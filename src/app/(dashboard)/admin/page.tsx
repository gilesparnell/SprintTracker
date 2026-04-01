"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  CheckIcon,
  Loader2Icon,
  MailIcon,
  PencilIcon,
  PlusIcon,
  ShieldIcon,
  Trash2Icon,
  UsersIcon,
  XIcon,
} from "lucide-react";

type AllowedEmail = {
  id: string;
  email: string;
  addedBy: string | null;
  createdAt: string;
};

type User = {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  image: string | null;
  role: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
};

export default function AdminPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [emails, setEmails] = useState<AllowedEmail[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; username: string; role: string }>({
    name: "",
    username: "",
    role: "user",
  });
  const [saving, setSaving] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const currentUserId = session?.user?.id;

  const fetchData = useCallback(async () => {
    try {
      const [emailsRes, usersRes] = await Promise.all([
        fetch("/api/admin/whitelist"),
        fetch("/api/admin/users"),
      ]);
      if (emailsRes.ok) setEmails(await emailsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Redirect non-admins
  useEffect(() => {
    if (session && session.user.role !== "admin") {
      router.replace("/");
    }
  }, [session, router]);

  async function handleAddEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/whitelist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to add email");
        setAdding(false);
        return;
      }
      setNewEmail("");
      await fetchData();
    } catch {
      setError("Failed to add email");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemoveEmail(id: string) {
    try {
      const res = await fetch(`/api/admin/whitelist/${id}`, { method: "DELETE" });
      if (res.ok) setEmails((prev) => prev.filter((e) => e.id !== id));
    } catch {
      setError("Failed to remove email");
    }
  }

  function startEditUser(user: User) {
    setEditingUserId(user.id);
    setEditForm({
      name: user.name || "",
      username: user.username || "",
      role: user.role,
    });
  }

  async function saveUser() {
    if (!editingUserId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${editingUserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update user");
      } else {
        setEditingUserId(null);
        await fetchData();
      }
    } catch {
      setError("Failed to update user");
    } finally {
      setSaving(false);
    }
  }

  async function toggleUserStatus(user: User) {
    const newStatus = user.status === "active" ? "inactive" : "active";
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) await fetchData();
    } catch {
      setError("Failed to update status");
    }
  }

  async function handleDeleteUser(id: string) {
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to delete user");
      } else {
        setDeletingUserId(null);
        await fetchData();
      }
    } catch {
      setError("Failed to delete user");
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function getInitials(name: string | null, email: string) {
    if (name) {
      return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return email[0].toUpperCase();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2Icon className="w-6 h-6 text-gray-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-purple-900/30 border border-purple-800 rounded-xl flex items-center justify-center">
          <ShieldIcon className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Admin</h2>
          <p className="text-xs text-gray-500">Manage users, roles, and email whitelist</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-red-900/20 border border-red-500/30 text-red-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="p-0.5 hover:text-red-300">
            <XIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Users Section */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <UsersIcon className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-white">Users</h3>
          <span className="ml-auto text-xs font-mono px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
            {users.length}
          </span>
        </div>

        <div className="border border-gray-800 rounded-xl overflow-hidden">
          {users.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">No users found</div>
          ) : (
            <div className="divide-y divide-gray-800">
              {users.map((user) => {
                const isEditing = editingUserId === user.id;
                const isDeleting = deletingUserId === user.id;
                const isSelf = user.id === currentUserId;

                return (
                  <div
                    key={user.id}
                    className="group px-4 py-3 hover:bg-gray-900/50 transition-colors"
                  >
                    {isEditing ? (
                      /* Edit mode */
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          {user.image ? (
                            <img src={user.image} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-xs font-bold text-gray-400">
                              {getInitials(user.name, user.email)}
                            </div>
                          )}
                          <span className="text-xs text-gray-500">{user.email}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 pl-10">
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                            placeholder="Display name"
                            className="flex-1 min-w-[140px] px-2.5 py-1.5 text-xs bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50"
                          />
                          <input
                            type="text"
                            value={editForm.username}
                            onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))}
                            placeholder="Username"
                            className="flex-1 min-w-[120px] px-2.5 py-1.5 text-xs bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50"
                          />
                          <select
                            value={editForm.role}
                            onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                            className="px-2.5 py-1.5 text-xs bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500/50"
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button
                            onClick={saveUser}
                            disabled={saving}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg transition-colors"
                          >
                            {saving ? <Loader2Icon className="w-3 h-3 animate-spin" /> : <CheckIcon className="w-3 h-3" />}
                            Save
                          </button>
                          <button
                            onClick={() => setEditingUserId(null)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-400 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* View mode */
                      <div className="flex items-center gap-3">
                        {user.image ? (
                          <img src={user.image} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-xs font-bold text-gray-400">
                            {getInitials(user.name, user.email)}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-white font-medium truncate">
                              {user.name || user.email}
                            </p>
                            {user.username && (
                              <span className="text-[10px] text-gray-500 font-mono">@{user.username}</span>
                            )}
                            {isSelf && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-900/20 text-green-400 border border-green-500/30">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>

                        {/* Role badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full border ${
                            user.role === "admin"
                              ? "bg-purple-900/20 text-purple-400 border-purple-500/30"
                              : "bg-gray-800 text-gray-400 border-gray-700"
                          }`}
                        >
                          {user.role === "admin" && <ShieldIcon className="w-2.5 h-2.5" />}
                          {user.role === "admin" ? "Admin" : "User"}
                        </span>

                        {/* Status badge */}
                        <button
                          onClick={() => !isSelf && toggleUserStatus(user)}
                          disabled={isSelf}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full border transition-colors ${
                            isSelf ? "cursor-default" : "cursor-pointer hover:opacity-80"
                          } ${
                            user.status === "active"
                              ? "bg-green-900/20 text-green-400 border-green-500/30"
                              : "bg-gray-800 text-gray-500 border-gray-700"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              user.status === "active" ? "bg-green-400" : "bg-gray-500"
                            }`}
                          />
                          {user.status === "active" ? "Active" : "Inactive"}
                        </button>

                        {/* Last login */}
                        <div className="text-right hidden sm:block">
                          <p className="text-[10px] text-gray-600">Last login</p>
                          <p className="text-xs text-gray-400">{formatDate(user.lastLoginAt)}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEditUser(user)}
                            className="p-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-gray-800 transition-colors"
                            title="Edit user"
                          >
                            <PencilIcon className="w-3.5 h-3.5" />
                          </button>
                          {!isSelf && (
                            isDeleting ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="px-2 py-1 text-[10px] font-medium text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg hover:bg-red-900/40 transition-colors"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setDeletingUserId(null)}
                                  className="px-2 py-1 text-[10px] font-medium text-gray-400 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeletingUserId(user.id)}
                                className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                                title="Delete user"
                              >
                                <Trash2Icon className="w-3.5 h-3.5" />
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Whitelisted Emails Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <MailIcon className="w-4 h-4 text-green-400" />
          <h3 className="text-sm font-semibold text-white">Email Whitelist</h3>
          <span className="ml-auto text-xs font-mono px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
            {emails.length}
          </span>
        </div>

        <form onSubmit={handleAddEmail} className="flex gap-2 mb-4">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="email@example.com"
            className="flex-1 px-3 py-2 text-sm bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20"
          />
          <button
            type="submit"
            disabled={adding || !newEmail.trim()}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {adding ? <Loader2Icon className="w-3.5 h-3.5 animate-spin" /> : <PlusIcon className="w-3.5 h-3.5" />}
            Add
          </button>
        </form>

        <div className="border border-gray-800 rounded-xl overflow-hidden">
          {emails.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">No whitelisted emails yet</div>
          ) : (
            <div className="divide-y divide-gray-800">
              {emails.map((entry) => {
                const addedByUser = users.find((u) => u.id === entry.addedBy);
                return (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-900/50 transition-colors group"
                  >
                    <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
                      <MailIcon className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{entry.email}</p>
                      <p className="text-xs text-gray-500">
                        Added {formatDate(entry.createdAt)}
                        {addedByUser && ` by ${addedByUser.name || addedByUser.email}`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveEmail(entry.id)}
                      className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all"
                      title="Remove email"
                    >
                      <Trash2Icon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
