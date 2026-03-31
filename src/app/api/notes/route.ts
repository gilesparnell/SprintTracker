import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createNote, getNotesForEntity } from "@/lib/actions/notes";
import { requireAuth } from "@/lib/auth-helpers";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const authResult = await requireAuth();
  if (!authResult.authenticated) return authResult.response;

  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entityType") as
    | "story"
    | "task"
    | "subtask"
    | null;
  const entityId = searchParams.get("entityId");

  if (!entityType || !entityId) {
    return NextResponse.json(
      { error: "entityType and entityId are required" },
      { status: 400 }
    );
  }

  const notes = await getNotesForEntity(db, entityType, entityId);

  // Enrich with author names
  const enriched = await Promise.all(
    notes.map(async (note) => {
      let authorName = "Unknown";
      let authorImage: string | null = null;
      if (note.authorId) {
        const user = await db
          .select({ name: users.name, image: users.image })
          .from(users)
          .where(eq(users.id, note.authorId))
          .get();
        if (user) {
          authorName = user.name ?? "Unknown";
          authorImage = user.image;
        }
      }
      return { ...note, authorName, authorImage };
    })
  );

  return NextResponse.json(enriched);
}

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if (!authResult.authenticated) return authResult.response;

  const body = await request.json();
  const result = await createNote(db, authResult.userId, body);
  return NextResponse.json(result);
}
