import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { createSubTask, getSubTasksForTask } from "@/lib/actions/subtasks";

export async function GET(request: Request) {
  const authResult = await requireAuth();
  if (!authResult.authenticated) return authResult.response;

  const { searchParams } = new URL(request.url);
  const parentTaskId = searchParams.get("parentTaskId");
  if (!parentTaskId) {
    return NextResponse.json(
      { error: "parentTaskId is required" },
      { status: 400 }
    );
  }

  const subtasks = await getSubTasksForTask(db, parentTaskId);
  return NextResponse.json(subtasks);
}

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if (!authResult.authenticated) return authResult.response;

  const body = await request.json();
  const { parentTaskId, ...input } = body;

  if (!parentTaskId) {
    return NextResponse.json(
      { success: false, errors: { parentTaskId: ["Parent task ID is required"] } },
      { status: 400 }
    );
  }

  const result = await createSubTask(db, authResult.userId, parentTaskId, input);
  return NextResponse.json(result);
}
