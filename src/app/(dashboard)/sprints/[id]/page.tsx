import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { sprints, tasks, syncLog } from "@/lib/db/schema";
import { eq, count, and } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteSprint } from "@/lib/actions/sprints";
import { createTask, getTasksBySprintId } from "@/lib/actions/tasks";
import { getClickUpConfig } from "@/lib/actions/clickup-config";
import { ClickUpClient } from "@/lib/clickup/client";
import { syncTaskToClickUp } from "@/lib/clickup/sync";
import { TaskFormDialog } from "@/components/features/task-form";
import { TaskListWrapper } from "@/components/features/task-list-wrapper";
import { SprintClickUpLinkWrapper } from "@/components/features/sprint-clickup-link-wrapper";
import Link from "next/link";

const statusColors: Record<string, string> = {
  planning: "bg-yellow-100 text-yellow-800",
  active: "bg-green-100 text-green-800",
  completed: "bg-blue-100 text-blue-800",
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

  const sprintTasks = getTasksBySprintId(db, id);
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

  // Count sync errors for this sprint's tasks
  const syncErrors = db
    .select({ count: count() })
    .from(syncLog)
    .where(
      and(
        eq(syncLog.success, 0),
        // Only count errors for tasks in this sprint
      )
    )
    .get();

  async function handleDelete() {
    "use server";
    deleteSprint(db, id);
    redirect("/sprints");
  }

  async function handleCreateTask(
    _prevState: { success: boolean; errors?: Record<string, string[]> },
    formData: FormData
  ) {
    "use server";

    const result = createTask(db, id, {
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || undefined,
      status: (formData.get("status") as string) || "open",
      priority: (formData.get("priority") as string) || "medium",
    });

    if (!result.success) {
      return { success: false, errors: result.errors };
    }

    // Sync to ClickUp if sprint is linked
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">{sprint.name}</h2>
            <Badge className={statusColors[sprint.status] ?? ""}>
              {sprint.status}
            </Badge>
            {sprint.clickupListId && (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                ClickUp Linked
              </Badge>
            )}
          </div>
          {sprint.goal && (
            <p className="text-muted-foreground mt-1">{sprint.goal}</p>
          )}
          <p className="text-sm text-muted-foreground mt-1">
            {sprint.startDate} → {sprint.endDate}
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
            <Button variant="destructive" type="submit">
              Delete
            </Button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold">{total}</div>
          <div className="text-sm text-muted-foreground">Total</div>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold">{counts.open}</div>
          <div className="text-sm text-muted-foreground">Open</div>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold">{counts.in_progress}</div>
          <div className="text-sm text-muted-foreground">In Progress</div>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold">{counts.done}</div>
          <div className="text-sm text-muted-foreground">Done</div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Tasks</h3>
          <div className="flex gap-2">
            {sprint.clickupListId && (
              <Link href={`/sprints/${id}/sync-log`}>
                <Button variant="outline" size="sm">
                  Sync Log
                </Button>
              </Link>
            )}
            <TaskFormDialog
              action={handleCreateTask}
              trigger={<Button>Add Task</Button>}
              title="New Task"
            />
          </div>
        </div>
        <TaskListWrapper sprintId={id} initialTasks={sprintTasks} />
      </div>
    </div>
  );
}
