---
date: 2026-03-30
topic: multi-user-sprint-tracker
---

# Multi-User Sprint Tracker

## Problem Frame

The sprint tracker is currently a single-user app with no authentication, no concept of users, and no collaboration features. To support team-based sprint planning, users need to sign in, assign work, communicate on tasks, and manage a backlog of user stories that feed into sprints.

## Requirements

### Google Authentication & Users

- R1. Users sign in via Google OAuth (NextAuth v5, JWT strategy), following the pattern in the parnellsystems-platform reference project
- R2. Whitelist-only access — only pre-approved email addresses can sign in. An admin can add/remove allowed users
- R3. Protected routes — all app routes require authentication; unauthenticated users are redirected to a login page

### Human-Readable IDs

- R4. User stories get sequential IDs with prefix `US-` (e.g. `US-1`, `US-2`)
- R5. Tasks get sequential IDs with prefix `T-` (e.g. `T-1`, `T-2`)
- R6. Sub-tasks get sequential IDs with prefix `ST-` (e.g. `ST-1`, `ST-2`)
- R7. These short IDs are displayed wherever the entity appears (cards, lists, detail views)
- R8. A running total of user stories and tasks is visible in the UI (e.g. sidebar or section headers)

### Backlog & User Stories

- R9. "Backlog" is a new top-level menu item, positioned above "Sprints" in the sidebar
- R10. A backlog is an ordered list of user stories
- R11. User stories are a new entity with: title, description, priority, assignee, short ID (`US-n`), and sort order
- R12. User stories can be easily reordered via drag-and-drop
- R13. A user story can be broken down into multiple tasks. When tasks are created from a story, they are linked to that story
- R14. User stories can be moved into a sprint — this adds the story's tasks to that sprint

### Task Assignment & Ownership

- R15. Tasks can be assigned to any user in the system
- R16. When a task is assigned or reassigned, the assignee receives both an email notification (via Resend) and an in-app notification
- R17. User stories can also be assigned to a user

### Task Notes / Comments

- R18. Any logged-in user can leave notes (comments) on a task or user story
- R19. Notes display newest-first
- R20. Each note shows the author, timestamp, and content
- R21. Reassigning a task from within the notes/detail view is supported; a notification is always sent

### Sub-Tasks

- R22. Tasks can have sub-tasks. Sub-tasks are nested within their parent task
- R23. Sub-tasks have their own: title, description, status, priority, assignee, short ID (`ST-n`), and notes
- R24. By default, a new sub-task is assigned to the parent task's assignee
- R25. Sub-tasks can be reassigned to any user (triggers notification)
- R26. Sub-tasks can be moved between parent tasks

### In-App Notifications

- R27. Bell icon in the header with unread notification count, specific to the logged-in user
- R28. Notification triggers: task/sub-task assignment, reassignment, and new notes on tasks assigned to you
- R29. Notifications can be marked as read individually or all-at-once

## Success Criteria

- Users can sign in with Google and only whitelisted emails are admitted
- A backlog of ordered user stories exists and stories can be broken into tasks and moved into sprints
- Tasks, sub-tasks, and stories display short human-readable IDs
- Assigning or reassigning work sends both email and in-app notifications
- Users can leave notes on any task or story, newest-first
- Sub-tasks nest under parent tasks and can be moved between parents
- Running totals of stories and tasks are visible

## Scope Boundaries

- No role-based permissions beyond admin (who manages the whitelist) — all authenticated users have equal access
- No real-time collaboration (websockets) — standard request/response is fine
- No Slack or other third-party notification integrations
- ClickUp sync is not extended to cover new entities (stories, sub-tasks, notifications) in this phase
- No file attachments on notes
- No @mentions in notes

## Key Decisions

- **Whitelist-only auth**: Matches reference project pattern; admin manages allowed users
- **Resend for email**: Modern API, good free tier, React Email support
- **User stories as separate entity**: Stories live in the backlog and decompose into tasks — they are not tasks themselves
- **Prefixed sequential IDs**: `US-`, `T-`, `ST-` prefixes for clarity at a glance
- **Both email + in-app notifications**: Bell icon with unread count plus Resend emails on assignment/reassignment

## Dependencies / Assumptions

- Google Cloud OAuth credentials (client ID + secret) will be configured
- Resend API key will be configured
- A "from" email domain will be set up with Resend (or use their default sandbox for dev)
- LibSQL/Turso can handle the additional tables (users, stories, notes, notifications) — no migration to Postgres needed

## Outstanding Questions

### Deferred to Planning

- [Affects R1][Needs research] NextAuth v5 compatibility with Next.js 16 — the reference project uses Next.js 15. May need to check for breaking changes or use Auth.js v5 stable
- [Affects R2][Technical] How to build the admin UI for managing the user whitelist — settings page tab vs. dedicated page
- [Affects R11][Technical] Whether user stories should belong to a specific backlog or if there's a single global backlog
- [Affects R14][Technical] When moving a story to a sprint, whether the story itself tracks which sprint it's in or if only its child tasks do
- [Affects R8][Technical] Where exactly to display running totals — sidebar, page headers, or both

## Next Steps

→ `/ce:plan` for structured implementation planning
