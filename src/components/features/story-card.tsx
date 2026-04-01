"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRightIcon,
  BookOpenIcon,
  BugIcon,
  ChevronDownIcon,
  GripVerticalIcon,
  ListTodoIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react";
import { formatDisplayId } from "@/lib/types";
import { EntityIcon } from "@/components/ui/entity-icon";
import { StoryDeleteDialog } from "@/components/features/story-delete-dialog";
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

const storyTypeIcons: Record<string, { icon: typeof BookOpenIcon; color: string; label: string }> = {
  user_story: { icon: BookOpenIcon, color: "text-gray-400", label: "Story" },
  feature_request: { icon: SparklesIcon, color: "text-purple-400", label: "Feature" },
  bug: { icon: BugIcon, color: "text-red-400", label: "Bug" },
};

const statusConfig: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  backlog: { label: "Backlog", bg: "bg-gray-800", text: "text-gray-400", border: "border-gray-700" },
  in_sprint: { label: "In Sprint", bg: "bg-blue-900/20", text: "text-blue-400", border: "border-blue-500/30" },
  done: { label: "Done", bg: "bg-green-900/20", text: "text-green-400", border: "border-green-500/30" },
};

export function StoryCard({
  story,
  allStories,
  users,
  customers,
  sprints,
}: {
  story: StoryWithTaskCount;
  allStories: StoryWithTaskCount[];
  users: User[];
  customers?: Customer[];
  sprints: Sprint[];
}) {
  const router = useRouter();
  const [sprintMenuOpen, setSprintMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [moving, setMoving] = useState(false);

  const priority = priorityConfig[story.priority] ?? priorityConfig.medium;
  const status = statusConfig[story.status] ?? statusConfig.backlog;
  const assignee = users.find((u) => u.id === story.assignedTo);
  const customer = customers?.find((c) => c.id === story.customerId);

  const otherStories = allStories
    .filter((s) => s.id !== story.id)
    .map((s) => ({ id: s.id, sequenceNumber: s.sequenceNumber, title: s.title }));

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
    <>
      <div className="group flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-800/40 transition-colors">
        {/* Drag handle */}
        <div className="shrink-0 cursor-grab active:cursor-grabbing text-gray-700 hover:text-gray-500 transition-colors">
          <GripVerticalIcon className="w-3.5 h-3.5" />
        </div>

        {/* Sequence ID with type icon */}
        {(() => {
          const typeConfig = storyTypeIcons[story.type] ?? storyTypeIcons.user_story;
          const TypeIcon = typeConfig.icon;
          return (
            <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-mono text-gray-500 w-14`} title={typeConfig.label}>
              <TypeIcon className={`w-3 h-3 ${typeConfig.color}`} />
              {formatDisplayId("story", story.sequenceNumber)}
            </span>
          );
        })()}

        {/* Title + task count */}
        <Link
          href={`/stories/${story.id}`}
          className="text-sm text-white hover:text-green-400 transition-colors truncate min-w-0 flex-1"
        >
          {story.title}
        </Link>
        {story.taskCount > 0 && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded border border-gray-700 bg-gray-800 text-gray-300 shrink-0">
            <ListTodoIcon className="w-3 h-3 text-gray-400" />
            {story.taskCount}
          </span>
        )}

        {/* Metadata badges — right side */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Status */}
          <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded ${status.bg} ${status.text} ${status.border} border`}>
            {status.label}
          </span>

          {/* Priority */}
          <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded ${priority.bg} ${priority.text} ${priority.border} border`}>
            {priority.label}
          </span>

          {/* Customer */}
          {customer && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded-full border border-purple-500/30 bg-purple-900/20 text-purple-300">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: customer.color }} />
              {customer.name}
            </span>
          )}

          {/* Assignee */}
          <div className="w-5 shrink-0 flex justify-center">
            {assignee ? (
              assignee.image ? (
                <img
                  src={assignee.image}
                  alt={assignee.name ?? assignee.email}
                  title={assignee.name ?? assignee.email}
                  className="w-5 h-5 rounded-full"
                />
              ) : (
                <span
                  title={assignee.name ?? assignee.email}
                  className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-[8px] font-bold text-gray-400"
                >
                  {(assignee.name ?? assignee.email).charAt(0).toUpperCase()}
                </span>
              )
            ) : (
              <span className="w-5 h-5" />
            )}
          </div>

          {/* Delete — hover only */}
          <button
            onClick={() => setDeleteOpen(true)}
            className="p-1 text-gray-700 hover:text-red-400 hover:bg-red-900/20 rounded-md transition-all opacity-0 group-hover:opacity-100"
          >
            <Trash2Icon className="w-3 h-3" />
          </button>

          {/* Move to Sprint */}
          {sprints.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setSprintMenuOpen(!sprintMenuOpen)}
                disabled={moving}
                className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 hover:text-white bg-gray-800/50 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-md transition-colors disabled:opacity-50 opacity-0 group-hover:opacity-100"
              >
                <ArrowRightIcon className="w-2.5 h-2.5" />
                Sprint
                <ChevronDownIcon className="w-2.5 h-2.5" />
              </button>

              {sprintMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setSprintMenuOpen(false)} />
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
      </div>

      <StoryDeleteDialog
        story={{ id: story.id, sequenceNumber: story.sequenceNumber, title: story.title }}
        taskCount={story.taskCount}
        otherStories={otherStories}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}
