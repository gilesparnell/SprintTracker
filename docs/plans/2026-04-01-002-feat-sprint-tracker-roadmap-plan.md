---
title: "feat: Sprint Tracker Development Roadmap"
type: feat
status: active
date: 2026-04-01
---

# Sprint Tracker — Development Roadmap

> **User Guide:** [docs/user-guide.html](../user-guide.html) | **Progress Diagram:** [docs/diagrams/plan-progress.html](../diagrams/plan-progress.html)

## Overview

The Sprint Tracker is 88% complete across its core feature set. This roadmap documents what's been built, what remains, and the prioritised sequence for completing the remaining 12% across 5 workstreams.

## Current State: What's Built

| Workstream | Status | Tasks |
|---|---|---|
| W1: Core Infrastructure & Auth | **100%** | Schema, NextAuth v5, whitelist, roles, JWT healing |
| W2: Sprint Management | **100%** | CRUD, statuses, folders, detail page, goals, dates |
| W3: User Stories & Backlog | **100%** | CRUD, types, pagination, DnD reorder, deletion modes |
| W4: Task Management | **100%** | CRUD, statuses, kanban, list view, convert-to-story |
| W5: Subtasks | **100%** | CRUD, assignee inheritance, move between parents |
| W6: Notes & Comments | **100%** | Polymorphic notes, 5-min edit window, cascade delete |
| W7: Notification System | **100%** | Assignment/reassignment/note, dedup, bell UI, email |
| W8: Products & Categorisation | **100%** | Hierarchy, backlog views, tags, customers |
| W9: Admin Panel | **100%** | User CRUD, roles, status toggle, whitelist management |

**Test coverage:** 79 tests across 9 files (schema, actions, integration, build validation, notification system).

---

## Remaining Work: Prioritised Phases

### Phase 0 — Quality & Confidence (P0)

_Estimated effort: Small. High value — catches regressions before adding features._

#### P0.1: E2E Browser Tests (Playwright)

**Problem:** All tests currently run at the action/integration layer. No tests verify the actual running application in a browser — forms, navigation, auth flows, and UI rendering are untested end-to-end.

**Approach:**
- Install Playwright and configure for the Next.js dev server
- Use the existing `dev-login` Credentials provider (active in `NODE_ENV=development`) for test auth — no need to mock Google OAuth
- Cover the critical user journeys:
  - Login flow (dev credentials)
  - Create sprint → add story → move to sprint → create task → change status → complete sprint
  - Backlog: add story, drag to reorder, move to sprint
  - Quick Submit FAB: submit bug, verify it appears in backlog
  - Notification bell: verify badge appears after assignment
  - Admin panel: user listing, role change (admin-only gate)
  - Settings: create/edit/delete tag, customer, product

**Files to create:**
- `playwright.config.ts`
- `e2e/auth.setup.ts` — shared auth state
- `e2e/sprint-lifecycle.spec.ts`
- `e2e/backlog.spec.ts`
- `e2e/quick-submit.spec.ts`
- `e2e/notifications.spec.ts`
- `e2e/admin.spec.ts`
- `e2e/settings.spec.ts`

**Acceptance criteria:**
- [ ] Playwright installed and configured
- [ ] Auth setup uses dev credentials provider
- [ ] 6+ spec files covering core user journeys
- [ ] All specs pass in headless mode
- [ ] `npm run test:e2e` script added to package.json

#### P0.2: API Route Integration Tests

**Problem:** API routes are thin dispatchers but they handle auth, request parsing, and response shaping — none of which is tested. A broken route handler would only be caught by manual testing or Playwright.

**Approach:**
- Test routes by calling them directly via `fetch()` against the dev server, or by importing route handlers and calling them with `NextRequest` objects (existing pattern in the codebase)
- Cover auth enforcement (401 without session, 403 for admin routes)
- Cover request validation (400 for malformed input)
- Cover happy paths (200/201 with correct response shape)

**Key routes to test:**
- `POST /api/stories` — create story
- `PATCH /api/tasks/[id]` — update task
- `DELETE /api/admin/users/[id]` — admin-only, self-deletion prevention
- `GET /api/notifications/unread-count` — auth required
- `POST /api/products` — create product, revalidates sidebar

**Files to create:**
- `src/__tests__/api/stories.test.ts`
- `src/__tests__/api/tasks.test.ts`
- `src/__tests__/api/admin.test.ts`
- `src/__tests__/api/notifications.test.ts`
- `src/__tests__/api/products.test.ts`

