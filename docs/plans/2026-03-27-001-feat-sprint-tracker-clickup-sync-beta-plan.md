---
title: "feat: Sprint Tracker with ClickUp Sync"
type: feat
status: completed
date: 2026-03-27
---

# feat: Sprint Tracker with ClickUp Sync

## Overview

Build a local-first sprint tracker that captures sprint goals, allows task entry and management, and optionally syncs sprints and tasks bidirectionally with ClickUp. When a user links a sprint to ClickUp, tasks created in the app push to the relevant ClickUp sprint (List). If the sprint doesn't exist in ClickUp, the app creates it in the designated Sprint Folder.

## Problem Frame

Managing sprint goals and tasks often requires switching between a heavyweight PM tool (ClickUp) and a quick-capture workflow. This app provides a fast, focused sprint tracker that works standalone but can optionally push work into ClickUp for team visibility -- without forcing ClickUp as the primary interface for personal sprint planning.

## Requirements Trace

- R1. Create sprints with a name, goal, start date, end date, and status
- R2. Create, edit, and delete tasks within a sprint (title, description, status, priority)
- R3. View sprint progress -- task counts by status, sprint goal visibility
- R4. Optionally connect to ClickUp via API token (stored server-side only)
- R5. Link a sprint to a ClickUp Space and Folder -- browse hierarchy to select target
- R6. When sync is enabled, creating a task locally also creates it in ClickUp
- R7. When sync is enabled, task status changes propagate to ClickUp
- R8. If a linked ClickUp sprint (List) doesn't exist, create it automatically in the target Folder
- R9. Store ClickUp task ID mapping for synced tasks to prevent duplicates
- R10. Handle ClickUp API errors gracefully -- local data is never blocked by sync failures

## Scope Boundaries

- **No inbound ClickUp webhooks in v1** -- sync is push-only (local -> ClickUp). Two-way sync with webhooks is a future enhancement.
- **No user authentication** -- single-user local app. No login system.
- **No drag-and-drop Kanban** in v1 -- table/list view with status dropdowns. Kanban is a future enhancement.
- **No sprint points or velocity tracking** in v1 -- keep it simple with task counts.
- **No per-assignee tracking** -- tasks have no assignee field in v1.
- **ClickUp Sprints ClickApp must already be enabled** in the user's ClickUp workspace -- the API cannot toggle ClickApps.

## Context & Research

### Technology Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js (App Router) | Full-stack React, Server Components, Server Actions |
| Language | TypeScript (strict) | Type safety across client/server boundary |
| Database | SQLite via better-sqlite3 | Zero infrastructure, file-based, fast for single-user |
| ORM | Drizzle ORM | Tiny bundle (~7.4 KB), no codegen, SQL-like TypeScript |
| UI | shadcn/ui + Tailwind CSS v4 | Owned components, dashboard-ready primitives |
| Forms | Server Actions + Zod | Progressive enhancement, type-safe validation |
| State | Server Components + minimal client state | Most views are data-display; avoid premature state management |

### ClickUp API v2 Key Findings

