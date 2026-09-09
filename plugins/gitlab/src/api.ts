/**
 * @fileoverview Typed GitLab REST API v4 client.
 * Provides strongly-typed methods for interacting with the GitLab API
 * using the native `fetch` API with comprehensive error handling.
 */

/**
 * GitLab project representation (subset of the full API response).
 */
export interface GitLabProject {
  readonly id: number;
  readonly name: string;
  readonly name_with_namespace: string;
  readonly path_with_namespace: string;
  readonly web_url: string;
  readonly default_branch: string;
  readonly avatar_url: string | null;
  readonly description: string | null;
  readonly last_activity_at: string;
  readonly namespace: {
    readonly id: number;
    readonly name: string;
    readonly path: string;
    readonly kind: string;
  };
}

/**
 * GitLab user reference used across multiple API responses.
 */
export interface GitLabUser {
  readonly id: number;
  readonly username: string;
  readonly name: string;
  readonly avatar_url: string;
  readonly web_url: string;
}

/**
 * Merge request state filter values.
 */
export type MergeRequestState = 'opened' | 'closed' | 'merged' | 'all';

/**
 * GitLab merge request representation.
 */
export interface GitLabMergeRequest {
  readonly id: number;
  readonly iid: number;
  readonly title: string;
  readonly description: string | null;
  readonly state: string;
  readonly web_url: string;
  readonly source_branch: string;
  readonly target_branch: string;
  readonly author: GitLabUser;
  readonly assignees: readonly GitLabUser[];
  readonly reviewers: readonly GitLabUser[];
  readonly created_at: string;
  readonly updated_at: string;
  readonly merged_at: string | null;
  readonly closed_at: string | null;
  readonly draft: boolean;
  readonly merge_status: string;
  readonly has_conflicts: boolean;
  readonly labels: readonly string[];
}

/**
 * Pipeline status values returned by the GitLab API.
 */
export type PipelineStatus =
  | 'created'
  | 'waiting_for_resource'
  | 'preparing'
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'canceled'
  | 'skipped'
  | 'manual'
  | 'scheduled';

/**
 * GitLab pipeline representation.
 */
export interface GitLabPipeline {
  readonly id: number;
  readonly iid: number;
  readonly status: PipelineStatus;
  readonly ref: string;
  readonly sha: string;
  readonly web_url: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly source: string;
  readonly user: GitLabUser;
}

/**
 * GitLab project webhook (hook) representation.
 */
export interface GitLabProjectHook {
  readonly id: number;
  readonly url: string;
  readonly push_events: boolean;
  readonly merge_requests_events: boolean;
  readonly tag_push_events: boolean;
  readonly pipeline_events: boolean;
  readonly releases_events: boolean;
  readonly enable_ssl_verification: boolean;
}

/**
 * Event toggles when creating a project webhook.
 */
export interface ProjectHookEvents {
  readonly push_events?: boolean;
  readonly merge_requests_events?: boolean;
  readonly tag_push_events?: boolean;
  readonly pipeline_events?: boolean;
  readonly releases_events?: boolean;
}

/**
 * GitLab group representation.
 */
export interface GitLabGroup {
  readonly id: number;
  readonly name: string;
  readonly path: string;
  readonly full_path: string;
  readonly web_url: string;
  readonly description: string | null;
  readonly avatar_url: string | null;
}

/**
 * Error thrown when a GitLab API request fails.
 */
export class GitLabApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly endpoint: string,
  ) {
    super(message);
    this.name = 'GitLabApiError';
  }
}

/**
 * Configuration required to initialize the GitLab API client.
 */
export interface GitLabClientConfig {
  /** Base URL of the GitLab instance (e.g. `https://gitlab.com`). */
  readonly url: string;
  /** Personal access token or project token for authentication. */
  readonly token: string;
  /** Request timeout in milliseconds. Defaults to 15000. */
  readonly timeoutMs?: number;
}

/**
 * Typed client for the GitLab REST API v4.
 *
 * All methods throw {@link GitLabApiError} on non-2xx responses.
 * Pagination is handled via the `per_page` and `page` query parameters.
 */
