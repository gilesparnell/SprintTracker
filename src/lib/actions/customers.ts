"use server";

import { eq } from "drizzle-orm";
import { customers, tasks } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import type { DB } from "@/lib/db/types";

export async function getAllCustomers(db: DB) {
  return db.select().from(customers).orderBy(customers.name).all();
}

export async function createCustomer(db: DB, name: string, color?: string) {
  const id = uuid();
  await db.insert(customers).values({
    id,
    name: name.trim(),
    color: color ?? "#6b7280",
    createdAt: new Date().toISOString(),
  });
  return db.select().from(customers).where(eq(customers.id, id)).get();
}

export async function updateCustomer(db: DB, id: string, name: string, color?: string) {
  const updates: { name: string; color?: string } = { name: name.trim() };
  if (color) updates.color = color;
  await db.update(customers).set(updates).where(eq(customers.id, id));
  return db.select().from(customers).where(eq(customers.id, id)).get();
}

export async function deleteCustomer(db: DB, id: string) {
  await db.delete(customers).where(eq(customers.id, id));
  return { success: true };
}

export async function getTasksForCustomer(db: DB, customerId: string) {
  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      sprintId: tasks.sprintId,
    })
    .from(tasks)
    .where(eq(tasks.customerId, customerId))
    .all();
  return rows;
}
