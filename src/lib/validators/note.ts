import { z } from "zod/v4";
import { entityTypeEnum } from "./shared";

export const createNoteSchema = z.object({
  content: z.string().min(1),
  entityType: entityTypeEnum,
  entityId: z.string().min(1),
});

export const updateNoteSchema = z.object({
  content: z.string().min(1),
});
