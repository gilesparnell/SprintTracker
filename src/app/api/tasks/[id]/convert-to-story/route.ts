import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { convertTaskToStory } from "@/lib/actions/tasks";
import { requireAuth } from "@/lib/auth-helpers";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.authenticated) return authResult.response;

  const { id } = await params;
  const result = await convertTaskToStory(db, id, authResult.userId);
  if (result.success) revalidateTag("sidebar", "seconds");
  return NextResponse.json(result);
}
