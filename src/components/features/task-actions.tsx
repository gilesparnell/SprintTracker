"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookOpenIcon, UnlinkIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RemoveFromSprintDialog } from "./remove-from-sprint-dialog";

type Product = { id: string; name: string; color: string };

export function TaskActions({
  taskId,
  taskTitle,
  sprintId,
  userStoryId,
  subtaskCount,
}: {
  taskId: string;
  taskTitle: string;
  sprintId: string | null;
  userStoryId?: string | null;
  subtaskCount: number;
}) {
  const router = useRouter();
  const [removing, setRemoving] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [converting, setConverting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");

  useEffect(() => {
    if (convertOpen && products.length === 0) {
      fetch("/api/products")
        .then((res) => res.json())
        .then((data) => {
          setProducts(data);
          if (data.length > 0) setSelectedProductId(data[0].id);
        });
    }
  }, [convertOpen, products.length]);

  async function handleRemoveFromSprint() {
    if (userStoryId) {
      // Linked to a story — just detach from sprint
      setRemoving(true);
      try {
        const res = await fetch(`/api/tasks/${taskId}/remove-from-sprint`, {
          method: "POST",
        });
        if (res.ok) {
          router.refresh();
        }
      } finally {
        setRemoving(false);
      }
    } else {
      // Orphan task — show dialogue
      setRemoveDialogOpen(true);
    }
  }

  async function handleRemoveToBacklog(productId: string) {
    const res = await fetch(`/api/tasks/${taskId}/convert-to-story`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, removeFromSprint: true }),
    });
    const result = await res.json();
    setRemoveDialogOpen(false);
    if (result.success && result.storyId) {
      router.push(`/stories/${result.storyId}`);
    }
  }

  async function handleRemoveAndDelete() {
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    setRemoveDialogOpen(false);
    router.push("/");
  }

  async function handleConvertToStory() {
    setConverting(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/convert-to-story`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: selectedProductId || undefined }),
      });
      const result = await res.json();
      if (result.success && result.storyId) {
        router.push(`/stories/${result.storyId}`);
      }
    } finally {
      setConverting(false);
      setConvertOpen(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {sprintId && (
          <button
            onClick={handleRemoveFromSprint}
            disabled={removing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-400 bg-amber-900/20 border border-amber-500/30 rounded-lg hover:bg-amber-900/40 transition-colors disabled:opacity-50"
          >
            <UnlinkIcon className="w-3 h-3" />
            {removing ? "Removing..." : "Remove from Sprint"}
          </button>
        )}
        <button
          onClick={() => setConvertOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-400 bg-purple-900/20 border border-purple-500/30 rounded-lg hover:bg-purple-900/40 transition-colors"
        >
          <BookOpenIcon className="w-3 h-3" />
          Convert to Story
        </button>
      </div>

      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-400">
              <BookOpenIcon className="w-5 h-5" />
              Convert to Story
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-gray-300">
              Convert <span className="font-medium text-white">{taskTitle}</span> into a user story?
            </p>

            {/* Product / Backlog picker */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Product Backlog
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 text-sm text-gray-400">
              <p>This will:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Create a new story with this task&apos;s fields</li>
                <li>Move all notes to the new story</li>
                {subtaskCount > 0 && (
                  <li className="text-amber-400">
                    Delete {subtaskCount} subtask{subtaskCount !== 1 ? "s" : ""} and their notes
                    <span className="text-gray-500"> (subtasks don&apos;t apply to stories)</span>
                  </li>
                )}
                <li>Delete the original task</li>
              </ul>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConvertOpen(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConvertToStory}
                disabled={converting || !selectedProductId}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-500 rounded-xl transition-colors disabled:opacity-50"
              >
                <BookOpenIcon className="w-4 h-4" />
                {converting ? "Converting..." : "Convert"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <RemoveFromSprintDialog
        taskTitle={taskTitle}
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        onMoveToBacklog={handleRemoveToBacklog}
        onDelete={handleRemoveAndDelete}
      />
    </>
  );
}
