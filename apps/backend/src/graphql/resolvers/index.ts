/**
 * @file Merged GraphQL resolvers.
 *
 * Implements Query, Mutation, and Subscription resolvers that delegate to the
 * service layer. Authorization is enforced per resolver rather than by a single
 * route hook, because a small, deliberate set of operations must stay reachable
 * without a session:
 *
 *  - `serverConfig` — the client needs the webhook base URL on the login screen.
 *  - `broadcastLink(token)` — the public TV view resolves its own page.
 *  - `resolveBindings(bindings, broadcastToken)` — the same view needs data, but
 *    only for the bindings its own broadcast declares (see `allowedBindingKeys`).
 *
 * Everything else requires a session, and mutations that touch credentials or
 * remove data additionally require a role.
 */

import type { PrismaClient } from '@prisma/client';
import type { MercuriusContext } from 'mercurius';
import type { JwtPayload, Role } from '../../middleware/index.js';
import { hasRole } from '../../middleware/index.js';
import type { DataSourceManager } from '../../plugins/index.js';
import type {
  BindingResolver,
  BroadcastService,
  DashboardService,
  DataSourceService,
  EventService,
  NotificationService,
  PagePortabilityService,
} from '../../services/index.js';
import {
  ForbiddenError,
  getPublicBaseUrl,
  NotFoundError,
  UnauthorizedError,
} from '../../utils/index.js';
import {
  bindingsArraySchema,
  configurePluginSchema,
  createBroadcastLinkSchema,
  createDashboardSchema,
  createNotificationRuleSchema,
  eventFilterSchema,
  idSchema,
  installPluginSchema,
  parseInput,
  sourceMappingSchema,
  tokenSchema,
  updateBroadcastLinkSchema,
  updateDashboardSchema,
  updateNotificationRuleSchema,
} from '../validation.js';

/** Shape of the Mercurius context enriched by the application. */
export interface GqlContext extends MercuriusContext {
  prisma: PrismaClient;
  dataSourceManager: DataSourceManager;
  eventService: EventService;
  dataSourceService: DataSourceService;
  bindingResolver: BindingResolver;
  dashboardService: DashboardService;
  portabilityService: PagePortabilityService;
  notificationService: NotificationService;
  broadcastService: BroadcastService;
  /** The authenticated caller, when the request carried a valid session cookie. */
  user?: JwtPayload;
}

/**
 * Assert that the current request is authenticated.
 * @returns The authenticated user's JWT payload.
 */
function requireAuth(ctx: GqlContext): JwtPayload {
  const user = ctx.user ?? ctx.reply?.request?.user;
  if (!user) throw new UnauthorizedError();
  return user;
}

/**
 * Assert that the caller holds at least `required`.
 * @returns The authenticated user's JWT payload.
 */
function requireMinRole(ctx: GqlContext, required: Role): JwtPayload {
  const user = requireAuth(ctx);
  if (!hasRole(user.role, required)) {
    throw new ForbiddenError(`Insufficient permissions — ${required} role required`);
  }
  return user;
}

/** Flatten a broadcast link's join-table dashboards into a plain array. */
function transformBroadcastLink(link: Record<string, unknown>) {
  const dashboards = link.dashboards as Array<{ dashboard: unknown }> | undefined;
  return {
    ...link,
    dashboards: dashboards?.map((d) => d.dashboard) ?? [],
  };
}

/**
 * Build the full resolver map consumed by Mercurius.
 */
