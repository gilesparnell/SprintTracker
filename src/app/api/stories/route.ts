import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { createStory, getStories } from "@/lib/actions/stories";

export async function GET(request: Request) {
  const authResult = await requireAuth();
  if (!authResult.authenticated) return authResult.response;

  const { searchParams } = new URL(request.url);
  const stories = await getStories(db, {
    status: searchParams.get("status") ?? undefined,
    assignedTo: searchParams.get("assignedTo") ?? undefined,
    customerId: searchParams.get("customerId") ?? undefined,
  });
  return NextResponse.json(stories);
}

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if (!authResult.authenticated) return authResult.response;

  const body = await request.json();
  const result = await createStory(db, authResult.userId, body);
  return NextResponse.json(result);
}
