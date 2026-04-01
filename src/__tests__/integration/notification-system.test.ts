import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { eq, and } from "drizzle-orm";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  users,
  allowedEmails,
  sequences,
  sprints,
  userStories,
  tasks,
  subTasks,
  notes,
  notifications,
  products,
} from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import { upsertUser } from "@/lib/actions/users";
import { createSprint } from "@/lib/actions/sprints";
import { createStory, updateStory, deleteStory } from "@/lib/actions/stories";
import { createTask, updateTask } from "@/lib/actions/tasks";
import { createSubTask, updateSubTask, deleteSubTask } from "@/lib/actions/subtasks";
import { createNote } from "@/lib/actions/notes";
import {
  createNotification,
  getUnreadCount,
  getNotificationsForUser,
  markAsRead,
} from "@/lib/actions/notifications";
import { triggerNotification } from "@/lib/helpers/notify";

describe("Notification System", () => {
  let db: ReturnType<typeof drizzle>;
  let dbPath: string;

  // Shared test users
  let alice: { id: string; email: string; name: string | null };
  let bob: { id: string; email: string; name: string | null };
  let productId: string;

  beforeAll(async () => {
    dbPath = path.join(os.tmpdir(), `notif-test-${Date.now()}.db`);
    const client = createClient({ url: `file:${dbPath}` });
    db = drizzle(client);
    await migrate(db, { migrationsFolder: "./drizzle" });
  });

  afterAll(() => {
    try { fs.unlinkSync(dbPath); } catch {}
    try { fs.unlinkSync(`${dbPath}-journal`); } catch {}
    try { fs.unlinkSync(`${dbPath}-wal`); } catch {}
    try { fs.unlinkSync(`${dbPath}-shm`); } catch {}
  });

  beforeEach(async () => {
    // Clear all data in correct FK order
    await db.delete(notifications);
    await db.delete(notes);
    await db.delete(subTasks);
    await db.delete(tasks);
    await db.delete(userStories);
    await db.delete(sprints);
    await db.delete(products);
    await db.delete(allowedEmails);
    await db.delete(users);
    await db.update(sequences).set({ value: 0 });

    // Seed shared users + product
    alice = (await upsertUser(db, { email: "alice@test.com", name: "Alice" }))!;
    bob = (await upsertUser(db, { email: "bob@test.com", name: "Bob" }))!;
    productId = uuid();
    await db.insert(products).values({ id: productId, name: "Core", color: "#6b7280" });
  });

  // ── A. Story Notification Triggers ──────────────────────────

  describe("A. Story notification triggers", () => {
    it("A1: createStory with different assignee triggers assignment notification", async () => {
      const result = await createStory(db, alice.id, {
        title: "Build dashboard",
        assignedTo: bob.id,
        productId,
      });
      expect(result.success).toBe(true);

      // Give fire-and-forget notification time to settle
      await new Promise((r) => setTimeout(r, 100));

      const bobUnread = await getUnreadCount(db, bob.id);
      expect(bobUnread).toBe(1);

      const bobNotifs = await getNotificationsForUser(db, bob.id);
      expect(bobNotifs).toHaveLength(1);
      expect(bobNotifs[0].type).toBe("assignment");
      expect(bobNotifs[0].entityType).toBe("story");
      expect(bobNotifs[0].entityId).toBe(result.data!.id);
      expect(bobNotifs[0].title).toContain("assigned to");
    });

    it("A2: createStory assigned to self creates no notification", async () => {
      await createStory(db, alice.id, {
        title: "Self-assigned story",
        assignedTo: alice.id,
        productId,
      });

      await new Promise((r) => setTimeout(r, 100));

      const aliceUnread = await getUnreadCount(db, alice.id);
      expect(aliceUnread).toBe(0);
    });

    it("A3: updateStory reassignment triggers reassignment notification", async () => {
      const story = await createStory(db, alice.id, {
        title: "Reassign me",
        assignedTo: alice.id,
        productId,
      });

      // Reassign from Alice to Bob
      const updated = await updateStory(db, alice.id, story.data!.id, {
        title: "Reassign me",
        priority: "medium",
        productId,
        assignedTo: bob.id,
      });
      expect(updated.success).toBe(true);

      await new Promise((r) => setTimeout(r, 100));

      const bobNotifs = await getNotificationsForUser(db, bob.id);
      expect(bobNotifs).toHaveLength(1);
      expect(bobNotifs[0].type).toBe("reassignment");
      expect(bobNotifs[0].title).toContain("reassigned");
    });

    it("A4: updateStory first assignment (was null) triggers assignment notification", async () => {
      const story = await createStory(db, alice.id, {
        title: "Unassigned story",
        productId,
      });

      // First assignment to Bob
      const updated = await updateStory(db, alice.id, story.data!.id, {
        title: "Unassigned story",
        priority: "medium",
        productId,
        assignedTo: bob.id,
      });
      expect(updated.success).toBe(true);

      await new Promise((r) => setTimeout(r, 100));

      const bobNotifs = await getNotificationsForUser(db, bob.id);
      expect(bobNotifs).toHaveLength(1);
      expect(bobNotifs[0].type).toBe("assignment");
      expect(bobNotifs[0].title).toContain("assigned to");
    });
  });

  // ── B. SubTask Notification Triggers ────────────────────────

  describe("B. SubTask notification triggers", () => {
    let sprintId: string;
    let taskId: string;

    beforeEach(async () => {
      const sprint = await createSprint(db, {
        name: "Sprint 1",
        startDate: "2026-04-01",
        endDate: "2026-04-14",
      });
      sprintId = sprint.sprint!.id;

      const task = await createTask(db, sprintId, {
        title: "Parent task",
        assignedTo: bob.id,
      }, alice.id);
      taskId = task.task!.id;

      // Wait for fire-and-forget notifications from task creation to settle, then clear
      await new Promise((r) => setTimeout(r, 150));
      await db.delete(notifications);
    });

    it("B1: createSubTask inherits parent assignee and notifies if different from creator", async () => {
      // Alice creates subtask → inherits Bob's assignment → Bob gets notified
      const result = await createSubTask(db, alice.id, taskId, {
        title: "Sub work",
      });
      expect(result.success).toBe(true);
      expect(result.data!.assignedTo).toBe(bob.id);

      await new Promise((r) => setTimeout(r, 100));

      const bobUnread = await getUnreadCount(db, bob.id);
      expect(bobUnread).toBe(1);

      const bobNotifs = await getNotificationsForUser(db, bob.id);
      expect(bobNotifs[0].type).toBe("assignment");
      expect(bobNotifs[0].entityType).toBe("subtask");
    });

    it("B2: createSubTask with self as assignee creates no notification", async () => {
      // Bob creates subtask on his own task → inherits his own assignment → no notification
      const result = await createSubTask(db, bob.id, taskId, {
        title: "Self sub",
      });
      expect(result.success).toBe(true);
      expect(result.data!.assignedTo).toBe(bob.id);

      await new Promise((r) => setTimeout(r, 100));

      const bobUnread = await getUnreadCount(db, bob.id);
      expect(bobUnread).toBe(0);
    });

    it("B3: updateSubTask reassignment triggers reassignment notification", async () => {
      const sub = await createSubTask(db, alice.id, taskId, {
        title: "Reassign sub",
      });
      // Wait for fire-and-forget, then clear creation notifications
      await new Promise((r) => setTimeout(r, 150));
      await db.delete(notifications);

      // Reassign from Bob (inherited) to Alice
      const updated = await updateSubTask(db, bob.id, sub.data!.id, {
        title: "Reassign sub",
        priority: "medium",
        assignedTo: alice.id,
      });
      expect(updated.success).toBe(true);

      await new Promise((r) => setTimeout(r, 100));

      const aliceNotifs = await getNotificationsForUser(db, alice.id);
      expect(aliceNotifs).toHaveLength(1);
      expect(aliceNotifs[0].type).toBe("reassignment");
      expect(aliceNotifs[0].entityType).toBe("subtask");
    });

    it("B4: updateSubTask first assignment triggers assignment notification", async () => {
      // Create a task with no assignee
      const unassignedTask = await createTask(db, sprintId, {
        title: "No assignee task",
      });

      const sub = await createSubTask(db, alice.id, unassignedTask.task!.id, {
        title: "First assign sub",
      });
      // Subtask should have no assignee since parent has none
      expect(sub.data!.assignedTo).toBeNull();

      // Wait for any fire-and-forget, then clear
      await new Promise((r) => setTimeout(r, 150));
      await db.delete(notifications);

      // First assignment
      const updated = await updateSubTask(db, alice.id, sub.data!.id, {
        title: "First assign sub",
        priority: "medium",
        assignedTo: bob.id,
      });
      expect(updated.success).toBe(true);

      await new Promise((r) => setTimeout(r, 100));

      const bobNotifs = await getNotificationsForUser(db, bob.id);
      expect(bobNotifs).toHaveLength(1);
      expect(bobNotifs[0].type).toBe("assignment");
    });
  });

  // ── C. Note-Triggered Notifications ─────────────────────────

  describe("C. Note-triggered notifications", () => {
    it("C1: createNote on task by non-assignee notifies assignee", async () => {
      const sprint = await createSprint(db, {
        name: "Sprint 1",
        startDate: "2026-04-01",
        endDate: "2026-04-14",
      });
      const task = await createTask(db, sprint.sprint!.id, {
        title: "Noted task",
        assignedTo: bob.id,
      }, alice.id);

      // Wait for fire-and-forget notifications to settle, then clear
      await new Promise((r) => setTimeout(r, 150));
      await db.delete(notifications);

      // Alice adds a note on Bob's task
      await createNote(db, alice.id, {
        entityType: "task",
        entityId: task.task!.id,
        content: "Hey Bob, check this out",
      });

      await new Promise((r) => setTimeout(r, 100));

      const bobNotifs = await getNotificationsForUser(db, bob.id);
      expect(bobNotifs).toHaveLength(1);
      expect(bobNotifs[0].type).toBe("note");
      expect(bobNotifs[0].entityType).toBe("task");
      expect(bobNotifs[0].title).toContain("New note on");
    });

    it("C2: createNote on task by assignee (self) creates no notification", async () => {
      const sprint = await createSprint(db, {
        name: "Sprint 1",
        startDate: "2026-04-01",
        endDate: "2026-04-14",
      });
      const task = await createTask(db, sprint.sprint!.id, {
        title: "My task",
        assignedTo: alice.id,
      });

      await new Promise((r) => setTimeout(r, 150));
      await db.delete(notifications);

      // Alice notes her own task
      await createNote(db, alice.id, {
        entityType: "task",
        entityId: task.task!.id,
        content: "My own note",
      });

      await new Promise((r) => setTimeout(r, 100));

      const aliceUnread = await getUnreadCount(db, alice.id);
      expect(aliceUnread).toBe(0);
    });

    it("C3: createNote on story notifies story assignee", async () => {
      const story = await createStory(db, alice.id, {
        title: "Story with note",
        assignedTo: bob.id,
        productId,
      });

      await new Promise((r) => setTimeout(r, 150));
      await db.delete(notifications);

      await createNote(db, alice.id, {
        entityType: "story",
        entityId: story.data!.id,
        content: "Story note for Bob",
      });

      await new Promise((r) => setTimeout(r, 100));

      const bobNotifs = await getNotificationsForUser(db, bob.id);
      expect(bobNotifs).toHaveLength(1);
      expect(bobNotifs[0].type).toBe("note");
      expect(bobNotifs[0].entityType).toBe("story");
      expect(bobNotifs[0].title).toContain("S-");
    });

    it("C4: createNote on subtask notifies subtask assignee", async () => {
      const sprint = await createSprint(db, {
        name: "Sprint 1",
        startDate: "2026-04-01",
        endDate: "2026-04-14",
      });
      const task = await createTask(db, sprint.sprint!.id, {
        title: "Parent",
        assignedTo: bob.id,
      }, alice.id);

      const sub = await createSubTask(db, alice.id, task.task!.id, {
        title: "Sub with note",
      });

      await new Promise((r) => setTimeout(r, 150));
      await db.delete(notifications);

      // Alice adds note on Bob's subtask
      await createNote(db, alice.id, {
        entityType: "subtask",
        entityId: sub.data!.id,
        content: "Subtask note",
      });

      await new Promise((r) => setTimeout(r, 100));

      const bobNotifs = await getNotificationsForUser(db, bob.id);
      expect(bobNotifs).toHaveLength(1);
      expect(bobNotifs[0].type).toBe("note");
      expect(bobNotifs[0].entityType).toBe("subtask");
      expect(bobNotifs[0].title).toContain("ST-");
    });
  });

  // ── D. Story Deletion Cascade ──────────────────────────────

  describe("D. Story deletion cascade", () => {
    it("D1: deleteStory(cascade) removes story notifications", async () => {
      const story = await createStory(db, alice.id, {
        title: "Delete me",
        assignedTo: bob.id,
        productId,
      });

      await new Promise((r) => setTimeout(r, 100));

      // Verify notification exists
      expect(await getUnreadCount(db, bob.id)).toBeGreaterThan(0);

      // Delete story
      const result = await deleteStory(db, alice.id, story.data!.id, "cascade");
      expect(result.success).toBe(true);

      // Story notifications gone
      const storyNotifs = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.entityType, "story"),
            eq(notifications.entityId, story.data!.id)
          )
        )
        .all();
      expect(storyNotifs).toHaveLength(0);
    });

    it("D2: deleteStory(cascade) removes child task + subtask notifications", async () => {
      const sprint = await createSprint(db, {
        name: "Sprint 1",
        startDate: "2026-04-01",
        endDate: "2026-04-14",
      });

      const story = await createStory(db, alice.id, {
        title: "Story with children",
        productId,
      });

      // Move story to sprint
      const task = await createTask(db, sprint.sprint!.id, {
        title: "Child task",
        assignedTo: bob.id,
        userStoryId: story.data!.id,
      }, alice.id);

      const sub = await createSubTask(db, alice.id, task.task!.id, {
        title: "Child subtask",
      });

      await new Promise((r) => setTimeout(r, 100));

      // Verify notifications exist for task + subtask
      const beforeCount = await db.select().from(notifications).all();
      expect(beforeCount.length).toBeGreaterThan(0);

      // Cascade delete story
      await deleteStory(db, alice.id, story.data!.id, "cascade");

      // ALL notifications should be gone
      const afterCount = await db.select().from(notifications).all();
      expect(afterCount).toHaveLength(0);
    });

    it("D3: deleteStory(unlink) removes story notifications but preserves task notifications", async () => {
      const sprint = await createSprint(db, {
        name: "Sprint 1",
        startDate: "2026-04-01",
        endDate: "2026-04-14",
      });

      const story = await createStory(db, alice.id, {
        title: "Unlink story",
        assignedTo: bob.id,
        productId,
      });

      const task = await createTask(db, sprint.sprint!.id, {
        title: "Preserved task",
        assignedTo: bob.id,
        userStoryId: story.data!.id,
      }, alice.id);

      await new Promise((r) => setTimeout(r, 100));

      // Unlink mode: only removes story, detaches tasks
      await deleteStory(db, alice.id, story.data!.id, "unlink");

      // Story notifications should be gone
      const storyNotifs = await db
        .select()
        .from(notifications)
        .where(eq(notifications.entityType, "story"))
        .all();
      expect(storyNotifs).toHaveLength(0);

      // Task notifications should still exist
      const taskNotifs = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.entityType, "task"),
            eq(notifications.entityId, task.task!.id)
          )
        )
        .all();
      expect(taskNotifs.length).toBeGreaterThan(0);
    });
  });

  // ── E. SubTask Deletion ─────────────────────────────────────

  describe("E. SubTask deletion", () => {
    it("E1: deleteSubTask removes subtask notifications", async () => {
      const sprint = await createSprint(db, {
        name: "Sprint 1",
        startDate: "2026-04-01",
        endDate: "2026-04-14",
      });
      const task = await createTask(db, sprint.sprint!.id, {
        title: "Parent task",
        assignedTo: bob.id,
      }, alice.id);

      const sub = await createSubTask(db, alice.id, task.task!.id, {
        title: "Delete sub",
      });

      await new Promise((r) => setTimeout(r, 100));

      // Verify subtask notification exists
      const before = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.entityType, "subtask"),
            eq(notifications.entityId, sub.data!.id)
          )
        )
        .all();
      expect(before.length).toBeGreaterThan(0);

      // Delete subtask
      await deleteSubTask(db, alice.id, sub.data!.id);

      // Subtask notifications gone
      const after = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.entityType, "subtask"),
            eq(notifications.entityId, sub.data!.id)
          )
        )
        .all();
      expect(after).toHaveLength(0);
    });
  });

  // ── F. Notification Query & Access ──────────────────────────

  describe("F. Notification query & access", () => {
    it("F1: getNotificationsForUser returns only that user's notifications", async () => {
      // Create notifications for both users
      await createNotification(db, {
        userId: alice.id,
        type: "assignment",
        title: "Alice's notification",
        entityType: "task",
        entityId: uuid(),
      });
      await createNotification(db, {
        userId: bob.id,
        type: "assignment",
        title: "Bob's notification",
        entityType: "task",
        entityId: uuid(),
      });

      const aliceNotifs = await getNotificationsForUser(db, alice.id);
      expect(aliceNotifs).toHaveLength(1);
      expect(aliceNotifs[0].title).toBe("Alice's notification");

      const bobNotifs = await getNotificationsForUser(db, bob.id);
      expect(bobNotifs).toHaveLength(1);
      expect(bobNotifs[0].title).toBe("Bob's notification");
    });

    it("F2: markAsRead fails if notification belongs to different user", async () => {
      const notif = await createNotification(db, {
        userId: alice.id,
        type: "assignment",
        title: "Alice only",
        entityType: "task",
        entityId: uuid(),
      });

      // Bob tries to mark Alice's notification as read
      const result = await markAsRead(db, bob.id, notif!.id);
      expect(result.success).toBe(false);

      // Alice's notification still unread
      expect(await getUnreadCount(db, alice.id)).toBe(1);
    });

    it("F3: getNotificationsForUser returns newest first", async () => {
      // Create 3 notifications with slight time gaps
      await createNotification(db, {
        userId: alice.id,
        type: "assignment",
        title: "First",
        entityType: "task",
        entityId: uuid(),
      });
      await new Promise((r) => setTimeout(r, 10));
      await createNotification(db, {
        userId: alice.id,
        type: "note",
        title: "Second",
        entityType: "task",
        entityId: uuid(),
      });
      await new Promise((r) => setTimeout(r, 10));
      await createNotification(db, {
        userId: alice.id,
        type: "reassignment",
        title: "Third",
        entityType: "task",
        entityId: uuid(),
      });

      const notifs = await getNotificationsForUser(db, alice.id);
      expect(notifs).toHaveLength(3);
      expect(notifs[0].title).toBe("Third");
      expect(notifs[1].title).toBe("Second");
      expect(notifs[2].title).toBe("First");
    });
  });

  // ── G. Edge Cases ───────────────────────────────────────────

  describe("G. Edge cases", () => {
    it("G1: note on entity with no assignee creates no notification", async () => {
      const sprint = await createSprint(db, {
        name: "Sprint 1",
        startDate: "2026-04-01",
        endDate: "2026-04-14",
      });
      const task = await createTask(db, sprint.sprint!.id, {
        title: "Unassigned task",
        // No assignedTo
      });

      await db.delete(notifications);

      await createNote(db, alice.id, {
        entityType: "task",
        entityId: task.task!.id,
        content: "Note on unassigned",
      });

      await new Promise((r) => setTimeout(r, 100));

      const allNotifs = await db.select().from(notifications).all();
      expect(allNotifs).toHaveLength(0);
    });

    it("G2: different notification types on same entity within 30s are NOT deduped", async () => {
      const taskId = uuid();

      // Assignment notification
      await triggerNotification(db, {
        type: "assignment",
        actorId: alice.id,
        targetUserId: bob.id,
        entityType: "task",
        entityId: taskId,
        title: "Assigned",
      });

      // Note notification on same entity within 30s
      await triggerNotification(db, {
        type: "note",
        actorId: alice.id,
        targetUserId: bob.id,
        entityType: "task",
        entityId: taskId,
        title: "New note",
      });

      const bobNotifs = await getNotificationsForUser(db, bob.id);
      expect(bobNotifs).toHaveLength(2);
      expect(bobNotifs.map((n) => n.type).sort()).toEqual(["assignment", "note"]);
    });
  });
});