export class GitLabApiClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly timeoutMs: number;

  constructor(config: GitLabClientConfig) {
    this.baseUrl = config.url.replace(/\/+$/, '');
    this.token = config.token;
    this.timeoutMs = config.timeoutMs ?? 15_000;
  }

  /**
   * Fetch a paginated list of projects accessible to the authenticated user.
   *
   * @param options - Optional pagination and filter parameters.
   * @returns Array of GitLab projects.
   */
  async getProjects(options?: {
    page?: number;
    perPage?: number;
    search?: string;
    orderBy?: string;
  }): Promise<readonly GitLabProject[]> {
    const params = new URLSearchParams({
      page: String(options?.page ?? 1),
      per_page: String(options?.perPage ?? 20),
      order_by: options?.orderBy ?? 'last_activity_at',
      sort: 'desc',
    });
    if (options?.search) {
      params.set('search', options.search);
    }
    return this.request<GitLabProject[]>(`/api/v4/projects?${params.toString()}`);
  }

  /**
   * Fetch a single project by its numeric id or URL-encoded path.
   *
   * @param id - Project id (number) or URL-encoded path string.
   * @returns The requested GitLab project.
   */
  async getProject(id: number | string): Promise<GitLabProject> {
    const encodedId = typeof id === 'string' ? encodeURIComponent(id) : String(id);
    return this.request<GitLabProject>(`/api/v4/projects/${encodedId}`);
  }

  /**
   * Fetch merge requests for a given project.
   *
   * @param projectId - Numeric project id.
   * @param state - Filter by merge request state. Defaults to `"opened"`.
   * @param options - Optional pagination parameters.
   * @returns Array of merge requests.
   */
  async getMergeRequests(
    projectId: number,
    state: MergeRequestState = 'opened',
    options?: { page?: number; perPage?: number },
  ): Promise<readonly GitLabMergeRequest[]> {
    const params = new URLSearchParams({
      state,
      page: String(options?.page ?? 1),
      per_page: String(options?.perPage ?? 20),
      order_by: 'updated_at',
      sort: 'desc',
    });
    return this.request<GitLabMergeRequest[]>(
      `/api/v4/projects/${projectId}/merge_requests?${params.toString()}`,
    );
  }

  /**
   * Fetch recent pipelines for a given project.
   *
   * @param projectId - Numeric project id.
   * @param options - Optional pagination and filter parameters.
   * @returns Array of pipelines.
   */
  async getPipelines(
    projectId: number,
    options?: { page?: number; perPage?: number; ref?: string },
  ): Promise<readonly GitLabPipeline[]> {
    const params = new URLSearchParams({
      page: String(options?.page ?? 1),
      per_page: String(options?.perPage ?? 20),
      order_by: 'updated_at',
      sort: 'desc',
    });
    if (options?.ref) {
      params.set('ref', options.ref);
    }
    return this.request<GitLabPipeline[]>(
      `/api/v4/projects/${projectId}/pipelines?${params.toString()}`,
    );
  }

  /**
   * Fetch groups accessible to the authenticated user.
   *
   * @param options - Optional pagination parameters.
   * @returns Array of GitLab groups.
   */
  async getProjectGroups(options?: {
    page?: number;
    perPage?: number;
  }): Promise<readonly GitLabGroup[]> {
    const params = new URLSearchParams({
      page: String(options?.page ?? 1),
      per_page: String(options?.perPage ?? 20),
      order_by: 'name',
      sort: 'asc',
    });
    return this.request<GitLabGroup[]>(`/api/v4/groups?${params.toString()}`);
  }

  /**
   * List the webhooks configured on a project.
   *
   * @param projectId - Numeric project id.
   * @returns Array of project webhooks.
   */
  async getProjectHooks(projectId: number): Promise<readonly GitLabProjectHook[]> {
    return this.request<GitLabProjectHook[]>(`/api/v4/projects/${projectId}/hooks`);
  }

  /**
   * Create a webhook on a project pointing at the given URL.
   *
   * @param projectId - Numeric project id.
   * @param options - Webhook URL, optional secret token, and event toggles.
   * @returns The created webhook.
   */
  async createProjectHook(
    projectId: number,
    options: { url: string; token?: string; events?: ProjectHookEvents },
  ): Promise<GitLabProjectHook> {
    const body: Record<string, unknown> = {
      url: options.url,
      push_events: options.events?.push_events ?? true,
      merge_requests_events: options.events?.merge_requests_events ?? true,
      tag_push_events: options.events?.tag_push_events ?? true,
      pipeline_events: options.events?.pipeline_events ?? true,
      releases_events: options.events?.releases_events ?? true,
      enable_ssl_verification: options.url.startsWith('https://'),
    };
    if (options.token) {
      body.token = options.token;
    }
    return this.request<GitLabProjectHook>(`/api/v4/projects/${projectId}/hooks`, {
      method: 'POST',
      body,
    });
  }

  /**
   * Delete a webhook from a project.
   *
   * @param projectId - Numeric project id.
   * @param hookId - Identifier of the hook to remove.
   */
  async deleteProjectHook(projectId: number, hookId: number): Promise<void> {
    await this.request<void>(`/api/v4/projects/${projectId}/hooks/${hookId}`, {
      method: 'DELETE',
      allowEmpty: true,
    });
  }

  /**
   * Send an authenticated request to the GitLab API.
   *
   * @param path - API path relative to the base URL.
   * @param options - Optional HTTP method, JSON body, and empty-response toggle.
   * @returns Parsed JSON response body (or `undefined` for empty responses).
   * @throws {GitLabApiError} When the response status is not 2xx.
   */
  private async request<T>(
    path: string,
    options?: { method?: string; body?: unknown; allowEmpty?: boolean },
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: options?.method ?? 'GET',
        headers: {
          'PRIVATE-TOKEN': this.token,
          Accept: 'application/json',
          ...(options?.body !== undefined && { 'Content-Type': 'application/json' }),
        },
        ...(options?.body !== undefined && { body: JSON.stringify(options.body) }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new GitLabApiError(
          `GitLab API returned ${response.status}: ${body}`,
          response.status,
          path,
        );
      }

      if (options?.allowEmpty) {
        const text = await response.text();
        return (text ? JSON.parse(text) : undefined) as T;
      }
      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof GitLabApiError) {
        throw error;
      }
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new GitLabApiError(
          `Request to ${path} timed out after ${this.timeoutMs}ms`,
          408,
          path,
        );
      }
      throw new GitLabApiError(
        `Request to ${path} failed: ${error instanceof Error ? error.message : String(error)}`,
        0,
        path,
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
