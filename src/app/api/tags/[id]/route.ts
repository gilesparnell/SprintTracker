import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deleteTag, renameTag } from "@/lib/actions/tags";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { name, color } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }
  const tag = await renameTag(db, id, name, color);
  return NextResponse.json(tag);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await deleteTag(db, id);
  return NextResponse.json(result);
}
