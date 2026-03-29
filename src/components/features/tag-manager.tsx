"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangleIcon,
  CheckIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";

const TAG_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280",
];

type Tag = {
  id: string;
  name: string;
  color: string;
};

type AffectedTask = {
  id: string;
  title: string;
  status: string;
  sprintId: string;
};

export function TagManager({ initialTags }: { initialTags: Tag[] }) {
  const router = useRouter();
  const [tags, setTags] = useState<Tag[]>(initialTags);

  // Create state
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // Delete confirmation state
  const [deletingTag, setDeletingTag] = useState<Tag | null>(null);
  const [affectedTasks, setAffectedTasks] = useState<AffectedTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  async function handleCreate() {
    if (!newName.trim()) return;
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), color: newColor }),
    });
    const tag = await res.json();
    if (tag?.id) {
      setTags((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)));
    }
    setNewName("");
    setNewColor(TAG_COLORS[0]);
    setCreating(false);
  }

  function startEdit(tag: Tag) {
    setEditingId(tag.id);
    setEditName(tag.name);
  }

  async function handleRename(tagId: string) {
    if (!editName.trim()) return;
    const res = await fetch(`/api/tags/${tagId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    const updated = await res.json();
    if (updated?.id) {
      setTags((prev) =>
        prev.map((t) => (t.id === tagId ? { ...t, name: updated.name } : t))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    }
    setEditingId(null);
    router.refresh();
  }

  async function startDelete(tag: Tag) {
    setDeletingTag(tag);
    setLoadingTasks(true);
    const res = await fetch(`/api/tags/${tag.id}/tasks`);
    const tasks = await res.json();
    setAffectedTasks(tasks);
    setLoadingTasks(false);
  }

  async function confirmDelete() {
    if (!deletingTag) return;
    await fetch(`/api/tags/${deletingTag.id}`, { method: "DELETE" });
    setTags((prev) => prev.filter((t) => t.id !== deletingTag.id));
    setDeletingTag(null);
    setAffectedTasks([]);
    router.refresh();
  }

  const statusLabels: Record<string, string> = {
    open: "Open",
    in_progress: "In Progress",
    done: "Done",
  };

  return (
    <div className="space-y-4">
      {/* Tag list */}
      {tags.length === 0 && !creating && (
        <p className="text-sm text-gray-500">No tags yet. Create one to get started.</p>
      )}

      <div className="space-y-1">
        {tags.map((tag) => (
          <div
            key={tag.id}
            className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-800 hover:bg-gray-800/30 transition-colors group"
          >
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: tag.color }}
            />

            {editingId === tag.id ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); handleRename(tag.id); }
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-green-500/50"
                  autoFocus
                />
                <button
                  onClick={() => handleRename(tag.id)}
                  className="p-1 text-green-400 hover:text-green-300 hover:bg-green-900/20 rounded-md transition-colors"
                >
                  <CheckIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="p-1 text-gray-500 hover:text-gray-300 rounded-md transition-colors"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <span className="text-sm text-white flex-1">{tag.name}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEdit(tag)}
                    className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-gray-800 rounded-md transition-colors"
                  >
                    <PencilIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => startDelete(tag)}
                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-md transition-colors"
                  >
                    <Trash2Icon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Create new tag */}
      {creating ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-700 bg-gray-900/50">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); handleCreate(); }
              if (e.key === "Escape") setCreating(false);
            }}
            placeholder="Tag name"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50"
            autoFocus
          />
          <div className="flex gap-1">
            {TAG_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className={`w-5 h-5 rounded-full border-2 transition-colors ${
                  newColor === c ? "border-white" : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <button
            onClick={handleCreate}
            className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-500 rounded-lg transition-colors"
          >
            Add
          </button>
          <button
            onClick={() => { setCreating(false); setNewName(""); }}
            className="p-1 text-gray-500 hover:text-gray-300"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-400 hover:text-white border border-dashed border-gray-700 hover:border-gray-500 rounded-lg transition-colors w-full"
        >
          <PlusIcon className="w-4 h-4" />
          Create tag
        </button>
      )}

      {/* Delete confirmation overlay */}
      {deletingTag && (
        <div className="rounded-xl border border-red-500/30 bg-red-900/10 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangleIcon className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-white">
                Delete tag &ldquo;{deletingTag.name}&rdquo;?
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                This will remove the tag from all tasks. This cannot be undone.
              </p>
            </div>
          </div>

          {loadingTasks ? (
            <p className="text-xs text-gray-500 pl-7">Loading affected tasks...</p>
          ) : affectedTasks.length > 0 ? (
            <div className="pl-7">
              <p className="text-xs text-gray-400 mb-1.5">
                {affectedTasks.length} task{affectedTasks.length !== 1 ? "s" : ""} will lose this tag:
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {affectedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 text-xs py-1 px-2 rounded bg-gray-900/50 border border-gray-800"
                  >
                    <span className="text-white truncate flex-1">{task.title}</span>
                    <span className="text-gray-500 shrink-0">
                      {statusLabels[task.status] ?? task.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500 pl-7">No tasks currently use this tag.</p>
          )}

          <div className="flex items-center gap-2 pl-7">
            <button
              onClick={confirmDelete}
              className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
            >
              Delete tag
            </button>
            <button
              onClick={() => { setDeletingTag(null); setAffectedTasks([]); }}
              className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white border border-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
