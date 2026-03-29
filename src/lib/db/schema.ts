import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const folders = sqliteTable("folders", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const sprints = sqliteTable("sprints", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  goal: text("goal"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  status: text("status", { enum: ["planning", "active", "completed"] })
    .notNull()
    .default("planning"),
  folderId: text("folder_id").references(() => folders.id, { onDelete: "set null" }),
  clickupListId: text("clickup_list_id"),
  clickupFolderId: text("clickup_folder_id"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  sprintId: text("sprint_id")
    .notNull()
    .references(() => sprints.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: ["open", "in_progress", "done"] })
    .notNull()
    .default("open"),
  priority: text("priority", { enum: ["low", "medium", "high", "urgent"] })
    .notNull()
    .default("medium"),
  clickupTaskId: text("clickup_task_id"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("#6b7280"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const taskTags = sqliteTable("task_tags", {
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  tagId: text("tag_id")
    .notNull()
    .references(() => tags.id, { onDelete: "cascade" }),
});

export const clickupConfig = sqliteTable("clickup_config", {
  id: text("id").primaryKey(),
  apiToken: text("api_token"),
  spaceId: text("space_id").notNull(),
  spaceName: text("space_name").notNull(),
  folderId: text("folder_id").notNull(),
  folderName: text("folder_name").notNull(),
  statusMapping: text("status_mapping"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const syncLog = sqliteTable("sync_log", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull(),
  action: text("action").notNull(),
  success: integer("success").notNull(),
  errorMessage: text("error_message"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});
