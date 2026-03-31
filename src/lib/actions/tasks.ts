"use server";

import { eq, sql, and } from "drizzle-orm";
import { tasks, notes, notifications, subTasks } from "@/lib/db/schema";
import { taskSchema, type TaskInput } from "@/lib/validators/task";
import { v4 as uuid } from "uuid";
import type { DB } from "@/lib/db/types";
import { parseZodErrors } from "@/lib/helpers/zod-errors";
import { getNextSequenceNumber } from "@/lib/helpers/sequence";
import { triggerNotification } from "@/lib/helpers/notify";

export type TaskResult = {
  success: boolean;
  task?: typeof tasks.$inferSelect;
  errors?: Record<string, string[]>;
  syncWarning?: string;
};

export async function createTask(
  db: DB,
  sprintId: string | null,
  input: Partial<TaskInput>,
  userId?: string
): Promise<TaskResult> {
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, errors: parseZodErrors(parsed.error) };
  }

  const id = uuid();
  const now = new Date().toISOString();
  const sequenceNumber = await getNextSequenceNumber(db, "task");

  await db.insert(tasks).values({
    id,
    sequenceNumber,
    sprintId: sprintId ?? null,
    userStoryId: parsed.data.userStoryId ?? null,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    status: parsed.data.status,
    priority: parsed.data.priority,
    assignedTo: parsed.data.assignedTo ?? null,
    createdBy: userId ?? null,
    customerId: parsed.data.customerId ?? null,
    createdAt: now,
    updatedAt: now,
  });

  const task = await db.select().from(tasks).where(eq(tasks.id, id)).get();

  // Notify assignee on creation
  if (task?.assignedTo && userId) {
    void triggerNotification(db, {
      type: "assignment",
      actorId: userId,
      targetUserId: task.assignedTo,
      entityType: "task",
      entityId: id,
      title: `You were assigned to T-${sequenceNumber}: ${parsed.data.title}`,
    });
  }

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

export async function getTaskById(db: DB, id: string) {
  return db.select().from(tasks).where(eq(tasks.id, id)).get();
}

export async function getTasksByStoryId(db: DB, storyId: string) {
  return db
    .select()
    .from(tasks)
    .where(eq(tasks.userStoryId, storyId))
    .orderBy(tasks.createdAt)
    .all();
}

export async function updateTask(
  db: DB,
  id: string,
  input: Partial<TaskInput>,
  actorId?: string
): Promise<TaskResult> {
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, errors: parseZodErrors(parsed.error) };
  }

  const oldTask = await db.select().from(tasks).where(eq(tasks.id, id)).get();

  const updateValues: Record<string, unknown> = {
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    status: parsed.data.status,
    priority: parsed.data.priority,
    updatedAt: new Date().toISOString(),
  };

  if (input.customerId !== undefined) {
    updateValues.customerId =
      input.customerId === "" || input.customerId === "__none__"
        ? null
        : input.customerId;
  }

  if (input.assignedTo !== undefined) {
    updateValues.assignedTo =
      input.assignedTo === "" || input.assignedTo === "__none__"
        ? null
        : input.assignedTo;
  }

  if (input.userStoryId !== undefined) {
    updateValues.userStoryId =
      input.userStoryId === "" || input.userStoryId === "__none__"
        ? null
        : input.userStoryId;
  }

  await db.update(tasks).set(updateValues).where(eq(tasks.id, id));

  const task = await db.select().from(tasks).where(eq(tasks.id, id)).get();

  // Notify on (re)assignment change
  if (task && actorId && task.assignedTo && task.assignedTo !== oldTask?.assignedTo) {
    const isNew = !oldTask?.assignedTo;
    void triggerNotification(db, {
      type: isNew ? "assignment" : "reassignment",
      actorId,
      targetUserId: task.assignedTo,
      entityType: "task",
      entityId: id,
      title: `You were ${isNew ? "assigned to" : "reassigned"} T-${task.sequenceNumber}: ${task.title}`,
    });
  }

  return { success: true, task };
}

export async function updateTaskStatus(
  db: DB,
  id: string,
  status: "open" | "in_progress" | "done"
): Promise<TaskResult> {
  await db
    .update(tasks)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(eq(tasks.id, id));

  const task = await db.select().from(tasks).where(eq(tasks.id, id)).get();
  return { success: true, task };
}

export async function deleteTask(
  db: DB,
  id: string
): Promise<{ success: boolean }> {
  // Clean up subtask polymorphic data first (subtasks themselves cascade via FK)
  const childSubTasks = await db
    .select({ id: subTasks.id })
    .from(subTasks)
    .where(eq(subTasks.parentTaskId, id))
    .all();

  for (const st of childSubTasks) {
    await db
      .delete(notes)
      .where(and(eq(notes.entityType, "subtask"), eq(notes.entityId, st.id)));
    await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.entityType, "subtask"),
          eq(notifications.entityId, st.id)
        )
      );
  }

  // Clean up task's own polymorphic data
  await db
    .delete(notes)
    .where(and(eq(notes.entityType, "task"), eq(notes.entityId, id)));
  await db
    .delete(notifications)
    .where(
      and(eq(notifications.entityType, "task"), eq(notifications.entityId, id))
    );

  // Delete task (subtasks cascade via FK)
  await db.delete(tasks).where(eq(tasks.id, id));
  return { success: true };
}
