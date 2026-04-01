"use client";

import { useState, useEffect } from "react";
import { PackageIcon, Trash2Icon, UnlinkIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Product = { id: string; name: string; color: string };

export function RemoveFromSprintDialog({
  taskTitle,
  open,
  onOpenChange,
  onMoveToBacklog,
  onDelete,
}: {
  taskTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMoveToBacklog: (productId: string) => void;
  onDelete: () => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && products.length === 0) {
      fetch("/api/products")
        .then((res) => res.json())
        .then((data) => {
          setProducts(data);
          if (data.length > 0) setSelectedProductId(data[0].id);
        });
    }
  }, [open, products.length]);

  function handleMoveToBacklog() {
    if (!selectedProductId) return;
    setBusy(true);
    onMoveToBacklog(selectedProductId);
  }

  function handleDelete() {
    setBusy(true);
    onDelete();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-400">
            <UnlinkIcon className="w-5 h-5" />
            Remove from Sprint
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-gray-300">
            <span className="font-medium text-white">{taskTitle}</span> isn&apos;t linked to a story.
            What would you like to do?
          </p>

          {/* Option 1: Move to backlog */}
          <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <PackageIcon className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-white">Move to a product backlog</span>
            </div>
            <p className="text-xs text-gray-500">
              Converts this task into a story and places it in the selected backlog.
            </p>
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
            <button
              type="button"
              onClick={handleMoveToBacklog}
              disabled={busy || !selectedProductId}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-500 rounded-xl transition-colors disabled:opacity-50"
            >
              <PackageIcon className="w-4 h-4" />
              Move to Backlog
            </button>
          </div>

          {/* Option 2: Delete */}
          <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Trash2Icon className="w-4 h-4 text-red-400" />
              <span className="text-sm font-medium text-white">Delete task</span>
            </div>
            <p className="text-xs text-gray-500">
              Permanently removes this task and all its subtasks.
            </p>
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-400 bg-red-900/20 border border-red-500/30 hover:bg-red-900/40 rounded-xl transition-colors disabled:opacity-50"
            >
              <Trash2Icon className="w-4 h-4" />
              Delete Task
            </button>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full px-4 py-2.5 text-sm font-medium text-gray-400 hover:text-white border border-gray-700 rounded-xl transition-colors"
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
