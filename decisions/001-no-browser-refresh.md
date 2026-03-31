# Decision 001: No Browser Refresh Required

**Date:** 2026-03-31
**Status:** Active

## Rule

After any modal closes or data is added/updated/deleted via any UI interaction, the page must reflect the change immediately without requiring a manual browser refresh.

## Implementation

- After a successful mutation (create, update, delete), always call `router.refresh()` to revalidate server components, OR use optimistic UI updates via local state.
- Dialogues/modals must close AND the underlying list/view must update in the same action flow.
- This applies to all entities: stories, tasks, subtasks, notes, tags, customers, sprints.
- Never rely on the user hitting F5/Cmd+R to see their changes.

## Rationale

Requiring a browser refresh after a data operation breaks the user's flow and feels broken. A modern web app must reflect state changes instantly.
