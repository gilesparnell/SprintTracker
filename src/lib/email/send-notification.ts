import { getResend } from "./client";
import { render } from "@react-email/render";
import { createElement } from "react";
import TaskAssignedEmail from "./templates/task-assigned";
import StoryAssignedEmail from "./templates/story-assigned";
import SubtaskAssignedEmail from "./templates/subtask-assigned";
import NoteAddedEmail from "./templates/note-added";

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

async function buildHtml(
  type: NotificationType,
  recipient: Recipient,
  context: NotificationContext,
): Promise<string> {
  const name = recipient.name ?? "there";
  const actor = context.actorName ?? "Someone";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (type === "note") {
    return render(
      createElement(NoteAddedEmail, {
        recipientName: name,
        entityTitle: context.title,
        entityId: context.entityId,
        authorName: actor,
        notePreview: "",
        appUrl,
      })
    );
  }

  // assignment or reassignment
  if (context.entityType === "story") {
    return render(
      createElement(StoryAssignedEmail, {
        assigneeName: name,
        storyTitle: context.title,
        storyId: context.entityId,
        assignedBy: actor,
        appUrl,
      })
    );
  }

  if (context.entityType === "subtask") {
    return render(
      createElement(SubtaskAssignedEmail, {
        assigneeName: name,
        subtaskTitle: context.title,
        subtaskId: context.entityId,
        assignedBy: actor,
        appUrl,
      })
    );
  }

  // Default: task
  return render(
    createElement(TaskAssignedEmail, {
      assigneeName: name,
      taskTitle: context.title,
      taskId: context.entityId,
      assignedBy: actor,
      appUrl,
    })
  );
}

export async function sendNotificationEmail(
  type: NotificationType,
  recipient: Recipient,
  context: NotificationContext,
): Promise<void> {
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";
  const subject = buildSubject(type, context);
  const html = await buildHtml(type, recipient, context);

  const { error } = await getResend().emails.send({
    from,
    to: recipient.email,
    subject,
    html,
  });

  if (error) {
    console.error("[email-send-failed]", error);
  }
}
