"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PlusIcon, XIcon, Loader2, Send, Trash2Icon } from "lucide-react";
import { EntityIcon } from "@/components/ui/entity-icon";

type Tag = {
  id: string;
  name: string;
  color: string;
};

type Customer = {
  id: string;
  name: string;
  color: string;
};

type User = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};

type FormState = {
  success: boolean;
  errors?: Record<string, string[]>;
};

const TAG_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280",
];

function TagPicker({
  allTags: allTagsProp,
  selectedIds,
  onChange,
}: {
  allTags: Tag[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);
  const [localTags, setLocalTags] = useState<Tag[]>([]);

  const allTags = [...allTagsProp, ...localTags.filter((lt) => !allTagsProp.some((t) => t.id === lt.id))];

  async function handleCreate() {
    if (!newName.trim()) return;
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), color: newColor }),
    });
    const tag = await res.json();
    if (tag?.id) {
      setLocalTags((prev) => [...prev, tag]);
      onChange([...selectedIds, tag.id]);
    }
    setNewName("");
    setCreating(false);
  }

  const availableTags = allTags.filter((t) => !selectedIds.includes(t.id));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="block text-sm font-medium text-gray-300">Tags</label>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="p-0.5 text-gray-500 hover:text-green-400 hover:bg-green-900/20 rounded-md transition-colors"
          title={expanded ? "Hide available tags" : "Add tags"}
        >
          {expanded ? <XIcon className="w-3.5 h-3.5" /> : <PlusIcon className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Assigned tags — always visible */}
      <div className="flex flex-wrap gap-1.5">
        {selectedIds.map((tagId) => {
          const tag = allTags.find((t) => t.id === tagId);
          if (!tag) return null;
          return (
            <button
              key={tagId}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onChange(selectedIds.filter((sid) => sid !== tagId));
              }}
              className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1.5 text-xs rounded-full border border-green-500/40 text-white bg-green-900/30 hover:border-red-500/50 hover:bg-red-900/20 transition-colors group"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: tag.color }}
              />
              {tag.name}
              <XIcon className="w-4 h-4 text-gray-400 group-hover:text-red-400 transition-colors" />
            </button>
          );
        })}
        {selectedIds.length === 0 && !expanded && (
          <span className="text-xs text-gray-600">No tags assigned</span>
        )}
      </div>

      {/* Available tags — shown only when expanded */}
      {expanded && (
        <div className="space-y-2 rounded-lg border border-gray-800 bg-gray-800/20 p-2.5">
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Available</p>
          <div className="flex flex-wrap gap-1.5">
            {availableTags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => onChange([...selectedIds, tag.id])}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border border-dashed border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors"
              >
                <PlusIcon className="w-3 h-3" />
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.name}
              </button>
            ))}

            {creating ? (
              <div className="flex items-center gap-1.5">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); handleCreate(); }
                    if (e.key === "Escape") setCreating(false);
                  }}
                  placeholder="Tag name"
                  className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50"
                  autoFocus
                />
                <div className="flex gap-0.5">
                  {TAG_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className={`w-4 h-4 rounded-full border-2 transition-colors ${
                        newColor === c ? "border-white" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleCreate}
                  className="px-2 py-1 text-[10px] font-medium text-white bg-green-600 hover:bg-green-500 rounded-lg transition-colors"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="text-gray-500 hover:text-gray-300"
                >
                  <XIcon className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="inline-flex items-center gap-0.5 px-2 py-1 text-xs rounded-full border border-dashed border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-500 transition-colors"
              >
                <PlusIcon className="w-3 h-3" />
                New
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Inline Subtask List (for edit modal) ────────────────────

type SubTask = {
  id: string;
  sequenceNumber: number;
  title: string;
  status: string;
};

function InlineSubTasks({ taskId }: { taskId: string }) {
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch(`/api/subtasks?parentTaskId=${taskId}`)
      .then((r) => r.json())
      .then((data) => setSubtasks(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [taskId]);

  async function handleCreate() {
    const trimmed = newTitle.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/subtasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentTaskId: taskId, title: trimmed }),
      });
      const result = await res.json();
      if (result.success && result.data) {
        setSubtasks((prev) => [...prev, result.data]);
        setNewTitle("");
      }
    } finally {
      setCreating(false);
    }
  }

  async function toggleStatus(st: SubTask) {
    const newStatus = st.status === "done" ? "open" : "done";
    setSubtasks((prev) =>
      prev.map((s) => (s.id === st.id ? { ...s, status: newStatus } : s))
    );
    await fetch(`/api/subtasks/${st.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  }

  async function handleDelete(stId: string) {
    setSubtasks((prev) => prev.filter((s) => s.id !== stId));
    await fetch(`/api/subtasks/${stId}`, { method: "DELETE" });
  }

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-1.5 text-sm font-medium text-gray-300">
        <EntityIcon type="subtask" />
        Subtasks
      </label>

      {loading ? (
        <p className="text-xs text-gray-500">Loading...</p>
      ) : (
        <div className="space-y-1">
          {subtasks.map((st) => (
            <div
              key={st.id}
              className="flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-800/30 px-2.5 py-1.5 group"
            >
              <button
                type="button"
                onClick={() => toggleStatus(st)}
                className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                  st.status === "done"
                    ? "bg-green-600 border-green-600 text-white"
                    : "border-gray-600 hover:border-gray-400"
                }`}
              >
                {st.status === "done" && (
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <span className="text-[10px] font-mono text-gray-500">ST-{st.sequenceNumber}</span>
              <span className={`text-sm flex-1 truncate ${st.status === "done" ? "text-gray-500 line-through" : "text-gray-300"}`}>
                {st.title}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(st.id)}
                className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-600 hover:text-red-400 transition-all"
              >
                <Trash2Icon className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new subtask */}
      <div className="flex items-center gap-1.5">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); handleCreate(); }
          }}
          placeholder="Add a subtask..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50"
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={!newTitle.trim() || creating}
          className="px-2.5 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-500 disabled:opacity-40 rounded-lg transition-colors"
        >
          <PlusIcon className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Inline Notes (for edit modal) ───────────────────────────

type Note = {
  id: string;
  content: string;
  authorName: string;
  authorImage: string | null;
  createdAt: string;
};

function InlineNotes({ entityType, entityId }: { entityType: "task"; entityId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/notes?entityType=${entityType}&entityId=${entityId}`)
      .then((r) => r.json())
      .then((data) => setNotes(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [entityType, entityId]);

  async function handleSubmit() {
    const trimmed = newContent.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId, content: trimmed }),
      });
      if (res.ok) {
        const refreshed = await fetch(`/api/notes?entityType=${entityType}&entityId=${entityId}`);
        setNotes(await refreshed.json());
        setNewContent("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function timeAgo(dateStr: string) {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300">Notes</label>

      {/* Add note input */}
      <div>
        <textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="Add a note..."
          rows={2}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 resize-none focus:outline-none focus:border-green-500/50"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
          }}
        />
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[10px] text-gray-600">Cmd+Enter to submit</span>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!newContent.trim() || submitting}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg transition-colors"
          >
            {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            Add
          </button>
        </div>
      </div>

      {/* Notes list */}
      {loading ? (
        <p className="text-xs text-gray-500">Loading...</p>
      ) : notes.length > 0 ? (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {notes.map((note) => (
            <div key={note.id} className="rounded-lg border border-gray-800 bg-gray-800/30 px-3 py-2">
              <div className="flex items-center gap-2 mb-1">
                {note.authorImage ? (
                  <img src={note.authorImage} alt={note.authorName} className="w-4 h-4 rounded-full" />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-gray-700 flex items-center justify-center text-[8px] font-medium text-gray-400">
                    {note.authorName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-[11px] font-medium text-gray-300">{note.authorName}</span>
                <span className="text-[10px] text-gray-600">{timeAgo(note.createdAt)}</span>
              </div>
              <p className="text-xs text-gray-300 whitespace-pre-wrap">{note.content}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500">No notes yet</p>
      )}
    </div>
  );
}

// ─── Task Form Dialogue ────────────────────────────────────────

export function TaskFormDialog({
  action,
  trigger,
  title,
  taskId,
  defaultValues,
  allTags = [],
  allCustomers = [],
  allUsers = [],
  open: controlledOpen,
  onOpenChange,
  onDelete,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  trigger?: React.ReactNode;
  title: string;
  taskId?: string;
  defaultValues?: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    tagIds?: string[];
    customerId?: string;
    assignedTo?: string;
    sequenceNumber?: number | null;
  };
  allTags?: Tag[];
  allCustomers?: Customer[];
  allUsers?: User[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onDelete?: () => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const dialogOpen = isControlled ? controlledOpen : uncontrolledOpen;
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    defaultValues?.tagIds ?? []
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    defaultValues?.customerId ?? "__none__"
  );
  const [selectedAssignedTo, setSelectedAssignedTo] = useState<string>(
    defaultValues?.assignedTo ?? "__none__"
  );

  // Reset tag/customer/assignee selection when dialogue opens or a different task is edited.
  const tagIdsKey = (defaultValues?.tagIds ?? []).join(",");
  const customerIdKey = defaultValues?.customerId ?? "__none__";
  const assignedToKey = defaultValues?.assignedTo ?? "__none__";
  useEffect(() => {
    if (dialogOpen) {
      setSelectedTagIds(defaultValues?.tagIds ?? []);
      setSelectedCustomerId(defaultValues?.customerId ?? "__none__");
      setSelectedAssignedTo(defaultValues?.assignedTo ?? "__none__");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen, tagIdsKey, customerIdKey, assignedToKey]);

  function handleOpenChange(open: boolean) {
    if (isControlled) {
      onOpenChange?.(open);
    } else {
      setUncontrolledOpen(open);
    }
  }

  const [state, setState] = useState<FormState>({ success: false });
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    try {
      const result = await action(state, new FormData(e.currentTarget));
      setState(result);
      if (result.success) {
        handleOpenChange(false);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <input type="hidden" name="tagIds" value={selectedTagIds.join(",")} />

          {/* Task ID — only in edit mode */}
          {taskId && defaultValues?.sequenceNumber != null && (
            <div className="inline-flex items-center gap-1.5 text-xs font-mono text-gray-500">
              <EntityIcon type="task" />
              T-{defaultValues.sequenceNumber}
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="title" className="block text-sm font-medium text-gray-300">
              Title *
            </label>
            <input
              id="title"
              name="title"
              defaultValue={defaultValues?.title}
              placeholder="Task title"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-colors"
            />
            {state.errors?.title && (
              <p className="text-sm text-red-400">{state.errors.title[0]}</p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="description" className="block text-sm font-medium text-gray-300">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              defaultValue={defaultValues?.description}
              placeholder="Optional description"
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 resize-y focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <label htmlFor="status" className="text-sm font-medium text-gray-300 shrink-0">
                Status
              </label>
              <Select
                name="status"
                defaultValue={defaultValues?.status ?? "open"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="priority" className="text-sm font-medium text-gray-300 shrink-0">
                Priority
              </label>
              <Select
                name="priority"
                defaultValue={defaultValues?.priority ?? "medium"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Customer + Assigned To on same row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-300 shrink-0">Customer</label>
              <input type="hidden" name="customerId" value={selectedCustomerId} />
              <Select value={selectedCustomerId} onValueChange={(v) => setSelectedCustomerId(v ?? "__none__")}>
                <SelectTrigger>
                  <SelectValue>
                    {selectedCustomerId === "__none__"
                      ? "No customer"
                      : (() => {
                          const c = allCustomers.find((c) => c.id === selectedCustomerId);
                          return c ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                              {c.name}
                            </span>
                          ) : "No customer";
                        })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No customer</SelectItem>
                  {allCustomers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {allUsers.length > 0 && (
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-300 shrink-0">Assignee</label>
                <input type="hidden" name="assignedTo" value={selectedAssignedTo} />
                <Select value={selectedAssignedTo} onValueChange={(v) => setSelectedAssignedTo(v ?? "__none__")}>
                  <SelectTrigger>
                    <SelectValue>
                      {selectedAssignedTo === "__none__"
                        ? "Unassigned"
                        : (() => {
                            const u = allUsers.find((u) => u.id === selectedAssignedTo);
                            return u ? (
                              <span className="inline-flex items-center gap-1.5">
                                {u.image ? (
                                  <img src={u.image} alt="" className="w-4 h-4 rounded-full" />
                                ) : (
                                  <span className="w-4 h-4 rounded-full bg-gray-600 flex items-center justify-center text-[8px] text-white font-bold">
                                    {(u.name ?? u.email).charAt(0).toUpperCase()}
                                  </span>
                                )}
                                {u.name ?? u.email}
                              </span>
                            ) : "Unassigned";
                          })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Unassigned</SelectItem>
                    {allUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        <span className="inline-flex items-center gap-1.5">
                          {u.image ? (
                            <img src={u.image} alt="" className="w-4 h-4 rounded-full" />
                          ) : (
                            <span className="w-4 h-4 rounded-full bg-gray-600 flex items-center justify-center text-[8px] text-white font-bold">
                              {(u.name ?? u.email).charAt(0).toUpperCase()}
                            </span>
                          )}
                          {u.name ?? u.email}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <TagPicker
            allTags={allTags}
            selectedIds={selectedTagIds}
            onChange={setSelectedTagIds}
          />

          {/* Subtasks — only in edit mode */}
          {taskId && (
            <InlineSubTasks taskId={taskId} />
          )}

          {/* Notes — only in edit mode */}
          {taskId && (
            <InlineNotes entityType="task" entityId={taskId} />
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl text-sm font-medium transition-colors"
          >
            {pending ? "Saving..." : "Save Task"}
          </button>

          {taskId && onDelete && (
            <button
              type="button"
              onClick={() => {
                handleOpenChange(false);
                onDelete();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-400 bg-red-900/10 hover:bg-red-900/20 border border-red-500/20 hover:border-red-500/30 rounded-xl transition-colors"
            >
              <Trash2Icon className="w-4 h-4" />
              Delete Task
            </button>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
