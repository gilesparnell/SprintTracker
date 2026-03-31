import { z } from "zod/v4";
import { priorityEnum, taskStatusEnum } from "./shared";

export const createSubTaskSchema = z.object({
  title: z.string().min(1, "Sub-task title is required"),
  description: z.string().optional(),
  priority: priorityEnum.default("medium"),
  assignedTo: z.string().optional(),
});

export const updateSubTaskSchema = z.object({
  title: z.string().min(1, "Sub-task title is required"),
  description: z.string().optional(),
  status: taskStatusEnum.optional(),
  priority: priorityEnum,
  assignedTo: z.string().nullable().optional(),
});

export type CreateSubTaskInput = z.infer<typeof createSubTaskSchema>;
export type UpdateSubTaskInput = z.infer<typeof updateSubTaskSchema>;
