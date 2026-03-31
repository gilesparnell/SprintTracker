"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BugIcon, XIcon, ChevronDownIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Product = {
  id: string;
  name: string;
  color: string;
};

export function QuickSubmit({ products }: { products: Product[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [type, setType] = useState<"bug" | "feature_request">("bug");
  const [productId, setProductId] = useState(products[0]?.id ?? "__none__");
  const [priority, setPriority] = useState("medium");
  const [showDescription, setShowDescription] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // Focus title input when popover opens
  useEffect(() => {
    if (open) {
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        cardRef.current &&
        !cardRef.current.contains(e.target as Node) &&
        fabRef.current &&
        !fabRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Clear success message after a delay
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(false), 2000);
    return () => clearTimeout(t);
  }, [success]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const title = (formData.get("title") as string).trim();
    const description = (formData.get("description") as string)?.trim() || null;

    if (!title) {
      setError("Title is required");
      setPending(false);
      return;
    }

    try {
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          type,
          productId: productId === "__none__" ? null : productId,
          description,
          priority,
          status: "backlog",
        }),
      });

      if (!res.ok) {
        setError(`Server error: ${res.status}`);
        return;
      }

      const result = await res.json();

      if (result.success) {
        // Clear title and description, keep type + product + priority
        const form = e.currentTarget;
        const titleInput = form.querySelector<HTMLInputElement>('input[name="title"]');
        const descInput = form.querySelector<HTMLTextAreaElement>('textarea[name="description"]');
        if (titleInput) titleInput.value = "";
        if (descInput) descInput.value = "";
        setShowDescription(false);
        setSuccess(true);
        router.refresh();
      } else if (result.errors) {
        const msgs = Object.values(result.errors).flat();
        setError((msgs as string[])[0] ?? "Validation error");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Popover card */}
      {open && (
        <div
          ref={cardRef}
          className="absolute bottom-14 right-0 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl shadow-black/50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <span className="text-sm font-medium text-white">Quick Submit</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-3">
            {/* Title */}
            <input
              ref={titleRef}
              name="title"
              placeholder="What needs attention?"
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-colors"
            />

            {/* Type toggle pills */}
            <div className="flex gap-1 p-0.5 bg-gray-800 rounded-lg">
              <button
                type="button"
                onClick={() => setType("bug")}
                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  type === "bug"
                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                Bug
              </button>
              <button
                type="button"
                onClick={() => setType("feature_request")}
                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  type === "feature_request"
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                Feature
              </button>
            </div>

            {/* Product select */}
            {products.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 shrink-0 w-14">Product</label>
                <Select value={productId} onValueChange={(v) => setProductId(v ?? "__none__")}>
                  <SelectTrigger size="sm" className="flex-1 text-xs">
                    <SelectValue>
                      {productId === "__none__"
                        ? "None"
                        : (() => {
                            const p = products.find((p) => p.id === productId);
                            return p ? (
                              <span className="inline-flex items-center gap-1.5">
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: p.color }}
                                />
                                {p.name}
                              </span>
                            ) : (
                              "None"
                            );
                          })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: p.color }}
                          />
                          {p.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Description (collapsed by default) */}
            {!showDescription ? (
              <button
                type="button"
                onClick={() => setShowDescription(true)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                <ChevronDownIcon className="w-3 h-3" />
                Add description
              </button>
            ) : (
              <textarea
                name="description"
                placeholder="Optional description..."
                rows={2}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 resize-y focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-colors"
              />
            )}

            {/* Priority */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 shrink-0 w-14">Priority</label>
              <Select value={priority} onValueChange={(v) => setPriority(v ?? "medium")}>
                <SelectTrigger size="sm" className="flex-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}

            {/* Success */}
            {success && (
              <p className="text-xs text-green-400">Submitted to backlog!</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={pending}
              className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {pending ? "Submitting..." : "Submit"}
            </button>
          </form>
        </div>
      )}

      {/* FAB */}
      <button
        ref={fabRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-12 h-12 rounded-full bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/30 flex items-center justify-center transition-all hover:scale-105"
        title="Quick submit bug or feature"
      >
        <BugIcon className="w-5 h-5" />
      </button>
    </div>
  );
}
