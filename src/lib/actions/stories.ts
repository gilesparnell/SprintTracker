"use server";

import { eq, sql, and, desc, asc } from "drizzle-orm";
import { userStories, tasks, notes, notifications } from "@/lib/db/schema";
import {
  createStorySchema,
  updateStorySchema,
  type CreateStoryInput,
  type UpdateStoryInput,
} from "@/lib/validators/story";
import { v4 as uuid } from "uuid";
import type { DB } from "@/lib/db/types";
import type { ActionResult } from "@/lib/types";
import { parseZodErrors } from "@/lib/helpers/zod-errors";
import { getNextSequenceNumber } from "@/lib/helpers/sequence";

type Story = typeof userStories.$inferSelect;

export type StoryWithTaskCount = Story & { taskCount: number };

export async function createStory(
  db: DB,
  userId: string,
  input: Partial<CreateStoryInput>
): Promise<ActionResult<Story>> {
  const parsed = createStorySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, errors: parseZodErrors(parsed.error) };
  }

  const id = uuid();
  const now = new Date().toISOString();
  const sequenceNumber = await getNextSequenceNumber(db, "story");

  // Get max sort order and add gap
  const maxSort = await db
    .select({ max: sql<number>`COALESCE(MAX(${userStories.sortOrder}), 0)` })
    .from(userStories)
    .get();
  const sortOrder = (maxSort?.max ?? 0) + 1000;

  await db.insert(userStories).values({
    id,
    sequenceNumber,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    priority: parsed.data.priority,
    status: "backlog",
    sortOrder,
    assignedTo: parsed.data.assignedTo ?? null,
    createdBy: userId,
    customerId: parsed.data.customerId ?? null,
    createdAt: now,
    updatedAt: now,
  });

  const story = await db
    .select()
    .from(userStories)
    .where(eq(userStories.id, id))
    .get();

  return { success: true, data: story! };
}

export async function updateStory(
  db: DB,
  userId: string,
  id: string,
  input: Partial<UpdateStoryInput>
): Promise<ActionResult<Story>> {
  const parsed = updateStorySchema.safeParse(input);
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
  if (parsed.data.customerId !== undefined) {
    updateValues.customerId = parsed.data.customerId || null;
  }

  await db
    .update(userStories)
    .set(updateValues)
    .where(eq(userStories.id, id));

  const story = await db
    .select()
    .from(userStories)
    .where(eq(userStories.id, id))
    .get();

  return { success: true, data: story! };
}

export async function deleteStory(
  db: DB,
  userId: string,
  id: string
): Promise<ActionResult<{ deleted: true }>> {
  // Application-level cascade for polymorphic tables
  await db
    .delete(notes)
    .where(and(eq(notes.entityType, "story"), eq(notes.entityId, id)));
  await db
    .delete(notifications)
    .where(
      and(eq(notifications.entityType, "story"), eq(notifications.entityId, id))
    );

  await db.delete(userStories).where(eq(userStories.id, id));
  return { success: true, data: { deleted: true } };
}

export async function getStories(
  db: DB,
  filters?: {
    status?: string;
    assignedTo?: string;
    customerId?: string;
  }
): Promise<StoryWithTaskCount[]> {
  // Build WHERE conditions
  const conditions = [];
  if (filters?.status) {
    conditions.push(eq(userStories.status, filters.status as "backlog" | "in_sprint" | "done"));
  }
  if (filters?.assignedTo) {
    conditions.push(eq(userStories.assignedTo, filters.assignedTo));
  }
  if (filters?.customerId) {
    conditions.push(eq(userStories.customerId, filters.customerId));
  }

  const whereClause =
    conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: userStories.id,
      sequenceNumber: userStories.sequenceNumber,
      title: userStories.title,
      description: userStories.description,
      priority: userStories.priority,
      status: userStories.status,
      sortOrder: userStories.sortOrder,
      assignedTo: userStories.assignedTo,
      createdBy: userStories.createdBy,
      sprintId: userStories.sprintId,
      customerId: userStories.customerId,
      createdAt: userStories.createdAt,
      updatedAt: userStories.updatedAt,
      taskCount: sql<number>`COUNT(${tasks.id})`.as("task_count"),
    })
    .from(userStories)
    .leftJoin(tasks, eq(tasks.userStoryId, userStories.id))
    .where(whereClause)
    .groupBy(userStories.id)
    .orderBy(asc(userStories.sortOrder))
    .all();

  return rows;
}

export async function getStoryById(db: DB, id: string) {
  return db.select().from(userStories).where(eq(userStories.id, id)).get();
}

export async function moveStoryToSprint(
  db: DB,
  userId: string,
  storyId: string,
  sprintId: string
): Promise<ActionResult<Story>> {
  const story = await db
    .select()
    .from(userStories)
    .where(eq(userStories.id, storyId))
    .get();

  if (!story) {
    return { success: false, errors: { storyId: ["Story not found"] } };
  }

  // Transactional: update story status + bulk update child tasks
  await db.transaction(async (tx) => {
    await tx
      .update(userStories)
      .set({
        status: "in_sprint",
        sprintId,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userStories.id, storyId));

    // Bulk update all child tasks with one statement
    await tx
      .update(tasks)
      .set({ sprintId })
      .where(eq(tasks.userStoryId, storyId));
  });

  const updated = await db
    .select()
    .from(userStories)
    .where(eq(userStories.id, storyId))
    .get();

  return { success: true, data: updated! };
}

export async function moveStoryBackToBacklog(
  db: DB,
  userId: string,
  storyId: string
): Promise<ActionResult<Story>> {
  await db.transaction(async (tx) => {
    await tx
      .update(userStories)
      .set({
        status: "backlog",
        sprintId: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userStories.id, storyId));

    // Only clear sprintId on non-done child tasks
    await tx
      .update(tasks)
      .set({ sprintId: null })
      .where(
        and(
          eq(tasks.userStoryId, storyId),
          sql`${tasks.status} != 'done'`
        )
      );
  });

  const updated = await db
    .select()
    .from(userStories)
    .where(eq(userStories.id, storyId))
    .get();

  return { success: true, data: updated! };
}

export async function reorderStory(
  db: DB,
  userId: string,
  storyId: string,
  newSortOrder: number
): Promise<ActionResult<{ reindexed: boolean }>> {
  // Check if gap is too small (< 1) — if so, re-index all backlog stories
  const stories = await db
    .select({ id: userStories.id, sortOrder: userStories.sortOrder })
    .from(userStories)
    .where(eq(userStories.status, "backlog"))
    .orderBy(asc(userStories.sortOrder))
    .all();

  let reindexed = false;

  // Check if any adjacent items have a gap < 1 after this move
  if (newSortOrder % 1 !== 0 || newSortOrder < 1) {
    // Re-index all with gaps of 1000
    reindexed = true;
    for (let i = 0; i < stories.length; i++) {
      const targetOrder = (i + 1) * 1000;
      if (stories[i].id === storyId) {
        // Skip the moved story — it will be set separately
        continue;
      }
      await db
        .update(userStories)
        .set({ sortOrder: targetOrder })
        .where(eq(userStories.id, stories[i].id));
    }
  }

  // Set the moved story's sort order
  await db
    .update(userStories)
    .set({ sortOrder: newSortOrder, updatedAt: new Date().toISOString() })
    .where(eq(userStories.id, storyId));

  return { success: true, data: { reindexed } };
}