**Acceptance criteria:**
- [ ] Route handler tests for 5+ API endpoints
- [ ] Auth enforcement verified (401/403 responses)
- [ ] Request validation verified (400 responses)
- [ ] Happy path responses verified (status + shape)
- [ ] All tests pass in `npx vitest run`

---

### Phase 1 — UI Polish (P1)

_Estimated effort: Medium. High user impact — daily workflow improvements._

#### P1.1: Kanban Drag-and-Drop

**Problem:** The kanban board shows tasks in status columns but status changes require clicking. Users expect to drag cards between columns (Open → In Progress → Done).

**Approach:**
- Extend the existing `@dnd-kit/react` setup (already used in `backlog-list.tsx` for story reordering)
- Add `DragDropProvider` to the kanban board component
- Each column is a droppable container with `group` and `accept` config
- On drop across columns: call `PATCH /api/tasks/[id]/status` with the new status
- Optimistic UI update with snapshot rollback on failure

**Key files:**
- `src/components/features/kanban-board.tsx` — add DnD wrappers
- `src/app/api/tasks/[id]/status/route.ts` — already exists (handles ClickUp sync too)

**Acceptance criteria:**
- [ ] Tasks can be dragged between kanban columns
- [ ] Status updates on drop (persisted + ClickUp synced if linked)
- [ ] Optimistic UI with rollback on failure
- [ ] Visual drag feedback (ghost card, drop indicator)
- [ ] Works on touch devices

#### P1.2: Keyboard Shortcuts

**Problem:** Power users want keyboard shortcuts for common actions — navigating between views, creating items, changing status.

**Approach:**
- Install `react-hotkeys-hook` or implement with `useEffect` + `keydown`
- Global shortcuts (work anywhere): `n` = new task, `s` = new story, `/` = focus search (future), `?` = show shortcut help
- Context shortcuts (sprint detail): `1`/`2`/`3` = switch kanban columns, `b` = board view, `l` = list view
- Show a help overlay with `?` key

**Key files:**
- `src/components/features/keyboard-shortcuts.tsx` — provider + help overlay
- `src/app/(dashboard)/layout.tsx` — mount the provider

**Acceptance criteria:**
- [ ] Global shortcuts for common actions
- [ ] Context-aware shortcuts on sprint detail page
- [ ] `?` shows help overlay listing all shortcuts
- [ ] Shortcuts disabled when typing in input/textarea fields

#### P1.3: Archive Status for Stories

**Problem:** Completed stories can only be "done" — there's no way to archive them out of view without deleting them. Over time, the done list grows unwieldy.

**Approach:**
- Add `"archived"` to the story status enum via migration
- Update `getStories()` to exclude archived by default (add `includeArchived` filter param)
- Add "Archive" action on story cards/detail (separate from "Done")
- Add "Show archived" toggle in backlog view

**Key files:**
- New migration: `ALTER TABLE user_stories...` — add archived status
- `src/lib/validators/shared.ts` — add to `storyStatusEnum`
- `src/lib/actions/stories.ts` — update `getStories()` filter
- `src/components/features/backlog-list.tsx` — add archive toggle

**Acceptance criteria:**
- [ ] Stories can be archived from done state
- [ ] Archived stories hidden by default in backlog/sprint views
- [ ] "Show archived" toggle reveals them
- [ ] Archived stories can be un-archived (moved back to backlog)

---

### Phase 2 — Integration & Intelligence (P2)

_Estimated effort: Large. Moderate priority — enhances workflow but not blocking._

#### P2.1: Bidirectional ClickUp Sync

**Problem:** Current sync is push-only (Tracker → ClickUp). Changes made in ClickUp don't flow back, causing data drift between systems.

**Approach:**
- **Option A (Polling):** Periodic fetch of ClickUp list tasks, diff against local state, apply changes. Simpler but delayed.
- **Option B (Webhooks):** Register a ClickUp webhook for task events, receive real-time updates. More complex but instant.
- **Recommended:** Start with polling (cron job or manual "Sync from ClickUp" button), add webhooks later.

**Technical considerations:**
- Conflict resolution: Last-write-wins based on `updatedAt` timestamps, with sync log for audit
- Field mapping: Status (using existing `statusMapping` in `clickupConfig`), title, description, assignee
- The `ClickUpClient` needs `getTasks(listId)` and `getTask(taskId)` methods
- New `syncDirection` field on `syncLog`: `"push"` | `"pull"`

