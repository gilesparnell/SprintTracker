import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAllCustomers, createCustomer } from "@/lib/actions/customers";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET() {
  const authResult = await requireAuth();
  if (!authResult.authenticated) return authResult.response;

  const allCustomers = await getAllCustomers(db);
  return NextResponse.json(allCustomers);
}

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if (!authResult.authenticated) return authResult.response;

  const { name, color } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }
  const customer = await createCustomer(db, name, color);
  return NextResponse.json(customer);
}
