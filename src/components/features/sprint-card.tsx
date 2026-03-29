import Link from "next/link";
import {
  CalendarIcon,
  CheckCircle2Icon,
  CircleDotIcon,
  LinkIcon,
  ChevronRightIcon,
} from "lucide-react";

type SprintWithCounts = {
  id: string;
  name: string;
  goal: string | null;
  startDate: string;
  endDate: string;
  status: string;
  folderId?: string | null;
  clickupListId: string | null;
  taskCounts: { open: number; in_progress: number; done: number };
};

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

function SprintCardInner({ sprint }: { sprint: SprintWithCounts }) {
  const total =
    sprint.taskCounts.open +
    sprint.taskCounts.in_progress +
    sprint.taskCounts.done;
  const progress = total > 0 ? (sprint.taskCounts.done / total) * 100 : 0;
  const status = statusConfig[sprint.status] ?? statusConfig.planning;

  return (
    <div className="group flex items-center gap-3 bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-2.5 hover:border-gray-700 hover:bg-gray-900 transition-all cursor-pointer">
      <h3 className="text-sm font-bold text-white truncate group-hover:text-green-400 transition-colors shrink-0 max-w-[200px]">
        {sprint.name}
      </h3>
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full border shrink-0 ${status.bg} ${status.text} ${status.border}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
        {status.label}
      </span>
      {sprint.goal && (
        <p className="text-xs text-gray-500 truncate min-w-0">{sprint.goal}</p>
      )}
      <div className="flex items-center gap-3 ml-auto shrink-0 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <CalendarIcon className="w-3 h-3" />
          {sprint.startDate} — {sprint.endDate}
        </span>
        <span className="flex items-center gap-1">
          <CircleDotIcon className="w-3 h-3" />
          {total}
        </span>
        {sprint.taskCounts.done > 0 && (
          <span className="flex items-center gap-1 text-green-400/70">
            <CheckCircle2Icon className="w-3 h-3" />
            {sprint.taskCounts.done}
          </span>
        )}
        {total > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-16 h-1.5 rounded-full bg-gray-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-gray-500">
              {Math.round(progress)}%
            </span>
          </div>
        )}
        {sprint.clickupListId && (
          <LinkIcon className="w-3 h-3 text-green-400/60" />
        )}
        <ChevronRightIcon className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
      </div>
    </div>
  );
}

export function SprintCard({ sprint }: { sprint: SprintWithCounts }) {
  return (
    <Link href={`/sprints/${sprint.id}`}>
      <SprintCardInner sprint={sprint} />
    </Link>
  );
}

export function SprintCardContent({ sprint }: { sprint: SprintWithCounts }) {
  return <SprintCardInner sprint={sprint} />;
}
