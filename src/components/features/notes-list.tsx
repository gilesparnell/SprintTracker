"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Pencil, Send, X, Loader2 } from "lucide-react";

type Note = {
  id: string;
  entityType: string;
  entityId: string;
  content: string;
  authorId: string | null;
  authorName: string;
  authorImage: string | null;
  editableUntil: string;
  createdAt: string;
  updatedAt: string;
};

function timeAgo(dateStr: string) {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function isEditable(editableUntil: string) {
  return new Date(editableUntil).getTime() > Date.now();
}

export function NotesList({
  entityType,
  entityId,
}: {
  entityType: "story" | "task" | "subtask";
  entityId: string;
}) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/notes?entityType=${entityType}&entityId=${entityId}`
      );
      if (res.ok) {
        const data = await res.json();
        setNotes(data);
      }
    } catch {
      // Silently ignore
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleSubmit = async () => {
    const trimmed = newContent.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);

    // Optimistic update
    const optimisticNote: Note = {
      id: `temp-${Date.now()}`,
      entityType,
      entityId,
      content: trimmed,
      authorId: null,
      authorName: "You",
      authorImage: null,
      editableUntil: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setNotes((prev) => [optimisticNote, ...prev]);
    setNewContent("");

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId, content: trimmed }),
      });
      if (res.ok) {
        // Refetch to get real data with author info
        await fetchNotes();
      } else {
        // Revert optimistic update
        setNotes((prev) => prev.filter((n) => n.id !== optimisticNote.id));
        setNewContent(trimmed);
      }
    } catch {
      setNotes((prev) => prev.filter((n) => n.id !== optimisticNote.id));
      setNewContent(trimmed);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (noteId: string) => {
    const trimmed = editContent.trim();
    if (!trimmed || editSubmitting) return;

    setEditSubmitting(true);

    // Optimistic update
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId
          ? { ...n, content: trimmed, updatedAt: new Date().toISOString() }
          : n
      )
    );
    setEditingId(null);

    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
      if (res.ok) {
        await fetchNotes();
      } else {
        // Revert by refetching
        await fetchNotes();
      }
    } catch {
      await fetchNotes();
    } finally {
      setEditSubmitting(false);
    }
  };

  const startEdit = (note: Note) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  return (
    <div>
      <h3 className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        <MessageSquare className="w-3.5 h-3.5" />
        Notes
      </h3>

      {/* New note input */}
      <div className="mb-4">
        <textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="Add a note..."
          rows={3}
          className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              handleSubmit();
            }
          }}
        />
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-[10px] text-gray-600">Cmd+Enter to submit</span>
          <button
            onClick={handleSubmit}
            disabled={!newContent.trim() || submitting}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Send className="w-3 h-3" />
            )}
            Add Note
          </button>
        </div>
      </div>

      {/* Notes list */}
      {loading ? (
        <div className="py-6 text-center text-sm text-gray-500">
          Loading notes...
        </div>
      ) : notes.length === 0 ? (
        <div className="py-6 text-center text-sm text-gray-500">
          No notes yet
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded-lg border border-gray-800 bg-gray-800/30 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  {note.authorImage ? (
                    <img
                      src={note.authorImage}
                      alt={note.authorName}
                      className="w-5 h-5 rounded-full"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-[10px] font-medium text-gray-400">
                      {note.authorName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-medium text-gray-300">
                    {note.authorName}
                  </span>
                  <span className="text-[10px] text-gray-600">
                    {timeAgo(note.createdAt)}
                  </span>
                  {note.updatedAt !== note.createdAt && (
                    <span className="text-[10px] text-gray-600 italic">
                      (edited)
                    </span>
                  )}
                </div>
                {isEditable(note.editableUntil) && editingId !== note.id && (
                  <button
                    onClick={() => startEdit(note)}
                    className="text-gray-600 hover:text-gray-400 transition-colors"
                    title="Edit note"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
              </div>

              {editingId === note.id ? (
                <div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        handleEdit(note.id);
                      }
                      if (e.key === "Escape") {
                        cancelEdit();
                      }
                    }}
                  />
                  <div className="mt-1.5 flex items-center gap-2 justify-end">
                    <button
                      onClick={cancelEdit}
                      className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-gray-400 hover:text-white transition-colors"
                    >
                      <X className="w-3 h-3" />
                      Cancel
                    </button>
                    <button
                      onClick={() => handleEdit(note.id)}
                      disabled={!editContent.trim() || editSubmitting}
                      className="flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-500 transition-colors disabled:opacity-40"
                    >
                      {editSubmitting ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Pencil className="w-3 h-3" />
                      )}
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-300 whitespace-pre-wrap">
                  {note.content}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
