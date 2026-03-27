import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, sprints } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { updateTaskStatus } from "@/lib/actions/tasks";
import { ClickUpClient } from "@/lib/clickup/client";
import { syncTaskStatusToClickUp } from "@/lib/clickup/sync";
import { getClickUpConfig } from "@/lib/actions/clickup-config";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const result = updateTaskStatus(db, id, body.status);

  // Sync status to ClickUp if task is synced
  const task = db.select().from(tasks).where(eq(tasks.id, id)).get();
  if (task?.clickupTaskId && process.env.CLICKUP_API_TOKEN) {
    const config = await getClickUpConfig();
    if (config) {
      const clickupStatus = config.statusMapping[body.status] ?? body.status;
      const client = new ClickUpClient(process.env.CLICKUP_API_TOKEN);
      await syncTaskStatusToClickUp(db, client, id, clickupStatus);
    }
  }

  return NextResponse.json(result);
}
