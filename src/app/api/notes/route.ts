import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createNote } from "@/lib/actions/notes";
import { requireAuth } from "@/lib/auth-helpers";

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if (!authResult.authenticated) return authResult.response;

  const body = await request.json();
  const result = await createNote(db, authResult.userId, body);
  return NextResponse.json(result);
}
