import { z } from "zod/v4";
import { priorityEnum, storyStatusEnum, storyTypeEnum } from "./shared";

export const createStorySchema = z.object({
  title: z.string().min(1, "Story title is required"),
  description: z.string().nullish(),
  type: storyTypeEnum.default("user_story"),
  status: storyStatusEnum.default("backlog"),
  priority: priorityEnum.default("medium"),
  productId: z.string().min(1, "Product is required"),
  assignedTo: z.string().nullish(),
  customerId: z.string().nullish(),
});

export const updateStorySchema = z.object({
  title: z.string().min(1, "Story title is required"),
  description: z.string().nullish(),
  type: storyTypeEnum.optional(),
  priority: priorityEnum,
  status: storyStatusEnum.optional(),
  productId: z.string().nullish(),
  assignedTo: z.string().nullish(),
  customerId: z.string().nullish(),
});

export type CreateStoryInput = z.infer<typeof createStorySchema>;
export type UpdateStoryInput = z.infer<typeof updateStorySchema>;
