import { eq } from "drizzle-orm";
import { tasks, syncLog } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import type { ClickUpClient } from "./client";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

type DB = BetterSQLite3Database<Record<string, never>>;

export async function syncTaskToClickUp(
  db: DB,
  client: ClickUpClient,
  taskId: string,
  clickupListId: string
): Promise<void> {
  const task = db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) return;

  try {
    const cuTask = await client.createTask(clickupListId, {
      name: task.title,
      description: task.description,
    });

    // Store the ClickUp task ID
    db.update(tasks)
      .set({ clickupTaskId: cuTask.id, updatedAt: new Date().toISOString() })
      .where(eq(tasks.id, taskId))
      .run();

    // Log success
    db.insert(syncLog)
      .values({
        id: uuid(),
        taskId,
        action: "create",
        success: 1,
        errorMessage: null,
      })
      .run();
  } catch (e) {
    // Log failure — never throw
    db.insert(syncLog)
      .values({
        id: uuid(),
        taskId,
        action: "create",
        success: 0,
        errorMessage: e instanceof Error ? e.message : String(e),
      })
      .run();
  }
}

export async function syncTaskStatusToClickUp(
  db: DB,
  client: ClickUpClient,
  taskId: string,
  clickupStatus: string
): Promise<void> {
  const task = db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task || !task.clickupTaskId) return;

  try {
    await client.updateTask(task.clickupTaskId, {
      status: clickupStatus,
    });

    db.insert(syncLog)
      .values({
        id: uuid(),
        taskId,
        action: "status_update",
        success: 1,
        errorMessage: null,
      })
      .run();
  } catch (e) {
    db.insert(syncLog)
      .values({
        id: uuid(),
        taskId,
        action: "status_update",
        success: 0,
        errorMessage: e instanceof Error ? e.message : String(e),
      })
      .run();
  }
}

export async function ensureClickUpList(
  db: DB,
  client: ClickUpClient,
  folderId: string,
  sprintName: string,
  startDate: string,
  endDate: string
): Promise<string> {
  const list = await client.createList(folderId, {
    name: sprintName,
    start_date: new Date(startDate).getTime(),
    due_date: new Date(endDate).getTime(),
  });

  return list.id;
}
