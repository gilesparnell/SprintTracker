import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { getAllowedEmails, addAllowedEmail } from "@/lib/actions/users";

export async function GET() {
  const authResult = await requireAdmin();
  if (!authResult.authenticated) return authResult.response;

  const emails = await getAllowedEmails(db);
  return NextResponse.json(emails);
}

const addEmailSchema = z.object({
  email: z.email("Invalid email address"),
});

export async function POST(request: Request) {
  const authResult = await requireAdmin();
  if (!authResult.authenticated) return authResult.response;

  const body = await request.json();
  const parsed = addEmailSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid email format", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const result = await addAllowedEmail(db, parsed.data.email, authResult.userId);

  if (!result.success) {
    return NextResponse.json(
      { error: "Email already whitelisted", ...result },
      { status: 409 }
    );
  }

  return NextResponse.json(result, { status: 201 });
}
