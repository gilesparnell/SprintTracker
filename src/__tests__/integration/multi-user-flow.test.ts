import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { eq, sql } from "drizzle-orm";
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
import { upsertUser, isEmailAllowed, addAllowedEmail } from "@/lib/actions/users";
import { createSprint } from "@/lib/actions/sprints";
import { createStory, getStories, moveStoryToSprint, reorderStory } from "@/lib/actions/stories";
import { createTask, getTasksBySprintId, getTasksByStoryId, updateTask, deleteTask } from "@/lib/actions/tasks";
import { createSubTask, getSubTasksForTask, moveSubTask, updateSubTaskStatus } from "@/lib/actions/subtasks";
import { createNote, getNotesForEntity, updateNote, deleteNote } from "@/lib/actions/notes";
import { createNotification, getUnreadCount, markAsRead, markAllAsRead } from "@/lib/actions/notifications";
import { triggerNotification } from "@/lib/helpers/notify";
import { getNextSequenceNumber } from "@/lib/helpers/sequence";

describe("Multi-User Sprint Tracker Integration", () => {
  let db: ReturnType<typeof drizzle>;
  let dbPath: string;

  beforeAll(async () => {
    // Use file-based temp DB — drizzle-orm 0.45.1 transaction() destroys in-memory DBs
    dbPath = path.join(os.tmpdir(), `sprint-test-${Date.now()}.db`);
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
    // Reset sequences
    await db.update(sequences).set({ value: 0 });
  });

  // ── Whitelist & Users ──────────────────────────────────────

  it("should enforce email whitelist", async () => {
    expect(await isEmailAllowed(db, "alice@example.com")).toBe(false);
    await addAllowedEmail(db, "alice@example.com");
    expect(await isEmailAllowed(db, "alice@example.com")).toBe(true);
    expect(await isEmailAllowed(db, "Alice@Example.com")).toBe(true); // case insensitive
  });

  it("should upsert user on sign-in", async () => {
    const user1 = await upsertUser(db, {
      email: "alice@example.com",
      name: "Alice",
      image: "https://example.com/alice.jpg",
    });
    expect(user1).toBeDefined();
    expect(user1!.name).toBe("Alice");

    // Second upsert updates last login, preserves data
    const user2 = await upsertUser(db, { email: "alice@example.com" });
    expect(user2!.id).toBe(user1!.id);
    expect(user2!.name).toBe("Alice"); // preserved
  });

  // ── Sequential IDs ────────────────────────────────────────

  it("should generate contiguous sequential IDs", async () => {
    const seq1 = await getNextSequenceNumber(db, "task");
    const seq2 = await getNextSequenceNumber(db, "task");
    const seq3 = await getNextSequenceNumber(db, "task");
    expect(seq1).toBe(1);
    expect(seq2).toBe(2);
    expect(seq3).toBe(3);

    // Different entity types have independent sequences
    const storySeq = await getNextSequenceNumber(db, "story");
    expect(storySeq).toBe(1);
  });

  // ── Full User Journey ─────────────────────────────────────

  it("should support the full flow: story → tasks → subtasks → notes → notifications", async () => {
    // Setup users
    const alice = await upsertUser(db, { email: "alice@test.com", name: "Alice" });
    const bob = await upsertUser(db, { email: "bob@test.com", name: "Bob" });

    // Setup product
    const productId = uuid();
    await db.insert(products).values({ id: productId, name: "General", color: "#6b7280" });

    // Create a sprint
    const sprintResult = await createSprint(db, {
      name: "Sprint 1",
      startDate: "2026-04-01",
      endDate: "2026-04-14",
      status: "active",
    });
    expect(sprintResult.success).toBe(true);
    const sprintId = sprintResult.sprint!.id;

    // Create a backlog story
    const storyResult = await createStory(db, alice!.id, {
      title: "User authentication",
      description: "Implement login",
      priority: "high",
      assignedTo: alice!.id,
      productId,
    });
    expect(storyResult.success).toBe(true);
    const story = storyResult.data!;
    expect(story.sequenceNumber).toBe(1);
    expect(story.status).toBe("backlog");

    // Verify backlog listing
    const backlogResult = await getStories(db, { status: "backlog" });
    expect(backlogResult.stories).toHaveLength(1);
    expect(backlogResult.stories[0].id).toBe(story.id);

    // Move story to sprint
    const moveResult = await moveStoryToSprint(db, alice!.id, story.id, sprintId);
    expect(moveResult.success).toBe(true);

    // Create tasks under the story
    const task1Result = await createTask(db, sprintId, {
      title: "Build login form",
      priority: "high",
      assignedTo: alice!.id,
      userStoryId: story.id,
    }, bob!.id);
    expect(task1Result.success).toBe(true);
    expect(task1Result.task!.sequenceNumber).toBe(1);

    const task2Result = await createTask(db, sprintId, {
      title: "Add OAuth provider",
      priority: "medium",
      assignedTo: bob!.id,
      userStoryId: story.id,
    }, alice!.id);
    expect(task2Result.success).toBe(true);
    expect(task2Result.task!.sequenceNumber).toBe(2);

    // Verify tasks by story
    const storyTasks = await getTasksByStoryId(db, story.id);
    expect(storyTasks).toHaveLength(2);

    // Verify tasks by sprint
    const sprintTasks = await getTasksBySprintId(db, sprintId);
    expect(sprintTasks).toHaveLength(2);

    // Create subtask under task1
    const subtaskResult = await createSubTask(db, bob!.id, task1Result.task!.id, {
      title: "Style the form",
    });
    expect(subtaskResult.success).toBe(true);
    // Should default assignee to parent task's assignee (Alice)
    expect(subtaskResult.data!.assignedTo).toBe(alice!.id);
    expect(subtaskResult.data!.sequenceNumber).toBe(1);

    // List subtasks
    const subtasks = await getSubTasksForTask(db, task1Result.task!.id);
    expect(subtasks).toHaveLength(1);

    // Update subtask status
    const stUpdateResult = await updateSubTaskStatus(db, subtaskResult.data!.id, "done");
    expect(stUpdateResult.success).toBe(true);

    // Add a note on the task
    const noteResult = await createNote(db, alice!.id, {
      entityType: "task",
      entityId: task1Result.task!.id,
      content: "Started working on the form layout",
    });
    expect(noteResult.success).toBe(true);

    // List notes (newest first)
    const taskNotes = await getNotesForEntity(db, "task", task1Result.task!.id);
    expect(taskNotes).toHaveLength(1);
    expect(taskNotes[0].content).toBe("Started working on the form layout");
    expect(taskNotes[0].editableUntil).toBeDefined();

    // Edit the note (within 5-min window)
    const editResult = await updateNote(db, alice!.id, noteResult.data!.id, {
      content: "Updated: Form layout is done",
    });
    expect(editResult.success).toBe(true);

    // Notifications: triggerNotification should create one
    await triggerNotification(db, {
      type: "assignment",
      actorId: bob!.id,
      targetUserId: alice!.id,
      entityType: "task",
      entityId: task1Result.task!.id,
      title: "Bob assigned you to T-1: Build login form",
    });

    const unread = await getUnreadCount(db, alice!.id);
    // 2 notifications: one from createTask assignment (bob created, assigned to alice),
    // and one from the explicit triggerNotification above
    expect(unread).toBe(2);

    // Mark as read
    const allNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, alice!.id))
      .all();
    expect(allNotifications).toHaveLength(2);
    await markAsRead(db, alice!.id, allNotifications[0].id);
    expect(await getUnreadCount(db, alice!.id)).toBe(1);
    // Mark all remaining as read
    await markAllAsRead(db, alice!.id);
    expect(await getUnreadCount(db, alice!.id)).toBe(0);
  });

  // ── Notification Deduplication ────────────────────────────

  it("should deduplicate notifications within 30-second window", async () => {
    const alice = await upsertUser(db, { email: "alice@test.com", name: "Alice" });
    const bob = await upsertUser(db, { email: "bob@test.com", name: "Bob" });
    const taskId = uuid();

    // First notification
    await triggerNotification(db, {
      type: "assignment",
      actorId: bob!.id,
      targetUserId: alice!.id,
      entityType: "task",
      entityId: taskId,
      title: "First assignment",
    });

    // Second notification within 30s window — should update, not create new
    await triggerNotification(db, {
      type: "assignment",
      actorId: bob!.id,
      targetUserId: alice!.id,
      entityType: "task",
      entityId: taskId,
      title: "Updated assignment",
    });

    const count = await getUnreadCount(db, alice!.id);
    expect(count).toBe(1);

    // Verify the title was updated
    const allNotifs = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, alice!.id))
      .all();
    expect(allNotifs).toHaveLength(1);
    expect(allNotifs[0].title).toBe("Updated assignment");
  });

  // ── Self-notification suppression ─────────────────────────

  it("should not notify yourself", async () => {
    const alice = await upsertUser(db, { email: "alice@test.com", name: "Alice" });

    await triggerNotification(db, {
      type: "assignment",
      actorId: alice!.id,
      targetUserId: alice!.id,
      entityType: "task",
      entityId: uuid(),
      title: "Self assign",
    });

    expect(await getUnreadCount(db, alice!.id)).toBe(0);
  });

  // ── Mark all as read ──────────────────────────────────────

  it("should mark all notifications as read", async () => {
    const alice = await upsertUser(db, { email: "alice@test.com", name: "Alice" });
    const bob = await upsertUser(db, { email: "bob@test.com", name: "Bob" });

    // Create 3 notifications
    for (let i = 0; i < 3; i++) {
      await triggerNotification(db, {
        type: "note",
        actorId: bob!.id,
        targetUserId: alice!.id,
        entityType: "task",
        entityId: uuid(), // different entities to avoid dedup
        title: `Note ${i}`,
      });
    }

    expect(await getUnreadCount(db, alice!.id)).toBe(3);
    await markAllAsRead(db, alice!.id);
    expect(await getUnreadCount(db, alice!.id)).toBe(0);
  });

  // ── Notes edit window ─────────────────────────────────────

  it("should reject note edit from wrong user", async () => {
    const alice = await upsertUser(db, { email: "alice@test.com", name: "Alice" });
    const bob = await upsertUser(db, { email: "bob@test.com", name: "Bob" });

    const note = await createNote(db, alice!.id, {
      entityType: "task",
      entityId: uuid(),
      content: "Alice's note",
    });
    expect(note.success).toBe(true);

    // Bob tries to edit
    const editResult = await updateNote(db, bob!.id, note.data!.id, {
      content: "Hacked!",
    });
    expect(editResult.success).toBe(false);
  });

  it("should reject note delete from wrong user", async () => {
    const alice = await upsertUser(db, { email: "alice@test.com", name: "Alice" });
    const bob = await upsertUser(db, { email: "bob@test.com", name: "Bob" });

    const note = await createNote(db, alice!.id, {
      entityType: "task",
      entityId: uuid(),
      content: "Alice's note",
    });

    const deleteResult = await deleteNote(db, bob!.id, note.data!.id);
    expect(deleteResult.success).toBe(false);
  });

  // ── Subtask move ──────────────────────────────────────────

  it("should move subtask between tasks", async () => {
    const alice = await upsertUser(db, { email: "alice@test.com", name: "Alice" });
    const sprint = await createSprint(db, {
      name: "Sprint 1",
      startDate: "2026-04-01",
      endDate: "2026-04-14",
    });

    const task1 = await createTask(db, sprint.sprint!.id, {
      title: "Task A",
      assignedTo: alice!.id,
    });
    const task2 = await createTask(db, sprint.sprint!.id, {
      title: "Task B",
    });

    const subtask = await createSubTask(db, alice!.id, task1.task!.id, {
      title: "Move me",
    });

    // Move subtask from task1 to task2
    const moveResult = await moveSubTask(db, alice!.id, subtask.data!.id, task2.task!.id);
    expect(moveResult.success).toBe(true);
    expect(moveResult.data!.parentTaskId).toBe(task2.task!.id);
    // Keeps current assignee per plan (R26)
    expect(moveResult.data!.assignedTo).toBe(alice!.id);
  });

  // ── Backlog reordering ────────────────────────────────────

  it("should reorder stories in backlog with gapped integers", async () => {
    const alice = await upsertUser(db, { email: "alice@test.com", name: "Alice" });
    const productId = uuid();
    await db.insert(products).values({ id: productId, name: "General", color: "#6b7280" });
    const story1 = await createStory(db, alice!.id, { title: "Story 1", productId });
    const story2 = await createStory(db, alice!.id, { title: "Story 2", productId });
    const story3 = await createStory(db, alice!.id, { title: "Story 3", productId });

    // Move story3 between story1 and story2
    const s1Order = story1.data!.sortOrder;
    const s2Order = story2.data!.sortOrder;
    const midpoint = (s1Order + s2Order) / 2;

    const reorderResult = await reorderStory(db, alice!.id, story3.data!.id, midpoint);
    expect(reorderResult.success).toBe(true);

    // Verify order
    const storiesResult = await getStories(db, { status: "backlog" });
    expect(storiesResult.stories[0].id).toBe(story1.data!.id);
    expect(storiesResult.stories[1].id).toBe(story3.data!.id);
    expect(storiesResult.stories[2].id).toBe(story2.data!.id);
  });

  // ── Task deletion cascades ────────────────────────────────

  it("should cascade delete notes and notifications when deleting a task", async () => {
    const alice = await upsertUser(db, { email: "alice@test.com", name: "Alice" });
    const bob = await upsertUser(db, { email: "bob@test.com", name: "Bob" });

    const sprint = await createSprint(db, {
      name: "Sprint 1",
      startDate: "2026-04-01",
      endDate: "2026-04-14",
    });

    const task = await createTask(db, sprint.sprint!.id, {
      title: "Will be deleted",
      assignedTo: alice!.id,
    }, bob!.id);

    // Add note
    await createNote(db, alice!.id, {
      entityType: "task",
      entityId: task.task!.id,
      content: "This should be deleted too",
    });

    // Add notification
    await triggerNotification(db, {
      type: "assignment",
      actorId: bob!.id,
      targetUserId: alice!.id,
      entityType: "task",
      entityId: task.task!.id,
      title: "Assigned",
    });

    // Add subtask with its own note
    const st = await createSubTask(db, alice!.id, task.task!.id, { title: "Sub" });
    await createNote(db, alice!.id, {
      entityType: "subtask",
      entityId: st.data!.id,
      content: "Subtask note",
    });

    // Delete the task
    const result = await deleteTask(db, task.task!.id);
    expect(result.success).toBe(true);

    // Verify cascade cleanup
    const remainingNotes = await db.select().from(notes).all();
    expect(remainingNotes).toHaveLength(0);

    const remainingSubtasks = await db.select().from(subTasks).all();
    expect(remainingSubtasks).toHaveLength(0);

    // Task notifications cleaned up
    const taskNotifs = await db
      .select()
      .from(notifications)
      .where(eq(notifications.entityId, task.task!.id))
      .all();
    expect(taskNotifs).toHaveLength(0);
  });

  // ── Task with nullable sprintId ───────────────────────────

  it("should create a task without a sprint (backlog task via story)", async () => {
    const alice = await upsertUser(db, { email: "alice@test.com", name: "Alice" });
    const productId = uuid();
    await db.insert(products).values({ id: productId, name: "General", color: "#6b7280" });
    const story = await createStory(db, alice!.id, { title: "Backlog story", productId });

    const result = await createTask(db, null, {
      title: "Unassigned to sprint",
      priority: "low",
      userStoryId: story.data!.id,
    });
    expect(result.success).toBe(true);
    expect(result.task!.sprintId).toBeNull();
    expect(result.task!.userStoryId).toBe(story.data!.id);
  });

  // ── Assignment change triggers notification ───────────────

  it("should trigger reassignment notification on updateTask", async () => {
    const alice = await upsertUser(db, { email: "alice@test.com", name: "Alice" });
    const bob = await upsertUser(db, { email: "bob@test.com", name: "Bob" });

    const sprint = await createSprint(db, {
      name: "Sprint 1",
      startDate: "2026-04-01",
      endDate: "2026-04-14",
    });

    const task = await createTask(db, sprint.sprint!.id, {
      title: "Reassignment test",
      assignedTo: alice!.id,
    });

    // Reassign from Alice to Bob
    const result = await updateTask(db, task.task!.id, {
      title: "Reassignment test",
      assignedTo: bob!.id,
    }, alice!.id);
    expect(result.success).toBe(true);
    expect(result.task!.assignedTo).toBe(bob!.id);

    // Bob should have a reassignment notification (fire-and-forget, but triggerNotification is awaited in tests)
    // Give a small delay for the void promise
    await new Promise((r) => setTimeout(r, 100));
    const bobUnread = await getUnreadCount(db, bob!.id);
    expect(bobUnread).toBe(1);
  });
});
