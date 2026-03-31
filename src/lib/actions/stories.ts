"use server";

import { eq, sql, and, desc, asc } from "drizzle-orm";
import { userStories, tasks, subTasks, notes, notifications } from "@/lib/db/schema";
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
import { triggerNotification } from "@/lib/helpers/notify";

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

  // Get max sort order within same product and add gap
  const sortConditions = parsed.data.productId
    ? and(eq(userStories.status, "backlog"), eq(userStories.productId, parsed.data.productId))
    : eq(userStories.status, "backlog");
  const maxSort = await db
    .select({ max: sql<number>`COALESCE(MAX(${userStories.sortOrder}), 0)` })
    .from(userStories)
    .where(sortConditions)
    .get();
  const sortOrder = (maxSort?.max ?? 0) + 1000;

  await db.insert(userStories).values({
    id,
    sequenceNumber,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    type: parsed.data.type,
    priority: parsed.data.priority,
    status: parsed.data.status,
    sortOrder,
    productId: parsed.data.productId,
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

  // Notify assignee on creation
  if (story?.assignedTo && story.assignedTo !== userId) {
    void triggerNotification(db, {
      type: "assignment",
      actorId: userId,
      targetUserId: story.assignedTo,
      entityType: "story",
      entityId: id,
      title: `You were assigned to S-${sequenceNumber}: ${parsed.data.title}`,
    });
  }

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

  const oldStory = await db
    .select()
    .from(userStories)
    .where(eq(userStories.id, id))
    .get();

  const updateValues: Record<string, unknown> = {
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    priority: parsed.data.priority,
    updatedAt: new Date().toISOString(),
  };

  if (parsed.data.type !== undefined) {
    updateValues.type = parsed.data.type;
  }
  if (parsed.data.status !== undefined) {
    updateValues.status = parsed.data.status;
  }
  if (parsed.data.productId !== undefined) {
    updateValues.productId = parsed.data.productId || null;
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

  // Notify on (re)assignment change
  if (story && userId && story.assignedTo && story.assignedTo !== oldStory?.assignedTo) {
    const isNew = !oldStory?.assignedTo;
    void triggerNotification(db, {
      type: isNew ? "assignment" : "reassignment",
      actorId: userId,
      targetUserId: story.assignedTo,
      entityType: "story",
      entityId: id,
      title: `You were ${isNew ? "assigned to" : "reassigned"} S-${story.sequenceNumber}: ${story.title}`,
    });
  }

  return { success: true, data: story! };
}

export type DeleteStoryMode = "cascade" | "unlink" | "reassign";

export async function deleteStory(
  db: DB,
  userId: string,
  id: string,
  mode: DeleteStoryMode = "unlink",
  reassignStoryId?: string
): Promise<ActionResult<{ deleted: true }>> {
  // Get child tasks for this story
  const childTasks = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(eq(tasks.userStoryId, id))
    .all();

  if (mode === "cascade") {
    // Delete all child tasks, their subtasks, notes, and notifications
    for (const task of childTasks) {
      // Clean up subtask polymorphic data
      const childSubTasks = await db
        .select({ id: subTasks.id })
        .from(subTasks)
        .where(eq(subTasks.parentTaskId, task.id))
        .all();

      for (const st of childSubTasks) {
        await db.delete(notes).where(and(eq(notes.entityType, "subtask"), eq(notes.entityId, st.id)));
        await db.delete(notifications).where(and(eq(notifications.entityType, "subtask"), eq(notifications.entityId, st.id)));
      }

      // Clean up task polymorphic data
      await db.delete(notes).where(and(eq(notes.entityType, "task"), eq(notes.entityId, task.id)));
      await db.delete(notifications).where(and(eq(notifications.entityType, "task"), eq(notifications.entityId, task.id)));

      // Delete task (subtasks + taskTags cascade via FK)
      await db.delete(tasks).where(eq(tasks.id, task.id));
    }
  } else if (mode === "reassign" && reassignStoryId) {
    // Move all tasks to a different story
    await db
      .update(tasks)
      .set({ userStoryId: reassignStoryId, updatedAt: new Date().toISOString() })
      .where(eq(tasks.userStoryId, id));
  } else {
    // mode === "unlink": detach tasks (set userStoryId to null)
    await db
      .update(tasks)
      .set({ userStoryId: null, updatedAt: new Date().toISOString() })
      .where(eq(tasks.userStoryId, id));
  }

  // Clean up story's own polymorphic data
  await db.delete(notes).where(and(eq(notes.entityType, "story"), eq(notes.entityId, id)));
  await db.delete(notifications).where(and(eq(notifications.entityType, "story"), eq(notifications.entityId, id)));

  // Delete the story
  await db.delete(userStories).where(eq(userStories.id, id));
  return { success: true, data: { deleted: true } };
}

export async function getStories(
  db: DB,
  filters?: {
    status?: string;
    assignedTo?: string;
    customerId?: string;
    sprintId?: string;
    productId?: string;
    type?: string;
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
  if (filters?.sprintId) {
    conditions.push(eq(userStories.sprintId, filters.sprintId));
  }
  if (filters?.productId) {
    conditions.push(eq(userStories.productId, filters.productId));
  }
  if (filters?.type) {
    conditions.push(eq(userStories.type, filters.type as "user_story" | "feature_request" | "bug"));
  }

  const whereClause =
    conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: userStories.id,
      sequenceNumber: userStories.sequenceNumber,
      title: userStories.title,
      description: userStories.description,
      type: userStories.type,
      priority: userStories.priority,
      status: userStories.status,
      sortOrder: userStories.sortOrder,
      productId: userStories.productId,
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
  // Scope re-indexing to same product
  const story = await db.select({ productId: userStories.productId }).from(userStories).where(eq(userStories.id, storyId)).get();
  const productConditions = [eq(userStories.status, "backlog")];
  if (story?.productId) {
    productConditions.push(eq(userStories.productId, story.productId));
  }

  const stories = await db
    .select({ id: userStories.id, sortOrder: userStories.sortOrder })
    .from(userStories)
    .where(and(...productConditions))
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
