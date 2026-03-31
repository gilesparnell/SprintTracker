import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { moveSprintToFolder } from "@/lib/actions/sprints";
import { requireAuth } from "@/lib/auth-helpers";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.authenticated) return authResult.response;

  const { id } = await params;
  const body = await request.json();
  const result = await moveSprintToFolder(db, id, body.folderId ?? null);
  return NextResponse.json(result);
}
