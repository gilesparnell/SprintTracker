"use server";

import { eq } from "drizzle-orm";
import { clickupConfig } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { ClickUpClient } from "@/lib/clickup/client";
import { v4 as uuid } from "uuid";

export async function testClickUpConnection() {
  const token = process.env.CLICKUP_API_TOKEN;
  if (!token) {
    return { success: false, error: "CLICKUP_API_TOKEN not set in .env.local" };
  }

  try {
    const client = new ClickUpClient(token);
    const workspaces = await client.getWorkspaces();
    return { success: true, workspaces };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

export async function getClickUpSpaces(workspaceId: string) {
  const token = process.env.CLICKUP_API_TOKEN;
  if (!token) return { success: false, error: "No API token" };

  try {
    const client = new ClickUpClient(token);
    const spaces = await client.getSpaces(workspaceId);
    return { success: true, spaces };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

export async function getClickUpFolders(spaceId: string) {
  const token = process.env.CLICKUP_API_TOKEN;
  if (!token) return { success: false, error: "No API token" };

  try {
    const client = new ClickUpClient(token);
    const folders = await client.getFolders(spaceId);
    return { success: true, folders };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

export async function saveClickUpConfig(data: {
  spaceId: string;
  spaceName: string;
  folderId: string;
  folderName: string;
  statusMapping?: Record<string, string>;
}) {
  // Replace any existing config (single-user app)
  db.delete(clickupConfig).run();

  const id = uuid();
  db.insert(clickupConfig)
    .values({
      id,
      spaceId: data.spaceId,
      spaceName: data.spaceName,
      folderId: data.folderId,
      folderName: data.folderName,
      statusMapping: data.statusMapping
        ? JSON.stringify(data.statusMapping)
        : JSON.stringify({
            open: "Open",
            in_progress: "In Progress",
            done: "Closed",
          }),
    })
    .run();

  return { success: true };
}

export async function getClickUpConfig() {
  const config = db.select().from(clickupConfig).get();
  if (!config) return null;

  return {
    ...config,
    statusMapping: config.statusMapping
      ? (JSON.parse(config.statusMapping) as Record<string, string>)
      : { open: "Open", in_progress: "In Progress", done: "Closed" },
  };
}
