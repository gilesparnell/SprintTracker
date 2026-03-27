import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deleteTask } from "@/lib/actions/tasks";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = deleteTask(db, id);
  return NextResponse.json(result);
}
