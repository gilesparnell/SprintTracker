"use server";

import { eq, asc } from "drizzle-orm";
import { sprints } from "@/lib/db/schema";
import { sprintSchema, type SprintInput } from "@/lib/validators/sprint";
import { v4 as uuid } from "uuid";
import type { LibSQLDatabase } from "drizzle-orm/libsql";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = LibSQLDatabase<any>;

export type SprintResult = {
  success: boolean;
  sprint?: typeof sprints.$inferSelect;
  errors?: Record<string, string[]>;
};

export async function createSprint(db: DB, input: Partial<SprintInput>): Promise<SprintResult> {
  const parsed = sprintSchema.safeParse(input);
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

  await db.insert(sprints)
    .values({
      id,
      name: parsed.data.name,
      goal: parsed.data.goal ?? null,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      status: parsed.data.status,
      folderId: (input as Record<string, unknown>).folderId as string | undefined ?? null,
      createdAt: now,
      updatedAt: now,
    });

  const sprint = await db.select().from(sprints).where(eq(sprints.id, id)).get();
  return { success: true, sprint };
}

export async function getSprintById(db: DB, id: string) {
  return db.select().from(sprints).where(eq(sprints.id, id)).get();
}

export async function getAllSprints(db: DB) {
  return db.select().from(sprints).orderBy(asc(sprints.startDate)).all();
}

export async function updateSprint(
  db: DB,
  id: string,
  input: Partial<SprintInput>
): Promise<SprintResult> {
  const parsed = sprintSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".");
      if (!fieldErrors[path]) fieldErrors[path] = [];
      fieldErrors[path].push(issue.message);
    }
    return { success: false, errors: fieldErrors };
  }

  await db.update(sprints)
    .set({
      name: parsed.data.name,
      goal: parsed.data.goal ?? null,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      status: parsed.data.status,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(sprints.id, id));

  const sprint = await db.select().from(sprints).where(eq(sprints.id, id)).get();
  return { success: true, sprint };
}

export async function setSprintStatus(db: DB, id: string, status: "planning" | "active" | "completed"): Promise<{ success: boolean }> {
  await db.update(sprints)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(eq(sprints.id, id));
  return { success: true };
}

export async function deleteSprint(db: DB, id: string): Promise<{ success: boolean }> {
  await db.delete(sprints).where(eq(sprints.id, id));
  return { success: true };
}

export async function moveSprintToFolder(db: DB, sprintId: string, folderId: string | null): Promise<{ success: boolean }> {
  await db.update(sprints)
    .set({ folderId, updatedAt: new Date().toISOString() })
    .where(eq(sprints.id, sprintId));
  return { success: true };
}
