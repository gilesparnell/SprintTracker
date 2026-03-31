import { notFound, redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { sprints, tasks, syncLog } from "@/lib/db/schema";
import { eq, count, and, sql } from "drizzle-orm";
import { deleteSprint, setSprintStatus } from "@/lib/actions/sprints";
import { getTasksBySprintId } from "@/lib/actions/tasks";
import { getStories } from "@/lib/actions/stories";
import { getAllTags, getTagsForTasks } from "@/lib/actions/tags";
import { getAllCustomers } from "@/lib/actions/customers";
import { getActiveUsers } from "@/lib/actions/users";
import { getAllProducts } from "@/lib/actions/products";
import { getClickUpConfig } from "@/lib/actions/clickup-config";
import { TaskListWrapper } from "@/components/features/task-list-wrapper";
import { SprintClickUpLinkWrapper } from "@/components/features/sprint-clickup-link-wrapper";
import { DeleteSprintButton } from "@/components/features/delete-sprint-button";
import { EntityIcon } from "@/components/ui/entity-icon";
import Link from "next/link";
import {
  ArrowLeftIcon,
  BookOpenIcon,
  BugIcon,
  CalendarIcon,
  CheckCircle2Icon,
  CircleDotIcon,
  ClockIcon,
  LinkIcon,
  ListTodoIcon,
  ScrollTextIcon,
  SparklesIcon,
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

  // Parallel fetch: all independent queries at once
  const [sprintTasks, sprintStories, config, allTags, allCustomers, allUsers, allProducts, taskCounts] = await Promise.all([
    getTasksBySprintId(db, id),
    getStories(db, { sprintId: id }),
    getClickUpConfig(),
    getAllTags(db),
    getAllCustomers(db),
    getActiveUsers(db),
    getAllProducts(db),
    db
      .select({ status: tasks.status, count: count() })
      .from(tasks)
      .where(eq(tasks.sprintId, id))
      .groupBy(tasks.status)
      .all(),
  ]);

  // Second wave: queries that depend on sprintTasks
  const sprintTaskIds = sprintTasks.map((t) => t.id);
  const [taskTagsMap, syncErrorCount] = await Promise.all([
    getTagsForTasks(db, sprintTaskIds),
    sprintTaskIds.length > 0
      ? db
          .select({ count: count() })
          .from(syncLog)
          .where(
            and(
              eq(syncLog.success, 0),
              sql`${syncLog.taskId} IN (${sql.join(sprintTaskIds.map(id => sql`${id}`), sql`, `)})`
            )
          )
          .get()
          .then((r) => r?.count ?? 0)
      : Promise.resolve(0),
  ]);

  const customerMap = Object.fromEntries(allCustomers.map(c => [c.id, c]));
  const tasksWithTags = sprintTasks.map((t) => ({
    ...t,
    tags: taskTagsMap[t.id] ?? [],
    customer: t.customerId ? customerMap[t.customerId] ?? null : null,
  }));

  const counts = { open: 0, in_progress: 0, done: 0 };
  for (const tc of taskCounts) {
    counts[tc.status as keyof typeof counts] = tc.count;
  }

  const total = counts.open + counts.in_progress + counts.done;
  const progress = total > 0 ? (counts.done / total) * 100 : 0;
  const status = statusConfig[sprint.status] ?? statusConfig.planning;

  async function handleDelete() {
    "use server";
    await deleteSprint(db, id);
    revalidateTag("sidebar", "seconds");
    redirect("/sprints");
  }

  async function handleSetPlanning() {
    "use server";
    await setSprintStatus(db, id, "planning");
    redirect(`/sprints/${id}`);
  }

  async function handleSetActive() {
    "use server";
    await setSprintStatus(db, id, "active");
    redirect(`/sprints/${id}`);
  }

  async function handleSetCompleted() {
    "use server";
    await setSprintStatus(db, id, "completed");
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
      <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
        <Link
          href="/sprints"
          className="text-gray-500 hover:text-white transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
        </Link>
        <h2 className="text-base md:text-lg font-bold text-white">{sprint.name}</h2>
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
      </div>

      {/* Status action buttons */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {config && !sprint.clickupListId && (
          <SprintClickUpLinkWrapper
            sprintId={id}
            sprintName={sprint.name}
          />
        )}
        {sprint.status !== "planning" && (
          <form action={handleSetPlanning}>
            <button
              type="submit"
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-400 bg-amber-900/20 border border-amber-500/30 rounded-lg hover:bg-amber-900/40 transition-colors"
            >
              <CircleDotIcon className="w-3 h-3" />
              Planning
            </button>
          </form>
        )}
        {sprint.status !== "active" && (
          <form action={handleSetActive}>
            <button
              type="submit"
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-green-400 bg-green-900/20 border border-green-500/30 rounded-lg hover:bg-green-900/40 transition-colors"
            >
              <ClockIcon className="w-3 h-3" />
              Active
            </button>
          </form>
        )}
        {sprint.status !== "completed" && (
          <form action={handleSetCompleted}>
            <button
              type="submit"
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-400 bg-blue-900/20 border border-blue-500/30 rounded-lg hover:bg-blue-900/40 transition-colors"
            >
              <CheckCircle2Icon className="w-3 h-3" />
              Complete
            </button>
          </form>
        )}
        <DeleteSprintButton sprintName={sprint.name} action={handleDelete} />
      </div>

      {/* Meta + Stats — wraps on mobile */}
      <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-3 text-xs text-gray-500">
        {sprint.goal && (
          <>
            <span className="text-gray-400">{sprint.goal}</span>
            <span className="text-gray-700 hidden md:inline">·</span>
          </>
        )}
        <span className="flex items-center gap-1">
          <CalendarIcon className="w-3 h-3" />
          {sprint.startDate} — {sprint.endDate}
        </span>
        <span className="text-gray-700 hidden md:inline">·</span>
        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
          {statCards.map((stat) => (
            <span key={stat.label} className={`flex items-center gap-1 ${stat.color}`}>
              <stat.icon className="w-3 h-3" />
              <span className="font-bold text-white">{stat.value}</span>
              <span className="text-gray-600">{stat.label}</span>
            </span>
          ))}
        </div>
        {total > 0 && (
          <div className="flex items-center gap-1.5 w-full md:w-auto md:flex-1 min-w-0">
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
        )}
      </div>

      {/* Stories */}
      {sprintStories.length > 0 && (
        <div className="mb-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Stories</h3>
          <div className="flex flex-col gap-1">
            {sprintStories.map((story) => {
              const typeIcons: Record<string, { icon: typeof BookOpenIcon; color: string }> = {
                user_story: { icon: BookOpenIcon, color: "text-gray-400" },
                feature_request: { icon: SparklesIcon, color: "text-purple-400" },
                bug: { icon: BugIcon, color: "text-red-400" },
              };
              const typeConf = typeIcons[story.type] ?? typeIcons.user_story;
              const TypeIcon = typeConf.icon;
              const storyProduct = allProducts.find((p) => p.id === story.productId);
              return (
                <Link
                  key={story.id}
                  href={`/stories/${story.id}`}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-800 bg-gray-900 hover:border-gray-700 hover:bg-gray-800/50 transition-colors group"
                >
                  <TypeIcon className={`w-3.5 h-3.5 shrink-0 ${typeConf.color}`} />
                  <span className="text-[11px] font-mono text-gray-500">S-{story.sequenceNumber}</span>
                  <span className="text-xs text-gray-300 truncate group-hover:text-white transition-colors">{story.title}</span>
                  {storyProduct && (
                    <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded-full border border-gray-700 bg-gray-800/50 text-gray-400">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: storyProduct.color }} />
                      {storyProduct.name}
                    </span>
                  )}
                  <span
                    className={`ml-auto shrink-0 inline-flex items-center px-1.5 py-0.5 text-[10px] rounded-full border ${
                      story.status === "done"
                        ? "bg-green-900/20 text-green-400 border-green-500/30"
                        : story.status === "in_sprint"
                          ? "bg-blue-900/20 text-blue-400 border-blue-500/30"
                          : "bg-gray-800 text-gray-400 border-gray-700"
                    }`}
                  >
                    {story.status === "in_sprint" ? "In Sprint" : story.status === "done" ? "Done" : "Backlog"}
                  </span>
                  <span className="shrink-0 text-[10px] text-gray-600">{story.taskCount} {story.taskCount === 1 ? "task" : "tasks"}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Tasks */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tasks</h3>
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
        </div>
        <TaskListWrapper sprintId={id} initialTasks={tasksWithTags} allTags={allTags} allCustomers={allCustomers} allUsers={allUsers} />
      </div>
    </div>
  );
}
