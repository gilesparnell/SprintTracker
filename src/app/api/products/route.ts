import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { createProduct, getAllProducts } from "@/lib/actions/products";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET() {
  const authResult = await requireAuth();
  if (!authResult.authenticated) return authResult.response;

  const products = await getAllProducts(db);
  return NextResponse.json(products);
}

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if (!authResult.authenticated) return authResult.response;

  const body = await request.json();
  const result = await createProduct(db, body);
  if (result.success) revalidateTag("sidebar", { expire: 0 });
  return NextResponse.json(result);
}
