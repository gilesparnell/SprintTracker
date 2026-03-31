"use server";

import { eq, and } from "drizzle-orm";
import { subTasks, tasks, notes, notifications } from "@/lib/db/schema";
import {
  createSubTaskSchema,
  updateSubTaskSchema,
  type CreateSubTaskInput,
  type UpdateSubTaskInput,
} from "@/lib/validators/subtask";
import { v4 as uuid } from "uuid";
import type { DB } from "@/lib/db/types";
import type { ActionResult } from "@/lib/types";
import { parseZodErrors } from "@/lib/helpers/zod-errors";
import { getNextSequenceNumber } from "@/lib/helpers/sequence";

type SubTask = typeof subTasks.$inferSelect;

export async function createSubTask(
  db: DB,
  userId: string,
  parentTaskId: string,
  input: Partial<CreateSubTaskInput>
): Promise<ActionResult<SubTask>> {
  const parsed = createSubTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, errors: parseZodErrors(parsed.error) };
  }

  // Default assignee to parent task's assignee (R24)
  let assignedTo = parsed.data.assignedTo ?? null;
  if (!assignedTo) {
    const parent = await db
      .select({ assignedTo: tasks.assignedTo })
      .from(tasks)
      .where(eq(tasks.id, parentTaskId))
      .get();
    assignedTo = parent?.assignedTo ?? null;
  }

  const id = uuid();
  const now = new Date().toISOString();
  const sequenceNumber = await getNextSequenceNumber(db, "subtask");

  await db.insert(subTasks).values({
    id,
    sequenceNumber,
    parentTaskId,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    status: "open",
    priority: parsed.data.priority,
    assignedTo,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  });

  const subtask = await db
    .select()
    .from(subTasks)
    .where(eq(subTasks.id, id))
    .get();

  return { success: true, data: subtask! };
}

export async function updateSubTask(
  db: DB,
  userId: string,
  id: string,
  input: Partial<UpdateSubTaskInput>
): Promise<ActionResult<SubTask>> {
  const parsed = updateSubTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, errors: parseZodErrors(parsed.error) };
  }

  const updateValues: Record<string, unknown> = {
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    priority: parsed.data.priority,
    updatedAt: new Date().toISOString(),
  };

  if (parsed.data.status !== undefined) {
    updateValues.status = parsed.data.status;
  }
  if (parsed.data.assignedTo !== undefined) {
    updateValues.assignedTo = parsed.data.assignedTo || null;
  }

  await db
    .update(subTasks)
    .set(updateValues)
    .where(eq(subTasks.id, id));

  const subtask = await db
    .select()
    .from(subTasks)
    .where(eq(subTasks.id, id))
    .get();

  return { success: true, data: subtask! };
}

export async function deleteSubTask(
  db: DB,
  userId: string,
  id: string
): Promise<ActionResult<{ deleted: true }>> {
  // Application-level cascade for polymorphic tables
  await db
    .delete(notes)
    .where(and(eq(notes.entityType, "subtask"), eq(notes.entityId, id)));
  await db
    .delete(notifications)
    .where(
      and(
        eq(notifications.entityType, "subtask"),
        eq(notifications.entityId, id)
      )
    );

  await db.delete(subTasks).where(eq(subTasks.id, id));
  return { success: true, data: { deleted: true } };
}

export async function getSubTasksForTask(db: DB, parentTaskId: string) {
  return db
    .select()
    .from(subTasks)
    .where(eq(subTasks.parentTaskId, parentTaskId))
    .orderBy(subTasks.createdAt)
    .all();
}

export async function moveSubTask(
  db: DB,
  userId: string,
  subTaskId: string,
  newParentTaskId: string
): Promise<ActionResult<SubTask>> {
  // Keep current assignee when moving (R26)
  await db
    .update(subTasks)
    .set({
      parentTaskId: newParentTaskId,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(subTasks.id, subTaskId));

  const subtask = await db
    .select()
    .from(subTasks)
    .where(eq(subTasks.id, subTaskId))
    .get();

  return { success: true, data: subtask! };
}

export async function updateSubTaskStatus(
  db: DB,
  userId: string,
  id: string,
  status: "open" | "in_progress" | "done"
): Promise<ActionResult<SubTask>> {
  await db
    .update(subTasks)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(eq(subTasks.id, id));

  const subtask = await db
    .select()
    .from(subTasks)
    .where(eq(subTasks.id, id))
    .get();

  return { success: true, data: subtask! };
}
