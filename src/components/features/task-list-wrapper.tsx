"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TaskList } from "./task-list";
import { KanbanBoard } from "./kanban-board";
import { TaskFormDialog } from "./task-form";
import { KanbanIcon, ListIcon, TagIcon, XIcon } from "lucide-react";

type Tag = {
  id: string;
  name: string;
  color: string;
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  clickupTaskId: string | null;
  tags: Tag[];
};

export function TaskListWrapper({
  sprintId,
  initialTasks,
  allTags,
}: {
  sprintId: string;
  initialTasks: Task[];
  allTags: Tag[];
}) {
  const router = useRouter();
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const filteredTasks =
    selectedTagIds.length === 0
      ? initialTasks
      : initialTasks.filter((t) =>
          selectedTagIds.some((tagId) => t.tags.some((tt) => tt.id === tagId))
        );

  // Show all tags in filter bar (not just used ones) so the feature is discoverable

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }

  async function handleStatusChange(taskId: string, status: string) {
    await fetch(`/api/tasks/${taskId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  async function handleDelete(taskId: string) {
    await fetch(`/api/tasks/${taskId}`, {
      method: "DELETE",
    });
    router.refresh();
  }

  async function handleEditTask(
    _prevState: { success: boolean; errors?: Record<string, string[]> },
    formData: FormData
  ): Promise<{ success: boolean; errors?: Record<string, string[]> }> {
    if (!editingTask) return { success: false };

    const res = await fetch(`/api/tasks/${editingTask.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formData.get("title") as string,
        description: (formData.get("description") as string) || undefined,
        status: formData.get("status") as string,
        priority: formData.get("priority") as string,
      }),
    });

    const result = await res.json();
    if (!result.success) {
      return { success: false, errors: result.errors };
    }

    // Save tags
    const tagIdsRaw = formData.get("tagIds") as string;
    const tagIds = tagIdsRaw ? tagIdsRaw.split(",").filter(Boolean) : [];
    await fetch(`/api/tasks/${editingTask.id}/tags`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagIds }),
    });

    setEditingTask(null);
    router.refresh();
    return { success: true };
  }

  return (
    <div>
      {/* View toggle + tag filter */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-3 mb-3">
        {/* Tag filters */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-1 flex-wrap">
            <TagIcon className="w-3.5 h-3.5 text-gray-600 shrink-0" />
            {allTags.map((tag) => {
              const active = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full border transition-colors ${
                    active
                      ? "border-white/30 text-white bg-gray-700"
                      : "border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600"
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                  {active && <XIcon className="w-2.5 h-2.5 ml-0.5" />}
                </button>
              );
            })}
            {selectedTagIds.length > 0 && (
              <button
                onClick={() => setSelectedTagIds([])}
                className="text-[10px] text-gray-500 hover:text-gray-300 px-1.5 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        )}

        <div className="flex items-center bg-gray-900 border border-gray-800 rounded-lg p-0.5 ml-auto shrink-0">
          <button
            onClick={() => setView("kanban")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              view === "kanban"
                ? "bg-gray-800 text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <KanbanIcon className="w-3.5 h-3.5" />
            Board
          </button>
          <button
            onClick={() => setView("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              view === "list"
                ? "bg-gray-800 text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <ListIcon className="w-3.5 h-3.5" />
            List
          </button>
        </div>
      </div>

      {view === "kanban" ? (
        <KanbanBoard
          tasks={filteredTasks}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          onEdit={setEditingTask}
        />
      ) : (
        <TaskList
          tasks={filteredTasks}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          onEdit={setEditingTask}
        />
      )}

      {editingTask && (
        <TaskFormDialog
          action={handleEditTask}
          title="Edit Task"
          defaultValues={{
            title: editingTask.title,
            description: editingTask.description ?? undefined,
            status: editingTask.status,
            priority: editingTask.priority,
            tagIds: editingTask.tags.map((t) => t.id),
          }}
          allTags={allTags}
          open={!!editingTask}
          onOpenChange={(open) => {
            if (!open) setEditingTask(null);
          }}
        />
      )}
    </div>
  );
}
