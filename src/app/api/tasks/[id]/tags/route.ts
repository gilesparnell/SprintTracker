import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { setTaskTags, getTagsForTask } from "@/lib/actions/tags";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const taskTagsList = await getTagsForTask(db, id);
  return NextResponse.json(taskTagsList);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { tagIds } = await request.json();
  const result = await setTaskTags(db, id, tagIds ?? []);
  return NextResponse.json(result);
}
