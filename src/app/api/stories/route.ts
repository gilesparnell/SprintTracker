import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
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
    productId: searchParams.get("productId") ?? undefined,
    type: searchParams.get("type") ?? undefined,
  });
  return NextResponse.json(stories);
}

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if (!authResult.authenticated) return authResult.response;

  try {
    const body = await request.json();
    console.log("[stories/POST] body:", JSON.stringify(body));
    console.log("[stories/POST] userId:", authResult.userId);
    const result = await createStory(db, authResult.userId, body);
    console.log("[stories/POST] result:", JSON.stringify(result));
    if (result.success) revalidateTag("sidebar", "seconds");
    return NextResponse.json(result);
  } catch (error) {
    console.error("[stories/POST] error:", error);
    return NextResponse.json(
      { success: false, errors: { form: [String(error)] } },
      { status: 500 }
    );
  }
}
