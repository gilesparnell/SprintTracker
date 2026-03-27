"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TaskStatusSelect } from "./task-status-select";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  clickupTaskId: string | null;
};

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

export function TaskList({
  tasks,
  onStatusChange,
  onDelete,
}: {
  tasks: Task[];
  onStatusChange: (taskId: string, status: string) => void;
  onDelete: (taskId: string) => void;
}) {
  if (tasks.length === 0) {
    return (
      <p className="text-muted-foreground">
        No tasks yet. Add tasks to track your sprint progress.
      </p>
    );
  }

  return (
    <div className="border rounded-lg">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left p-3 text-sm font-medium">Title</th>
            <th className="text-left p-3 text-sm font-medium">Status</th>
            <th className="text-left p-3 text-sm font-medium">Priority</th>
            <th className="text-left p-3 text-sm font-medium">Sync</th>
            <th className="text-right p-3 text-sm font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id} className="border-b last:border-0">
              <td className="p-3">
                <div>
                  <span className="font-medium">{task.title}</span>
                  {task.description && (
                    <p className="text-sm text-muted-foreground truncate max-w-md">
                      {task.description}
                    </p>
                  )}
                </div>
              </td>
              <td className="p-3">
                <TaskStatusSelect
                  taskId={task.id}
                  currentStatus={task.status}
                  onStatusChange={onStatusChange}
                />
              </td>
              <td className="p-3">
                <Badge className={priorityColors[task.priority] ?? ""}>
                  {task.priority}
                </Badge>
              </td>
              <td className="p-3">
                {task.clickupTaskId ? (
                  <Badge
                    variant="outline"
                    className="bg-green-50 text-green-700 border-green-200"
                  >
                    Synced
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </td>
              <td className="p-3 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDelete(task.id)}
                >
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
