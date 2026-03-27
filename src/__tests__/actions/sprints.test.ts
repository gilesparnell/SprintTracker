import { describe, it, expect, beforeEach, afterAll, beforeAll } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import { sprints, tasks } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import {
  createSprint,
  getSprintById,
  getAllSprints,
  updateSprint,
  deleteSprint,
} from "@/lib/actions/sprints";

describe("Sprint Actions", () => {
  let sqlite: InstanceType<typeof Database>;
  let db: ReturnType<typeof drizzle>;

  beforeAll(() => {
    sqlite = new Database(":memory:");
    db = drizzle(sqlite);
    migrate(db, { migrationsFolder: "./drizzle" });
  });

  beforeEach(() => {
    db.delete(tasks).run();
    db.delete(sprints).run();
  });

  afterAll(() => {
    sqlite.close();
  });

  it("should create a sprint with valid data", async () => {
    const result = await createSprint(db, {
      name: "Sprint 1",
      goal: "Ship MVP",
      startDate: "2026-03-27",
      endDate: "2026-04-10",
      status: "planning",
    });

    expect(result.success).toBe(true);
    expect(result.sprint).toBeDefined();
    expect(result.sprint!.name).toBe("Sprint 1");
    expect(result.sprint!.goal).toBe("Ship MVP");
  });

  it("should return validation error for missing name", async () => {
    const result = await createSprint(db, {
      name: "",
      startDate: "2026-03-27",
      endDate: "2026-04-10",
    });

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
  });

  it("should get a sprint by id", async () => {
    const created = await createSprint(db, {
      name: "Sprint 1",
      startDate: "2026-03-27",
      endDate: "2026-04-10",
    });

    const sprint = await getSprintById(db, created.sprint!.id);
    expect(sprint).toBeDefined();
    expect(sprint!.name).toBe("Sprint 1");
  });

  it("should list all sprints sorted by start date", async () => {
    await createSprint(db, {
      name: "Sprint B",
      startDate: "2026-04-15",
      endDate: "2026-04-28",
    });
    await createSprint(db, {
      name: "Sprint A",
      startDate: "2026-03-01",
      endDate: "2026-03-14",
    });

    const all = await getAllSprints(db);
    expect(all).toHaveLength(2);
    expect(all[0].name).toBe("Sprint A");
    expect(all[1].name).toBe("Sprint B");
  });

  it("should update a sprint", async () => {
    const created = await createSprint(db, {
      name: "Sprint 1",
      startDate: "2026-03-27",
      endDate: "2026-04-10",
    });

    const result = await updateSprint(db, created.sprint!.id, {
      name: "Sprint 1 - Updated",
      goal: "New goal",
      startDate: "2026-03-27",
      endDate: "2026-04-10",
      status: "active",
    });

    expect(result.success).toBe(true);
    const updated = await getSprintById(db, created.sprint!.id);
    expect(updated!.name).toBe("Sprint 1 - Updated");
    expect(updated!.goal).toBe("New goal");
    expect(updated!.status).toBe("active");
  });

  it("should delete a sprint and cascade delete its tasks", async () => {
    const created = await createSprint(db, {
      name: "Sprint 1",
      startDate: "2026-03-27",
      endDate: "2026-04-10",
    });

    // Add a task to the sprint
    const taskId = uuid();
    db.insert(tasks)
      .values({
        id: taskId,
        sprintId: created.sprint!.id,
        title: "Test task",
        status: "open",
        priority: "medium",
      })
      .run();

    const result = await deleteSprint(db, created.sprint!.id);
    expect(result.success).toBe(true);

    const sprint = await getSprintById(db, created.sprint!.id);
    expect(sprint).toBeUndefined();

    const task = db.select().from(tasks).where(eq(tasks.id, taskId)).get();
    expect(task).toBeUndefined();
  });
});
