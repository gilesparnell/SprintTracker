import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { updateFolder, deleteFolder } from "@/lib/actions/folders";
import { requireAuth } from "@/lib/auth-helpers";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.authenticated) return authResult.response;

  const { id } = await params;
  const body = await request.json();
  const result = await updateFolder(db, id, body);
  return NextResponse.json(result);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.authenticated) return authResult.response;

  const { id } = await params;
  const result = await deleteFolder(db, id);
  return NextResponse.json(result);
}