export function buildResolvers() {
  return {
    Query: {
      /** Public: the client reads the webhook base URL before signing in. */
      serverConfig: () => ({ webhookBaseUrl: getPublicBaseUrl() }),

      events: async (
        _root: unknown,
        args: { filter?: Record<string, unknown> },
        ctx: GqlContext,
      ) => {
        requireAuth(ctx);
        const filter = parseInput(eventFilterSchema, args.filter ?? {}, 'event filter');
        return ctx.eventService.find(filter);
      },

      plugins: async (_root: unknown, _args: unknown, ctx: GqlContext) => {
        requireAuth(ctx);
        return ctx.dataSourceService.findAll();
      },

      /**
       * List available sources for the marketplace, each with its capability
       * descriptor so the client can preview what it exposes.
       */
      availablePlugins: (_root: unknown, _args: unknown, ctx: GqlContext) => {
        requireMinRole(ctx, 'EDITOR');
        return ctx.dataSourceManager.getAllSources().map((s) => ({
          ...s.manifest,
          capabilities: s.module.capabilities,
        }));
      },

      /**
       * Capability surface of every enabled instance (drives binding pickers).
       */
      sourceCapabilities: async (_root: unknown, _args: unknown, ctx: GqlContext) => {
        requireAuth(ctx);
        return ctx.dataSourceService.listInstanceCapabilities();
      },

      /**
       * Resolve an array of bindings to shaped values.
       *
       * Authenticated callers may resolve anything. An unauthenticated caller
       * must supply a broadcast token, and may then resolve only the bindings
       * that broadcast's own blocks declare.
       */
      resolveBindings: async (
        _root: unknown,
        args: { bindings: unknown; broadcastToken?: string },
        ctx: GqlContext,
      ) => {
        const bindings = parseInput(bindingsArraySchema, args.bindings ?? [], 'bindings');
        const user = ctx.user ?? ctx.reply?.request?.user;

        if (!user) {
          if (!args.broadcastToken) throw new UnauthorizedError();
          const token = parseInput(tokenSchema, args.broadcastToken, 'broadcastToken');
          const allowed = await ctx.broadcastService.allowedBindingKeys(token);
          if (!allowed) throw new NotFoundError('Broadcast link not found');

          for (const binding of bindings) {
            const key = binding.instanceId ? `${binding.ref}@${binding.instanceId}` : binding.ref;
            if (!allowed.has(key)) {
              throw new ForbiddenError(`Binding "${binding.ref}" is not part of this broadcast`);
            }
          }
        }

        return ctx.bindingResolver.resolveMany(bindings);
      },

      webhookTargets: async (
        _root: unknown,
        args: { pluginInstanceId: string; webhookUrl: string },
        ctx: GqlContext,
      ) => {
        requireMinRole(ctx, 'EDITOR');
        return ctx.dataSourceService.getWebhookTargets(
          parseInput(idSchema, args.pluginInstanceId, 'pluginInstanceId'),
          args.webhookUrl,
        );
      },

      dashboards: async (_root: unknown, _args: unknown, ctx: GqlContext) => {
        requireAuth(ctx);
        return ctx.dashboardService.findAll();
      },

      dashboard: async (_root: unknown, args: { id: string }, ctx: GqlContext) => {
        requireAuth(ctx);
        return ctx.dashboardService.findById(parseInput(idSchema, args.id, 'id'));
      },

      exportPage: async (_root: unknown, args: { id: string }, ctx: GqlContext) => {
        requireMinRole(ctx, 'EDITOR');
        return ctx.portabilityService.exportPage(parseInput(idSchema, args.id, 'id'));
      },

      notificationRules: async (_root: unknown, _args: unknown, ctx: GqlContext) => {
        requireAuth(ctx);
        return ctx.notificationService.findAll();
      },

      notificationRule: async (_root: unknown, args: { id: string }, ctx: GqlContext) => {
        requireAuth(ctx);
        return ctx.notificationService.findById(parseInput(idSchema, args.id, 'id'));
      },

      broadcastLinks: async (_root: unknown, _args: unknown, ctx: GqlContext) => {
        const user = requireAuth(ctx);
        const links = await ctx.broadcastService.findAll(user.sub);
        return links.map(transformBroadcastLink);
      },

      /** Public: the TV view resolves its own page from the shared token. */
      broadcastLink: async (_root: unknown, args: { token: string }, ctx: GqlContext) => {
        const token = parseInput(tokenSchema, args.token, 'token');
        const link = await ctx.broadcastService.findByToken(token);
        return link ? transformBroadcastLink(link) : null;
      },
    },

    Mutation: {
      createDashboard: async (
        _root: unknown,
        args: { input: Record<string, unknown> },
        ctx: GqlContext,
      ) => {
        requireMinRole(ctx, 'EDITOR');
        return ctx.dashboardService.create(
          parseInput(createDashboardSchema, args.input, 'dashboard input'),
        );
      },

      updateDashboard: async (
        _root: unknown,
        args: { id: string; input: Record<string, unknown> },
        ctx: GqlContext,
      ) => {
        requireMinRole(ctx, 'EDITOR');
        return ctx.dashboardService.update(
          parseInput(idSchema, args.id, 'id'),
          parseInput(updateDashboardSchema, args.input, 'dashboard input'),
        );
      },

      deleteDashboard: async (_root: unknown, args: { id: string }, ctx: GqlContext) => {
        requireMinRole(ctx, 'EDITOR');
        return ctx.dashboardService.delete(parseInput(idSchema, args.id, 'id'));
      },

      importPage: async (
        _root: unknown,
        args: { spec: unknown; sourceMapping: Record<string, string> },
        ctx: GqlContext,
      ) => {
        requireMinRole(ctx, 'EDITOR');
        return ctx.portabilityService.importPage(
          args.spec,
          parseInput(sourceMappingSchema, args.sourceMapping ?? {}, 'sourceMapping'),
        );
      },

      installPlugin: async (
        _root: unknown,
        args: { input: Record<string, unknown> },
        ctx: GqlContext,
      ) => {
        requireMinRole(ctx, 'ADMIN');
        return ctx.dataSourceService.install(
          parseInput(installPluginSchema, args.input, 'install input'),
        );
      },

      uninstallPlugin: async (_root: unknown, args: { id: string }, ctx: GqlContext) => {
        requireMinRole(ctx, 'ADMIN');
        return ctx.dataSourceService.uninstall(parseInput(idSchema, args.id, 'id'));
      },

      configurePlugin: async (
        _root: unknown,
        args: { id: string; input: { config: Record<string, unknown> } },
        ctx: GqlContext,
      ) => {
        requireMinRole(ctx, 'ADMIN');
        return ctx.dataSourceService.configure(
          parseInput(idSchema, args.id, 'id'),
          parseInput(configurePluginSchema, args.input, 'configure input'),
        );
      },

      togglePlugin: async (
        _root: unknown,
        args: { id: string; enabled: boolean },
        ctx: GqlContext,
      ) => {
        requireMinRole(ctx, 'ADMIN');
        return ctx.dataSourceService.toggle(parseInput(idSchema, args.id, 'id'), !!args.enabled);
      },

      syncPluginMetadata: async (_root: unknown, args: { id: string }, ctx: GqlContext) => {
        requireMinRole(ctx, 'EDITOR');
        return ctx.dataSourceService.syncMetadata(parseInput(idSchema, args.id, 'id'));
      },

      syncWebhookTargets: async (
        _root: unknown,
        args: { pluginInstanceId: string; targetIds: string[]; webhookUrl: string },
        ctx: GqlContext,
      ) => {
        requireMinRole(ctx, 'EDITOR');
        return ctx.dataSourceService.syncWebhookTargets(
          parseInput(idSchema, args.pluginInstanceId, 'pluginInstanceId'),
          args.targetIds ?? [],
          args.webhookUrl,
        );
      },

      createNotificationRule: async (
        _root: unknown,
        args: { input: Record<string, unknown> },
        ctx: GqlContext,
      ) => {
        requireMinRole(ctx, 'EDITOR');
        return ctx.notificationService.createRule(
          parseInput(createNotificationRuleSchema, args.input, 'rule input'),
        );
      },

      updateNotificationRule: async (
        _root: unknown,
        args: { id: string; input: Record<string, unknown> },
        ctx: GqlContext,
      ) => {
        requireMinRole(ctx, 'EDITOR');
        return ctx.notificationService.updateRule(
          parseInput(idSchema, args.id, 'id'),
          parseInput(updateNotificationRuleSchema, args.input, 'rule input'),
        );
      },

      deleteNotificationRule: async (_root: unknown, args: { id: string }, ctx: GqlContext) => {
        requireMinRole(ctx, 'EDITOR');
        return ctx.notificationService.deleteRule(parseInput(idSchema, args.id, 'id'));
      },

      createBroadcastLink: async (
        _root: unknown,
        args: { input: { name: string; dashboardIds: string[] } },
        ctx: GqlContext,
      ) => {
        const user = requireMinRole(ctx, 'EDITOR');
        const link = await ctx.broadcastService.create(
          user.sub,
          parseInput(createBroadcastLinkSchema, args.input, 'broadcast input'),
        );
        return transformBroadcastLink(link);
      },

      updateBroadcastLink: async (
        _root: unknown,
        args: {
          id: string;
          input: { name?: string; enabled?: boolean; dashboardIds?: string[] };
        },
        ctx: GqlContext,
      ) => {
        const user = requireMinRole(ctx, 'EDITOR');
        const link = await ctx.broadcastService.update(
          parseInput(idSchema, args.id, 'id'),
          user.sub,
          parseInput(updateBroadcastLinkSchema, args.input, 'broadcast input'),
        );
        return transformBroadcastLink(link);
      },

      deleteBroadcastLink: async (_root: unknown, args: { id: string }, ctx: GqlContext) => {
        const user = requireMinRole(ctx, 'EDITOR');
        const link = await ctx.broadcastService.delete(
          parseInput(idSchema, args.id, 'id'),
          user.sub,
        );
        return transformBroadcastLink(link);
      },

      regenerateBroadcastLinkToken: async (
        _root: unknown,
        args: { id: string },
        ctx: GqlContext,
      ) => {
        const user = requireMinRole(ctx, 'EDITOR');
        const link = await ctx.broadcastService.regenerateToken(
          parseInput(idSchema, args.id, 'id'),
          user.sub,
        );
        return transformBroadcastLink(link);
      },
    },

    Subscription: {
      onEvent: {
        subscribe: async (_root: unknown, args: { pluginInstanceId?: string }, ctx: GqlContext) => {
          requireAuth(ctx);
          const iter = await ctx.pubsub.subscribe('EVENT_CREATED');
          if (!args.pluginInstanceId) return iter;

          return (async function* () {
            for await (const value of iter) {
              const event = (value as Record<string, Record<string, unknown>>).onEvent;
              if (event.pluginInstanceId === args.pluginInstanceId) {
                yield value;
              }
            }
          })();
        },
        resolve: (payload: Record<string, unknown>) => payload.onEvent ?? payload,
      },
    },
  };
}
