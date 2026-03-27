import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type SprintWithCounts = {
  id: string;
  name: string;
  goal: string | null;
  startDate: string;
  endDate: string;
  status: string;
  clickupListId: string | null;
  taskCounts: { open: number; in_progress: number; done: number };
};

const statusColors: Record<string, string> = {
  planning: "bg-yellow-100 text-yellow-800",
  active: "bg-green-100 text-green-800",
  completed: "bg-blue-100 text-blue-800",
};

export function SprintCard({ sprint }: { sprint: SprintWithCounts }) {
  const total =
    sprint.taskCounts.open +
    sprint.taskCounts.in_progress +
    sprint.taskCounts.done;

  return (
    <Link href={`/sprints/${sprint.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{sprint.name}</CardTitle>
            <div className="flex gap-2">
              {sprint.clickupListId && (
                <Badge variant="outline" className="text-xs">
                  ClickUp
                </Badge>
              )}
              <Badge className={statusColors[sprint.status] ?? ""}>
                {sprint.status}
              </Badge>
            </div>
          </div>
          {sprint.goal && (
            <CardDescription>{sprint.goal}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>
              {sprint.startDate} → {sprint.endDate}
            </span>
            <span className="ml-auto">
              {total} tasks ({sprint.taskCounts.done} done)
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
