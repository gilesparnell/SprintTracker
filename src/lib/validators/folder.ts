import { z } from "zod/v4";

export const folderSchema = z.object({
  name: z.string().min(1, "Folder name is required").max(100),
});

export type FolderInput = z.infer<typeof folderSchema>;
