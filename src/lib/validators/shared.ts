import { z } from "zod/v4";

export const priorityEnum = z.enum(["low", "medium", "high", "urgent"]);

export const taskStatusEnum = z.enum(["open", "in_progress", "done"]);

export const storyStatusEnum = z.enum(["backlog", "in_sprint", "done"]);

export const entityTypeEnum = z.enum(["story", "task", "subtask"]);
