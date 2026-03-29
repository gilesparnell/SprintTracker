import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createFolder, getAllFolders } from "@/lib/actions/folders";

export async function GET() {
  const folders = await getAllFolders(db);
  return NextResponse.json(folders);
}

export async function POST(request: Request) {
  const body = await request.json();
  const result = await createFolder(db, body);
  return NextResponse.json(result);
}
