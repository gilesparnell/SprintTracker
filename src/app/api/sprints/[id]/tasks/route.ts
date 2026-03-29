import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sprints } from "@/lib/db/schema";
import { createTask } from "@/lib/actions/tasks";
import { setTaskTags } from "@/lib/actions/tags";
import { getClickUpToken } from "@/lib/actions/clickup-config";
import { ClickUpClient } from "@/lib/clickup/client";
import { syncTaskToClickUp } from "@/lib/clickup/sync";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sprintId } = await params;
  const { title, description, status, priority, customerId, tagIds } =
    await request.json();

  const result = await createTask(db, sprintId, {
    title,
    description: description || undefined,
    status: status || "open",
    priority: priority || "medium",
    customerId:
      customerId && customerId !== "__none__" ? customerId : undefined,
  });

  if (!result.success) {
    return NextResponse.json(result);
  }

  // Save tags
  const parsedTagIds = Array.isArray(tagIds)
    ? tagIds.filter(Boolean)
    : typeof tagIds === "string"
      ? tagIds.split(",").filter(Boolean)
      : [];
  if (parsedTagIds.length > 0) {
    await setTaskTags(db, result.task!.id, parsedTagIds);
  }

  // ClickUp sync
  const sprint = await db
    .select()
    .from(sprints)
    .where(eq(sprints.id, sprintId))
    .get();

  const token = await getClickUpToken();
  if (sprint?.clickupListId && token) {
    const client = new ClickUpClient(token);
    await syncTaskToClickUp(db, client, result.task!.id, sprint.clickupListId);
  }

  return NextResponse.json(result);
}
