import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { sprints, tasks, syncLog } from "@/lib/db/schema";
import { eq, count, and, sql } from "drizzle-orm";
import { deleteSprint } from "@/lib/actions/sprints";
import { createTask, getTasksBySprintId } from "@/lib/actions/tasks";
import { getClickUpConfig, getClickUpToken } from "@/lib/actions/clickup-config";
import { ClickUpClient } from "@/lib/clickup/client";
import { syncTaskToClickUp } from "@/lib/clickup/sync";
import { TaskFormDialog } from "@/components/features/task-form";
import { TaskListWrapper } from "@/components/features/task-list-wrapper";
import { SprintClickUpLinkWrapper } from "@/components/features/sprint-clickup-link-wrapper";
import { DeleteSprintButton } from "@/components/features/delete-sprint-button";
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
  const sprint = await db.select().from(sprints).where(eq(sprints.id, id)).get();

  if (!sprint) {
    notFound();
  }

  const sprintTasks = await getTasksBySprintId(db, id);
  const config = await getClickUpConfig();

  const taskCounts = await db
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
    ? (await db
        .select({ count: count() })
        .from(syncLog)
        .where(
          and(
            eq(syncLog.success, 0),
            sql`${syncLog.taskId} IN (${sql.join(sprintTaskIds.map(id => sql`${id}`), sql`, `)})`
          )
        )
        .get())?.count ?? 0
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

    const currentSprint = await db
      .select()
      .from(sprints)
      .where(eq(sprints.id, id))
      .get();

    const token = await getClickUpToken();
    if (currentSprint?.clickupListId && token) {
      const client = new ClickUpClient(token);
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
      {/* Back + Title row */}
      <div className="flex items-center gap-3 mb-2">
        <Link
          href="/sprints"
          className="text-gray-500 hover:text-white transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
        </Link>
        <h2 className="text-lg font-bold text-white">{sprint.name}</h2>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full border ${status.bg} ${status.text} ${status.border}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
        {sprint.clickupListId && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full border bg-green-900/20 text-green-400 border-green-500/30">
            <LinkIcon className="w-2.5 h-2.5" />
            Synced
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {config && !sprint.clickupListId && (
            <SprintClickUpLinkWrapper
              sprintId={id}
              sprintName={sprint.name}
            />
          )}
          <DeleteSprintButton sprintName={sprint.name} action={handleDelete} />
        </div>
      </div>

      {/* Meta + Stats single row */}
      <div className="flex items-center gap-3 mb-3 text-xs text-gray-500">
        {sprint.goal && (
          <>
            <span className="text-gray-400">{sprint.goal}</span>
            <span className="text-gray-700">·</span>
          </>
        )}
        <span className="flex items-center gap-1">
          <CalendarIcon className="w-3 h-3" />
          {sprint.startDate} — {sprint.endDate}
        </span>
        <span className="text-gray-700">·</span>
        {statCards.map((stat) => (
          <span key={stat.label} className={`flex items-center gap-1 ${stat.color}`}>
            <stat.icon className="w-3 h-3" />
            <span className="font-bold text-white">{stat.value}</span>
            <span className="text-gray-600">{stat.label}</span>
          </span>
        ))}
        {total > 0 && (
          <>
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <div className="h-1 rounded-full bg-gray-800 overflow-hidden flex-1">
                <div
                  className="h-full rounded-full bg-green-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="font-mono text-[10px] text-green-400">
                {Math.round(progress)}%
              </span>
            </div>
          </>
        )}
      </div>

      {/* Tasks */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tasks</h3>
          <div className="flex gap-2">
            {sprint.clickupListId && (
              <Link href={`/sprints/${id}/sync-log`}>
                <button className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-400 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 hover:text-gray-200 transition-colors">
                  <ScrollTextIcon className="w-3 h-3" />
                  Sync Log
                  {syncErrorCount > 0 && (
                    <span className="ml-1 w-3.5 h-3.5 rounded-full bg-red-900/50 text-red-400 text-[9px] font-bold flex items-center justify-center">
                      {syncErrorCount}
                    </span>
                  )}
                </button>
              </Link>
            )}
            <TaskFormDialog
              action={handleCreateTask}
              trigger={
                <button className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-500 rounded-lg transition-colors">
                  <PlusIcon className="w-3 h-3" />
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
