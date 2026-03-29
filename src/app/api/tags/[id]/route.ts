import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deleteTag } from "@/lib/actions/tags";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await deleteTag(db, id);
  return NextResponse.json(result);
}
