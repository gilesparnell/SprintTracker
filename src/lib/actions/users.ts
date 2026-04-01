"use server";

import { eq } from "drizzle-orm";
import { users, allowedEmails } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import type { DB } from "@/lib/db/types";

export async function getAllUsers(db: DB) {
  return db.select().from(users).orderBy(users.name).all();
}

export async function getActiveUsers(db: DB) {
  return db
    .select()
    .from(users)
    .where(eq(users.status, "active"))
    .orderBy(users.name)
    .all();
}

export async function getUserByEmail(db: DB, email: string) {
  return db.select().from(users).where(eq(users.email, email)).get();
}

export async function getUserById(db: DB, id: string) {
  return db.select().from(users).where(eq(users.id, id)).get();
}

export async function upsertUser(
  db: DB,
  data: { email: string; name?: string | null; image?: string | null }
) {
  const existing = await getUserByEmail(db, data.email);
  const now = new Date().toISOString();

  if (existing) {
    await db
      .update(users)
      .set({
        name: data.name ?? existing.name,
        image: data.image ?? existing.image,
        lastLoginAt: now,
        status: "active",
      })
      .where(eq(users.id, existing.id));
    return db.select().from(users).where(eq(users.id, existing.id)).get();
  }

  const id = uuid();
  await db.insert(users).values({
    id,
    email: data.email,
    name: data.name ?? null,
    image: data.image ?? null,
    lastLoginAt: now,
    createdAt: now,
  });
  return db.select().from(users).where(eq(users.id, id)).get();
}

export async function deactivateUser(db: DB, id: string) {
  await db
    .update(users)
    .set({ status: "inactive" })
    .where(eq(users.id, id));
  return { success: true };
}

export async function updateUser(
  db: DB,
  id: string,
  data: {
    name?: string | null;
    username?: string | null;
    role?: "admin" | "user";
    status?: "active" | "inactive";
  }
): Promise<{ error: string } | (typeof users.$inferSelect)> {
  const existing = await db.select().from(users).where(eq(users.id, id)).get();
  if (!existing) {
    return { error: "User not found" };
  }

  // Check username uniqueness (if changing)
  if (data.username !== undefined && data.username !== null && data.username !== existing.username) {
    const taken = await db
      .select()
      .from(users)
      .where(eq(users.username, data.username))
      .get();
    if (taken) {
      return { error: "Username already taken" };
    }
  }

  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.username !== undefined) updates.username = data.username;
  if (data.role !== undefined) updates.role = data.role;
  if (data.status !== undefined) updates.status = data.status;

  if (Object.keys(updates).length > 0) {
    await db.update(users).set(updates).where(eq(users.id, id));
  }

  return (await db.select().from(users).where(eq(users.id, id)).get())!;
}

export async function deleteUser(
  db: DB,
  id: string
): Promise<{ success: true } | { error: string }> {
  const existing = await db.select().from(users).where(eq(users.id, id)).get();
  if (!existing) {
    return { error: "User not found" };
  }

  await db.delete(users).where(eq(users.id, id));
  return { success: true };
}

// ─── Whitelist ──────────────────────────────────────────────

export async function isEmailAllowed(db: DB, email: string): Promise<boolean> {
  const row = await db
    .select()
    .from(allowedEmails)
    .where(eq(allowedEmails.email, email.toLowerCase()))
    .get();
  return !!row;
}

export async function getAllowedEmails(db: DB) {
  return db.select().from(allowedEmails).orderBy(allowedEmails.email).all();
}

export async function addAllowedEmail(
  db: DB,
  email: string,
  addedByUserId?: string
) {
  const normalised = email.toLowerCase().trim();
  const existing = await db
    .select()
    .from(allowedEmails)
    .where(eq(allowedEmails.email, normalised))
    .get();

  if (existing) {
    return { success: false, errors: { email: ["Email already whitelisted"] } };
  }

  const id = uuid();
  await db.insert(allowedEmails).values({
    id,
    email: normalised,
    addedBy: addedByUserId ?? null,
    createdAt: new Date().toISOString(),
  });
  return { success: true };
}

export async function removeAllowedEmail(db: DB, emailId: string) {
  await db.delete(allowedEmails).where(eq(allowedEmails.id, emailId));
  return { success: true };
}
