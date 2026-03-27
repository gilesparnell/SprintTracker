import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import { sprints, tasks, clickupConfig, syncLog } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";

describe("Database Schema", () => {
  let sqlite: InstanceType<typeof Database>;
  let db: ReturnType<typeof drizzle>;

  beforeAll(() => {
    sqlite = new Database(":memory:");
    db = drizzle(sqlite);
    migrate(db, { migrationsFolder: "./drizzle" });
  });

  afterAll(() => {
    sqlite.close();
  });

  it("should create all four tables", () => {
    const tables = sqlite
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%'"
      )
      .all() as { name: string }[];
    const tableNames = tables.map((t) => t.name).sort();
    expect(tableNames).toEqual(
      ["clickup_config", "sprints", "sync_log", "tasks"].sort()
    );
  });

  it("should insert and query a sprint", () => {
    const id = uuid();
    db.insert(sprints).values({
      id,
      name: "Sprint 1",
      goal: "Ship MVP",
      startDate: "2026-03-27",
      endDate: "2026-04-10",
      status: "planning",
    }).run();

    const result = db.select().from(sprints).where(eq(sprints.id, id)).get();
    expect(result).toBeDefined();
    expect(result!.name).toBe("Sprint 1");
    expect(result!.goal).toBe("Ship MVP");
    expect(result!.status).toBe("planning");
  });

  it("should insert a task linked to a sprint", () => {
    const sprintId = uuid();
    const taskId = uuid();

    db.insert(sprints).values({
      id: sprintId,
      name: "Sprint 2",
      goal: "Test tasks",
      startDate: "2026-04-01",
      endDate: "2026-04-14",
      status: "active",
    }).run();

    db.insert(tasks).values({
      id: taskId,
      sprintId,
      title: "Build login page",
      description: "Create the login form",
      status: "open",
      priority: "high",
    }).run();

    const result = db.select().from(tasks).where(eq(tasks.sprintId, sprintId)).get();
    expect(result).toBeDefined();
    expect(result!.title).toBe("Build login page");
    expect(result!.status).toBe("open");
    expect(result!.clickupTaskId).toBeNull();
  });

  it("should insert a clickup config record", () => {
    const id = uuid();
    db.insert(clickupConfig).values({
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
    }).run();

    const result = db.select().from(clickupConfig).where(eq(clickupConfig.id, id)).get();
    expect(result).toBeDefined();
    expect(result!.spaceName).toBe("My Space");
    expect(JSON.parse(result!.statusMapping!)).toEqual({
      open: "Open",
      in_progress: "In Progress",
      done: "Closed",
    });
  });

  it("should insert a sync log entry", () => {
    const id = uuid();
    db.insert(syncLog).values({
      id,
      taskId: "task_abc",
      action: "create",
      success: 1,
      errorMessage: null,
    }).run();

    const result = db.select().from(syncLog).where(eq(syncLog.id, id)).get();
    expect(result).toBeDefined();
    expect(result!.action).toBe("create");
    expect(result!.success).toBe(1);
  });
});
