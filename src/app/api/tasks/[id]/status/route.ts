import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { updateTaskStatus } from "@/lib/actions/tasks";
import { ClickUpClient } from "@/lib/clickup/client";
import { syncTaskStatusToClickUp } from "@/lib/clickup/sync";
import { getClickUpConfig, getClickUpToken } from "@/lib/actions/clickup-config";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const result = await updateTaskStatus(db, id, body.status);

  // Sync status to ClickUp if task is synced
  const task = await db.select().from(tasks).where(eq(tasks.id, id)).get();
  const clickUpToken = await getClickUpToken();
  if (task?.clickupTaskId && clickUpToken) {
    const config = await getClickUpConfig();
    if (config) {
      const clickupStatus = config.statusMapping[body.status] ?? body.status;
      const client = new ClickUpClient(clickUpToken);
      await syncTaskStatusToClickUp(db, client, id, clickupStatus);
    }
  }

  return NextResponse.json(result);
}
