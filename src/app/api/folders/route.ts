import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createFolder, getAllFolders } from "@/lib/actions/folders";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET() {
  const authResult = await requireAuth();
  if (!authResult.authenticated) return authResult.response;

  const folders = await getAllFolders(db);
  return NextResponse.json(folders);
}

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if (!authResult.authenticated) return authResult.response;

  const body = await request.json();
  const result = await createFolder(db, body);
  return NextResponse.json(result);
}
