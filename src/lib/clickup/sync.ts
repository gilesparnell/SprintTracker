import { eq } from "drizzle-orm";
import { tasks, syncLog } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import type { ClickUpClient } from "./client";
import type { LibSQLDatabase } from "drizzle-orm/libsql";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = LibSQLDatabase<any>;

export async function syncTaskToClickUp(
  db: DB,
  client: ClickUpClient,
  taskId: string,
  clickupListId: string
): Promise<void> {
  const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) return;

  try {
    const cuTask = await client.createTask(clickupListId, {
      name: task.title,
      description: task.description ?? undefined,
    });

    // Store the ClickUp task ID
    await db.update(tasks)
      .set({ clickupTaskId: cuTask.id, updatedAt: new Date().toISOString() })
      .where(eq(tasks.id, taskId));

    // Log success
    await db.insert(syncLog)
      .values({
        id: uuid(),
        taskId,
        action: "create",
        success: 1,
        errorMessage: null,
      });
  } catch (e) {
    // Log failure — never throw
    await db.insert(syncLog)
      .values({
        id: uuid(),
        taskId,
        action: "create",
        success: 0,
        errorMessage: e instanceof Error ? e.message : String(e),
      });
  }
}

export async function syncTaskStatusToClickUp(
  db: DB,
  client: ClickUpClient,
  taskId: string,
  clickupStatus: string
): Promise<void> {
  const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task || !task.clickupTaskId) return;

  try {
    await client.updateTask(task.clickupTaskId, {
      status: clickupStatus,
    });

    await db.insert(syncLog)
      .values({
        id: uuid(),
        taskId,
        action: "status_update",
        success: 1,
        errorMessage: null,
      });
  } catch (e) {
    await db.insert(syncLog)
      .values({
        id: uuid(),
        taskId,
        action: "status_update",
        success: 0,
        errorMessage: e instanceof Error ? e.message : String(e),
      });
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
