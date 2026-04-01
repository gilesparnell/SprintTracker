"use server";

import { eq, sql, and } from "drizzle-orm";
import { tasks, notes, notifications, subTasks, userStories } from "@/lib/db/schema";
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

  // Tasks must belong to either a sprint or a story to avoid orphans
  if (!sprintId && !parsed.data.userStoryId) {
    return { success: false, errors: { userStoryId: ["Task must belong to a sprint or a story"] } };
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

export async function getUnlinkedTasks(db: DB) {
  // Tasks that have no parent story — split into two groups:
  // 1. Truly orphaned (no story AND no sprint) → shown in backlog
  // 2. Sprint-only (no story but in a sprint) → shown in sprint view, not here
  return db
    .select({
      id: tasks.id,
      sequenceNumber: tasks.sequenceNumber,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      assignedTo: tasks.assignedTo,
    })
    .from(tasks)
    .leftJoin(userStories, eq(tasks.userStoryId, userStories.id))
    .where(
      sql`(${tasks.userStoryId} IS NULL OR ${userStories.id} IS NULL) AND ${tasks.sprintId} IS NULL`
    )
    .orderBy(tasks.createdAt)
    .all();
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

export async function removeTaskFromSprint(
  db: DB,
  id: string
): Promise<{ success: boolean; error?: string }> {
  // Only allow removal if the task has a story (otherwise it becomes an orphan)
  const task = await db.select().from(tasks).where(eq(tasks.id, id)).get();
  if (!task) return { success: false, error: "Task not found" };
  if (!task.userStoryId) {
    return { success: false, error: "Cannot remove orphan task from sprint — move to backlog or delete instead" };
  }

  await db
    .update(tasks)
    .set({ sprintId: null, updatedAt: new Date().toISOString() })
    .where(eq(tasks.id, id));
  return { success: true };
}

const taskToStoryStatusMap: Record<string, string> = {
  open: "backlog",
  in_progress: "in_sprint",
  done: "done",
};

export async function convertTaskToStory(
  db: DB,
  taskId: string,
  userId: string,
  productId?: string,
  removeFromSprint?: boolean
): Promise<{ success: boolean; storyId?: string }> {
  const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) return { success: false };

  const storyId = uuid();
  const now = new Date().toISOString();
  const sequenceNumber = await getNextSequenceNumber(db, "story");

  // Get max sort order for new story
  const maxSort = await db
    .select({ max: sql<number>`COALESCE(MAX(${userStories.sortOrder}), 0)` })
    .from(userStories)
    .get();
  const sortOrder = (maxSort?.max ?? 0) + 1000;

  // Create story from task fields
  await db.insert(userStories).values({
    id: storyId,
    sequenceNumber,
    title: task.title,
    description: task.description,
    priority: task.priority as "low" | "medium" | "high" | "urgent",
    status: removeFromSprint ? "backlog" : ((taskToStoryStatusMap[task.status] ?? "backlog") as "backlog" | "in_sprint" | "done"),
    sortOrder,
    assignedTo: task.assignedTo,
    createdBy: userId,
    sprintId: removeFromSprint ? null : task.sprintId,
    customerId: task.customerId,
    productId: productId ?? null,
    createdAt: now,
    updatedAt: now,
  });

  // Re-parent task notes → story notes
  await db
    .update(notes)
    .set({ entityType: "story", entityId: storyId })
    .where(and(eq(notes.entityType, "task"), eq(notes.entityId, taskId)));

  // Re-parent task notifications → story notifications
  await db
    .update(notifications)
    .set({ entityType: "story", entityId: storyId })
    .where(and(eq(notifications.entityType, "task"), eq(notifications.entityId, taskId)));

  // Delete subtask notes and notifications
  const childSubTasks = await db
    .select({ id: subTasks.id })
    .from(subTasks)
    .where(eq(subTasks.parentTaskId, taskId))
    .all();

  for (const st of childSubTasks) {
    await db
      .delete(notes)
      .where(and(eq(notes.entityType, "subtask"), eq(notes.entityId, st.id)));
    await db
      .delete(notifications)
      .where(and(eq(notifications.entityType, "subtask"), eq(notifications.entityId, st.id)));
  }

  // Delete the original task (subtasks cascade via FK)
  await db.delete(tasks).where(eq(tasks.id, taskId));

  return { success: true, storyId };
}
