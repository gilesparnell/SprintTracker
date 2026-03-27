"use client";

import { useRouter } from "next/navigation";
import { TaskList } from "./task-list";

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

  return (
    <TaskList
      tasks={initialTasks}
      onStatusChange={handleStatusChange}
      onDelete={handleDelete}
    />
  );
}
