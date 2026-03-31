---
date: 2026-04-01
topic: products-issue-types
---

# Products, Issue Types & Sidebar Restructure

## Problem Frame

The sprint tracker currently has a flat structure: one backlog, no concept of which product work belongs to, and no way to distinguish bugs from feature requests from user stories. As the user builds multiple products simultaneously, the single backlog becomes unmanageable and there's no quick way to capture defects or feature requests for any product.

## Requirements

### Sidebar Restructure
- R1. Sidebar splits into two root sections: **Backlogs** and **Sprints**
- R2. The Backlogs section contains product folders. Each product folder has its own backlog of stories. Product folders can be nested (sub-products/modules)
- R3. The Sprints section contains sprint folders and sprints (existing folder mechanism). Typically flat, but nesting is allowed
- R4. Settings and Admin move out of the sidebar into the top-right corner (icon-based)

### Products
- R5. A new "Product" concept represented as nestable backlog folders. Each product folder owns a backlog of stories
- R6. Stories belong to exactly one product (via their backlog folder)
- R7. Sprints are cross-product — a single sprint can contain stories/tasks from multiple product backlogs
- R8. Products are managed in the sidebar (create, rename, nest, reorder) similar to existing folder management

### Issue Types
- R9. Stories gain a `type` field with values: `user_story`, `feature_request`, `bug`
- R10. Default type is `user_story` (backward compatible with existing stories)
- R11. Issue type is displayed as an icon/badge on story cards and list views
- R12. Backlog views are filterable by issue type

### Quick Bug/Feature Submit
- R13. A persistent, lightweight UI element (floating button or similar) available across all pages for logged-in users
- R14. Clicking it opens a compact form to submit a bug or feature request
- R15. The form requires: title, type (bug or feature_request), and product (selected from existing product folders)
- R16. Submitting creates a new story in the selected product's backlog with status `backlog`
- R17. Optional fields: description, priority

## Success Criteria
- All existing stories migrate cleanly with type `user_story` and are assigned to a default product
- Backlog page shows stories scoped to the selected product folder
- Sprint pages continue to show all work regardless of product
- A bug can be submitted from any page in under 5 seconds

## Scope Boundaries
- No public-facing submission forms (logged-in users only)
- No per-product permissions or team isolation
- No changes to the Task or SubTask entity model
- Tags remain task-level only (no change)
- Customers remain as-is (orthogonal to products)

## Key Decisions
- **Products own backlogs, not sprints**: A sprint pulls work from any product. This matches the user's real workflow of mixing product work in a single sprint
- **Issue type on Story, not a separate entity**: Simplest approach — same table, same backlog, just a type field and filter
- **Product = nestable backlog folder**: Reuses the existing folder pattern rather than inventing a new concept. The key difference from sprint folders is that backlog folders own stories
- **Settings/Admin to top-right**: Frees sidebar for the two core navigation sections

## Outstanding Questions

### Deferred to Planning
- [Affects R5, R6][Technical] How to migrate existing stories to a default product — create one automatically or prompt user?
- [Affects R1-R3][Technical] Should backlog folders and sprint folders share the `folders` table with a `type` discriminator, or use separate tables?
- [Affects R2][Technical] How deep can product folder nesting go? Recommend capping at 2 levels
- [Affects R13-R14][Needs research] Best UX pattern for the quick-submit widget — floating action button, command palette, or keyboard shortcut?

## Next Steps
-> /ce:plan for structured implementation planning
