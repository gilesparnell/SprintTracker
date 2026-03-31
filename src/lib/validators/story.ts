import { z } from "zod/v4";
import { priorityEnum, storyStatusEnum } from "./shared";

export const createStorySchema = z.object({
  title: z.string().min(1, "Story title is required"),
  description: z.string().optional(),
  priority: priorityEnum.default("medium"),
  assignedTo: z.string().optional(),
  customerId: z.string().optional(),
});

export const updateStorySchema = z.object({
  title: z.string().min(1, "Story title is required"),
  description: z.string().optional(),
  priority: priorityEnum,
  status: storyStatusEnum.optional(),
  assignedTo: z.string().nullable().optional(),
  customerId: z.string().nullable().optional(),
});

export type CreateStoryInput = z.infer<typeof createStorySchema>;
export type UpdateStoryInput = z.infer<typeof updateStorySchema>;
