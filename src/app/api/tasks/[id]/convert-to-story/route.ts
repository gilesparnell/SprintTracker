import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { convertTaskToStory } from "@/lib/actions/tasks";
import { requireAuth } from "@/lib/auth-helpers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.authenticated) return authResult.response;

  const { id } = await params;
  let productId: string | undefined;
  let removeFromSprint: boolean | undefined;
  try {
    const body = await request.json();
    productId = body.productId ?? undefined;
    removeFromSprint = body.removeFromSprint ?? undefined;
  } catch {
    // No body — defaults stay undefined
  }
  const result = await convertTaskToStory(db, id, authResult.userId, productId, removeFromSprint);
  if (result.success) revalidateTag("sidebar", { expire: 0 });
  return NextResponse.json(result);
}
