import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { sprints, tasks, syncLog } from "@/lib/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

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

  // Get all task IDs for this sprint
  const sprintTasks = db
    .select({ id: tasks.id, title: tasks.title })
    .from(tasks)
    .where(eq(tasks.sprintId, id))
    .all();

  const taskIds = sprintTasks.map((t) => t.id);
  const taskTitleMap = new Map(sprintTasks.map((t) => [t.id, t.title]));

  // Get sync logs for these tasks
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Sync Log</h2>
          <p className="text-muted-foreground">{sprint.name}</p>
        </div>
        <Link href={`/sprints/${id}`}>
          <Button variant="outline">Back to Sprint</Button>
        </Link>
      </div>

      {logs.length === 0 ? (
        <p className="text-muted-foreground">No sync activity yet.</p>
      ) : (
        <div className="border rounded-lg">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 text-sm font-medium">Task</th>
                <th className="text-left p-3 text-sm font-medium">Action</th>
                <th className="text-left p-3 text-sm font-medium">Status</th>
                <th className="text-left p-3 text-sm font-medium">Error</th>
                <th className="text-left p-3 text-sm font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b last:border-0">
                  <td className="p-3 text-sm">
                    {taskTitleMap.get(log.taskId) ?? log.taskId}
                  </td>
                  <td className="p-3">
                    <Badge variant="outline">{log.action}</Badge>
                  </td>
                  <td className="p-3">
                    {log.success ? (
                      <Badge className="bg-green-50 text-green-700 border-green-200">
                        Success
                      </Badge>
                    ) : (
                      <Badge className="bg-red-50 text-red-700 border-red-200">
                        Failed
                      </Badge>
                    )}
                  </td>
                  <td className="p-3 text-sm text-muted-foreground max-w-xs truncate">
                    {log.errorMessage ?? "—"}
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">
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