**Key files:**
- `src/lib/clickup/client.ts` — add `getTasks()`, `getTask()` methods
- `src/lib/clickup/sync.ts` — add `pullTasksFromClickUp()`, conflict resolution
- `src/app/api/clickup/webhook/route.ts` — new webhook endpoint (Phase 2b)
- `src/lib/actions/clickup-config.ts` — add sync trigger action

**Acceptance criteria:**
- [ ] "Sync from ClickUp" button on sprint detail pulls task updates
- [ ] Status, title, description changes sync from ClickUp
- [ ] Conflict resolution with last-write-wins
- [ ] Sync log records pull operations
- [ ] No data loss on concurrent edits

#### P2.2: Global Search

**Problem:** No way to find a specific story, task, or subtask without browsing through pages. As the dataset grows, this becomes a major friction point.

**Approach:**
- Use SQLite FTS5 (full-text search) for performant search across titles and descriptions
- Create FTS virtual tables via Drizzle raw SQL migration
- Search API endpoint returns results grouped by entity type with highlighting
- Search UI: command palette (Cmd+K) with instant results

**Key files:**
- New migration: Create FTS5 virtual tables + triggers to keep in sync
- `src/lib/actions/search.ts` — FTS query function
- `src/app/api/search/route.ts` — search endpoint
- `src/components/features/search-palette.tsx` — Cmd+K UI

**Acceptance criteria:**
- [ ] FTS5 indexes on stories, tasks, subtasks (title + description)
- [ ] Search returns results grouped by type with match highlighting
- [ ] Cmd+K opens search palette from anywhere
- [ ] Results link to entity detail pages
- [ ] Search respects auth (only returns user-visible entities)

#### P2.3: Sprint Burndown & Velocity

**Problem:** No visibility into sprint progress over time. Teams can't tell if they're on track or estimate future capacity.

**Approach:**
- **Burndown:** Snapshot daily task counts (open/in_progress/done) per sprint. Chart ideal vs actual burndown.
- **Velocity:** Track story points or task counts completed per sprint. Show rolling average.
- **Implementation:** Daily snapshot via a lightweight cron or derive from task `updatedAt` timestamps (historical reconstruction).
- **Charting:** Install `recharts` (lightweight, React-native) for interactive charts.

**Key files:**
- `src/lib/db/schema.ts` — add `sprintSnapshots` table (sprintId, date, openCount, inProgressCount, doneCount)
- `src/lib/actions/reports.ts` — snapshot creation + query functions
- `src/app/(dashboard)/sprints/[id]/reports/page.tsx` — burndown chart page
- `src/components/features/burndown-chart.tsx` — recharts component
- `src/components/features/velocity-chart.tsx` — cross-sprint velocity

**Acceptance criteria:**
- [ ] Daily snapshots recorded for active sprints
- [ ] Burndown chart shows ideal vs actual line
- [ ] Velocity chart shows tasks completed per sprint (last 5 sprints)
- [ ] Charts responsive and readable on mobile

---

### Phase 3 — Advanced Features (P3)

_Estimated effort: Large. Lower priority — nice-to-have for power users._

#### P3.1: Bulk Operations

**Problem:** Managing many tasks requires clicking through each one individually. Bulk status changes, assignments, and deletions would save significant time.

**Current state:** Backlog has basic bulk delete (fires parallel requests). No batch API endpoints exist.

**Approach:**
- Add batch API endpoints: `POST /api/tasks/batch` (accepts array of operations)
- Extend selection UI in list view and backlog with action toolbar
- Actions: bulk assign, bulk status change, bulk move to sprint, bulk delete
- Use Drizzle transactions for atomicity

**Acceptance criteria:**
- [ ] Batch API endpoint for task operations
- [ ] Multi-select in list view and backlog
- [ ] Action toolbar appears on selection (assign, status, move, delete)
- [ ] Operations are atomic (all-or-nothing)

#### P3.2: Sprint Templates

**Problem:** Teams often create sprints with similar structures (same story types, recurring tasks). No way to save and reuse sprint configurations.

**Approach:**
- `sprint_templates` table storing name, goal, duration, default stories/tasks as JSON
- "Save as Template" button on sprint detail
- "Create from Template" option on sprint creation form
- Template instantiation creates sprint + stories + tasks with new IDs

**Acceptance criteria:**
- [ ] Save any sprint as a template
- [ ] Create sprint from template (copies structure, not data)
- [ ] Template management page in settings

