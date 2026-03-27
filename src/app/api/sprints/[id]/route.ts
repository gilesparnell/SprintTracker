import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { updateSprint, deleteSprint } from "@/lib/actions/sprints";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const result = await updateSprint(db, id, body);
  return NextResponse.json(result);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await deleteSprint(db, id);
  return NextResponse.json(result);
}
