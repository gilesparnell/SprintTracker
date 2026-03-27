import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { sprints, tasks, syncLog } from "@/lib/db/schema";
import { eq, count, and, sql } from "drizzle-orm";
import { deleteSprint } from "@/lib/actions/sprints";
import { createTask, getTasksBySprintId } from "@/lib/actions/tasks";
import { getClickUpConfig } from "@/lib/actions/clickup-config";
import { ClickUpClient } from "@/lib/clickup/client";
import { syncTaskToClickUp } from "@/lib/clickup/sync";
import { TaskFormDialog } from "@/components/features/task-form";
import { TaskListWrapper } from "@/components/features/task-list-wrapper";
import { SprintClickUpLinkWrapper } from "@/components/features/sprint-clickup-link-wrapper";
import Link from "next/link";
import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckCircle2Icon,
  CircleDotIcon,
  ClockIcon,
  LinkIcon,
  ListTodoIcon,
  PlusIcon,
  ScrollTextIcon,
  Trash2Icon,
} from "lucide-react";

const statusConfig: Record<
  string,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  planning: {
    label: "Planning",
    bg: "bg-amber-900/20",
    text: "text-amber-400",
    border: "border-amber-500/30",
    dot: "bg-amber-400",
  },
  active: {
    label: "Active",
    bg: "bg-green-900/20",
    text: "text-green-400",
    border: "border-green-500/30",
    dot: "bg-green-400",
  },
  completed: {
    label: "Completed",
    bg: "bg-blue-900/20",
    text: "text-blue-400",
    border: "border-blue-500/30",
    dot: "bg-blue-400",
  },
};

export default async function SprintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sprint = db.select().from(sprints).where(eq(sprints.id, id)).get();

  if (!sprint) {
    notFound();
  }

  const sprintTasks = await getTasksBySprintId(db, id);
  const config = await getClickUpConfig();

  const taskCounts = db
    .select({ status: tasks.status, count: count() })
    .from(tasks)
    .where(eq(tasks.sprintId, id))
    .groupBy(tasks.status)
    .all();

  const counts = { open: 0, in_progress: 0, done: 0 };
  for (const tc of taskCounts) {
    counts[tc.status as keyof typeof counts] = tc.count;
  }

  const total = counts.open + counts.in_progress + counts.done;
  const progress = total > 0 ? (counts.done / total) * 100 : 0;
  const status = statusConfig[sprint.status] ?? statusConfig.planning;

  const sprintTaskIds = sprintTasks.map((t) => t.id);
  const syncErrorCount = sprintTaskIds.length > 0
    ? db
        .select({ count: count() })
        .from(syncLog)
        .where(
          and(
            eq(syncLog.success, 0),
            sql`${syncLog.taskId} IN (${sql.join(sprintTaskIds.map(id => sql`${id}`), sql`, `)})`
          )
        )
        .get()?.count ?? 0
    : 0;

  async function handleDelete() {
    "use server";
    await deleteSprint(db, id);
    redirect("/sprints");
  }

  async function handleCreateTask(
    _prevState: { success: boolean; errors?: Record<string, string[]> },
    formData: FormData
  ) {
    "use server";

    const result = await createTask(db, id, {
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || undefined,
      status: (formData.get("status") as "open" | "in_progress" | "done") || "open",
      priority: (formData.get("priority") as "low" | "medium" | "high" | "urgent") || "medium",
    });

    if (!result.success) {
      return { success: false, errors: result.errors };
    }

    const currentSprint = db
      .select()
      .from(sprints)
      .where(eq(sprints.id, id))
      .get();

    if (currentSprint?.clickupListId && process.env.CLICKUP_API_TOKEN) {
      const client = new ClickUpClient(process.env.CLICKUP_API_TOKEN);
      await syncTaskToClickUp(
        db,
        client,
        result.task!.id,
        currentSprint.clickupListId
      );
    }

    redirect(`/sprints/${id}`);
  }

  const statCards = [
    {
      label: "Total",
      value: total,
      icon: ListTodoIcon,
      color: "text-gray-400",
      bg: "bg-gray-800",
      borderColor: "border-gray-700",
    },
    {
      label: "Open",
      value: counts.open,
      icon: CircleDotIcon,
      color: "text-amber-400",
      bg: "bg-amber-900/20",
      borderColor: "border-amber-500/30",
    },
    {
      label: "In Progress",
      value: counts.in_progress,
      icon: ClockIcon,
      color: "text-blue-400",
      bg: "bg-blue-900/20",
      borderColor: "border-blue-500/30",
    },
    {
      label: "Done",
      value: counts.done,
      icon: CheckCircle2Icon,
      color: "text-green-400",
      bg: "bg-green-900/20",
      borderColor: "border-green-500/30",
    },
  ];

  return (
    <div className="max-w-5xl">
      {/* Back */}
      <Link
        href="/sprints"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeftIcon className="w-3.5 h-3.5" />
        Back to Sprints
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-3xl font-bold text-white">{sprint.name}</h2>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border ${status.bg} ${status.text} ${status.border}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
            {sprint.clickupListId && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border bg-green-900/20 text-green-400 border-green-500/30">
                <LinkIcon className="w-3 h-3" />
                ClickUp Linked
              </span>
            )}
          </div>
          {sprint.goal && (
            <p className="text-gray-400 mb-1">{sprint.goal}</p>
          )}
          <p className="text-sm text-gray-500 flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5" />
            {sprint.startDate} — {sprint.endDate}
          </p>
        </div>
        <div className="flex gap-2">
          {config && !sprint.clickupListId && (
            <SprintClickUpLinkWrapper
              sprintId={id}
              sprintName={sprint.name}
            />
          )}
          <form action={handleDelete}>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-red-400 bg-red-900/20 border border-red-500/30 rounded-xl hover:bg-red-900/40 transition-colors"
            >
              <Trash2Icon className="w-3.5 h-3.5" />
              Delete
            </button>
          </form>
        </div>
      </div>

      {/* Progress */}
      {total > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-400">Sprint Progress</span>
            <span className="font-mono text-sm text-green-400">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className={`${stat.bg} border ${stat.borderColor} rounded-xl p-4`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg bg-gray-900/50 flex items-center justify-center`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
            <div className="text-xs text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tasks */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Tasks</h3>
          <div className="flex gap-2">
            {sprint.clickupListId && (
              <Link href={`/sprints/${id}/sync-log`}>
                <button className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-400 bg-gray-800 border border-gray-700 rounded-xl hover:bg-gray-700 hover:text-gray-200 transition-colors">
                  <ScrollTextIcon className="w-3.5 h-3.5" />
                  Sync Log
                  {syncErrorCount > 0 && (
                    <span className="ml-1 w-4 h-4 rounded-full bg-red-900/50 text-red-400 text-[10px] font-bold flex items-center justify-center">
                      {syncErrorCount}
                    </span>
                  )}
                </button>
              </Link>
            )}
            <TaskFormDialog
              action={handleCreateTask}
              trigger={
                <button className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-500 rounded-xl transition-colors">
                  <PlusIcon className="w-3.5 h-3.5" />
                  Add Task
                </button>
              }
              title="New Task"
            />
          </div>
        </div>
        <TaskListWrapper sprintId={id} initialTasks={sprintTasks} />
      </div>
    </div>
  );
}
