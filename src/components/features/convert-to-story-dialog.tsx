"use client";

import { useState, useEffect } from "react";
import { BookOpenIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Product = { id: string; name: string; color: string };

export function ConvertToStoryDialog({
  taskTitle,
  open,
  onOpenChange,
  onConfirm,
}: {
  taskTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (productId: string) => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [converting, setConverting] = useState(false);

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

  async function handleConfirm() {
    if (!selectedProductId) return;
    setConverting(true);
    try {
      onConfirm(selectedProductId);
    } finally {
      setConverting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-purple-400">
            <BookOpenIcon className="w-5 h-5" />
            Convert to Story
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-gray-300">
            Convert <span className="font-medium text-white">{taskTitle}</span> into a user story.
          </p>

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
              onClick={handleConfirm}
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
  );
}
