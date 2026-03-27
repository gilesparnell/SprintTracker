"use server";

import { clickupConfig } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { ClickUpClient } from "@/lib/clickup/client";
import { v4 as uuid } from "uuid";

/** Returns the ClickUp API token from DB first, then env var fallback. */
export async function getClickUpToken(): Promise<string | null> {
  const config = await db.select().from(clickupConfig).get();
  if (config?.apiToken) return config.apiToken;
  return process.env.CLICKUP_API_TOKEN ?? null;
}

export async function saveClickUpToken(token: string) {
  const existing = await db.select().from(clickupConfig).get();

  if (existing) {
    await db.update(clickupConfig)
      .set({ apiToken: token });
  } else {
    // Create a placeholder config row with just the token
    await db.insert(clickupConfig)
      .values({
        id: uuid(),
        apiToken: token,
        spaceId: "",
        spaceName: "",
        folderId: "",
        folderName: "",
      });
  }

  return { success: true };
}

export async function testClickUpConnection() {
  const token = await getClickUpToken();
  if (!token) {
    return { success: false, error: "No API token. Enter your ClickUp API token above." };
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
  const token = await getClickUpToken();
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
  const token = await getClickUpToken();
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
  const existing = await db.select().from(clickupConfig).get();
  const mappingJson = data.statusMapping
    ? JSON.stringify(data.statusMapping)
    : JSON.stringify({
        open: "Open",
        in_progress: "In Progress",
        done: "Closed",
      });

  if (existing) {
    // Update existing row, preserving apiToken
    await db.update(clickupConfig)
      .set({
        spaceId: data.spaceId,
        spaceName: data.spaceName,
        folderId: data.folderId,
        folderName: data.folderName,
        statusMapping: mappingJson,
      });
  } else {
    await db.insert(clickupConfig)
      .values({
        id: uuid(),
        spaceId: data.spaceId,
        spaceName: data.spaceName,
        folderId: data.folderId,
        folderName: data.folderName,
        statusMapping: mappingJson,
      });
  }

  return { success: true };
}

export async function getClickUpConfig() {
  const config = await db.select().from(clickupConfig).get();
  if (!config || !config.folderId) return null;

  return {
    ...config,
    statusMapping: config.statusMapping
      ? (JSON.parse(config.statusMapping) as Record<string, string>)
      : { open: "Open", in_progress: "In Progress", done: "Closed" },
  };
}
