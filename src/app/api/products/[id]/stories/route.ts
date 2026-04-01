import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStoriesForProduct } from "@/lib/actions/products";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.authenticated) return authResult.response;

  const { id } = await params;
  const stories = await getStoriesForProduct(db, id);
  return NextResponse.json(stories);
}
