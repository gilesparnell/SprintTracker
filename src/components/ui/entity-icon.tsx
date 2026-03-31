import { BookOpenIcon, SquareCheckIcon, ListChecksIcon } from "lucide-react";
import type { EntityType } from "@/lib/types";

const config: Record<EntityType, { icon: typeof BookOpenIcon; color: string }> = {
  story: { icon: BookOpenIcon, color: "text-purple-400" },
  task: { icon: SquareCheckIcon, color: "text-blue-400" },
  subtask: { icon: ListChecksIcon, color: "text-teal-400" },
};

export function EntityIcon({
  type,
  className = "w-3.5 h-3.5",
}: {
  type: EntityType;
  className?: string;
}) {
  const { icon: Icon, color } = config[type];
  return <Icon className={`${color} ${className}`} />;
}
