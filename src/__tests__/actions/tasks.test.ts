import { describe, it, expect, beforeEach, afterAll, beforeAll } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import { sprints, tasks } from "@/lib/db/schema";
import { createSprint } from "@/lib/actions/sprints";
import {
  createTask,
  getTasksBySprintId,
  updateTask,
  updateTaskStatus,
  deleteTask,
} from "@/lib/actions/tasks";

describe("Task Actions", () => {
  let sqlite: InstanceType<typeof Database>;
  let db: ReturnType<typeof drizzle>;
  let testSprintId: string;

  beforeAll(() => {
    sqlite = new Database(":memory:");
    db = drizzle(sqlite);
    migrate(db, { migrationsFolder: "./drizzle" });
  });

  beforeEach(() => {
    db.delete(tasks).run();
    db.delete(sprints).run();

    const result = createSprint(db, {
      name: "Test Sprint",
      startDate: "2026-03-27",
      endDate: "2026-04-10",
    });
    testSprintId = result.sprint!.id;
  });

  afterAll(() => {
    sqlite.close();
  });

  it("should create a task with valid data", () => {
    const result = createTask(db, testSprintId, {
      title: "Build login page",
      description: "Create the login form",
      status: "open",
      priority: "high",
    });

    expect(result.success).toBe(true);
    expect(result.task).toBeDefined();
    expect(result.task!.title).toBe("Build login page");
    expect(result.task!.sprintId).toBe(testSprintId);
  });

  it("should return validation error for missing title", () => {
    const result = createTask(db, testSprintId, {
      title: "",
    });

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
  });

  it("should list tasks for a sprint ordered by status then creation date", () => {
    createTask(db, testSprintId, { title: "Task A", status: "done" });
    createTask(db, testSprintId, { title: "Task B", status: "open" });
    createTask(db, testSprintId, { title: "Task C", status: "in_progress" });

    const taskList = getTasksBySprintId(db, testSprintId);
    expect(taskList).toHaveLength(3);
    // open first, then in_progress, then done
    expect(taskList[0].status).toBe("open");
    expect(taskList[1].status).toBe("in_progress");
    expect(taskList[2].status).toBe("done");
  });

  it("should update a task", () => {
    const created = createTask(db, testSprintId, { title: "Original" });

    const result = updateTask(db, created.task!.id, {
      title: "Updated Title",
      description: "New description",
      priority: "urgent",
    });

    expect(result.success).toBe(true);
    expect(result.task!.title).toBe("Updated Title");
    expect(result.task!.description).toBe("New description");
    expect(result.task!.priority).toBe("urgent");
  });

  it("should update task status only", () => {
    const created = createTask(db, testSprintId, {
      title: "My task",
      status: "open",
    });

    const result = updateTaskStatus(db, created.task!.id, "in_progress");
    expect(result.success).toBe(true);

    const taskList = getTasksBySprintId(db, testSprintId);
    const updated = taskList.find((t) => t.id === created.task!.id);
    expect(updated!.status).toBe("in_progress");
  });

  it("should delete a task", () => {
    const created = createTask(db, testSprintId, { title: "To delete" });

    const result = deleteTask(db, created.task!.id);
    expect(result.success).toBe(true);

    const remaining = getTasksBySprintId(db, testSprintId);
    expect(remaining).toHaveLength(0);
  });
});
