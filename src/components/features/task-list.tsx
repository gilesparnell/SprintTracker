"use client";

import { TaskStatusSelect } from "./task-status-select";
import {
  CheckCircle2Icon,
  ListTodoIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";

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

const priorityConfig: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  low: {
    label: "Low",
    bg: "bg-gray-800",
    text: "text-gray-400",
    border: "border-gray-700",
  },
  medium: {
    label: "Medium",
    bg: "bg-blue-900/20",
    text: "text-blue-400",
    border: "border-blue-500/30",
  },
  high: {
    label: "High",
    bg: "bg-amber-900/20",
    text: "text-amber-400",
    border: "border-amber-500/30",
  },
  urgent: {
    label: "Urgent",
    bg: "bg-red-900/20",
    text: "text-red-400",
    border: "border-red-500/30",
  },
};

export function TaskList({
  tasks,
  onStatusChange,
  onDelete,
  onEdit,
}: {
  tasks: Task[];
  onStatusChange: (taskId: string, status: string) => void;
  onDelete: (taskId: string) => void;
  onEdit: (task: Task) => void;
}) {
  if (tasks.length === 0) {
    return (
      <div className="border border-gray-800 border-dashed rounded-xl p-12 text-center">
        <div className="w-12 h-12 bg-green-900/20 rounded-xl flex items-center justify-center mx-auto mb-3">
          <ListTodoIcon className="w-5 h-5 text-green-400" />
        </div>
        <p className="text-sm text-gray-400">
          No tasks yet. Add tasks to track your sprint progress.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-gray-800 rounded-xl overflow-x-auto">
      <table className="w-full min-w-[640px]">
        <thead>
          <tr className="border-b border-gray-800 text-left">
            <th className="px-6 py-4 text-sm font-medium text-gray-400">
              Title
            </th>
            <th className="px-6 py-4 text-sm font-medium text-gray-400">
              Status
            </th>
            <th className="px-6 py-4 text-sm font-medium text-gray-400">
              Priority
            </th>
            <th className="px-6 py-4 text-sm font-medium text-gray-400">
              Tags
            </th>
            <th className="px-6 py-4 text-sm font-medium text-gray-400">
              Sync
            </th>
            <th className="px-6 py-4 text-sm font-medium text-gray-400 text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const priority = priorityConfig[task.priority] ?? priorityConfig.medium;
            return (
              <tr
                key={task.id}
                className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
              >
                <td className="px-6 py-4">
                  <div>
                    <span className="text-sm font-medium text-white">
                      {task.title}
                    </span>
                    {task.description && (
                      <p className="text-xs text-gray-500 truncate max-w-md mt-0.5">
                        {task.description}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <TaskStatusSelect
                    taskId={task.id}
                    currentStatus={task.status}
                    onStatusChange={onStatusChange}
                  />
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full border ${priority.bg} ${priority.text} ${priority.border}`}
                  >
                    {priority.label}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {task.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded-full border border-gray-700/50 text-gray-300"
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                      </span>
                    ))}
                    {task.tags.length === 0 && (
                      <span className="text-xs text-gray-600">—</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {task.clickupTaskId ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-400">
                      <CheckCircle2Icon className="w-3.5 h-3.5" />
                      Synced
                    </span>
                  ) : (
                    <span className="text-xs text-gray-600">—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onEdit(task)}
                      className="p-2 text-gray-500 hover:text-blue-400 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(task.id)}
                      className="p-2 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <Trash2Icon className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
