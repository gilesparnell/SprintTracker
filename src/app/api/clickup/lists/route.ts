import { NextResponse } from "next/server";
import { ClickUpClient } from "@/lib/clickup/client";
import { getClickUpConfig } from "@/lib/actions/clickup-config";

export async function GET() {
  const token = process.env.CLICKUP_API_TOKEN;
  if (!token) {
    return NextResponse.json({ lists: [] });
  }

  const config = await getClickUpConfig();
  if (!config) {
    return NextResponse.json({ lists: [] });
  }

  try {
    const client = new ClickUpClient(token);
    const lists = await client.getLists(config.folderId);
    return NextResponse.json({
      lists: lists.map((l) => ({ id: l.id, name: l.name })),
    });
  } catch {
    return NextResponse.json({ lists: [] });
  }
}
