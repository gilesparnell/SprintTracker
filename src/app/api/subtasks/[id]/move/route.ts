import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { moveSubTask } from "@/lib/actions/subtasks";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.authenticated) return authResult.response;

  const { id } = await params;
  const { newParentTaskId } = await request.json();

  if (!newParentTaskId) {
    return NextResponse.json(
      { success: false, errors: { newParentTaskId: ["New parent task ID is required"] } },
      { status: 400 }
    );
  }

  const result = await moveSubTask(db, authResult.userId, id, newParentTaskId);
  return NextResponse.json(result);
}
