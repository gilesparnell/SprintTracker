"use server";

import { eq, asc, sql } from "drizzle-orm";
import { products, userStories, notes, notifications } from "@/lib/db/schema";
import { productSchema, type ProductInput } from "@/lib/validators/product";
import { v4 as uuid } from "uuid";
import type { DB } from "@/lib/db/types";
import { parseZodErrors } from "@/lib/helpers/zod-errors";

type Product = typeof products.$inferSelect;

type ProductResult = {
  success: boolean;
  product?: Product;
  errors?: Record<string, string[]>;
};

export type ProductTreeNode = Product & {
  backlogCount: number;
  children: ProductTreeNode[];
};

export async function createProduct(db: DB, input: Partial<ProductInput>): Promise<ProductResult> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, errors: parseZodErrors(parsed.error) };
  }

  // Enforce max 2-level nesting: if parentId is set, parent must not have a parent
  if (parsed.data.parentId) {
    const parent = await db
      .select({ id: products.id, parentId: products.parentId })
      .from(products)
      .where(eq(products.id, parsed.data.parentId))
      .get();

    if (!parent) {
      return { success: false, errors: { parentId: ["Parent product not found"] } };
    }
    if (parent.parentId) {
      return { success: false, errors: { parentId: ["Cannot nest more than 2 levels deep"] } };
    }
  }

  const id = uuid();
  const now = new Date().toISOString();

  // Get max sort order among siblings
  const maxSort = await db
    .select({ max: sql<number>`COALESCE(MAX(${products.sortOrder}), 0)` })
    .from(products)
    .get();
  const sortOrder = (maxSort?.max ?? 0) + 1000;

  await db.insert(products).values({
    id,
    name: parsed.data.name,
    color: parsed.data.color ?? "#6b7280",
    parentId: parsed.data.parentId ?? null,
    sortOrder,
    createdAt: now,
    updatedAt: now,
  });

  const product = await db.select().from(products).where(eq(products.id, id)).get();
  return { success: true, product };
}

export async function updateProduct(
  db: DB,
  id: string,
  input: Partial<ProductInput>
): Promise<ProductResult> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, errors: parseZodErrors(parsed.error) };
  }

  // If changing parent, enforce nesting limit
  if (parsed.data.parentId) {
    const parent = await db
      .select({ id: products.id, parentId: products.parentId })
      .from(products)
      .where(eq(products.id, parsed.data.parentId))
      .get();

    if (!parent) {
      return { success: false, errors: { parentId: ["Parent product not found"] } };
    }
    if (parent.parentId) {
      return { success: false, errors: { parentId: ["Cannot nest more than 2 levels deep"] } };
    }
    // Prevent self-referencing
    if (parsed.data.parentId === id) {
      return { success: false, errors: { parentId: ["Product cannot be its own parent"] } };
    }
  }

  await db
    .update(products)
    .set({
      name: parsed.data.name,
      color: parsed.data.color ?? "#6b7280",
      parentId: parsed.data.parentId ?? null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(products.id, id));

  const product = await db.select().from(products).where(eq(products.id, id)).get();
  return { success: true, product };
}

export async function deleteProduct(db: DB, id: string): Promise<{ success: boolean }> {
  // Get stories belonging to this product (and child products) before deletion
  // so we can clean up their polymorphic notes/notifications
  const childProducts = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.parentId, id))
    .all();

  const productIds = [id, ...childProducts.map((p) => p.id)];

  // Clean up polymorphic data for stories that will be orphaned
  for (const pid of productIds) {
    const stories = await db
      .select({ id: userStories.id })
      .from(userStories)
      .where(eq(userStories.productId, pid))
      .all();

    for (const story of stories) {
      await db.delete(notes).where(
        sql`${notes.entityType} = 'story' AND ${notes.entityId} = ${story.id}`
      );
      await db.delete(notifications).where(
        sql`${notifications.entityType} = 'story' AND ${notifications.entityId} = ${story.id}`
      );
    }
  }

  // FK CASCADE handles child products; ON DELETE SET NULL handles stories.productId
  await db.delete(products).where(eq(products.id, id));
  return { success: true };
}

export async function getAllProducts(db: DB): Promise<Product[]> {
  return db
    .select()
    .from(products)
    .orderBy(asc(products.sortOrder), asc(products.createdAt))
    .all();
}

export async function getStoriesForProduct(db: DB, productId: string) {
  return db
    .select({
      id: userStories.id,
      title: userStories.title,
      status: userStories.status,
    })
    .from(userStories)
    .where(eq(userStories.productId, productId))
    .all();
}

export async function getProductTree(db: DB): Promise<ProductTreeNode[]> {
  const allProducts = await db
    .select()
    .from(products)
    .orderBy(asc(products.sortOrder), asc(products.createdAt))
    .all();

  // Get backlog counts per product
  const counts = await db
    .select({
      productId: userStories.productId,
      count: sql<number>`COUNT(*)`.as("count"),
    })
    .from(userStories)
    .where(eq(userStories.status, "backlog"))
    .groupBy(userStories.productId)
    .all();

  const countMap = new Map(counts.map((c) => [c.productId, c.count]));

  // Assemble tree
  const nodeMap = new Map<string, ProductTreeNode>();
  for (const p of allProducts) {
    nodeMap.set(p.id, {
      ...p,
      backlogCount: countMap.get(p.id) ?? 0,
      children: [],
    });
  }

  const roots: ProductTreeNode[] = [];
  for (const node of nodeMap.values()) {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export async function reorderProduct(
  db: DB,
  id: string,
  newSortOrder: number
): Promise<{ success: boolean; reindexed: boolean }> {
  const allProducts = await db
    .select({ id: products.id, sortOrder: products.sortOrder })
    .from(products)
    .orderBy(asc(products.sortOrder))
    .all();

  let reindexed = false;

  if (newSortOrder % 1 !== 0 || newSortOrder < 1) {
    reindexed = true;
    for (let i = 0; i < allProducts.length; i++) {
      if (allProducts[i].id === id) continue;
      await db
        .update(products)
        .set({ sortOrder: (i + 1) * 1000 })
        .where(eq(products.id, allProducts[i].id));
    }
  }

  await db
    .update(products)
    .set({ sortOrder: newSortOrder, updatedAt: new Date().toISOString() })
    .where(eq(products.id, id));

  return { success: true, reindexed };
}
