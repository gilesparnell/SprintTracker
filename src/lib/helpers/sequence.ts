import { sql } from "drizzle-orm";
import type { DB } from "@/lib/db/types";
import type { EntityType } from "@/lib/types";

/**
 * Atomically increments and returns the next sequence number for an entity type.
 * Uses UPDATE...RETURNING to avoid read-then-write race conditions.
 */
export async function getNextSequenceNumber(
  db: DB,
  entityType: EntityType
): Promise<number> {
  const result = await db.all<{ value: number }>(
    sql`UPDATE sequences SET value = value + 1 WHERE entity = ${entityType} RETURNING value`
  );

  if (result.length === 0) {
    throw new Error(`No sequence row found for entity type: ${entityType}`);
  }

  return result[0].value;
}
