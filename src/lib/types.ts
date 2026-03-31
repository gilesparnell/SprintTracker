// Shared types used across the application

export type EntityType = "story" | "task" | "subtask";

export type StoryType = "user_story" | "feature_request" | "bug";

export const STORY_TYPE_CONFIG: Record<StoryType, { label: string; icon: string; color: string }> = {
  user_story: { label: "Story", icon: "BookOpenIcon", color: "text-gray-400" },
  feature_request: { label: "Feature", icon: "SparklesIcon", color: "text-purple-400" },
  bug: { label: "Bug", icon: "BugIcon", color: "text-red-400" },
};

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