#### P3.3: File Attachments

**Problem:** Notes are text-only. Teams need to attach screenshots, documents, and design files to stories and tasks.

**Approach:**
- Use Vercel Blob or Cloudflare R2 for file storage
- `attachments` table following polymorphic pattern (entityType, entityId, filename, url, size, mimeType)
- Upload API route with multipart handling
- File preview for images, download link for others
- Attach to notes or directly to entities

**Acceptance criteria:**
- [ ] File upload on stories, tasks, subtasks, and notes
- [ ] Image preview in-line
- [ ] File size limit (10MB default)
- [ ] Cascade delete with parent entity

#### P3.4: Custom Fields

**Problem:** Different teams need different metadata on their entities (story points, T-shirt sizes, custom tags, deadlines).

**Approach:**
- EAV pattern: `custom_field_definitions` table (name, type, entityType, options) + `custom_field_values` table (entityType, entityId, fieldId, value)
- Field types: text, number, select, multi-select, date
- Admin UI to define fields in settings
- Fields render on entity detail pages and optionally in list views

**Acceptance criteria:**
- [ ] Admin can define custom fields per entity type
- [ ] 5 field types supported (text, number, select, multi-select, date)
- [ ] Custom fields display on detail pages
- [ ] Custom field values editable inline

#### P3.5: Fine-Grained Permissions

**Problem:** Current auth is binary (admin/user). All users can modify all entities. Teams need resource-level access control.

**Approach:**
- Add `teams` table and `team_members` join table
- Stories and sprints get a `teamId` owner
- `requirePermission(resource, action)` helper extending `requireAuth()`
- Permissions: owner (full), team member (edit), viewer (read-only)

**Acceptance criteria:**
- [ ] Teams can be created and managed
- [ ] Entities scoped to teams
- [ ] Non-team members get read-only access
- [ ] Admin retains full access to everything

#### P3.6: Webhooks

**Problem:** No way for external systems to react to Sprint Tracker events (task completed, story created, sprint started).

**Approach:**
- `webhook_endpoints` table (url, events[], secret, active)
- Event emission on key mutations (story/task/sprint create/update/delete)
- HMAC signature on payloads for verification
- Webhook management UI in settings
- Retry with exponential backoff (3 attempts)

**Acceptance criteria:**
- [ ] Webhook endpoints configurable in settings
- [ ] Events emitted for CRUD on stories, tasks, sprints
- [ ] HMAC signature verification
- [ ] Retry logic with backoff
- [ ] Delivery log viewable in settings

---

## Implementation Sequence

```
P0 (Now)        P1 (Next)           P2 (Later)              P3 (Future)
─────────────── ──────────────────── ─────────────────────── ───────────────────
E2E Tests       Kanban DnD           ClickUp Bidirectional   Bulk Operations
API Route Tests Keyboard Shortcuts   Global Search           Sprint Templates
                Archive Status       Burndown & Velocity     File Attachments
                                                             Custom Fields
                                                             Permissions
                                                             Webhooks
```

## Dependencies

| Feature | Depends On | Blocked By |
|---|---|---|
| Kanban DnD | @dnd-kit (installed) | Nothing |
| Keyboard Shortcuts | Nothing | Nothing |
| Archive Status | Schema migration | Nothing |
| ClickUp Bidirectional | ClickUp API access | Nothing |
| Global Search | SQLite FTS5 migration | Nothing |
| Burndown Charts | recharts (to install) | Daily snapshot mechanism |
| Bulk Operations | Batch API endpoints | Nothing |
| Sprint Templates | Nothing | Nothing |
| File Attachments | Blob storage provider | Account setup |
| Custom Fields | EAV migration | Nothing |
| Permissions | Teams schema | Nothing |
| Webhooks | Event emission layer | Nothing |

## Sources & References

- **Progress diagram:** [docs/diagrams/plan-progress.html](../diagrams/plan-progress.html)
- **User guide:** [docs/user-guide.html](../user-guide.html)
- **Existing DnD pattern:** `src/components/features/backlog-list.tsx`
- **Auth helpers:** `src/lib/auth-helpers.ts` (requireAuth/requireAdmin)
- **ClickUp client:** `src/lib/clickup/client.ts`
- **Test infrastructure:** `vitest.config.ts`, `src/__tests__/integration/`
- **AGENTS.md warning:** Next.js 16.2.1 has breaking changes — always reference `node_modules/next/dist/docs/`