- **Authentication**: Personal API token (`pk_...`) via `Authorization` header. Tokens don't expire. Stored in `.env.local`, never exposed to client.
- **Hierarchy**: Workspace (Team) > Space > Folder (Sprint Folder) > List (Sprint) > Task
- **Create sprint**: `POST /v2/folder/{folder_id}/list` with `name`, `start_date`, `due_date` (Unix ms)
- **Create task**: `POST /v2/list/{list_id}/task` -- only `name` required; supports `description`, `status`, `priority`
- **Update task**: `PUT /v2/task/{task_id}` -- partial updates, all fields optional
- **Rate limits**: 100 req/min on Free/Unlimited/Business plans. Headers: `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **Pagination**: Max 100 items/page, `page` + `last_page` pattern
- **Sprint Folder caveat**: Creating a Folder via API creates a normal Folder. Sprint behaviors require the Sprints ClickApp to be enabled on the Space (UI-only toggle).

### Relevant Patterns

- **Server Actions for CRUD** on local data (sprints, tasks) -- no Route Handlers needed for internal mutations
- **Route Handlers only for ClickUp proxy** -- outbound API calls go through `app/api/clickup/` to keep the token server-side
- **Drizzle schema** defined in TypeScript, migrations via `drizzle-kit`
- **shadcn/ui components**: Card, Badge, Button, Dialog, Select, DataTable for the dashboard

## Key Technical Decisions

- **Push-only sync (no webhooks in v1)**: Simplifies architecture dramatically. Local DB is source of truth. ClickUp is a push target. Two-way sync adds webhook infrastructure, conflict resolution, and idempotency -- defer to v2.
- **SQLite, not Postgres**: Single-user local app. No need for a database server. File sits at `./data/tracker.db`.
- **Drizzle over Prisma**: No codegen step, smaller footprint, better Turbopack compatibility. Ideal for a lightweight local app.
- **No Zustand in v1**: Server Components handle data fetching. Client interactivity is limited to forms and dropdowns -- React state + Server Actions suffice. Add Zustand only if/when Kanban board is built.
- **ClickUp sync is fire-and-forget with error logging**: If the ClickUp API call fails, the local operation still succeeds. Sync failures are logged to a `sync_log` table and surfaced in the UI as a warning.
- **MCP tools available but not used for sync**: The ClickUp MCP tools in the environment are useful for prototyping/testing but the app should use direct HTTP calls via `fetch` for production reliability and independence from the MCP runtime.

## Open Questions

### Resolved During Planning

- **Q: Should sync be real-time or batch?** Real-time (on each task create/update). At single-user scale with 100 req/min rate limit, there's no need to batch.
- **Q: How to handle ClickUp status mapping?** Fetch statuses from the target List via `GET /v2/list/{list_id}` and let the user map local statuses to ClickUp statuses in settings. Default mapping: Open->Open, In Progress->In Progress, Done->Closed.
- **Q: Where to store ClickUp connection config?** In the SQLite database (`clickup_config` table) -- not just env vars. The API token itself stays in `.env.local`, but the selected Space, Folder, and status mappings live in the DB.

### Deferred to Implementation

- **Exact Drizzle migration workflow** -- will be determined when setting up the schema
- **ClickUp status names vary by Space** -- the status mapping UI will need to fetch available statuses dynamically; exact UX to be refined during implementation
- **Error retry strategy for failed syncs** -- start with simple logging; retry mechanism deferred to v2

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```
┌─────────────────────────────────────────────────┐
│                   Next.js App                    │
│                                                  │
│  ┌──────────────┐    ┌────────────────────────┐  │
│  │ Dashboard UI  │    │   Server Actions       │  │
│  │ (Server +     │───>│   - createSprint()     │  │
│  │  Client       │    │   - createTask()       │  │
│  │  Components)  │    │   - updateTask()       │  │
│  └──────────────┘    │   - deleteTask()       │  │
│                      │   - configureClickUp() │  │
│                      └──────────┬─────────────┘  │
│                                 │                 │
│                    ┌────────────┼──────────┐      │
│                    │            │          │      │
│               ┌────▼────┐  ┌───▼───┐  ┌───▼───┐  │
│               │ SQLite  │  │ClickUp│  │ Sync  │  │
│               │ (Drizzle│  │ Client│  │ Log   │  │
│               │  ORM)   │  │ (fetch)│  │       │  │
│               └─────────┘  └───┬───┘  └───────┘  │
│                                │                 │
└────────────────────────────────┼─────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │    ClickUp API v2       │
                    │  api.clickup.com/api/v2 │
                    └─────────────────────────┘
