import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTasksForTag } from "@/lib/actions/tags";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tasks = await getTasksForTag(db, id);
  return NextResponse.json(tasks);
}
