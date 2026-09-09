/**
 * @file Data-source service.
 *
 * Persists data-source *instances* and orchestrates the stateless runtime:
 * metadata sync, resource queries, capability exposure, and webhook management.
 * There is no per-instance connect/disconnect — a query is a fresh module call.
 *
 * Credential handling: config fields a manifest declares as `secret` are
 * encrypted before they are written (see {@link encryptSecret}) and decrypted
 * only when building the context a plugin call receives. Anything that leaves
 * the service towards the API is masked, so a token can be set and replaced but
 * never read back.
 */

import {
  type DataSourceContext,
  isWebhookAuthError,
  type PluginLogger,
  type WebhookTarget,
} from '@eventium/plugin-sdk';
import type { CapabilityDescriptor, ResourceQuery, ResourceResult } from '@eventium/shared';
import type { Prisma, PrismaClient } from '@prisma/client';
import { env } from '../config/index.js';
import type { DataSourceManager } from '../plugins/index.js';
import {
  decryptSecret,
  encryptSecret,
  isEncrypted,
  logger,
  SECRET_MASK,
  UnauthorizedError,
  ValidationError,
} from '../utils/index.js';

/** Input for installing (creating) a new data-source instance. */
export interface InstallPluginInput {
  pluginId: string;
  name: string;
  config?: Record<string, unknown>;
}

/** Input for updating an instance's configuration. */
export interface ConfigurePluginInput {
  config: Record<string, unknown>;
}

/** An installed instance's queryable capability surface, for the binding UI. */
export interface InstanceCapability {
  instanceId: string;
  sourceType: string;
  name: string;
  capabilities: CapabilityDescriptor;
}

/** Config key that, by convention, holds the inbound webhook shared secret. */
const WEBHOOK_SECRET_KEY = 'webhookSecret';

/** Internal config key holding the user's monitored webhook target selection. */
const MONITORED_TARGETS_KEY = '_monitoredTargets';

/** A persisted instance row as this service passes it around. */
type InstanceRow = {
  id: string;
  pluginId: string;
  name: string;
  config: unknown;
  metadata: unknown;
};

/**
 * Service responsible for data-source instance persistence and runtime bridging.
 */
