export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { sprints, tasks, folders } from "@/lib/db/schema";
import { asc, eq, count } from "drizzle-orm";
import { SprintFolderList } from "@/components/features/sprint-folder-list";
import { PlusIcon, ZapIcon } from "lucide-react";

export default async function SprintsPage() {
  const allFolders = await db
    .select()
    .from(folders)
    .orderBy(asc(folders.sortOrder), asc(folders.createdAt))
    .all();

  const allSprints = await db.select().from(sprints).orderBy(asc(sprints.startDate)).all();

  const sprintsWithCounts = await Promise.all(
    allSprints.map(async (sprint) => {
      const taskCounts = await db
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
    })
  );

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
