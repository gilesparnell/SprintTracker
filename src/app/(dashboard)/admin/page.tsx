"use client";

import { useEffect, useState, useCallback } from "react";
import {
  MailIcon,
  PlusIcon,
  Trash2Icon,
  UsersIcon,
  ShieldIcon,
  Loader2Icon,
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
  image: string | null;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
};

export default function AdminPage() {
  const [emails, setEmails] = useState<AllowedEmail[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const res = await fetch(`/api/admin/whitelist/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setEmails((prev) => prev.filter((e) => e.id !== id));
      }
    } catch {
      setError("Failed to remove email");
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
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
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
          <p className="text-xs text-gray-500">
            Manage email whitelist and view users
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-red-900/20 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Whitelisted Emails Section */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <MailIcon className="w-4 h-4 text-green-400" />
          <h3 className="text-sm font-semibold text-white">
            Whitelisted Emails
          </h3>
          <span className="ml-auto text-xs font-mono px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
            {emails.length}
          </span>
        </div>

        {/* Add email form */}
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
            {adding ? (
              <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <PlusIcon className="w-3.5 h-3.5" />
            )}
            Add
          </button>
        </form>

        {/* Email list */}
        <div className="border border-gray-800 rounded-xl overflow-hidden">
          {emails.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              No whitelisted emails yet
            </div>
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
                      <p className="text-sm text-white font-medium truncate">
                        {entry.email}
                      </p>
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

      {/* Active Users Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <UsersIcon className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-white">Active Users</h3>
          <span className="ml-auto text-xs font-mono px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
            {users.length}
          </span>
        </div>

        <div className="border border-gray-800 rounded-xl overflow-hidden">
          {users.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              No users found
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-900/50 transition-colors"
                >
                  {/* Avatar */}
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.name || user.email}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-xs font-bold text-gray-400">
                      {getInitials(user.name, user.email)}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">
                      {user.name || user.email}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user.email}
                    </p>
                  </div>

                  {/* Last login */}
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-gray-500">Last login</p>
                    <p className="text-xs text-gray-400">
                      {formatDate(user.lastLoginAt)}
                    </p>
                  </div>

                  {/* Status badge */}
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full border ${
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
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
