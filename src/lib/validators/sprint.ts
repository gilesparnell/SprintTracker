import { z } from "zod/v4";

export const sprintSchema = z.object({
  name: z.string().min(1, "Sprint name is required"),
  goal: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  status: z.enum(["planning", "active", "completed"]).default("planning"),
});

export type SprintInput = z.infer<typeof sprintSchema>;
