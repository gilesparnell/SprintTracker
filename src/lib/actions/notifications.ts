"use server";

import { eq, and, desc, sql } from "drizzle-orm";
import { notifications } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import type { DB } from "@/lib/db/types";

export async function createNotification(
  db: DB,
  data: {
    userId: string;
    type: "assignment" | "reassignment" | "note";
    title: string;
    body?: string;
    entityType: "story" | "task" | "subtask";
    entityId: string;
  }
) {
  const id = uuid();
  const now = new Date().toISOString();

  await db.insert(notifications).values({
    id,
    userId: data.userId,
    type: data.type,
    title: data.title,
    body: data.body ?? null,
    entityType: data.entityType,
    entityId: data.entityId,
    read: 0,
    createdAt: now,
  });

  return db.select().from(notifications).where(eq(notifications.id, id)).get();
}

export async function getUnreadCount(db: DB, userId: string) {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, 0)))
    .get();

  return result?.count ?? 0;
}

export async function getNotificationsForUser(
  db: DB,
  userId: string,
  limit = 20
) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .all();
}

export async function markAsRead(
  db: DB,
  userId: string,
  notificationId: string
) {
  const notification = await db
    .select()
    .from(notifications)
    .where(eq(notifications.id, notificationId))
    .get();

  if (!notification || notification.userId !== userId) {
    return { success: false, error: "Notification not found" };
  }

  await db
    .update(notifications)
    .set({ read: 1 })
    .where(eq(notifications.id, notificationId));

  return { success: true };
}

export async function markAllAsRead(db: DB, userId: string) {
  await db
    .update(notifications)
    .set({ read: 1 })
    .where(and(eq(notifications.userId, userId), eq(notifications.read, 0)));

  return { success: true };
}
