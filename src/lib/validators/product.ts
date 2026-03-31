import { z } from "zod/v4";

export const productSchema = z.object({
  name: z.string().min(1, "Product name is required").max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color").default("#6b7280"),
  parentId: z.string().nullish(),
});

export type ProductInput = z.infer<typeof productSchema>;
