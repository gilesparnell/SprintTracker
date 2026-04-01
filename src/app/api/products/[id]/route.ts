import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { updateProduct, deleteProduct } from "@/lib/actions/products";
import { requireAuth } from "@/lib/auth-helpers";
import { products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.authenticated) return authResult.response;

  const { id } = await params;
  const product = await db.select().from(products).where(eq(products.id, id)).get();
  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(product);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.authenticated) return authResult.response;

  const { id } = await params;
  const body = await request.json();
  const result = await updateProduct(db, id, body);
  if (result.success) revalidateTag("sidebar", { expire: 0 });
  return NextResponse.json(result);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.authenticated) return authResult.response;

  const { id } = await params;
  const result = await deleteProduct(db, id);
  if (result.success) revalidateTag("sidebar", { expire: 0 });
  return NextResponse.json(result);
}
