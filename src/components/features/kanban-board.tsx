"use client";

import { useState, useEffect } from "react";
import { DragDropProvider, useDroppable } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { move } from "@dnd-kit/helpers";
import {
  CheckCircle2Icon,
  CircleDotIcon,
  ClockIcon,
  GripVerticalIcon,
  LinkIcon,
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
  sequenceNumber?: number | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignedTo?: string | null;
  clickupTaskId: string | null;
  tags: Tag[];
  customer: { id: string; name: string; color: string } | null;
};

type User = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};

const columns = [
  {
    id: "open",
    label: "Open",
    icon: CircleDotIcon,
    color: "text-amber-400",
    borderColor: "border-amber-500/40",
    bgAccent: "bg-amber-500/10",
    dotColor: "bg-amber-400",
  },
  {
    id: "in_progress",
    label: "In Progress",
    icon: ClockIcon,
    color: "text-blue-400",
    borderColor: "border-blue-500/40",
    bgAccent: "bg-blue-500/10",
    dotColor: "bg-blue-400",
  },
  {
    id: "done",
    label: "Done",
    icon: CheckCircle2Icon,
    color: "text-green-400",
    borderColor: "border-green-500/40",
    bgAccent: "bg-green-500/10",
    dotColor: "bg-green-400",
  },
];

const priorityConfig: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  low: { label: "Low", bg: "bg-gray-800", text: "text-gray-400", border: "border-gray-700" },
  medium: { label: "Med", bg: "bg-blue-900/20", text: "text-blue-400", border: "border-blue-500/30" },
  high: { label: "High", bg: "bg-amber-900/20", text: "text-amber-400", border: "border-amber-500/30" },
  urgent: { label: "Urgent", bg: "bg-red-900/20", text: "text-red-400", border: "border-red-500/30" },
};

