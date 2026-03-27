import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { sprints, tasks } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteSprint } from "@/lib/actions/sprints";
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

  async function handleDelete() {
    "use server";
    deleteSprint(db, id);
    redirect("/sprints");
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
              <Badge variant="outline" className="text-xs">
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
          <Link href={`/sprints/${id}/edit`}>
            <Button variant="outline">Edit</Button>
          </Link>
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
          {/* Task creation will be added in Unit 3 */}
        </div>
        <p className="text-muted-foreground">
          {total === 0
            ? "No tasks yet. Add tasks to track your sprint progress."
            : "Task list will be rendered here."}
        </p>
      </div>
    </div>
  );
}
