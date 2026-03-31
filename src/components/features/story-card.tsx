"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRightIcon,
  ChevronDownIcon,
  GripVerticalIcon,
  ListTodoIcon,
  UserCircleIcon,
} from "lucide-react";
import { formatDisplayId } from "@/lib/types";
import type { StoryWithTaskCount } from "@/lib/actions/stories";

type User = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};

type Customer = {
  id: string;
  name: string;
  color: string;
};

type Sprint = {
  id: string;
  name: string;
  status: string;
};

const priorityConfig: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  low: { label: "Low", bg: "bg-gray-800", text: "text-gray-400", border: "border-gray-700" },
  medium: { label: "Med", bg: "bg-blue-900/20", text: "text-blue-400", border: "border-blue-500/30" },
  high: { label: "High", bg: "bg-amber-900/20", text: "text-amber-400", border: "border-amber-500/30" },
  urgent: { label: "Urgent", bg: "bg-red-900/20", text: "text-red-400", border: "border-red-500/30" },
};

export function StoryCard({
  story,
  users,
  customers,
  sprints,
}: {
  story: StoryWithTaskCount;
  users: User[];
  customers?: Customer[];
  sprints: Sprint[];
}) {
  const router = useRouter();
  const [sprintMenuOpen, setSprintMenuOpen] = useState(false);
  const [moving, setMoving] = useState(false);

  const priority = priorityConfig[story.priority] ?? priorityConfig.medium;
  const assignee = users.find((u) => u.id === story.assignedTo);
  const customer = customers?.find((c) => c.id === story.customerId);

  async function handleMoveToSprint(sprintId: string) {
    setMoving(true);
    setSprintMenuOpen(false);
    try {
      const res = await fetch(`/api/stories/${story.id}/move-to-sprint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sprintId }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setMoving(false);
    }
  }

  return (
    <div className="group relative flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl p-3 hover:border-gray-700 transition-colors">
      {/* Drag handle */}
      <div className="shrink-0 cursor-grab active:cursor-grabbing text-gray-600 hover:text-gray-400 transition-colors">
        <GripVerticalIcon className="w-4 h-4" />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {/* Sequence ID */}
          <span className="shrink-0 text-xs font-mono text-gray-500">
            {formatDisplayId("story", story.sequenceNumber)}
          </span>

          {/* Title as link */}
          <Link
            href={`/stories/${story.id}`}
            className="text-sm font-medium text-white hover:text-green-400 transition-colors truncate"
          >
            {story.title}
          </Link>
        </div>

        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Priority badge */}
          <span
            className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded ${priority.bg} ${priority.text} ${priority.border} border`}
          >
            {priority.label}
          </span>

          {/* Customer badge */}
          {customer && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded-full border border-purple-500/30 bg-purple-900/20 text-purple-300">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: customer.color }}
              />
              {customer.name}
            </span>
          )}

          {/* Task count */}
          <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
            <ListTodoIcon className="w-3 h-3" />
            {story.taskCount} {story.taskCount === 1 ? "task" : "tasks"}
          </span>
        </div>
      </div>

      {/* Assignee avatar */}
      <div className="shrink-0">
        {assignee ? (
          assignee.image ? (
            <img
              src={assignee.image}
              alt={assignee.name ?? assignee.email}
              className="w-7 h-7 rounded-full border border-gray-700"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-[10px] font-medium text-gray-400">
              {(assignee.name ?? assignee.email).charAt(0).toUpperCase()}
            </div>
          )
        ) : (
          <UserCircleIcon className="w-7 h-7 text-gray-700" />
        )}
      </div>

      {/* Move to Sprint button/menu */}
      {sprints.length > 0 && (
        <div className="relative shrink-0">
          <button
            onClick={() => setSprintMenuOpen(!sprintMenuOpen)}
            disabled={moving}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-gray-600 rounded-lg transition-colors disabled:opacity-50"
          >
            <ArrowRightIcon className="w-3 h-3" />
            Sprint
            <ChevronDownIcon className="w-3 h-3" />
          </button>

          {sprintMenuOpen && (
            <>
              {/* Backdrop to close menu */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setSprintMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-gray-900 border border-gray-700 rounded-xl shadow-xl shadow-black/40 py-1 max-h-60 overflow-y-auto">
                {sprints.map((sprint) => (
                  <button
                    key={sprint.id}
                    onClick={() => handleMoveToSprint(sprint.id)}
                    className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                  >
                    {sprint.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
