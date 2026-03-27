import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { eq } from "drizzle-orm";
import { sprints, tasks, syncLog } from "@/lib/db/schema";
import { createSprint } from "@/lib/actions/sprints";
import { createTask } from "@/lib/actions/tasks";
import { syncTaskToClickUp, syncTaskStatusToClickUp, ensureClickUpList } from "@/lib/clickup/sync";
import { ClickUpClient } from "@/lib/clickup/client";

vi.mock("@/lib/clickup/client");

describe("ClickUp Sync", () => {
  let db: ReturnType<typeof drizzle>;
  let mockClient: ClickUpClient;

  beforeAll(async () => {
    const client = createClient({ url: "file::memory:" });
    db = drizzle(client);
    await migrate(db, { migrationsFolder: "./drizzle" });
  });

  beforeEach(async () => {
    await db.delete(syncLog);
    await db.delete(tasks);
    await db.delete(sprints);
    vi.clearAllMocks();
    mockClient = new ClickUpClient("pk_test");
  });

  it("should sync a task to ClickUp and store the clickupTaskId", async () => {
    const sprint = await createSprint(db, {
      name: "Sprint 1",
      startDate: "2026-03-27",
      endDate: "2026-04-10",
    });

    // Link sprint to ClickUp
    await db.update(sprints)
      .set({ clickupListId: "list_123", clickupFolderId: "folder_456" })
      .where(eq(sprints.id, sprint.sprint!.id));

    const task = await createTask(db, sprint.sprint!.id, { title: "Test task" });

    vi.mocked(mockClient.createTask).mockResolvedValue({
      id: "cu_task_789",
      name: "Test task",
      status: { status: "Open" },
    });

    await syncTaskToClickUp(db, mockClient, task.task!.id, "list_123");

    expect(mockClient.createTask).toHaveBeenCalledWith("list_123", {
      name: "Test task",
      description: undefined,
    });

    // Verify clickupTaskId was stored
    const updated = await db.select().from(tasks).where(eq(tasks.id, task.task!.id)).get();
    expect(updated!.clickupTaskId).toBe("cu_task_789");

    // Verify sync log
    const logs = await db.select().from(syncLog).all();
    expect(logs).toHaveLength(1);
    expect(logs[0].success).toBe(1);
  });

  it("should log error on sync failure without throwing", async () => {
    const sprint = await createSprint(db, {
      name: "Sprint 1",
      startDate: "2026-03-27",
      endDate: "2026-04-10",
    });
    const task = await createTask(db, sprint.sprint!.id, { title: "Test task" });

    vi.mocked(mockClient.createTask).mockRejectedValue(
      new Error("API rate limit exceeded")
    );

    await syncTaskToClickUp(db, mockClient, task.task!.id, "list_123");

    // Task should NOT have clickupTaskId
    const updated = await db.select().from(tasks).where(eq(tasks.id, task.task!.id)).get();
    expect(updated!.clickupTaskId).toBeNull();

    // Error should be logged
    const logs = await db.select().from(syncLog).all();
    expect(logs).toHaveLength(1);
    expect(logs[0].success).toBe(0);
    expect(logs[0].errorMessage).toContain("API rate limit exceeded");
  });

  it("should sync task status change to ClickUp", async () => {
    const sprint = await createSprint(db, {
      name: "Sprint 1",
      startDate: "2026-03-27",
      endDate: "2026-04-10",
    });
    const task = await createTask(db, sprint.sprint!.id, { title: "Test task" });

    // Set clickupTaskId
    await db.update(tasks)
      .set({ clickupTaskId: "cu_task_789" })
      .where(eq(tasks.id, task.task!.id));

    vi.mocked(mockClient.updateTask).mockResolvedValue({
      id: "cu_task_789",
      name: "Test task",
      status: { status: "In Progress" },
    });

    await syncTaskStatusToClickUp(db, mockClient, task.task!.id, "In Progress");

    expect(mockClient.updateTask).toHaveBeenCalledWith("cu_task_789", {
      status: "In Progress",
    });

    const logs = await db.select().from(syncLog).all();
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe("status_update");
    expect(logs[0].success).toBe(1);
  });

  it("should not call ClickUp for tasks without clickupTaskId", async () => {
    const sprint = await createSprint(db, {
      name: "Sprint 1",
      startDate: "2026-03-27",
      endDate: "2026-04-10",
    });
    const task = await createTask(db, sprint.sprint!.id, { title: "Test task" });

    await syncTaskStatusToClickUp(db, mockClient, task.task!.id, "In Progress");

    expect(mockClient.updateTask).not.toHaveBeenCalled();
  });

  it("should create a ClickUp list if one doesn't exist", async () => {
    vi.mocked(mockClient.createList).mockResolvedValue({
      id: "new_list_999",
      name: "Sprint 1",
    });

    const result = await ensureClickUpList(
      db,
      mockClient,
      "folder_456",
      "Sprint 1",
      "2026-03-27",
      "2026-04-10"
    );

    expect(result).toBe("new_list_999");
    expect(mockClient.createList).toHaveBeenCalledWith("folder_456", {
      name: "Sprint 1",
      start_date: expect.any(Number),
      due_date: expect.any(Number),
    });
  });
});
