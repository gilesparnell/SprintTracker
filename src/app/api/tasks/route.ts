import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createTask } from "@/lib/actions/tasks";
import { requireAuth } from "@/lib/auth-helpers";

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if (!authResult.authenticated) return authResult.response;

  const { title, description, status, priority, userStoryId, customerId, assignedTo } =
    await request.json();

  const result = await createTask(db, null, {
    title,
    description: description || undefined,
    status: status || "open",
    priority: priority || "medium",
    userStoryId: userStoryId || undefined,
    customerId: customerId && customerId !== "__none__" ? customerId : undefined,
    assignedTo: assignedTo && assignedTo !== "__none__" ? assignedTo : undefined,
  }, authResult.userId);

  return NextResponse.json(result);
}
