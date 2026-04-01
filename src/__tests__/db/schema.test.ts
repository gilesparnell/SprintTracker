import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { eq, sql } from "drizzle-orm";
import { sprints, tasks, clickupConfig, syncLog, users, allowedEmails, sequences, userStories, subTasks, notes, notifications, folders, customers, tags, taskTags } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";

describe("Database Schema", () => {
  let db: ReturnType<typeof drizzle>;

  beforeAll(async () => {
    const client = createClient({ url: "file::memory:" });
    db = drizzle(client);
    await migrate(db, { migrationsFolder: "./drizzle" });
  });

  it("should create all four tables", async () => {
    const tables = await db.all<{ name: string }>(
      sql`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%'`
    );
    const tableNames = tables.map((t) => t.name).sort();
    expect(tableNames).toEqual(
      [
        "allowed_emails", "clickup_config", "customers", "folders",
        "notes", "notifications", "products", "sequences", "sprints", "sub_tasks",
        "sync_log", "tags", "task_tags", "tasks", "user_stories", "users",
      ].sort()
    );
  });

  it("should insert and query a sprint", async () => {
    const id = uuid();
    await db.insert(sprints).values({
      id,
      name: "Sprint 1",
      goal: "Ship MVP",
      startDate: "2026-03-27",
      endDate: "2026-04-10",
      status: "planning",
    });

    const result = await db.select().from(sprints).where(eq(sprints.id, id)).get();
    expect(result).toBeDefined();
    expect(result!.name).toBe("Sprint 1");
    expect(result!.goal).toBe("Ship MVP");
    expect(result!.status).toBe("planning");
  });

  it("should insert a task linked to a sprint", async () => {
    const sprintId = uuid();
    const taskId = uuid();

    await db.insert(sprints).values({
      id: sprintId,
      name: "Sprint 2",
      goal: "Test tasks",
      startDate: "2026-04-01",
      endDate: "2026-04-14",
      status: "active",
    });

    await db.insert(tasks).values({
      id: taskId,
      sprintId,
      title: "Build login page",
      description: "Create the login form",
      status: "open",
      priority: "high",
    });

    const result = await db.select().from(tasks).where(eq(tasks.sprintId, sprintId)).get();
    expect(result).toBeDefined();
    expect(result!.title).toBe("Build login page");
    expect(result!.status).toBe("open");
    expect(result!.clickupTaskId).toBeNull();
  });

  it("should insert a clickup config record", async () => {
    const id = uuid();
    await db.insert(clickupConfig).values({
      id,
      spaceId: "space_123",
      spaceName: "My Space",
      folderId: "folder_456",
      folderName: "Sprint Folder",
      statusMapping: JSON.stringify({
        open: "Open",
        in_progress: "In Progress",
        done: "Closed",
      }),
    });

    const result = await db.select().from(clickupConfig).where(eq(clickupConfig.id, id)).get();
    expect(result).toBeDefined();
    expect(result!.spaceName).toBe("My Space");
    expect(JSON.parse(result!.statusMapping!)).toEqual({
      open: "Open",
      in_progress: "In Progress",
      done: "Closed",
    });
  });

  it("should insert a sync log entry", async () => {
    const id = uuid();
    await db.insert(syncLog).values({
      id,
      taskId: "task_abc",
      action: "create",
      success: 1,
      errorMessage: null,
    });

    const result = await db.select().from(syncLog).where(eq(syncLog.id, id)).get();
    expect(result).toBeDefined();
    expect(result!.action).toBe("create");
    expect(result!.success).toBe(1);
  });
});
