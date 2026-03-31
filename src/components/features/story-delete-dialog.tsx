"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangleIcon, Trash2Icon, UnlinkIcon, ArrowRightLeftIcon } from "lucide-react";

type Story = {
  id: string;
  sequenceNumber: number | null;
  title: string;
};

type DeleteMode = "cascade" | "unlink" | "reassign";

export function StoryDeleteDialog({
  story,
  taskCount,
  otherStories,
  open,
  onOpenChange,
  redirectTo,
}: {
  story: Story;
  taskCount: number;
  otherStories: Story[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<DeleteMode>(taskCount > 0 ? "unlink" : "cascade");
  const [reassignStoryId, setReassignStoryId] = useState<string>(otherStories[0]?.id ?? "");
  const [deleting, setDeleting] = useState(false);

  const hasTasks = taskCount > 0;

  async function handleDelete() {
    setDeleting(true);
    try {
      const body: Record<string, string> = { mode };
      if (mode === "reassign" && reassignStoryId) {
        body.reassignStoryId = reassignStoryId;
      }

      const res = await fetch(`/api/stories/${story.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        onOpenChange(false);
        if (redirectTo) {
          router.push(redirectTo);
        } else {
          router.refresh();
        }
      }
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
            Delete Story
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-gray-300">
            Are you sure you want to delete{" "}
            <span className="font-medium text-white">{story.title}</span>?
          </p>

          {hasTasks ? (
            <>
              <p className="text-sm text-gray-400">
                This story has{" "}
                <span className="font-medium text-amber-400">{taskCount} task{taskCount !== 1 ? "s" : ""}</span>.
                Choose what to do with them:
              </p>

              <div className="space-y-2">
                {/* Option: Unlink */}
                <button
                  type="button"
                  onClick={() => setMode("unlink")}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                    mode === "unlink"
                      ? "border-blue-500/50 bg-blue-900/20"
                      : "border-gray-800 hover:border-gray-700"
                  }`}
                >
                  <UnlinkIcon className={`w-4 h-4 mt-0.5 shrink-0 ${mode === "unlink" ? "text-blue-400" : "text-gray-500"}`} />
                  <div>
                    <p className={`text-sm font-medium ${mode === "unlink" ? "text-blue-300" : "text-gray-300"}`}>
                      Keep tasks, remove story link
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Tasks become unlinked but stay in their sprints
                    </p>
                  </div>
                </button>

                {/* Option: Reassign */}
                {otherStories.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setMode("reassign")}
                    className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                      mode === "reassign"
                        ? "border-purple-500/50 bg-purple-900/20"
                        : "border-gray-800 hover:border-gray-700"
                    }`}
                  >
                    <ArrowRightLeftIcon className={`w-4 h-4 mt-0.5 shrink-0 ${mode === "reassign" ? "text-purple-400" : "text-gray-500"}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${mode === "reassign" ? "text-purple-300" : "text-gray-300"}`}>
                        Move tasks to another story
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Re-parent all tasks under a different story
                      </p>
                      {mode === "reassign" && (
                        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                          <Select value={reassignStoryId} onValueChange={(v) => setReassignStoryId(v ?? "")}>
                            <SelectTrigger>
                              <SelectValue>
                                {(() => {
                                  const s = otherStories.find((s) => s.id === reassignStoryId);
                                  return s ? `${s.sequenceNumber != null ? `S-${s.sequenceNumber}: ` : ""}${s.title}` : "Select a story...";
                                })()}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {otherStories.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.sequenceNumber != null ? `S-${s.sequenceNumber}: ` : ""}
                                  {s.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </button>
                )}

                {/* Option: Cascade delete */}
                <button
                  type="button"
                  onClick={() => setMode("cascade")}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                    mode === "cascade"
                      ? "border-red-500/50 bg-red-900/20"
                      : "border-gray-800 hover:border-gray-700"
                  }`}
                >
                  <Trash2Icon className={`w-4 h-4 mt-0.5 shrink-0 ${mode === "cascade" ? "text-red-400" : "text-gray-500"}`} />
                  <div>
                    <p className={`text-sm font-medium ${mode === "cascade" ? "text-red-300" : "text-gray-300"}`}>
                      Delete everything
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Permanently delete the story, all {taskCount} task{taskCount !== 1 ? "s" : ""}, their subtasks, and all notes
                    </p>
                  </div>
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">
              This story has no tasks. It will be permanently deleted.
            </p>
          )}

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
              disabled={deleting || (mode === "reassign" && !reassignStoryId)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                mode === "cascade"
                  ? "bg-red-600 hover:bg-red-500 text-white"
                  : "bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-500/30"
              }`}
            >
              <Trash2Icon className="w-4 h-4" />
              {deleting ? "Deleting..." : mode === "cascade" ? "Delete Everything" : "Delete Story"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
