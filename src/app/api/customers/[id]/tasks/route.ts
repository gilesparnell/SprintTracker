import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTasksForCustomer } from "@/lib/actions/customers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tasks = await getTasksForCustomer(db, id);
  return NextResponse.json(tasks);
}
