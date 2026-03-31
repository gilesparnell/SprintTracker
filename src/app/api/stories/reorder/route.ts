import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { reorderStory } from "@/lib/actions/stories";

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if (!authResult.authenticated) return authResult.response;

  const { storyId, newSortOrder } = await request.json();

  if (!storyId || typeof newSortOrder !== "number") {
    return NextResponse.json(
      { success: false, errors: { body: ["storyId and newSortOrder are required"] } },
      { status: 400 }
    );
  }

  const result = await reorderStory(db, authResult.userId, storyId, newSortOrder);
  return NextResponse.json(result);
}
