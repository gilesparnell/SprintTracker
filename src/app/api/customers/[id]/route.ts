import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deleteCustomer, updateCustomer } from "@/lib/actions/customers";
import { requireAuth } from "@/lib/auth-helpers";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.authenticated) return authResult.response;

  const { id } = await params;
  const { name, color } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }
  const customer = await updateCustomer(db, id, name, color);
  return NextResponse.json(customer);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.authenticated) return authResult.response;

  const { id } = await params;
  const result = await deleteCustomer(db, id);
  return NextResponse.json(result);
}
