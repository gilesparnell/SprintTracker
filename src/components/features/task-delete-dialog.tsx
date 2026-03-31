"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangleIcon, Trash2Icon } from "lucide-react";

type TaskInfo = {
  id: string;
  title: string;
  sequenceNumber?: number | null;
};

export function TaskDeleteDialog({
  task,
  open,
  onOpenChange,
  onConfirm,
}: {
  task: TaskInfo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      onConfirm();
      onOpenChange(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-400">
            <AlertTriangleIcon className="w-5 h-5" />
            Delete Task
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-gray-300">
            Are you sure you want to delete{" "}
            <span className="font-medium text-white">
              {task.sequenceNumber != null ? `T-${task.sequenceNumber}: ` : ""}
              {task.title}
            </span>
            ?
          </p>

          <p className="text-sm text-gray-400">
            This will permanently delete the task, all its subtasks, notes, and
            notifications. This action cannot be undone.
          </p>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-red-600 hover:bg-red-500 text-white"
            >
              <Trash2Icon className="w-4 h-4" />
              {deleting ? "Deleting..." : "Delete Task"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
