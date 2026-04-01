import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { updateUser, deleteUser } from "@/lib/actions/users";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin();
  if (!authResult.authenticated) return authResult.response;

  const { id } = await params;
  const body = await request.json();

  const data: {
    name?: string | null;
    username?: string | null;
    role?: "admin" | "user";
    status?: "active" | "inactive";
  } = {};

  if (body.name !== undefined) data.name = body.name || null;
  if (body.username !== undefined) data.username = body.username || null;
  if (body.role !== undefined && ["admin", "user"].includes(body.role)) {
    data.role = body.role;
  }
  if (body.status !== undefined && ["active", "inactive"].includes(body.status)) {
    data.status = body.status;
  }

  const result = await updateUser(db, id, data);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin();
  if (!authResult.authenticated) return authResult.response;

  const { id } = await params;

  // Prevent self-deletion
  if (id === authResult.userId) {
    return NextResponse.json(
      { error: "Cannot delete your own account" },
      { status: 400 }
    );
  }

  const result = await deleteUser(db, id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
