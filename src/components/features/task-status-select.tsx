"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const statusLabels: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  done: "Done",
};

export function TaskStatusSelect({
  taskId,
  currentStatus,
  onStatusChange,
}: {
  taskId: string;
  currentStatus: string;
  onStatusChange: (taskId: string, status: string) => void;
}) {
  return (
    <Select
      defaultValue={currentStatus}
      onValueChange={(value: string | null) => value && onStatusChange(taskId, value)}
    >
      <SelectTrigger className="w-[140px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="open">Open</SelectItem>
        <SelectItem value="in_progress">In Progress</SelectItem>
        <SelectItem value="done">Done</SelectItem>
      </SelectContent>
    </Select>
  );
}
