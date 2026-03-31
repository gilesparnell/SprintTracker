import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { markAllAsRead } from "@/lib/actions/notifications";
import { requireAuth } from "@/lib/auth-helpers";

export async function POST() {
  const authResult = await requireAuth();
  if (!authResult.authenticated) return authResult.response;

  const result = await markAllAsRead(db, authResult.userId);
  return NextResponse.json(result);
}
