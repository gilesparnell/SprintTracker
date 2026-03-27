import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { updateTaskStatus } from "@/lib/actions/tasks";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const result = updateTaskStatus(db, id, body.status);
  return NextResponse.json(result);
}
