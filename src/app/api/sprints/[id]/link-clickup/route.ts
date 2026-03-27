import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sprints } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ClickUpClient } from "@/lib/clickup/client";
import { ensureClickUpList } from "@/lib/clickup/sync";
import { getClickUpConfig } from "@/lib/actions/clickup-config";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const token = process.env.CLICKUP_API_TOKEN;

  if (!token) {
    return NextResponse.json(
      { success: false, error: "No API token" },
      { status: 400 }
    );
  }

  const sprint = db.select().from(sprints).where(eq(sprints.id, id)).get();
  if (!sprint) {
    return NextResponse.json(
      { success: false, error: "Sprint not found" },
      { status: 404 }
    );
  }

  const config = await getClickUpConfig();
  if (!config) {
    return NextResponse.json(
      { success: false, error: "ClickUp not configured" },
      { status: 400 }
    );
  }

  const client = new ClickUpClient(token);

  let listId: string;
  if (body.listId) {
    // Link to existing list
    listId = body.listId;
  } else {
    // Create new list
    listId = await ensureClickUpList(
      db,
      client,
      config.folderId,
      sprint.name,
      sprint.startDate,
      sprint.endDate
    );
  }

  db.update(sprints)
    .set({
      clickupListId: listId,
      clickupFolderId: config.folderId,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(sprints.id, id))
    .run();

  return NextResponse.json({ success: true, listId });
}
