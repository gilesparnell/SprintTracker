"use server";

import { eq, and, inArray } from "drizzle-orm";
import { tags, taskTags, tasks } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import type { DB } from "@/lib/db/types";

export async function getAllTags(db: DB) {
  return db.select().from(tags).orderBy(tags.name).all();
}

export async function createTag(db: DB, name: string, color?: string) {
  const id = uuid();
  await db.insert(tags).values({
    id,
    name: name.trim(),
    color: color ?? "#6b7280",
    createdAt: new Date().toISOString(),
  });
  return db.select().from(tags).where(eq(tags.id, id)).get();
}

export async function renameTag(db: DB, id: string, name: string, color?: string) {
  const updates: { name: string; color?: string } = { name: name.trim() };
  if (color) updates.color = color;
  await db.update(tags).set(updates).where(eq(tags.id, id));
  return db.select().from(tags).where(eq(tags.id, id)).get();
}

export async function getTasksForTag(db: DB, tagId: string) {
  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      sprintId: tasks.sprintId,
    })
    .from(taskTags)
    .innerJoin(tasks, eq(taskTags.taskId, tasks.id))
    .where(eq(taskTags.tagId, tagId))
    .all();
  return rows;
}

export async function deleteTag(db: DB, id: string) {
  await db.delete(taskTags).where(eq(taskTags.tagId, id));
  await db.delete(tags).where(eq(tags.id, id));
  return { success: true };
}

export async function getTagsForTask(db: DB, taskId: string) {
  const rows = await db
    .select({ id: tags.id, name: tags.name, color: tags.color })
    .from(taskTags)
    .innerJoin(tags, eq(taskTags.tagId, tags.id))
    .where(eq(taskTags.taskId, taskId))
    .all();
  return rows;
}

export async function getTagsForTasks(db: DB, taskIds: string[]) {
  if (taskIds.length === 0) return {};
  const rows = await db
    .select({
      taskId: taskTags.taskId,
      tagId: tags.id,
      tagName: tags.name,
      tagColor: tags.color,
    })
    .from(taskTags)
    .innerJoin(tags, eq(taskTags.tagId, tags.id))
    .where(inArray(taskTags.taskId, taskIds))
    .all();

  const map: Record<string, { id: string; name: string; color: string }[]> = {};
  for (const row of rows) {
    if (!map[row.taskId]) map[row.taskId] = [];
    map[row.taskId].push({ id: row.tagId, name: row.tagName, color: row.tagColor });
  }
  return map;
}

export async function setTaskTags(db: DB, taskId: string, tagIds: string[]) {
  await db.delete(taskTags).where(eq(taskTags.taskId, taskId));
  if (tagIds.length > 0) {
    await db.insert(taskTags).values(
      tagIds.map((tagId) => ({ taskId, tagId }))
    );
  }
  return { success: true };
}

export async function addTagToTask(db: DB, taskId: string, tagId: string) {
  const existing = await db
    .select()
    .from(taskTags)
    .where(and(eq(taskTags.taskId, taskId), eq(taskTags.tagId, tagId)))
    .get();
  if (!existing) {
    await db.insert(taskTags).values({ taskId, tagId });
  }
  return { success: true };
}

export async function removeTagFromTask(db: DB, taskId: string, tagId: string) {
  await db
    .delete(taskTags)
    .where(and(eq(taskTags.taskId, taskId), eq(taskTags.tagId, tagId)));
  return { success: true };
}
