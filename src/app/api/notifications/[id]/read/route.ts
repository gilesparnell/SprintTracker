import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { markAsRead } from "@/lib/actions/notifications";
import { requireAuth } from "@/lib/auth-helpers";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.authenticated) return authResult.response;

  const { id } = await params;
  const result = await markAsRead(db, authResult.userId, id);
  return NextResponse.json(result);
}
