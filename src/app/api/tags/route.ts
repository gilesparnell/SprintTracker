import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAllTags, createTag } from "@/lib/actions/tags";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET() {
  const authResult = await requireAuth();
  if (!authResult.authenticated) return authResult.response;

  const allTags = await getAllTags(db);
  return NextResponse.json(allTags);
}

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if (!authResult.authenticated) return authResult.response;

  const { name, color } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }
  const tag = await createTag(db, name, color);
  return NextResponse.json(tag);
}
