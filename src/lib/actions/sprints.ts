"use server";

import { eq, asc } from "drizzle-orm";
import { sprints } from "@/lib/db/schema";
import { sprintSchema, type SprintInput } from "@/lib/validators/sprint";
import { v4 as uuid } from "uuid";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

type DB = BetterSQLite3Database<Record<string, never>>;

export type SprintResult = {
  success: boolean;
  sprint?: typeof sprints.$inferSelect;
  errors?: Record<string, string[]>;
};

export function createSprint(db: DB, input: Partial<SprintInput>): SprintResult {
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

  db.insert(sprints)
    .values({
      id,
      name: parsed.data.name,
      goal: parsed.data.goal ?? null,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      status: parsed.data.status,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const sprint = db.select().from(sprints).where(eq(sprints.id, id)).get();
  return { success: true, sprint };
}

export function getSprintById(db: DB, id: string) {
  return db.select().from(sprints).where(eq(sprints.id, id)).get();
}

export function getAllSprints(db: DB) {
  return db.select().from(sprints).orderBy(asc(sprints.startDate)).all();
}

export function updateSprint(
  db: DB,
  id: string,
  input: Partial<SprintInput>
): SprintResult {
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

  db.update(sprints)
    .set({
      name: parsed.data.name,
      goal: parsed.data.goal ?? null,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      status: parsed.data.status,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(sprints.id, id))
    .run();

  const sprint = db.select().from(sprints).where(eq(sprints.id, id)).get();
  return { success: true, sprint };
}

export function deleteSprint(db: DB, id: string): { success: boolean } {
  db.delete(sprints).where(eq(sprints.id, id)).run();
  return { success: true };
}
