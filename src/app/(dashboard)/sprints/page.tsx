import Link from "next/link";
import { db } from "@/lib/db";
import { sprints, tasks } from "@/lib/db/schema";
import { asc, eq, count } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { SprintCard } from "@/components/features/sprint-card";

export default async function SprintsPage() {
  const allSprints = db.select().from(sprints).orderBy(asc(sprints.startDate)).all();

  const sprintsWithCounts = allSprints.map((sprint) => {
    const taskCounts = db
      .select({ status: tasks.status, count: count() })
      .from(tasks)
      .where(eq(tasks.sprintId, sprint.id))
      .groupBy(tasks.status)
      .all();

    const counts = { open: 0, in_progress: 0, done: 0 };
    for (const tc of taskCounts) {
      counts[tc.status as keyof typeof counts] = tc.count;
    }

    return { ...sprint, taskCounts: counts };
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Sprints</h2>
        <Link href="/sprints/new">
          <Button>New Sprint</Button>
        </Link>
      </div>

      {sprintsWithCounts.length === 0 ? (
        <p className="text-muted-foreground">
          No sprints yet. Create your first sprint to get started.
        </p>
      ) : (
        <div className="grid gap-4">
          {sprintsWithCounts.map((sprint) => (
            <SprintCard key={sprint.id} sprint={sprint} />
          ))}
        </div>
      )}
    </div>
  );
}
