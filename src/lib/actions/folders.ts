"use server";

import { eq, asc } from "drizzle-orm";
import { folders } from "@/lib/db/schema";
import { folderSchema, type FolderInput } from "@/lib/validators/folder";
import { v4 as uuid } from "uuid";
import type { LibSQLDatabase } from "drizzle-orm/libsql";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = LibSQLDatabase<any>;

export type FolderResult = {
  success: boolean;
  folder?: typeof folders.$inferSelect;
  errors?: Record<string, string[]>;
};

export async function createFolder(db: DB, input: Partial<FolderInput>): Promise<FolderResult> {
  const parsed = folderSchema.safeParse(input);
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

  await db.insert(folders).values({
    id,
    name: parsed.data.name,
    createdAt: now,
    updatedAt: now,
  });

  const folder = await db.select().from(folders).where(eq(folders.id, id)).get();
  return { success: true, folder };
}

export async function getAllFolders(db: DB) {
  return db.select().from(folders).orderBy(asc(folders.sortOrder), asc(folders.createdAt)).all();
}

export async function updateFolder(db: DB, id: string, input: Partial<FolderInput>): Promise<FolderResult> {
  const parsed = folderSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".");
      if (!fieldErrors[path]) fieldErrors[path] = [];
      fieldErrors[path].push(issue.message);
    }
    return { success: false, errors: fieldErrors };
  }

  await db.update(folders)
    .set({ name: parsed.data.name, updatedAt: new Date().toISOString() })
    .where(eq(folders.id, id));

  const folder = await db.select().from(folders).where(eq(folders.id, id)).get();
  return { success: true, folder };
}

export async function deleteFolder(db: DB, id: string): Promise<{ success: boolean }> {
  // Manually nullify folder_id on sprints (in case FK SET NULL isn't supported)
  const { sprints } = await import("@/lib/db/schema");
  await db.update(sprints)
    .set({ folderId: null, updatedAt: new Date().toISOString() })
    .where(eq(sprints.folderId, id));
  await db.delete(folders).where(eq(folders.id, id));
  return { success: true };
}
