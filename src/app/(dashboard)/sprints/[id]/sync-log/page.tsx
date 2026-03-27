import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { sprints, tasks, syncLog } from "@/lib/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import Link from "next/link";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  ScrollTextIcon,
  XCircleIcon,
} from "lucide-react";

export default async function SyncLogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sprint = db.select().from(sprints).where(eq(sprints.id, id)).get();

  if (!sprint) {
    notFound();
  }

  const sprintTasks = db
    .select({ id: tasks.id, title: tasks.title })
    .from(tasks)
    .where(eq(tasks.sprintId, id))
    .all();

  const taskIds = sprintTasks.map((t) => t.id);
  const taskTitleMap = new Map(sprintTasks.map((t) => [t.id, t.title]));

  const logs =
    taskIds.length > 0
      ? db
          .select()
          .from(syncLog)
          .where(inArray(syncLog.taskId, taskIds))
          .orderBy(desc(syncLog.createdAt))
          .limit(100)
          .all()
      : [];

  return (
    <div className="max-w-5xl">
      <Link
        href={`/sprints/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeftIcon className="w-3.5 h-3.5" />
        Back to Sprint
      </Link>

      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white">Sync Log</h2>
        <p className="text-gray-400 text-sm mt-1">{sprint.name}</p>
      </div>

      {logs.length === 0 ? (
        <div className="border border-gray-800 border-dashed rounded-xl p-12 text-center">
          <div className="w-12 h-12 bg-green-900/20 rounded-xl flex items-center justify-center mx-auto mb-3">
            <ScrollTextIcon className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-sm text-gray-400">No sync activity yet.</p>
        </div>
      ) : (
        <div className="border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 text-left">
                <th className="px-6 py-4 text-sm font-medium text-gray-400">
                  Task
                </th>
                <th className="px-6 py-4 text-sm font-medium text-gray-400">
                  Action
                </th>
                <th className="px-6 py-4 text-sm font-medium text-gray-400">
                  Status
                </th>
                <th className="px-6 py-4 text-sm font-medium text-gray-400">
                  Error
                </th>
                <th className="px-6 py-4 text-sm font-medium text-gray-400">
                  Time
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-medium text-white">
                    {taskTitleMap.get(log.taskId) ?? log.taskId}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 text-xs rounded-full border bg-gray-800 text-gray-400 border-gray-700 font-mono">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {log.success ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-400">
                        <CheckCircle2Icon className="w-3.5 h-3.5" />
                        Success
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-red-400">
                        <XCircleIcon className="w-3.5 h-3.5" />
                        Failed
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500 max-w-xs truncate">
                    {log.errorMessage ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500 font-mono">
                    {log.createdAt}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
