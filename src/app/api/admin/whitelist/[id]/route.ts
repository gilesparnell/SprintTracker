import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { removeAllowedEmail } from "@/lib/actions/users";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin();
  if (!authResult.authenticated) return authResult.response;

  const { id } = await params;
  const result = await removeAllowedEmail(db, id);
  return NextResponse.json(result);
}