```

**Data flow for task creation with sync enabled:**
1. User submits task form -> Server Action `createTask()`
2. Server Action inserts task into SQLite -> returns success to UI immediately
3. Server Action checks if sprint is linked to ClickUp
4. If linked: calls ClickUp client `POST /v2/list/{list_id}/task`
5. On success: stores `clickup_task_id` on the local task record
6. On failure: logs error to `sync_log` table, local task unaffected

## Implementation Units

- [ ] **Unit 1: Project scaffolding and database schema**

  **Goal:** Set up the Next.js project, install dependencies, define the database schema, and run initial migration.

  **Requirements:** Foundation for R1, R2, R9

  **Dependencies:** None

  **Files:**
  - Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`
  - Create: `src/lib/db/schema.ts` (sprints, tasks, clickup_config, sync_log tables)
  - Create: `src/lib/db/index.ts` (Drizzle client singleton)
  - Create: `drizzle.config.ts`
  - Create: `.env.local.example` (CLICKUP_API_TOKEN placeholder)
  - Create: `.gitignore` (node_modules, .env.local, data/*.db)

  **Approach:**
  - `npx create-next-app@latest` with App Router, TypeScript, Tailwind, src directory
  - Install: `drizzle-orm`, `better-sqlite3`, `drizzle-kit`, `zod`
  - Install shadcn/ui: `npx shadcn@latest init`
  - Database schema tables:
    - `sprints`: id (text UUID PK), name, goal, startDate, endDate, status (enum: planning/active/completed), clickupListId (nullable), clickupFolderId (nullable), createdAt, updatedAt
    - `tasks`: id (text UUID PK), sprintId (FK), title, description, status (enum: open/in_progress/done), priority (enum: low/medium/high/urgent), clickupTaskId (nullable), createdAt, updatedAt
    - `clickup_config`: id, spaceId, spaceName, folderId, folderName, statusMapping (JSON text), createdAt
    - `sync_log`: id, taskId, action, success (boolean), errorMessage, createdAt
  - Run `drizzle-kit generate` and `drizzle-kit migrate` to create the SQLite file at `./data/tracker.db`

  **Patterns to follow:**
  - Drizzle ORM `sqliteTable` definitions with `text`, `integer` column types
  - Export singleton `db` from `src/lib/db/index.ts`

  **Test scenarios:**
  - Database file is created at `./data/tracker.db` on first run
  - All four tables exist with correct columns
  - Drizzle client can insert and query a sprint record

  **Verification:**
  - `drizzle-kit migrate` runs without errors
  - Dev server starts with `npm run dev`

- [ ] **Unit 2: Sprint CRUD with Server Actions**

  **Goal:** Implement sprint creation, listing, editing, and deletion with a basic dashboard UI.

  **Requirements:** R1, R3

  **Dependencies:** Unit 1

  **Files:**
  - Create: `src/lib/actions/sprints.ts` (createSprint, updateSprint, deleteSprint Server Actions)
  - Create: `src/lib/validators/sprint.ts` (Zod schema for sprint input)
  - Create: `src/app/(dashboard)/layout.tsx` (dashboard shell with sidebar)
  - Create: `src/app/(dashboard)/sprints/page.tsx` (sprint list -- Server Component)
  - Create: `src/app/(dashboard)/sprints/new/page.tsx` (create sprint form)
  - Create: `src/app/(dashboard)/sprints/[id]/page.tsx` (sprint detail with task list)
  - Create: `src/components/features/sprint-card.tsx`
  - Create: `src/components/features/sprint-form.tsx` (Client Component for form interactivity)
  - Test: `src/__tests__/actions/sprints.test.ts`

  **Approach:**
  - Server Actions use Drizzle to query/mutate SQLite directly
  - Zod validates form input before DB operations
  - Sprint list page is a Server Component that fetches sprints via Drizzle
  - Sprint form uses `useActionState` for validation feedback
  - Dashboard layout includes a sidebar with navigation (shadcn Sidebar component)
  - Sprint card shows name, goal, date range, task count summary, and sync status badge

  **Patterns to follow:**
  - shadcn/ui Card, Badge, Button components
  - Server Action pattern: `'use server'` + Zod parse + DB operation + `revalidatePath()`

  **Test scenarios:**
  - Creating a sprint with valid data inserts a record and redirects to sprint list
  - Creating a sprint with missing name returns validation error
  - Sprint list page displays all sprints sorted by start date
  - Deleting a sprint removes it and its tasks (cascade)
  - Sprint detail page shows task count by status

  **Verification:**
  - Can create, view, edit, and delete sprints through the UI
  - Form validation errors display inline

- [ ] **Unit 3: Task CRUD within sprints**

  **Goal:** Implement task creation, editing, status changes, and deletion within a sprint context.

  **Requirements:** R2, R3

  **Dependencies:** Unit 2

  **Files:**
  - Create: `src/lib/actions/tasks.ts` (createTask, updateTask, deleteTask, updateTaskStatus)
  - Create: `src/lib/validators/task.ts` (Zod schema for task input)
  - Create: `src/components/features/task-list.tsx` (Server Component -- table of tasks)
  - Create: `src/components/features/task-form.tsx` (Client Component -- create/edit dialog)
  - Create: `src/components/features/task-status-select.tsx` (Client Component -- inline status change)
  - Test: `src/__tests__/actions/tasks.test.ts`

  **Approach:**
  - Tasks are displayed on the sprint detail page (`sprints/[id]/page.tsx`)
  - Task list as a table with columns: title, status, priority, sync status, actions
  - Inline status change via a Select dropdown that triggers `updateTaskStatus` Server Action
  - Create/edit task via a Dialog form (shadcn Dialog + Form components)
  - Delete task with confirmation dialog
  - Task count summary updates on the sprint detail page header

  **Patterns to follow:**
  - shadcn/ui DataTable pattern for the task list
  - Dialog for task create/edit forms
  - Select component for inline status changes

  **Test scenarios:**
  - Creating a task with valid data inserts it under the correct sprint
  - Changing task status updates the record and refreshes the sprint view
  - Deleting a task removes it and updates task counts
  - Task form validates required fields (title)
  - Tasks display in a sensible default order (status groups, then creation date)

  **Verification:**
  - Can create, edit, change status, and delete tasks within a sprint
  - Sprint detail page reflects current task counts by status

- [ ] **Unit 4: ClickUp client and hierarchy browser**

  **Goal:** Build a ClickUp API client and a settings UI to connect to ClickUp, browse the workspace hierarchy, and select a target Space + Folder for sync.

  **Requirements:** R4, R5

  **Dependencies:** Unit 1

  **Files:**
  - Create: `src/lib/clickup/client.ts` (ClickUp API client -- fetch wrapper with auth, rate limit handling, error normalization)
  - Create: `src/lib/clickup/types.ts` (TypeScript types for ClickUp API responses)
  - Create: `src/lib/actions/clickup-config.ts` (saveClickUpConfig, testConnection Server Actions)
  - Create: `src/app/(dashboard)/settings/page.tsx` (ClickUp connection settings)
  - Create: `src/components/features/clickup-hierarchy-browser.tsx` (Client Component -- cascading selects for Space > Folder)
  - Test: `src/__tests__/lib/clickup/client.test.ts`

  **Approach:**
  - ClickUp client is a thin wrapper around `fetch` that:
    - Reads API token from `process.env.CLICKUP_API_TOKEN`
    - Adds `Authorization` and `Content-Type` headers
    - Parses rate limit headers and throws a typed error on 429
    - Normalizes error responses into a consistent shape
  - Settings page flow:
    1. User enters API token (stored in `.env.local` manually -- settings page just tests the connection)
    2. "Test Connection" button calls `GET /v2/team` and shows workspace name on success
    3. Cascading selects: Workspace -> Space -> Folder
    4. User selects a Space and Folder, saves to `clickup_config` table
  - Status mapping: After folder selection, fetch statuses from a List in that Folder and display a mapping UI (local status -> ClickUp status)

  **Patterns to follow:**
  - Typed fetch wrapper pattern with generics for response parsing
  - shadcn/ui Select and Card components for the hierarchy browser

  **Test scenarios:**
  - Client correctly adds auth header to all requests
  - Client throws typed error on 429 with reset timestamp
  - Client throws typed error on 401 (invalid token)
  - Settings page shows workspace name after successful connection test
  - Hierarchy browser loads Spaces after workspace selection
  - Saving config persists Space and Folder IDs to the database

  **Verification:**
  - Can connect to ClickUp, browse hierarchy, and save config through the settings UI
  - Config persists across page reloads

- [ ] **Unit 5: Task sync to ClickUp**

  **Goal:** When sync is configured, automatically push task creates and updates to ClickUp. If the sprint's ClickUp List doesn't exist, create it.

  **Requirements:** R6, R7, R8, R9, R10

  **Dependencies:** Units 3, 4

  **Files:**
  - Create: `src/lib/clickup/sync.ts` (syncTaskToClickUp, syncTaskStatusToClickUp, ensureClickUpList functions)
  - Modify: `src/lib/actions/tasks.ts` (add sync calls after local DB operations)
  - Modify: `src/lib/actions/sprints.ts` (add linkSprintToClickUp action)
  - Create: `src/components/features/sprint-clickup-link.tsx` (Client Component -- link sprint to ClickUp dialog)
  - Modify: `src/app/(dashboard)/sprints/[id]/page.tsx` (add sync status indicators, link button)
  - Test: `src/__tests__/lib/clickup/sync.test.ts`

  **Approach:**
  - **Linking a sprint**: Dialog on sprint detail page lets user link this sprint to a ClickUp List. Options:
    1. Select an existing List from the configured Folder
    2. Create a new List (sprint) in the Folder with the sprint's name and dates
  - **ensureClickUpList()**: If the sprint has a `clickupFolderId` but no `clickupListId`, create the List via `POST /v2/folder/{id}/list` and store the resulting ID
  - **Task sync flow** (in `createTask` Server Action):
    1. Insert task locally (always succeeds)
    2. Check if sprint is linked to ClickUp (`clickupListId` is not null)
    3. If linked: call `syncTaskToClickUp()` which does `POST /v2/list/{list_id}/task`
    4. On success: update local task with `clickupTaskId`
    5. On failure: insert error into `sync_log`, return success with sync warning
  - **Status sync flow** (in `updateTaskStatus` Server Action):
    1. Update status locally
    2. If task has `clickupTaskId`: call `PUT /v2/task/{clickup_task_id}` with mapped status
    3. Log result to `sync_log`
  - **Sync status indicators**: Badge on task rows showing sync state (synced/pending/error)

  **Patterns to follow:**
  - Fire-and-forget pattern: local operation never fails due to sync
  - ClickUp client error handling from Unit 4

  **Test scenarios:**
  - Creating a task in a linked sprint calls ClickUp create task API
  - Creating a task in an unlinked sprint does NOT call ClickUp
  - ClickUp API failure does not prevent local task creation
  - Sync failure is logged to sync_log table
  - Task with successful sync shows clickupTaskId in the database
  - Linking a sprint to a non-existent List creates the List first
  - Status update on a synced task pushes the mapped status to ClickUp
  - Status update on an unsynced task does NOT call ClickUp

  **Verification:**
  - Tasks created in a linked sprint appear in ClickUp
  - Status changes in the app reflect in ClickUp
  - Sync failures are visible in the UI but don't block local operations

- [ ] **Unit 6: Sync log and error visibility**

  **Goal:** Surface sync status and errors so the user knows what synced successfully and what failed.

  **Requirements:** R10

  **Dependencies:** Unit 5

  **Files:**
  - Create: `src/app/(dashboard)/sprints/[id]/sync-log/page.tsx` (sync log view for a sprint)
  - Create: `src/components/features/sync-status-badge.tsx` (reusable sync indicator)
  - Modify: `src/app/(dashboard)/sprints/[id]/page.tsx` (add sync log link, aggregate sync status)

  **Approach:**
  - Sync log page shows recent sync operations for the sprint's tasks (table: task title, action, success/fail, error message, timestamp)
  - Sprint header shows aggregate sync status: "All synced" / "3 sync errors"
  - Individual task rows show a small sync badge (green check / yellow warning / gray if unlinked)

  **Patterns to follow:**
  - shadcn/ui Badge with color variants for sync states
  - DataTable for sync log entries

  **Test scenarios:**
  - Sync log page shows entries for successful and failed syncs
  - Sprint header displays correct aggregate sync count
  - Task sync badge reflects the most recent sync result for that task

  **Verification:**
  - User can see which tasks synced successfully and which had errors
  - Sync log provides enough detail to diagnose issues

## System-Wide Impact

- **Interaction graph:** Server Actions are the single entry point for all mutations. ClickUp sync is called within the Server Action after local DB writes -- no separate middleware or observer pattern.
- **Error propagation:** ClickUp sync errors are caught and logged, never thrown to the UI layer. The Server Action returns a `syncWarning` field alongside the success response when sync fails.
- **State lifecycle risks:** Race condition if user rapidly creates tasks while sync is in progress -- mitigated by the fire-and-forget pattern (each sync call is independent). No optimistic UI in v1.
- **API surface parity:** N/A -- single-user app, no external API consumers.
- **Integration coverage:** ClickUp sync should be tested with mocked HTTP responses to verify the full Server Action -> DB -> ClickUp client flow.

## Risks & Dependencies

- **ClickUp API rate limit (100 req/min)**: Low risk at single-user scale. Would become an issue with batch operations or real-time polling. Mitigated by push-only sync and no polling.
- **ClickUp Sprints ClickApp must be pre-enabled**: The API cannot enable it. The settings page should detect this and guide the user.
- **SQLite concurrency**: Not an issue for single-user. Would need to switch to WAL mode or Postgres for multi-user.
- **ClickUp API v2 stability**: v2 remains active alongside v3 with no announced deprecation. Low risk for the near term.

## Sources & References

- ClickUp API v2 docs: developer.clickup.com
- ClickUp Sprints Help: help.clickup.com (Sprint Folders, adding tasks to sprints)
- Next.js App Router: nextjs.org/docs
- Drizzle ORM: orm.drizzle.team/docs
- shadcn/ui: ui.shadcn.com
