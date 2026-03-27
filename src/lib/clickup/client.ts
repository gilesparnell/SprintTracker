import type {
  ClickUpWorkspace,
  ClickUpSpace,
  ClickUpFolder,
  ClickUpList,
  ClickUpTask,
  CreateTaskParams,
  CreateListParams,
} from "./types";

const BASE_URL = "https://api.clickup.com/api/v2";

export class ClickUpApiError extends Error {
  constructor(
    public status: number,
    public body: unknown
  ) {
    super(`ClickUp API error ${status}: ${JSON.stringify(body)}`);
    this.name = "ClickUpApiError";
  }
}

export class ClickUpRateLimitError extends ClickUpApiError {
  constructor(
    public resetAt: number,
    body: unknown
  ) {
    super(429, body);
    this.name = "ClickUpRateLimitError";
  }
}

export class ClickUpClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        Authorization: this.token,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (response.status === 429) {
      const resetAt = Number(response.headers.get("x-ratelimit-reset") ?? 0);
      const body = await response.json().catch(() => ({}));
      throw new ClickUpRateLimitError(resetAt, body);
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new ClickUpApiError(response.status, body);
    }

    return response.json() as Promise<T>;
  }

  async getWorkspaces(): Promise<ClickUpWorkspace[]> {
    const data = await this.request<{ teams: ClickUpWorkspace[] }>("/team");
    return data.teams;
  }

  async getSpaces(workspaceId: string): Promise<ClickUpSpace[]> {
    const data = await this.request<{ spaces: ClickUpSpace[] }>(
      `/team/${workspaceId}/space`
    );
    return data.spaces;
  }

  async getFolders(spaceId: string): Promise<ClickUpFolder[]> {
    const data = await this.request<{ folders: ClickUpFolder[] }>(
      `/space/${spaceId}/folder`
    );
    return data.folders;
  }

  async getLists(folderId: string): Promise<ClickUpList[]> {
    const data = await this.request<{ lists: ClickUpList[] }>(
      `/folder/${folderId}/list`
    );
    return data.lists;
  }

  async createList(
    folderId: string,
    params: CreateListParams
  ): Promise<ClickUpList> {
    return this.request<ClickUpList>(`/folder/${folderId}/list`, {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async createTask(
    listId: string,
    params: CreateTaskParams
  ): Promise<ClickUpTask> {
    return this.request<ClickUpTask>(`/list/${listId}/task`, {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async updateTask(
    taskId: string,
    params: Partial<CreateTaskParams>
  ): Promise<ClickUpTask> {
    return this.request<ClickUpTask>(`/task/${taskId}`, {
      method: "PUT",
      body: JSON.stringify(params),
    });
  }
}
