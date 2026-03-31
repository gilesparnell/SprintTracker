// Shared types used across the application

export type EntityType = "story" | "task" | "subtask";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; errors: Record<string, string[]> };

const ENTITY_PREFIX_MAP: Record<EntityType, string> = {
  story: "US",
  task: "T",
  subtask: "ST",
};

export function formatDisplayId(entityType: EntityType, seq: number): string {
  return `${ENTITY_PREFIX_MAP[entityType]}-${seq}`;
}
