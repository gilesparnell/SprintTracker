import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { updateStory, deleteStory, getStoryById } from "@/lib/actions/stories";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.authenticated) return authResult.response;

  const { id } = await params;
  const story = await getStoryById(db, id);
  if (!story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }
  return NextResponse.json(story);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.authenticated) return authResult.response;

  const { id } = await params;
  const body = await request.json();
  const result = await updateStory(db, authResult.userId, id, body);
  if (result.success) revalidateTag("sidebar", { expire: 0 });
  return NextResponse.json(result);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.authenticated) return authResult.response;

  const { id } = await params;

  // Parse optional body for delete mode
  let mode: "cascade" | "unlink" | "reassign" = "unlink";
  let reassignStoryId: string | undefined;
  try {
    const body = await request.json();
    if (body.mode === "cascade" || body.mode === "unlink" || body.mode === "reassign") {
      mode = body.mode;
    }
    if (body.reassignStoryId) {
      reassignStoryId = body.reassignStoryId;
    }
  } catch {
    // No body or invalid JSON — use defaults
  }

  const result = await deleteStory(db, authResult.userId, id, mode, reassignStoryId);
  if (result.success) revalidateTag("sidebar", { expire: 0 });
  return NextResponse.json(result);
}