function KanbanCard({
  task,
  columnId,
  index,
  onDelete,
  onEdit,
  allUsers = [],
}: {
  task: Task;
  columnId: string;
  index: number;
  onDelete: (taskId: string) => void;
  onEdit: (task: Task) => void;
  allUsers?: User[];
}) {
  const { ref, isDragSource } = useSortable({
    id: task.id,
    index,
    group: columnId,
    type: "item",
    accept: "item",
  });

  const priority = priorityConfig[task.priority] ?? priorityConfig.medium;

  return (
    <div
      ref={ref}
      className={`group relative bg-gray-900 border border-gray-800 rounded-lg p-2.5 cursor-grab active:cursor-grabbing transition-all duration-150 hover:border-gray-700 hover:shadow-lg hover:shadow-black/20 ${
        isDragSource ? "opacity-40 scale-95" : ""
      }`}
    >
      {/* Top-right actions: edit + drag handle */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(task);
          }}
          className="p-1 text-gray-600 hover:text-blue-400 hover:bg-blue-900/20 rounded-md transition-colors"
        >
          <PencilIcon className="w-3 h-3" />
        </button>
        <GripVerticalIcon className="w-3 h-3 text-gray-600" />
      </div>

      {/* Short ID + Title */}
      <div className="flex items-start gap-1.5 pr-8">
        {task.sequenceNumber != null && (
          <span className="text-[10px] font-mono text-gray-500 mt-0.5 shrink-0">
            T-{task.sequenceNumber}
          </span>
        )}
        <p className="text-sm font-medium text-white leading-snug line-clamp-2">
          {task.title}
        </p>
      </div>

      {/* Metadata line: assignee, priority, tags, customer, sync */}
      <div className="flex flex-wrap items-center gap-1 mt-1">
        {task.assignedTo && (() => {
          const user = allUsers.find((u) => u.id === task.assignedTo);
          if (!user) return null;
          return user.image ? (
            <img
              src={user.image}
              alt={user.name ?? user.email}
              title={user.name ?? user.email}
              className="w-4 h-4 rounded-full"
            />
          ) : (
            <span
              title={user.name ?? user.email}
              className="w-4 h-4 rounded-full bg-gray-600 flex items-center justify-center text-[8px] text-white font-bold shrink-0"
            >
              {(user.name ?? user.email).charAt(0).toUpperCase()}
            </span>
          );
        })()}
        <span
          className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded ${priority.bg} ${priority.text} ${priority.border} border`}
        >
          {priority.label}
        </span>
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
        {task.customer && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded-full border border-purple-500/30 bg-purple-900/20 text-purple-300">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: task.customer.color }} />
            {task.customer.name}
          </span>
        )}
        {task.clickupTaskId && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded bg-green-900/20 text-green-400 border border-green-500/30">
            <LinkIcon className="w-2.5 h-2.5" />
            Synced
          </span>
        )}
      </div>

      {/* Delete button */}
      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
          className="p-1 text-gray-600 hover:text-red-400 hover:bg-red-900/20 rounded-md transition-colors"
        >
          <Trash2Icon className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function KanbanColumn({
  column,
  tasks,
  onDelete,
  onEdit,
  allUsers = [],
}: {
  column: (typeof columns)[number];
  tasks: Task[];
  onDelete: (taskId: string) => void;
  onEdit: (task: Task) => void;
  allUsers?: User[];
}) {
  const { ref, isDropTarget } = useDroppable({
    id: column.id,
    type: "column",
    accept: "item",
  });

  const Icon = column.icon;

  return (
    <div
      ref={ref}
      className={`flex flex-col min-w-0 md:min-w-[250px] flex-1 rounded-xl border transition-colors duration-200 ${
        isDropTarget
          ? `${column.borderColor} ${column.bgAccent}`
          : "border-gray-800/50 bg-gray-900/30"
      }`}
    >
      {/* Column header */}
      <div className={`flex items-center gap-2 px-3 py-2.5 border-b ${
        isDropTarget ? column.borderColor : "border-gray-800/50"
      }`}>
        <div className={`w-6 h-6 rounded-md ${column.bgAccent} flex items-center justify-center`}>
          <Icon className={`w-3 h-3 ${column.color}`} />
        </div>
        <span className="text-sm font-semibold text-white">{column.label}</span>
        <span className={`ml-auto text-xs font-mono px-2 py-0.5 rounded-full ${column.bgAccent} ${column.color}`}>
          {tasks.length}
        </span>
      </div>

      {/* Cards container */}
      <div className="flex-1 p-2 space-y-1.5 min-h-[80px] overflow-y-auto">
        {tasks.map((task, index) => (
          <KanbanCard
            key={task.id}
            task={task}
            columnId={column.id}
            index={index}
            onDelete={onDelete}
            onEdit={onEdit}
            allUsers={allUsers}
          />
        ))}

        {/* Empty state */}
        {tasks.length === 0 && (
          <div className={`flex items-center justify-center h-16 border-2 border-dashed rounded-lg transition-colors ${
            isDropTarget ? column.borderColor : "border-gray-800/30"
          }`}>
            <p className="text-xs text-gray-600">Drag tasks here</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function KanbanBoard({
  tasks,
  onStatusChange,
  onDelete,
  onEdit,
  allUsers = [],
}: {
  tasks: Task[];
  onStatusChange: (taskId: string, status: string) => void;
  onDelete: (taskId: string) => void;
  onEdit: (task: Task) => void;
  allUsers?: User[];
}) {
  // Group tasks by status into a record of arrays
  function groupTasks(taskList: Task[]) {
    const grouped: Record<string, Task[]> = {
      open: [],
      in_progress: [],
      done: [],
    };
    for (const task of taskList) {
      const col = grouped[task.status] ?? grouped.open;
      col.push(task);
    }
    return grouped;
  }

  const [items, setItems] = useState<Record<string, Task[]>>(() => groupTasks(tasks));

  // Re-group when the tasks prop changes (filter, tag edits, status changes).
  const tasksKey = JSON.stringify(
    tasks.map((t) => ({ i: t.id, s: t.status, t: t.tags.map((tt) => tt.id).sort(), c: t.customer?.id }))
  );
  useEffect(() => {
    setItems(groupTasks(tasks));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasksKey]);

  return (
    <DragDropProvider
      onDragOver={(event) => {
        setItems((prev) => move(prev, event));
      }}
      onDragEnd={(event) => {
        setItems((prev) => {
          const next = move(prev, event);

          // Find which column the dragged task ended up in
          const draggedId = event.operation.source?.id;
          if (draggedId) {
            for (const [status, taskList] of Object.entries(next)) {
              const idx = taskList.findIndex((t) => t.id === draggedId);
              if (idx !== -1 && taskList[idx].status !== status) {
                // Status changed — produce new object (no mutation)
                next[status] = taskList.map((t, i) =>
                  i === idx ? { ...t, status } : t
                );
                onStatusChange(String(draggedId), status);
              }
            }
          }

          return next;
        });
      }}
    >
      <div className="flex flex-col md:flex-row gap-2.5 md:overflow-x-auto pb-2">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            tasks={items[column.id] ?? []}
            onDelete={onDelete}
            onEdit={onEdit}
            allUsers={allUsers}
          />
        ))}
      </div>
    </DragDropProvider>
  );
}
