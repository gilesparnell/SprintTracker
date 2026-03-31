import { createNotification } from "@/lib/actions/notifications";
import { notifications, users } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import type { DB } from "@/lib/db/types";
import { sendNotificationEmail } from "@/lib/email/send-notification";

export async function triggerNotification(
  db: DB,
  data: {
    type: "assignment" | "reassignment" | "note";
    actorId: string;
    targetUserId: string;
    entityType: "story" | "task" | "subtask";
    entityId: string;
    title: string;
  }
) {
  // Don't notify yourself
  if (data.targetUserId === data.actorId) return;

  // Check for duplicate unread notification within the last 30 seconds
  const thirtySecondsAgo = new Date(Date.now() - 30_000).toISOString();

  const existing = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, data.targetUserId),
        eq(notifications.entityType, data.entityType),
        eq(notifications.entityId, data.entityId),
        eq(notifications.type, data.type),
        eq(notifications.read, 0),
        sql`${notifications.createdAt} >= ${thirtySecondsAgo}`
      )
    )
    .get();

  if (existing) {
    // Update the existing notification's title instead of creating a new one
    await db
      .update(notifications)
      .set({ title: data.title })
      .where(eq(notifications.id, existing.id));
    return;
  }

  await createNotification(db, {
    userId: data.targetUserId,
    type: data.type,
    title: data.title,
    entityType: data.entityType,
    entityId: data.entityId,
  });

  // Fire-and-forget email
  if (process.env.RESEND_API_KEY) {
    const [targetUser, actorUser] = await Promise.all([
      db.select().from(users).where(eq(users.id, data.targetUserId)).get(),
      db.select().from(users).where(eq(users.id, data.actorId)).get(),
    ]);

    if (targetUser?.email) {
      void sendNotificationEmail(data.type, {
        email: targetUser.email,
        name: targetUser.name ?? undefined,
      }, {
        entityType: data.entityType,
        entityId: data.entityId,
        title: data.title,
        actorName: actorUser?.name ?? undefined,
      });
    }
  }
}
