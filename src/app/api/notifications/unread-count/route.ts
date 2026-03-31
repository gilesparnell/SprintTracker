import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUnreadCount } from "@/lib/actions/notifications";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET() {
  const authResult = await requireAuth();
  if (!authResult.authenticated) return authResult.response;

  const count = await getUnreadCount(db, authResult.userId);
  return NextResponse.json({ count });
}
