"use server";

import { eq, and, desc } from "drizzle-orm";
import { notes, userStories, tasks, subTasks } from "@/lib/db/schema";
import { createNoteSchema, updateNoteSchema } from "@/lib/validators/note";
import { v4 as uuid } from "uuid";
import type { DB } from "@/lib/db/types";
import { parseZodErrors } from "@/lib/helpers/zod-errors";
import type { ActionResult } from "@/lib/types";
import { triggerNotification } from "@/lib/helpers/notify";

type Note = typeof notes.$inferSelect;

const EDIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export async function createNote(
  db: DB,
  userId: string,
  input: unknown
): Promise<ActionResult<Note>> {
  const parsed = createNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, errors: parseZodErrors(parsed.error) };
  }

  const id = uuid();
  const now = new Date().toISOString();

  await db.insert(notes).values({
    id,
    entityType: parsed.data.entityType,
    entityId: parsed.data.entityId,
    content: parsed.data.content,
    authorId: userId,
    createdAt: now,
    updatedAt: now,
  });

  const note = await db.select().from(notes).where(eq(notes.id, id)).get();

  // Notify entity assignee when someone else adds a note
  const entityType = parsed.data.entityType as "story" | "task" | "subtask";
  const entityId = parsed.data.entityId;
  let assignee: { assignedTo: string | null; title: string; sequenceNumber: number | null } | undefined;

  if (entityType === "story") {
    const row = await db
      .select({ assignedTo: userStories.assignedTo, title: userStories.title, sequenceNumber: userStories.sequenceNumber })
      .from(userStories)
      .where(eq(userStories.id, entityId))
      .get();
    assignee = row ?? undefined;
  } else if (entityType === "task") {
    const row = await db
      .select({ assignedTo: tasks.assignedTo, title: tasks.title, sequenceNumber: tasks.sequenceNumber })
      .from(tasks)
      .where(eq(tasks.id, entityId))
      .get();
    assignee = row ?? undefined;
  } else if (entityType === "subtask") {
    const row = await db
      .select({ assignedTo: subTasks.assignedTo, title: subTasks.title, sequenceNumber: subTasks.sequenceNumber })
      .from(subTasks)
      .where(eq(subTasks.id, entityId))
      .get();
    assignee = row ?? undefined;
  }

  if (assignee?.assignedTo && assignee.assignedTo !== userId) {
    const prefix = entityType === "story" ? "S" : entityType === "task" ? "T" : "ST";
    void triggerNotification(db, {
      type: "note",
      actorId: userId,
      targetUserId: assignee.assignedTo,
      entityType,
      entityId,
      title: `New note on ${prefix}-${assignee.sequenceNumber}: ${assignee.title}`,
    });
  }

  return { success: true, data: note! };
}

export async function updateNote(
  db: DB,
  userId: string,
  noteId: string,
  input: unknown
): Promise<ActionResult<Note>> {
  const parsed = updateNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, errors: parseZodErrors(parsed.error) };
  }

  const note = await db
    .select()
    .from(notes)
    .where(eq(notes.id, noteId))
    .get();

  if (!note) {
    return { success: false, errors: { noteId: ["Note not found"] } };
  }

  if (note.authorId !== userId) {
    return { success: false, errors: { authorId: ["Not authorized to edit this note"] } };
  }

  const createdAt = new Date(note.createdAt).getTime();
  const now = Date.now();
  if (now - createdAt > EDIT_WINDOW_MS) {
    return { success: false, errors: { content: ["Edit window has expired (5 minutes)"] } };
  }

  await db
    .update(notes)
    .set({ content: parsed.data.content, updatedAt: new Date().toISOString() })
    .where(eq(notes.id, noteId));

  const updated = await db.select().from(notes).where(eq(notes.id, noteId)).get();
  return { success: true, data: updated! };
}

export async function getNotesForEntity(
  db: DB,
  entityType: "story" | "task" | "subtask",
  entityId: string
) {
  const rows = await db
    .select()
    .from(notes)
    .where(and(eq(notes.entityType, entityType), eq(notes.entityId, entityId)))
    .orderBy(desc(notes.createdAt))
    .all();

  return rows.map((note) => ({
    ...note,
    editableUntil: new Date(
      new Date(note.createdAt).getTime() + EDIT_WINDOW_MS
    ).toISOString(),
  }));
}

export async function deleteNote(
  db: DB,
  userId: string,
  noteId: string
): Promise<ActionResult<{ deleted: true }>> {
  const note = await db
    .select()
    .from(notes)
    .where(eq(notes.id, noteId))
    .get();

  if (!note) {
    return { success: false, errors: { noteId: ["Note not found"] } };
  }

  if (note.authorId !== userId) {
    return { success: false, errors: { authorId: ["Not authorized to delete this note"] } };
  }

  await db.delete(notes).where(eq(notes.id, noteId));
  return { success: true, data: { deleted: true } };
}
