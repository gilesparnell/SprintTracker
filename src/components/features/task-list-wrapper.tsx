"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TaskList } from "./task-list";
import { KanbanBoard } from "./kanban-board";
import { TaskFormDialog } from "./task-form";
import { KanbanIcon, ListIcon } from "lucide-react";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  clickupTaskId: string | null;
};

export function TaskListWrapper({
  sprintId,
  initialTasks,
}: {
  sprintId: string;
  initialTasks: Task[];
}) {
  const router = useRouter();
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [editingTask, setEditingTask] = useState<Task | null>(null);

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

    setEditingTask(null);
    router.refresh();
    return { success: true };
  }

  return (
    <div>
      {/* View toggle */}
      <div className="flex justify-end mb-3">
        <div className="flex items-center bg-gray-900 border border-gray-800 rounded-lg p-0.5">
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
          tasks={initialTasks}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          onEdit={setEditingTask}
        />
      ) : (
        <TaskList
          tasks={initialTasks}
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
          }}
          open={!!editingTask}
          onOpenChange={(open) => {
            if (!open) setEditingTask(null);
          }}
        />
      )}
    </div>
  );
}
