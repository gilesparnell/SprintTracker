# Sprint Tracker — Development Plan

## W1: Core Infrastructure & Auth
- [x] Database schema (SQLite/Turso + Drizzle ORM)
- [x] NextAuth v5 with Google OAuth + dev credentials
- [x] Email whitelist system (allowed_emails table)
- [x] User roles (admin/user) + status (active/inactive)
- [x] Admin-seeded migration (gilesparnell@gmail.com)
- [x] JWT session with cached user status (60s TTL)
- [x] requireAuth() + requireAdmin() middleware
- [x] Stale JWT self-healing (DB fallback)

## W2: Sprint Management
- [x] Sprint CRUD (create, read, update, delete)
- [x] Sprint statuses (planning, active, completed)
- [x] Sprint folders for organisation
- [x] Sprint detail page with task views
- [x] Sprint goal tracking
- [x] Sprint date management

## W3: User Stories & Backlog
- [x] Story CRUD with sequence numbers (S-1, S-2...)
- [x] Story types (user_story, feature_request, bug)
- [x] Backlog page with pagination
- [x] Move stories to/from sprints
- [x] Drag-and-drop story reordering
- [x] Story detail page with child tasks
- [x] Story deletion modes (cascade, unlink, reassign)
- [x] Product-filtered backlog views

## W4: Task Management
- [x] Task CRUD with sequence numbers (T-1, T-2...)
- [x] Task statuses (open, in_progress, done)
- [x] Task priorities (low, medium, high, urgent)
- [x] Task assignment to users
- [x] Task detail page with subtasks and notes
- [x] Kanban board view (columns by status)
- [x] List view with filters
- [x] Convert task to story
- [x] Remove task from sprint

## W5: Subtasks
- [x] Subtask CRUD with sequence numbers (ST-1, ST-2...)
- [x] Inherit parent task assignee on creation
- [x] Move subtask between parent tasks
- [x] Subtask status updates

## W6: Notes & Comments
- [x] Polymorphic notes (story/task/subtask)
- [x] 5-minute edit window
- [x] Author ownership enforcement
- [x] Note deletion with author check
- [x] Cascade delete with parent entities

## W7: Notification System
- [x] Assignment notifications (story/task/subtask)
- [x] Reassignment notifications
- [x] Note-added notifications
- [x] Self-notification suppression
- [x] 30-second deduplication window
- [x] Notification bell with unread badge (30s polling)
- [x] Mark as read / mark all as read
- [x] User isolation (ownership check)
- [x] Cascade delete on entity deletion
- [x] Email templates (Resend integration)

## W8: Products & Categorisation
- [x] Product CRUD with colour picker
- [x] 2-level product hierarchy (parent/child)
- [x] Product backlog pages
- [x] Sidebar product tree with backlog counts
- [x] Tags system with colour coding
- [x] Tag management in settings
- [x] Customer management with colours
- [x] Task-tag many-to-many association

## W9: Admin Panel
- [x] Admin-only page with role gating
- [x] User listing with roles and status
- [x] Inline user editing (name, username, role)
- [x] Toggle user active/inactive
- [x] Two-step delete confirmation
- [x] Self-deletion prevention
- [x] Whitelist management (add/remove emails)

## W10: ClickUp Integration
- [x] API token configuration
- [x] Space/folder/list browser
- [x] Link sprint to ClickUp list
- [x] Push tasks to ClickUp (one-way sync)
- [x] Sync log page for debugging
- [ ] Bidirectional sync (pull from ClickUp)

## W11: UI/UX & Polish
- [x] Dark theme throughout
- [x] Mobile responsive layout
- [x] Sidebar navigation with active states
- [x] User menu with avatar
- [x] Quick submit FAB (bug/feature)
- [x] Sprint product badges
- [x] Sprint UI declutter (5 rows to 3)
- [x] Combined filter row with labels
- [x] Lazy-loaded widgets (QuickSubmit, LoveNotes)
- [ ] Drag-and-drop kanban cards
- [ ] Keyboard shortcuts

## W12: Testing & Quality
- [x] Schema validation tests
- [x] Sprint action tests
- [x] Task action tests
- [x] User action tests (14 tests)
- [x] ClickUp client + sync tests
- [x] Multi-user integration flow (14 tests)
- [x] Notification system integration (21 tests)
- [x] Build validation test
- [ ] E2E browser tests (Playwright)
- [ ] API route integration tests

## W13: Future — Search & Reporting
- [ ] Global search across entities
- [ ] Sprint burndown charts
- [ ] Velocity tracking
- [ ] Sprint reports / retrospective view

## W14: Future — Advanced Features
- [ ] Bulk operations (edit/delete)
- [ ] Sprint templates / duplication
- [ ] File attachments on notes
- [ ] Custom fields on entities
- [ ] Fine-grained permissions (team-based)
- [ ] Webhooks for external integrations
- [ ] Archive status for stories
