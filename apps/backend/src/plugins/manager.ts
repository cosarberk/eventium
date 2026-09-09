/**
 * @file Data-source manager.
 *
 * Owns the registry of loaded data sources (manifest + module) and the internal
 * event bus. Data sources are stateless request/response modules — there is no
 * per-instance connect/disconnect lifecycle; a query is a fresh call and a
 * webhook is translated on arrival. The manager builds the {@link StreamContext}
 * a source's `handleWebhook` uses to emit normalized events onto the bus.
 */

import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import type { PluginLogger, StreamContext } from '@eventium/plugin-sdk';
import type { EmittedEvent, PlatformEvent } from '@eventium/shared';
import { logger } from '../utils/index.js';
import type { LoadedSource, SourceManifest } from './types.js';

/** The read-only context a source needs to answer a resource query. */
export interface SourceRuntime {
  readonly config: Record<string, unknown>;
  readonly metadata: Record<string, unknown>;
  readonly instanceId: string;
}

/**
 * Central registry of installed data sources and the platform event bus.
 */
export class DataSourceManager {
  /** Loaded sources keyed by their manifest id. */
  private sources = new Map<string, LoadedSource>();

  /** Internal event emitter used as a lightweight pub/sub bus. */
  private bus = new EventEmitter();

  constructor() {
    this.bus.setMaxListeners(100);
  }

  /**
   * Register a discovered data source so instances of it can be installed.
   *
   * @param source - The loaded manifest + module.
   */
  registerSource(source: LoadedSource): void {
    const { id, version } = source.manifest;
    if (this.sources.has(id)) {
      logger.warn(`Data source "${id}" is already registered; skipping.`);
      return;
    }
    this.sources.set(id, source);
    logger.info(`Data source "${id}" registered (v${version}).`);
  }

  /** Retrieve a loaded source by its type id. */
  getSource(sourceType: string): LoadedSource | undefined {
    return this.sources.get(sourceType);
  }

  /** All registered source manifests (marketplace listing). */
  getAllManifests(): SourceManifest[] {
    return Array.from(this.sources.values(), (s) => s.manifest);
  }

  /** All registered sources. */
  getAllSources(): LoadedSource[] {
    return Array.from(this.sources.values());
  }

  /**
   * Deliver an inbound webhook to a source instance, giving its handler a
   * stream context bound to that instance so emitted events carry the right
   * source/instance identity.
   *
   * @returns `true` if the source has a webhook handler and it ran.
   */
  async deliverWebhook(
    sourceType: string,
    runtime: SourceRuntime,
    payload: unknown,
    headers: Record<string, string | undefined>,
  ): Promise<boolean> {
    const source = this.sources.get(sourceType);
    if (!source?.module.handleWebhook) return false;
    const ctx = this.buildStreamContext(sourceType, runtime);
    await source.module.handleWebhook(payload, headers, ctx);
    return true;
  }

  /** Subscribe to platform events (use `"*"` for all). */
  on(eventName: string, handler: (event: PlatformEvent) => void): void {
    this.bus.on(eventName, handler);
  }

  /** Remove a previously registered listener. */
  off(eventName: string, handler: (event: PlatformEvent) => void): void {
    this.bus.off(eventName, handler);
  }

  /** Emit an enriched platform event onto the bus. */
  emit(event: PlatformEvent): void {
    this.bus.emit(event.eventType, event);
    this.bus.emit('*', event);
  }

  /** A scoped logger for a source instance. */
  private buildLogger(sourceType: string, instanceId: string): PluginLogger {
    const child = logger.child({ source: sourceType, instance: instanceId });
    return {
      info: (msg, data) => child.info(data ?? {}, msg),
      warn: (msg, data) => child.warn(data ?? {}, msg),
      error: (msg, data) => child.error(data ?? {}, msg),
    };
  }

  /**
   * Build the stream context handed to `handleWebhook`, wiring `emitEvent` to
   * enrich raw events into {@link PlatformEvent}s and publish them on the bus.
   */
  private buildStreamContext(sourceType: string, runtime: SourceRuntime): StreamContext {
    const self = this;
    return {
      config: runtime.config,
      metadata: runtime.metadata,
      instanceId: runtime.instanceId,
      logger: this.buildLogger(sourceType, runtime.instanceId),
      async emitEvent(raw: EmittedEvent): Promise<void> {
        self.emit({
          id: randomUUID(),
          pluginInstanceId: runtime.instanceId,
          sourceType,
          eventType: raw.eventType,
          title: raw.title,
          description: raw.description ?? '',
          payload: raw.payload ?? {},
          severity: raw.severity ?? 'INFO',
          createdAt: new Date().toISOString(),
        });
      },
    };
  }
}
