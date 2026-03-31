import { resend } from "./client";

type NotificationType = "assignment" | "reassignment" | "note";

interface Recipient {
  email: string;
  name?: string;
}

interface NotificationContext {
  entityType: string;
  entityId: string;
  title: string;
  actorName?: string;
}

function buildSubject(type: NotificationType, context: NotificationContext): string {
  const actor = context.actorName ?? "Someone";
  switch (type) {
    case "assignment":
      return `${actor} assigned you to ${context.entityType} ${context.entityId}: ${context.title}`;
    case "reassignment":
      return `${actor} reassigned ${context.entityType} ${context.entityId}: ${context.title} to you`;
    case "note":
      return `${actor} added a note on ${context.entityType} ${context.entityId}: ${context.title}`;
  }
}

function buildHtml(
  type: NotificationType,
  recipient: Recipient,
  context: NotificationContext,
): string {
  const name = recipient.name ?? "there";
  const actor = context.actorName ?? "Someone";

  let heading: string;
  let body: string;

  switch (type) {
    case "assignment":
      heading = "You've been assigned a task";
      body = `<strong>${actor}</strong> assigned you to <strong>${context.entityType} ${context.entityId}</strong>: ${context.title}.`;
      break;
    case "reassignment":
      heading = "A task has been reassigned to you";
      body = `<strong>${actor}</strong> reassigned <strong>${context.entityType} ${context.entityId}</strong>: ${context.title} to you.`;
      break;
    case "note":
      heading = "New note on your task";
      body = `<strong>${actor}</strong> added a note on <strong>${context.entityType} ${context.entityId}</strong>: ${context.title}.`;
      break;
  }

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #1a1a1a;">
  <h2 style="margin-bottom: 8px;">${heading}</h2>
  <p>Hi ${name},</p>
  <p>${body}</p>
</body>
</html>`.trim();
}

export async function sendNotificationEmail(
  type: NotificationType,
  recipient: Recipient,
  context: NotificationContext,
): Promise<void> {
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";
  const subject = buildSubject(type, context);
  const html = buildHtml(type, recipient, context);

  const { error } = await resend.emails.send({
    from,
    to: recipient.email,
    subject,
    html,
  });

  if (error) {
    console.error("[email-send-failed]", error);
  }
}
