"use server";

import { eq, sql } from "drizzle-orm";
import { tasks } from "@/lib/db/schema";
import { taskSchema, type TaskInput } from "@/lib/validators/task";
import { v4 as uuid } from "uuid";
import type { LibSQLDatabase } from "drizzle-orm/libsql";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = LibSQLDatabase<any>;

export type TaskResult = {
  success: boolean;
  task?: typeof tasks.$inferSelect;
  errors?: Record<string, string[]>;
  syncWarning?: string;
};

export async function createTask(
  db: DB,
  sprintId: string,
  input: Partial<TaskInput>
): Promise<TaskResult> {
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".");
      if (!fieldErrors[path]) fieldErrors[path] = [];
      fieldErrors[path].push(issue.message);
    }
    return { success: false, errors: fieldErrors };
  }

  const id = uuid();
  const now = new Date().toISOString();

  await db.insert(tasks)
    .values({
      id,
      sprintId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      status: parsed.data.status,
      priority: parsed.data.priority,
      createdAt: now,
      updatedAt: now,
    });

  const task = await db.select().from(tasks).where(eq(tasks.id, id)).get();
  return { success: true, task };
}

export async function getTasksBySprintId(db: DB, sprintId: string) {
  return db
    .select()
    .from(tasks)
    .where(eq(tasks.sprintId, sprintId))
    .orderBy(
      sql`CASE ${tasks.status} WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 WHEN 'done' THEN 2 END`,
      tasks.createdAt
    )
    .all();
}

export async function updateTask(
  db: DB,
  id: string,
  input: Partial<TaskInput>
): Promise<TaskResult> {
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".");
      if (!fieldErrors[path]) fieldErrors[path] = [];
      fieldErrors[path].push(issue.message);
    }
    return { success: false, errors: fieldErrors };
  }

  await db.update(tasks)
    .set({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      status: parsed.data.status,
      priority: parsed.data.priority,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(tasks.id, id));

  const task = await db.select().from(tasks).where(eq(tasks.id, id)).get();
  return { success: true, task };
}

export async function updateTaskStatus(
  db: DB,
  id: string,
  status: "open" | "in_progress" | "done"
): Promise<TaskResult> {
  await db.update(tasks)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(eq(tasks.id, id));

  const task = await db.select().from(tasks).where(eq(tasks.id, id)).get();
  return { success: true, task };
}

export async function deleteTask(db: DB, id: string): Promise<{ success: boolean }> {
  await db.delete(tasks).where(eq(tasks.id, id));
  return { success: true };
}
