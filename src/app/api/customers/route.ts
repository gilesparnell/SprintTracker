import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAllCustomers, createCustomer } from "@/lib/actions/customers";

export async function GET() {
  const allCustomers = await getAllCustomers(db);
  return NextResponse.json(allCustomers);
}

export async function POST(request: Request) {
  const { name, color } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }
  const customer = await createCustomer(db, name, color);
  return NextResponse.json(customer);
}