export class DataSourceService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly manager: DataSourceManager,
  ) {}

  /** Install a new instance and sync its metadata. */
  async install(input: InstallPluginInput) {
    if (!this.manager.getSource(input.pluginId)) {
      throw new ValidationError(`Data source "${input.pluginId}" is not registered.`);
    }

    const instance = await this.prisma.pluginInstance.create({
      data: {
        pluginId: input.pluginId,
        name: input.name,
        config: this.protectConfig(input.pluginId, input.config ?? {}, {}) as Prisma.InputJsonValue,
        enabled: true,
      },
    });

    try {
      await this.syncMetadata(instance.id);
    } catch (err) {
      logger.warn(`Metadata sync failed for instance "${instance.id}": ${(err as Error).message}`);
    }

    return this.findByIdMasked(instance.id);
  }

  /** Remove an instance and all its events (cascade). */
  async uninstall(instanceId: string) {
    const removed = await this.prisma.pluginInstance.delete({ where: { id: instanceId } });
    return this.mask(removed);
  }

  /**
   * Update an instance's configuration and re-sync metadata.
   * Secret fields left at {@link SECRET_MASK} keep their stored value.
   */
  async configure(instanceId: string, input: ConfigurePluginInput) {
    const existing = await this.prisma.pluginInstance.findUniqueOrThrow({
      where: { id: instanceId },
    });

    await this.prisma.pluginInstance.update({
      where: { id: instanceId },
      data: {
        config: this.protectConfig(
          existing.pluginId,
          input.config,
          (existing.config ?? {}) as Record<string, unknown>,
        ) as Prisma.InputJsonValue,
      },
    });

    try {
      await this.syncMetadata(instanceId);
    } catch (err) {
      logger.warn(`Metadata sync after configure failed: ${(err as Error).message}`);
    }

    return this.findByIdMasked(instanceId);
  }

  /** Toggle an instance's enabled state. */
  async toggle(instanceId: string, enabled: boolean) {
    const updated = await this.prisma.pluginInstance.update({
      where: { id: instanceId },
      data: { enabled },
    });
    return this.mask(updated);
  }

  /** List all persisted instances, with secrets masked. */
  async findAll() {
    const instances = await this.prisma.pluginInstance.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return instances.map((instance) => this.mask(instance));
  }

  /** Retrieve a single instance by id, with secrets masked. */
  async findById(id: string) {
    const instance = await this.prisma.pluginInstance.findUnique({ where: { id } });
    return instance ? this.mask(instance) : null;
  }

  /**
   * Pull dynamic metadata from the source's external API and persist it.
   */
  async syncMetadata(instanceId: string) {
    const instance = await this.prisma.pluginInstance.findUniqueOrThrow({
      where: { id: instanceId },
    });

    const source = this.manager.getSource(instance.pluginId);
    if (!source?.module.fetchMetadata) {
      logger.info(`Source "${instance.pluginId}" has no fetchMetadata; skipping sync.`);
      return this.mask(instance);
    }

    const ctx = this.buildContext(instance);
    const metadata = await source.module.fetchMetadata(ctx);

    const updated = await this.prisma.pluginInstance.update({
      where: { id: instanceId },
      data: { metadata: metadata as Prisma.InputJsonValue, syncedAt: new Date() },
    });
    return this.mask(updated);
  }

  /**
   * Answer a resource query against a concrete instance by delegating to the
   * source's `queryResource`.
   */
  async queryResource(instanceId: string, query: ResourceQuery): Promise<ResourceResult> {
    const instance = await this.prisma.pluginInstance.findUniqueOrThrow({
      where: { id: instanceId },
    });
    if (!instance.enabled) {
      throw new ValidationError(`Data source instance "${instance.name}" is disabled.`);
    }
    const source = this.manager.getSource(instance.pluginId);
    if (!source) {
      throw new ValidationError(`Data source "${instance.pluginId}" is not registered.`);
    }
    return source.module.queryResource(query, this.buildContext(instance));
  }

  /** The capability descriptor of a registered source type. */
  getCapabilities(sourceType: string): CapabilityDescriptor | undefined {
    return this.manager.getSource(sourceType)?.module.capabilities;
  }

  /**
   * The capability surface of every enabled instance, so the design layer can
   * offer bindings scoped to what is actually installed.
   */
  async listInstanceCapabilities(): Promise<InstanceCapability[]> {
    const instances = await this.prisma.pluginInstance.findMany({ where: { enabled: true } });
    const result: InstanceCapability[] = [];
    for (const instance of instances) {
      const source = this.manager.getSource(instance.pluginId);
      if (!source) continue;
      result.push({
        instanceId: instance.id,
        sourceType: instance.pluginId,
        name: instance.name,
        capabilities: source.module.capabilities,
      });
    }
    return result;
  }

  /** Find the sole enabled instance of a source type (for instance-agnostic bindings). */
  async findDefaultInstanceId(sourceType: string): Promise<string | null> {
    const instance = await this.prisma.pluginInstance.findFirst({
      where: { pluginId: sourceType, enabled: true },
      orderBy: { createdAt: 'asc' },
    });
    return instance?.id ?? null;
  }

  /** List a source instance's monitorable webhook targets. */
  async getWebhookTargets(instanceId: string, webhookUrl: string): Promise<WebhookTarget[]> {
    const { instance, provider } = await this.requireWebhookProvider(instanceId);
    return provider.list(this.buildContext(instance), webhookUrl);
  }

  /** Reconcile which targets carry the Eventium webhook, then persist the selection. */
  async syncWebhookTargets(
    instanceId: string,
    targetIds: string[],
    webhookUrl: string,
  ): Promise<WebhookTarget[]> {
    const { instance, provider } = await this.requireWebhookProvider(instanceId);
    const result = await provider.sync(this.buildContext(instance), targetIds, webhookUrl);

    // Stored config is already protected; merge the selection without re-encrypting.
    const storedConfig = (instance.config ?? {}) as Record<string, unknown>;
    await this.prisma.pluginInstance.update({
      where: { id: instanceId },
      data: {
        config: {
          ...storedConfig,
          [MONITORED_TARGETS_KEY]: targetIds,
        } as Prisma.InputJsonValue,
      },
    });

    return result;
  }

  /**
   * Deliver an inbound webhook to every enabled instance of the source type.
   *
   * Each instance verifies its own secret, and a mismatch on one instance never
   * blocks a matching one. Authentication failures are separated from processing
   * failures on purpose: an unauthenticated delivery is refused, but a delivery
   * that authenticated and then failed to parse is still acknowledged, because
   * GitLab and Nexus disable a webhook after repeated error responses — a parser
   * bug must not silently switch off event delivery.
   *
   * @throws {UnauthorizedError} When no instance could authenticate the request.
   */
  async deliverWebhook(
    sourceType: string,
    payload: unknown,
    headers: Record<string, string | undefined>,
  ): Promise<void> {
    const instances = await this.prisma.pluginInstance.findMany({
      where: { pluginId: sourceType, enabled: true },
    });
    if (instances.length === 0) {
      logger.warn(`Webhook for "${sourceType}" but no enabled instances; ignoring.`);
      return;
    }

    let authenticated = 0;

    for (const instance of instances) {
      const config = this.revealConfig(instance);

      if (env.WEBHOOK_REQUIRE_SECRET && !config[WEBHOOK_SECRET_KEY]) {
        logger.warn(
          `Instance "${instance.name}" has no ${WEBHOOK_SECRET_KEY} configured and ` +
            'WEBHOOK_REQUIRE_SECRET is on; rejecting unauthenticated webhook.',
        );
        continue;
      }

      try {
        await this.manager.deliverWebhook(
          sourceType,
          {
            config,
            metadata: (instance.metadata ?? {}) as Record<string, unknown>,
            instanceId: instance.id,
          },
          payload,
          headers,
        );
        authenticated++;
      } catch (err) {
        if (isWebhookAuthError(err)) {
          logger.debug(
            `Webhook secret did not match instance "${instance.name}" (${instance.id}).`,
          );
          continue;
        }

        // Authenticated, but the handler could not process it. Count it as
        // accepted and surface the fault in the logs.
        authenticated++;
        logger.error(
          `Webhook handler for "${instance.name}" (${instance.id}) failed: ${(err as Error).message}`,
        );
      }
    }

    if (authenticated === 0) {
      throw new UnauthorizedError('No enabled instance authenticated this webhook.');
    }
  }

  /**
   * Re-register webhooks for every instance with a saved monitored selection
   * against a freshly-resolved public base URL (e.g. after a tunnel restart).
   */
  async reregisterWebhooks(publicBaseUrl: string): Promise<void> {
    const instances = await this.prisma.pluginInstance.findMany({ where: { enabled: true } });
    for (const instance of instances) {
      const source = this.manager.getSource(instance.pluginId);
      if (!source?.module.webhookTargets) continue;

      const config = (instance.config ?? {}) as Record<string, unknown>;
      const monitored = config[MONITORED_TARGETS_KEY];
      if (!Array.isArray(monitored) || monitored.length === 0) continue;

      const webhookUrl = `${publicBaseUrl}/api/webhooks/${instance.pluginId}`;
      try {
        await this.syncWebhookTargets(instance.id, monitored as string[], webhookUrl);
        logger.info(
          `Re-registered ${monitored.length} webhook(s) for "${instance.name}" at ${webhookUrl}`,
        );
      } catch (err) {
        logger.warn(
          `Failed to re-register webhooks for "${instance.name}": ${(err as Error).message}`,
        );
      }
    }
  }

  /** Load an instance and assert its source exposes a webhook target provider. */
  private async requireWebhookProvider(instanceId: string) {
    const instance = await this.prisma.pluginInstance.findUniqueOrThrow({
      where: { id: instanceId },
    });
    const source = this.manager.getSource(instance.pluginId);
    if (!source?.module.webhookTargets) {
      throw new ValidationError(
        `Source "${instance.pluginId}" does not support webhook management.`,
      );
    }
    return { instance, provider: source.module.webhookTargets };
  }

  /** The set of config keys a source declares as secret. */
  private secretKeys(pluginId: string): Set<string> {
    const fields = this.manager.getSource(pluginId)?.manifest.configFields ?? [];
    return new Set(fields.filter((f) => f.type === 'secret').map((f) => f.key));
  }

  /**
   * Prepare a user-supplied config for storage: encrypt secret fields, and keep
   * the stored value for any secret left at the mask (meaning "unchanged").
   *
   * @param pluginId - Source type, used to look up which fields are secret.
   * @param incoming - The config as submitted by the client.
   * @param stored   - The currently persisted (already protected) config.
   */
  private protectConfig(
    pluginId: string,
    incoming: Record<string, unknown>,
    stored: Record<string, unknown>,
  ): Record<string, unknown> {
    const secrets = this.secretKeys(pluginId);
    const result: Record<string, unknown> = {};

    // Preserve internal bookkeeping keys the client never sends back.
    if (stored[MONITORED_TARGETS_KEY] !== undefined) {
      result[MONITORED_TARGETS_KEY] = stored[MONITORED_TARGETS_KEY];
    }

    for (const [key, value] of Object.entries(incoming)) {
      if (!secrets.has(key)) {
        result[key] = value;
        continue;
      }

      // An untouched masked field means "keep what is stored".
      if (value === SECRET_MASK || value === undefined || value === null) {
        if (stored[key] !== undefined) result[key] = stored[key];
        continue;
      }

      const asString = String(value);
      if (asString.length === 0) {
        // Explicitly cleared.
        continue;
      }

      result[key] = isEncrypted(asString) ? asString : encryptSecret(asString);
    }

    return result;
  }

  /** Decrypt an instance's stored config for plugin consumption. */
  private revealConfig(instance: InstanceRow): Record<string, unknown> {
    const stored = (instance.config ?? {}) as Record<string, unknown>;
    const secrets = this.secretKeys(instance.pluginId);
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(stored)) {
      if (secrets.has(key) && typeof value === 'string') {
        try {
          result[key] = decryptSecret(value);
        } catch (err) {
          logger.error(
            `Could not decrypt "${key}" for instance "${instance.id}": ${(err as Error).message}. ` +
              'Re-enter the credential (ENCRYPTION_KEY may have changed).',
          );
        }
        continue;
      }
      result[key] = value;
    }

    return result;
  }

  /** Replace every secret field with {@link SECRET_MASK} for API responses. */
  private mask<T extends { pluginId: string; config: unknown }>(instance: T): T {
    const stored = (instance.config ?? {}) as Record<string, unknown>;
    const secrets = this.secretKeys(instance.pluginId);
    const config: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(stored)) {
      if (key === MONITORED_TARGETS_KEY) {
        config[key] = value;
        continue;
      }
      config[key] = secrets.has(key) && value !== undefined && value !== '' ? SECRET_MASK : value;
    }

    return { ...instance, config };
  }

  /** Fetch an instance by id and mask it, throwing when absent. */
  private async findByIdMasked(id: string) {
    const instance = await this.prisma.pluginInstance.findUniqueOrThrow({ where: { id } });
    return this.mask(instance);
  }

  /** Build the read-only context handed to a source's query/metadata functions. */
  private buildContext(instance: InstanceRow): DataSourceContext {
    return {
      config: this.revealConfig(instance),
      metadata: (instance.metadata ?? {}) as Record<string, unknown>,
      instanceId: instance.id,
      logger: this.instanceLogger(instance.pluginId, instance.id),
    };
  }

  /** A scoped logger for a source instance. */
  private instanceLogger(sourceType: string, instanceId: string): PluginLogger {
    const child = logger.child({ source: sourceType, instance: instanceId });
    return {
      info: (msg, data) => child.info(data ?? {}, msg),
      warn: (msg, data) => child.warn(data ?? {}, msg),
      error: (msg, data) => child.error(data ?? {}, msg),
    };
  }
}
