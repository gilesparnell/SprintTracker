import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";

// ─── Users & Auth ───────────────────────────────────────────

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  image: text("image"),
  status: text("status", { enum: ["active", "inactive"] })
    .notNull()
    .default("active"),
  lastLoginAt: text("last_login_at"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const allowedEmails = sqliteTable("allowed_emails", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  addedBy: text("added_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const sequences = sqliteTable("sequences", {
  entity: text("entity").primaryKey(),
  value: integer("value").notNull().default(0),
});

// ─── Products ──────────────────────────────────────────────

export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#6b7280"),
  parentId: text("parent_id").references((): any => products.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
}, (table) => [
  index("idx_products_parent").on(table.parentId),
]);

// ─── Core Entities ──────────────────────────────────────────

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

export const userStories = sqliteTable("user_stories", {
  id: text("id").primaryKey(),
  sequenceNumber: integer("sequence_number").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type", { enum: ["user_story", "feature_request", "bug"] })
    .notNull()
    .default("user_story"),
  priority: text("priority", { enum: ["low", "medium", "high", "urgent"] })
    .notNull()
    .default("medium"),
  status: text("status", { enum: ["backlog", "in_sprint", "done"] })
    .notNull()
    .default("backlog"),
  sortOrder: integer("sort_order").notNull().default(0),
  productId: text("product_id").references(() => products.id, { onDelete: "set null" }),
  assignedTo: text("assigned_to").references(() => users.id, { onDelete: "set null" }),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  sprintId: text("sprint_id").references(() => sprints.id, { onDelete: "set null" }),
  customerId: text("customer_id").references(() => customers.id, { onDelete: "set null" }),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
}, (table) => [
  index("idx_stories_status_sort").on(table.status, table.sortOrder),
  index("idx_stories_assignee").on(table.assignedTo, table.status),
  index("idx_stories_product").on(table.productId, table.status),
  index("idx_stories_type").on(table.type, table.status),
]);

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  sequenceNumber: integer("sequence_number").unique(),
  sprintId: text("sprint_id")
    .references(() => sprints.id, { onDelete: "cascade" }),
  userStoryId: text("user_story_id")
    .references(() => userStories.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: ["open", "in_progress", "done"] })
    .notNull()
    .default("open"),
  priority: text("priority", { enum: ["low", "medium", "high", "urgent"] })
    .notNull()
    .default("medium"),
  assignedTo: text("assigned_to").references(() => users.id, { onDelete: "set null" }),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  customerId: text("customer_id").references(() => customers.id, { onDelete: "set null" }),
  clickupTaskId: text("clickup_task_id"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
}, (table) => [
  index("idx_tasks_story").on(table.userStoryId),
]);

export const subTasks = sqliteTable("sub_tasks", {
  id: text("id").primaryKey(),
  sequenceNumber: integer("sequence_number").notNull().unique(),
  parentTaskId: text("parent_task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: ["open", "in_progress", "done"] })
    .notNull()
    .default("open"),
  priority: text("priority", { enum: ["low", "medium", "high", "urgent"] })
    .notNull()
    .default("medium"),
  assignedTo: text("assigned_to").references(() => users.id, { onDelete: "set null" }),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
}, (table) => [
  index("idx_subtasks_parent").on(table.parentTaskId),
]);

// ─── Comments & Notifications ───────────────────────────────

export const notes = sqliteTable("notes", {
  id: text("id").primaryKey(),
  entityType: text("entity_type", { enum: ["story", "task", "subtask"] }).notNull(),
  entityId: text("entity_id").notNull(),
  content: text("content").notNull(),
  authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
}, (table) => [
  index("idx_notes_entity").on(table.entityType, table.entityId, table.createdAt),
]);

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["assignment", "reassignment", "note"] }).notNull(),
  title: text("title").notNull(),
  body: text("body"),
  entityType: text("entity_type", { enum: ["story", "task", "subtask"] }).notNull(),
  entityId: text("entity_id").notNull(),
  read: integer("read").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
}, (table) => [
  index("idx_notifications_user_unread").on(table.userId, table.read),
  index("idx_notifications_entity").on(table.entityType, table.entityId),
]);

// ─── Supporting Tables ──────────────────────────────────────

export const customers = sqliteTable("customers", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("#6b7280"),
  createdAt: text("created_at")
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
