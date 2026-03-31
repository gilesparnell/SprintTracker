import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deleteTask, updateTask } from "@/lib/actions/tasks";
import { requireAuth } from "@/lib/auth-helpers";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.authenticated) return authResult.response;

  const { id } = await params;
  const result = await deleteTask(db, id);
  return NextResponse.json(result);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.authenticated) return authResult.response;

  const { id } = await params;
  const { title, description, status, priority, customerId, assignedTo } = await request.json();
  const result = await updateTask(db, id, { title, description, status, priority, customerId, assignedTo }, authResult.userId);
  return NextResponse.json(result);
}
