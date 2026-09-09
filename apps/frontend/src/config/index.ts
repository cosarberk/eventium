/**
 * @fileoverview Application configuration derived from Vite environment variables.
 * All VITE_ prefixed environment variables are exposed here with sensible defaults.
 *
 * Defaults are same-origin paths, so one build works behind any hostname: Nginx
 * (production) and the Vite dev server both proxy `/api`, `/graphql`, and
 * `/socket.io` to the backend. `??` would keep an empty string supplied by the
 * build environment, so `||` is used for values that must not be empty.
 */

/** Application-wide configuration object */
export const config = {
  /** Base URL for the GraphQL API endpoint */
  graphqlUrl: (import.meta.env.VITE_GRAPHQL_URL as string) || '/graphql',

  /**
   * Origin for the WebSocket connection. Empty means "the page's own origin",
   * which is what a reverse-proxied deployment needs.
   */
  wsUrl: (import.meta.env.VITE_WS_URL as string) ?? '',

  /** Base URL for the REST API */
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string) || '/api',

  /** Application name displayed in the UI */
  appName: (import.meta.env.VITE_APP_NAME as string) || 'Eventium',

  /** Current environment identifier */
  environment: (import.meta.env.VITE_ENVIRONMENT as string) ?? 'development',

  /** Whether the application is running in production mode */
  isProduction: import.meta.env.PROD as boolean,

  /** Whether the application is running in development mode */
  isDevelopment: import.meta.env.DEV as boolean,

  /** Default number of events to display in the feed */
  defaultEventLimit: Number(import.meta.env.VITE_DEFAULT_EVENT_LIMIT ?? 50),

  /** Interval in milliseconds for polling fallback when WebSocket is unavailable */
  pollInterval: Number(import.meta.env.VITE_POLL_INTERVAL ?? 30000),
} as const;
