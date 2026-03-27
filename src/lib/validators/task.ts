import { z } from "zod/v4";

export const taskSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  status: z.enum(["open", "in_progress", "done"]).default("open"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
});

export type TaskInput = z.infer<typeof taskSchema>;
