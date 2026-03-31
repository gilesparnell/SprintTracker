import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { getAllUsers } from "@/lib/actions/users";

export async function GET() {
  const authResult = await requireAuth();
  if (!authResult.authenticated) return authResult.response;

  const allUsers = await getAllUsers(db);
  return NextResponse.json(allUsers);
}
