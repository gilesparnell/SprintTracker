import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAllTags, createTag } from "@/lib/actions/tags";

export async function GET() {
  const allTags = await getAllTags(db);
  return NextResponse.json(allTags);
}

export async function POST(request: Request) {
  const { name, color } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }
  const tag = await createTag(db, name, color);
  return NextResponse.json(tag);
}
