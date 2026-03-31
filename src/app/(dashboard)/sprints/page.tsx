export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { sprints, tasks, folders } from "@/lib/db/schema";
import { asc, count, sql } from "drizzle-orm";
import { SprintFolderList } from "@/components/features/sprint-folder-list";
import { PlusIcon, ZapIcon } from "lucide-react";

export default async function SprintsPage() {
  // Parallel: fetch folders, sprints, and all task counts in 3 queries (not N+1)
  const [allFolders, allSprints, allTaskCounts] = await Promise.all([
    db
      .select()
      .from(folders)
      .orderBy(asc(folders.sortOrder), asc(folders.createdAt))
      .all(),
    db.select().from(sprints).orderBy(asc(sprints.startDate)).all(),
    db
      .select({
        sprintId: tasks.sprintId,
        status: tasks.status,
        count: count(),
      })
      .from(tasks)
      .where(sql`${tasks.sprintId} IS NOT NULL`)
      .groupBy(tasks.sprintId, tasks.status)
      .all(),
  ]);

  // Build a lookup: sprintId → { open, in_progress, done }
  const countsMap = new Map<string, { open: number; in_progress: number; done: number }>();
  for (const tc of allTaskCounts) {
    if (!tc.sprintId) continue;
    if (!countsMap.has(tc.sprintId)) {
      countsMap.set(tc.sprintId, { open: 0, in_progress: 0, done: 0 });
    }
    const entry = countsMap.get(tc.sprintId)!;
    entry[tc.status as keyof typeof entry] = tc.count;
  }

  const sprintsWithCounts = allSprints.map((sprint) => ({
    ...sprint,
    taskCounts: countsMap.get(sprint.id) ?? { open: 0, in_progress: 0, done: 0 },
  }));

  return (
    <div className="max-w-5xl">
      <div className="flex items-start md:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white">Sprints</h2>
          <p className="text-gray-400 text-sm mt-1">
            Manage your development cycles
          </p>
        </div>
        <Link href="/sprints/new" className="shrink-0">
          <button className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-sm font-medium transition-colors">
            <PlusIcon className="w-4 h-4" />
            <span className="hidden sm:inline">New Sprint</span>
            <span className="sm:hidden">New</span>
          </button>
        </Link>
      </div>

      {sprintsWithCounts.length === 0 && allFolders.length === 0 ? (
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
        <SprintFolderList
          initialFolders={allFolders.map((f) => ({ id: f.id, name: f.name }))}
          initialSprints={sprintsWithCounts}
        />
      )}
    </div>
  );
}
