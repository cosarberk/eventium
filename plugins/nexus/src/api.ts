/**
 * @fileoverview Typed Sonatype Nexus Repository Manager REST API (v1) client.
 * Uses the native `fetch` API with optional HTTP basic authentication and
 * bounded pagination via continuation tokens.
 */

/** A Nexus repository as returned by `/service/rest/v1/repositories`. */
export interface NexusRepository {
  readonly name: string;
  readonly format: string;
  readonly type: string;
  readonly url: string;
  readonly online?: boolean;
}

/** An asset attached to a Nexus component. */
export interface NexusAsset {
  readonly id: string;
  readonly path: string;
  readonly downloadUrl: string;
  readonly lastModified?: string;
  readonly lastDownloaded?: string;
  readonly fileSize?: number;
}

/** A Nexus component (a published artifact at a specific version). */
export interface NexusComponent {
  readonly id: string;
  readonly repository: string;
  readonly format: string;
  readonly group: string | null;
  readonly name: string;
  readonly version: string;
  readonly assets: readonly NexusAsset[];
}

/** Paginated component listing response. */
interface ComponentPage {
  readonly items: readonly NexusComponent[];
  readonly continuationToken: string | null;
}

/**
 * Resolves the newest asset modification time on a component.
 * @param component - The component whose assets to inspect.
 * @returns The latest `lastModified` ISO timestamp, or `null` when none exist.
 */
export function latestAssetTime(component: NexusComponent): string | null {
  let newest: string | null = null;
  for (const asset of component.assets ?? []) {
    if (asset.lastModified && (!newest || asset.lastModified > newest)) {
      newest = asset.lastModified;
    }
  }
  return newest;
}

/** Error thrown when a Nexus API request fails. */
export class NexusApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly endpoint: string,
  ) {
    super(message);
    this.name = 'NexusApiError';
  }
}

/** Configuration required to initialize the Nexus API client. */
export interface NexusClientConfig {
  /** Base URL of the Nexus instance (e.g. `https://nexus.example.com`). */
  readonly url: string;
  /** Username for basic auth (optional — omit for anonymous access). */
  readonly username?: string;
  /** Password/token for basic auth. */
  readonly password?: string;
  /** Request timeout in milliseconds. Defaults to 15000. */
  readonly timeoutMs?: number;
}

/**
 * Typed client for the Nexus Repository Manager REST API v1.
 * All methods throw {@link NexusApiError} on non-2xx responses.
 */
export class NexusApiClient {
  private readonly baseUrl: string;
  private readonly authHeader: string | null;
  private readonly timeoutMs: number;

  constructor(config: NexusClientConfig) {
    this.baseUrl = config.url.replace(/\/+$/, '');
    this.timeoutMs = config.timeoutMs ?? 15_000;
    this.authHeader =
      config.username && config.password
        ? `Basic ${btoa(`${config.username}:${config.password}`)}`
        : null;
  }

  /**
   * Fetch all repositories visible to the configured credentials.
   * @returns Array of repositories.
   */
  async getRepositories(): Promise<readonly NexusRepository[]> {
    return this.request<NexusRepository[]>('/service/rest/v1/repositories');
  }

  /**
   * Fetch a single page of components for a repository.
   * @param repository - Repository name.
   * @param continuationToken - Token from a previous page, or null for the first page.
   * @returns A page of components and the next continuation token.
   */
  async getComponentsPage(
    repository: string,
    continuationToken: string | null = null,
  ): Promise<ComponentPage> {
    const params = new URLSearchParams({ repository });
    if (continuationToken) {
      params.set('continuationToken', continuationToken);
    }
    const page = await this.request<{
      items: NexusComponent[];
      continuationToken: string | null;
    }>(`/service/rest/v1/components?${params.toString()}`);
    return { items: page.items ?? [], continuationToken: page.continuationToken ?? null };
  }

  /**
   * Fetch components for a repository across multiple pages, bounded by a cap.
   * @param repository - Repository name.
   * @param maxItems - Maximum number of components to collect.
   * @returns Collected components.
   */
  async getComponents(repository: string, maxItems = 200): Promise<NexusComponent[]> {
    const collected: NexusComponent[] = [];
    let token: string | null = null;

    do {
      const page: ComponentPage = await this.getComponentsPage(repository, token);
      collected.push(...page.items);
      token = page.continuationToken;
    } while (token && collected.length < maxItems);

    return collected.slice(0, maxItems);
  }

  /**
   * Check whether the Nexus instance reports a healthy status.
   * @returns `true` when the status endpoint responds successfully.
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.request<unknown>('/service/rest/v1/status', true);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Send an authenticated request to the Nexus API.
   * @param path - API path relative to the base URL.
   * @param allowEmpty - When true, an empty 2xx body resolves to `undefined`.
   * @returns Parsed JSON response body.
   * @throws {NexusApiError} When the response status is not 2xx.
   */
  private async request<T>(path: string, allowEmpty = false): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (this.authHeader) {
      headers.Authorization = this.authHeader;
    }

    try {
      const response = await fetch(url, { headers, signal: controller.signal });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new NexusApiError(
          `Nexus API returned ${response.status}: ${body}`,
          response.status,
          path,
        );
      }

      const text = await response.text();
      if (!text && allowEmpty) {
        return undefined as T;
      }
      return JSON.parse(text) as T;
    } catch (error) {
      if (error instanceof NexusApiError) throw error;
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new NexusApiError(
          `Request to ${path} timed out after ${this.timeoutMs}ms`,
          408,
          path,
        );
      }
      throw new NexusApiError(
        `Request to ${path} failed: ${error instanceof Error ? error.message : String(error)}`,
        0,
        path,
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
