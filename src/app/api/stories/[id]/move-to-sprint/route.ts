import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { moveStoryToSprint, moveStoryBackToBacklog } from "@/lib/actions/stories";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.authenticated) return authResult.response;

  const { id } = await params;
  const { sprintId } = await request.json();

  if (!sprintId) {
    // Move back to backlog
    const result = await moveStoryBackToBacklog(db, authResult.userId, id);
    return NextResponse.json(result);
  }

  const result = await moveStoryToSprint(db, authResult.userId, id, sprintId);
  return NextResponse.json(result);
}
