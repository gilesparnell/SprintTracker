import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTasksForCustomer } from "@/lib/actions/customers";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.authenticated) return authResult.response;

  const { id } = await params;
  const tasks = await getTasksForCustomer(db, id);
  return NextResponse.json(tasks);
}
