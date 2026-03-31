import { z } from "zod/v4";
import { priorityEnum, taskStatusEnum } from "./shared";

export const taskSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  status: taskStatusEnum.default("open"),
  priority: priorityEnum.default("medium"),
  customerId: z.string().optional(),
});

export type TaskInput = z.infer<typeof taskSchema>;
