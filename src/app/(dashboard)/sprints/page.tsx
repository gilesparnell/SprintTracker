import Link from "next/link";
import { db } from "@/lib/db";
import { sprints, tasks } from "@/lib/db/schema";
import { asc, eq, count } from "drizzle-orm";
import { SprintCard } from "@/components/features/sprint-card";
import { PlusIcon, ZapIcon } from "lucide-react";

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
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white">Sprints</h2>
          <p className="text-gray-400 text-sm mt-1">
            Manage your development cycles
          </p>
        </div>
        <Link href="/sprints/new">
          <button className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
            <PlusIcon className="w-4 h-4" />
            New Sprint
          </button>
        </Link>
      </div>

      {sprintsWithCounts.length === 0 ? (
        <div className="border border-gray-800 border-dashed rounded-2xl p-16 text-center">
          <div className="w-14 h-14 bg-green-900/20 rounded-xl flex items-center justify-center mx-auto mb-4">
            <ZapIcon className="w-6 h-6 text-green-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No sprints yet</h3>
          <p className="text-gray-400 text-sm max-w-sm mx-auto mb-6">
            Create your first sprint to start tracking goals and tasks.
          </p>
          <Link href="/sprints/new">
            <button className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors mx-auto">
              <PlusIcon className="w-4 h-4" />
              Create Sprint
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sprintsWithCounts.map((sprint) => (
            <SprintCard key={sprint.id} sprint={sprint} />
          ))}
        </div>
      )}
    </div>
  );
}
