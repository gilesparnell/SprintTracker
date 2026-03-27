import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClickUpClient, ClickUpApiError, ClickUpRateLimitError } from "@/lib/clickup/client";

describe("ClickUpClient", () => {
  let client: ClickUpClient;

  beforeEach(() => {
    client = new ClickUpClient("pk_test_token");
    vi.restoreAllMocks();
  });

  it("should add Authorization header to all requests", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "x-ratelimit-remaining": "99" }),
      json: () => Promise.resolve({ teams: [] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await client.getWorkspaces();

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.clickup.com/api/v2/team",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "pk_test_token",
          "Content-Type": "application/json",
        }),
      })
    );
  });

  it("should throw ClickUpApiError on 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers(),
        json: () => Promise.resolve({ err: "Token invalid", ECODE: "OAUTH_025" }),
      })
    );

    await expect(client.getWorkspaces()).rejects.toThrow(ClickUpApiError);
    await expect(client.getWorkspaces()).rejects.toThrow(/401/);
  });

  it("should throw ClickUpRateLimitError on 429 with reset timestamp", async () => {
    const resetTime = Math.floor(Date.now() / 1000) + 60;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Headers({
          "x-ratelimit-reset": String(resetTime),
          "x-ratelimit-remaining": "0",
        }),
        json: () => Promise.resolve({ err: "Rate limit exceeded" }),
      })
    );

    try {
      await client.getWorkspaces();
      expect.fail("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ClickUpRateLimitError);
      expect((e as ClickUpRateLimitError).resetAt).toBe(resetTime);
    }
  });

  it("should get workspaces", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "x-ratelimit-remaining": "99" }),
        json: () =>
          Promise.resolve({
            teams: [{ id: "123", name: "My Workspace" }],
          }),
      })
    );

    const result = await client.getWorkspaces();
    expect(result).toEqual([{ id: "123", name: "My Workspace" }]);
  });

  it("should get spaces for a workspace", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "x-ratelimit-remaining": "99" }),
        json: () =>
          Promise.resolve({
            spaces: [{ id: "456", name: "Dev Space" }],
          }),
      })
    );

    const result = await client.getSpaces("123");
    expect(result).toEqual([{ id: "456", name: "Dev Space" }]);
  });

  it("should get folders for a space", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "x-ratelimit-remaining": "99" }),
        json: () =>
          Promise.resolve({
            folders: [{ id: "789", name: "Sprint Folder" }],
          }),
      })
    );

    const result = await client.getFolders("456");
    expect(result).toEqual([{ id: "789", name: "Sprint Folder" }]);
  });

  it("should create a task in a list", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "x-ratelimit-remaining": "99" }),
        json: () =>
          Promise.resolve({
            id: "task_abc",
            name: "Build login",
            status: { status: "Open" },
          }),
      })
    );

    const result = await client.createTask("list_123", {
      name: "Build login",
      description: "Create the login form",
    });
    expect(result.id).toBe("task_abc");
    expect(result.name).toBe("Build login");
  });
});
