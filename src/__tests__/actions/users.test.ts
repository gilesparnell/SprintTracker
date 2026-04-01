import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { users, allowedEmails } from "@/lib/db/schema";
import {
  upsertUser,
  getUserById,
  getUserByEmail,
  getAllUsers,
  getActiveUsers,
  deactivateUser,
  updateUser,
  deleteUser,
  isEmailAllowed,
  addAllowedEmail,
} from "@/lib/actions/users";

describe("User Actions", () => {
  let db: ReturnType<typeof drizzle>;
  let dbPath: string;

  beforeAll(async () => {
    dbPath = path.join(os.tmpdir(), `users-test-${Date.now()}.db`);
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
    await db.delete(allowedEmails);
    await db.delete(users);
  });

  // ── Role defaults ──────────────────────────────────────────

  it("should create user with default role 'user'", async () => {
    const user = await upsertUser(db, { email: "alice@example.com", name: "Alice" });
    expect(user).toBeDefined();
    expect(user!.role).toBe("user");
  });

  it("should preserve role on upsert (re-login)", async () => {
    // First login creates user
    await upsertUser(db, { email: "alice@example.com", name: "Alice" });
    // Manually set to admin
    const user = await getUserByEmail(db, "alice@example.com");
    await updateUser(db, user!.id, { role: "admin" });
    // Re-login should NOT reset role
    const updated = await upsertUser(db, { email: "alice@example.com", name: "Alice" });
    expect(updated!.role).toBe("admin");
  });

  // ── Username ───────────────────────────────────────────────

  it("should create user with null username by default", async () => {
    const user = await upsertUser(db, { email: "alice@example.com", name: "Alice" });
    expect(user!.username).toBeNull();
  });

  it("should update username via updateUser", async () => {
    const user = await upsertUser(db, { email: "alice@example.com", name: "Alice" });
    const updated = await updateUser(db, user!.id, { username: "alice_dev" });
    expect(updated!.username).toBe("alice_dev");
  });

  it("should reject duplicate usernames", async () => {
    const u1 = await upsertUser(db, { email: "alice@example.com", name: "Alice" });
    await updateUser(db, u1!.id, { username: "taken_name" });

    const u2 = await upsertUser(db, { email: "bob@example.com", name: "Bob" });
    const result = await updateUser(db, u2!.id, { username: "taken_name" });
    expect(result).toHaveProperty("error");
  });

  it("should allow setting username to null (clearing it)", async () => {
    const user = await upsertUser(db, { email: "alice@example.com", name: "Alice" });
    await updateUser(db, user!.id, { username: "alice_dev" });
    const cleared = await updateUser(db, user!.id, { username: null });
    expect(cleared!.username).toBeNull();
  });

  // ── updateUser (role + status + username) ──────────────────

  it("should update role via updateUser", async () => {
    const user = await upsertUser(db, { email: "alice@example.com", name: "Alice" });
    const updated = await updateUser(db, user!.id, { role: "admin" });
    expect(updated!.role).toBe("admin");
  });

  it("should update status via updateUser", async () => {
    const user = await upsertUser(db, { email: "alice@example.com", name: "Alice" });
    const updated = await updateUser(db, user!.id, { status: "inactive" });
    expect(updated!.status).toBe("inactive");
  });

  it("should update multiple fields at once", async () => {
    const user = await upsertUser(db, { email: "alice@example.com", name: "Alice" });
    const updated = await updateUser(db, user!.id, {
      role: "admin",
      username: "alice_admin",
      name: "Alice Admin",
    });
    expect(updated!.role).toBe("admin");
    expect(updated!.username).toBe("alice_admin");
    expect(updated!.name).toBe("Alice Admin");
  });

  it("should return error when updating non-existent user", async () => {
    const result = await updateUser(db, "non-existent-id", { role: "admin" });
    expect(result).toHaveProperty("error");
  });

  // ── deleteUser ─────────────────────────────────────────────

  it("should delete a user", async () => {
    const user = await upsertUser(db, { email: "alice@example.com", name: "Alice" });
    const result = await deleteUser(db, user!.id);
    expect(result).toEqual({ success: true });

    const found = await getUserById(db, user!.id);
    expect(found).toBeUndefined();
  });

  it("should return error when deleting non-existent user", async () => {
    const result = await deleteUser(db, "non-existent-id");
    expect(result).toHaveProperty("error");
  });

  // ── Query helpers ──────────────────────────────────────────

  it("should return role in getAllUsers results", async () => {
    await upsertUser(db, { email: "alice@example.com", name: "Alice" });
    const all = await getAllUsers(db);
    expect(all[0]).toHaveProperty("role");
    expect(all[0].role).toBe("user");
  });

  it("should return role and username in getActiveUsers results", async () => {
    const user = await upsertUser(db, { email: "alice@example.com", name: "Alice" });
    await updateUser(db, user!.id, { username: "alice_dev", role: "admin" });

    const active = await getActiveUsers(db);
    expect(active[0].role).toBe("admin");
    expect(active[0].username).toBe("alice_dev");
  });
});
