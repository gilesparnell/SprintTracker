"use client";

import { useState } from "react";
import { Trash2Icon, AlertTriangleIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

export function DeleteSprintButton({
  sprintName,
  action,
}: {
  sprintName: string;
  action: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg hover:bg-red-900/40 transition-colors cursor-pointer"
      >
        <Trash2Icon className="w-3 h-3" />
        Delete
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-900/30 flex items-center justify-center">
              <AlertTriangleIcon className="w-4 h-4 text-red-400" />
            </div>
            <DialogTitle>Delete Sprint</DialogTitle>
          </div>
          <DialogDescription>
            Are you sure you want to delete <strong>{sprintName}</strong>? This will permanently remove the sprint and all its tasks. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose
            className="px-3 py-1.5 text-xs font-medium text-gray-400 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </DialogClose>
          <form action={action}>
            <button
              type="submit"
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-red-600 border border-red-500 rounded-lg hover:bg-red-500 transition-colors cursor-pointer"
            >
              <Trash2Icon className="w-3 h-3" />
              Delete Sprint
            </button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
