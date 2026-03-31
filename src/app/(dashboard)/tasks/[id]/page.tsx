export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getTaskById } from "@/lib/actions/tasks";
import { getSubTasksForTask } from "@/lib/actions/subtasks";
import { getActiveUsers } from "@/lib/actions/users";
import { getAllCustomers } from "@/lib/actions/customers";
import { NotesList } from "@/components/features/notes-list";
import Link from "next/link";
import {
  ArrowLeftIcon,
  AlertTriangleIcon,
  UserIcon,
  ListTodoIcon,
} from "lucide-react";
import { EntityIcon } from "@/components/ui/entity-icon";
import { TaskActions } from "@/components/features/task-actions";

const statusConfig: Record<
  string,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  open: {
    label: "Open",
    bg: "bg-amber-900/20",
    text: "text-amber-400",
    border: "border-amber-500/30",
    dot: "bg-amber-400",
  },
  in_progress: {
    label: "In Progress",
    bg: "bg-blue-900/20",
    text: "text-blue-400",
    border: "border-blue-500/30",
    dot: "bg-blue-400",
  },
  done: {
    label: "Done",
    bg: "bg-green-900/20",
    text: "text-green-400",
    border: "border-green-500/30",
    dot: "bg-green-400",
  },
};

const priorityConfig: Record<
  string,
  { label: string; color: string }
> = {
  low: { label: "Low", color: "text-gray-400" },
  medium: { label: "Medium", color: "text-blue-400" },
  high: { label: "High", color: "text-amber-400" },
  urgent: { label: "Urgent", color: "text-red-400" },
};

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const task = await getTaskById(db, id);

  if (!task) {
    notFound();
  }

  const subtasks = await getSubTasksForTask(db, id);
  const users = await getActiveUsers(db);
  const customers = await getAllCustomers(db);

  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
  const customerMap = Object.fromEntries(customers.map((c) => [c.id, c]));

  const assignee = task.assignedTo ? userMap[task.assignedTo] : null;
  const customer = task.customerId ? customerMap[task.customerId] : null;
  const status = statusConfig[task.status] ?? statusConfig.open;
  const priority = priorityConfig[task.priority] ?? priorityConfig.medium;

  const backLink = task.sprintId ? `/sprints/${task.sprintId}` : "/sprints";

  return (
    <div className="max-w-3xl">
      {/* Back + Title */}
      <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
        <Link
          href={backLink}
          className="text-gray-500 hover:text-white transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
        </Link>
        <h2 className="text-base md:text-lg font-bold text-white inline-flex items-center gap-1.5">
          <EntityIcon type="task" className="w-4 h-4" />
          <span className="text-gray-500 font-normal">T-{task.sequenceNumber}</span>{" "}
          {task.title}
        </h2>
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full border ${status.bg} ${status.text} ${status.border}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
        <span className={`text-xs font-medium ${priority.color}`}>
          {priority.label} priority
        </span>
      </div>

      {/* Actions */}
      <div className="mb-4">
        <TaskActions
          taskId={id}
          taskTitle={task.title}
          sprintId={task.sprintId}
          subtaskCount={subtasks.length}
        />
      </div>

      {/* Meta info */}
      <div className="rounded-lg border border-gray-800 bg-gray-800/30 p-4 mb-4 space-y-3">
        {assignee && (
          <div className="flex items-center gap-2 text-sm">
            <UserIcon className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-gray-500">Assignee:</span>
            <div className="flex items-center gap-1.5">
              {assignee.image ? (
                <img
                  src={assignee.image}
                  alt={assignee.name ?? ""}
                  className="w-5 h-5 rounded-full"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-[10px] font-medium text-gray-400">
                  {(assignee.name ?? "?").charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-gray-300">{assignee.name}</span>
            </div>
          </div>
        )}
        {customer && (
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangleIcon className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-gray-500">Customer:</span>
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full border"
              style={{
                borderColor: customer.color + "50",
                backgroundColor: customer.color + "15",
                color: customer.color,
              }}
            >
              {customer.name}
            </span>
          </div>
        )}
        {task.description && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Description</p>
            <p className="text-sm text-gray-300 whitespace-pre-wrap">
              {task.description}
            </p>
          </div>
        )}
      </div>

      {/* Subtasks */}
      {subtasks.length > 0 && (
        <div className="mb-6">
          <h3 className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            <ListTodoIcon className="w-3.5 h-3.5" />
            Subtasks ({subtasks.length})
          </h3>
          <div className="space-y-1.5">
            {subtasks.map((st) => {
              const stStatus = statusConfig[st.status] ?? statusConfig.open;
              const stAssignee = st.assignedTo
                ? userMap[st.assignedTo]
                : null;
              return (
                <div
                  key={st.id}
                  className="flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-800/30 px-3 py-2"
                >
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded-full border ${stStatus.bg} ${stStatus.text} ${stStatus.border}`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${stStatus.dot}`}
                    />
                    {stStatus.label}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500 font-mono">
                    <EntityIcon type="subtask" />
                    ST-{st.sequenceNumber}
                  </span>
                  <span className="text-sm text-gray-300 truncate flex-1">
                    {st.title}
                  </span>
                  {stAssignee && (
                    <div className="flex items-center gap-1">
                      {stAssignee.image ? (
                        <img
                          src={stAssignee.image}
                          alt={stAssignee.name ?? ""}
                          className="w-4 h-4 rounded-full"
                        />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-gray-700 flex items-center justify-center text-[8px] font-medium text-gray-400">
                          {(stAssignee.name ?? "?").charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Notes */}
      <NotesList entityType="task" entityId={id} />
    </div>
  );
}
