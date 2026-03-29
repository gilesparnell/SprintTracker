"use client";

import { useState, useActionState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PlusIcon, XIcon } from "lucide-react";

type Tag = {
  id: string;
  name: string;
  color: string;
};

type FormState = {
  success: boolean;
  errors?: Record<string, string[]>;
};

const TAG_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280",
];

function TagPicker({
  allTags: allTagsProp,
  selectedIds,
  onChange,
}: {
  allTags: Tag[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);
  const [localTags, setLocalTags] = useState<Tag[]>([]);

  const allTags = [...allTagsProp, ...localTags.filter((lt) => !allTagsProp.some((t) => t.id === lt.id))];

  async function handleCreate() {
    if (!newName.trim()) return;
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), color: newColor }),
    });
    const tag = await res.json();
    if (tag?.id) {
      setLocalTags((prev) => [...prev, tag]);
      // Don't auto-select — just make it available to click
    }
    setNewName("");
    setCreating(false);
  }

  const availableTags = allTags.filter((t) => !selectedIds.includes(t.id));

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300">Tags</label>

      {/* Selected tags on this task — click X to remove */}
      {selectedIds.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">On this task</p>
          <div className="flex flex-wrap gap-1.5">
            {selectedIds.map((tagId) => {
              const tag = allTags.find((t) => t.id === tagId);
              if (!tag) return null;
              return (
                <button
                  key={tagId}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onChange(selectedIds.filter((sid) => sid !== tagId));
                  }}
                  className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1.5 text-xs rounded-full border border-green-500/40 text-white bg-green-900/30 hover:border-red-500/50 hover:bg-red-900/20 transition-colors group"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                  <XIcon className="w-4 h-4 text-gray-400 group-hover:text-red-400 transition-colors" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Available tags — click to add to this task */}
      {(availableTags.length > 0 || selectedIds.length === 0) && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Available</p>
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {availableTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => onChange([...selectedIds, tag.id])}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border border-dashed border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors"
            >
              <PlusIcon className="w-3 h-3" />
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: tag.color }}
              />
              {tag.name}
            </button>
          ))}

        {creating ? (
          <div className="flex items-center gap-1.5">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); handleCreate(); }
                if (e.key === "Escape") setCreating(false);
              }}
              placeholder="Tag name"
              className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50"
              autoFocus
            />
            <div className="flex gap-0.5">
              {TAG_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className={`w-4 h-4 rounded-full border-2 transition-colors ${
                    newColor === c ? "border-white" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={handleCreate}
              className="px-2 py-1 text-[10px] font-medium text-white bg-green-600 hover:bg-green-500 rounded-lg transition-colors"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="text-gray-500 hover:text-gray-300"
            >
              <XIcon className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-0.5 px-2 py-1 text-xs rounded-full border border-dashed border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-500 transition-colors"
          >
            <PlusIcon className="w-3 h-3" />
            New
          </button>
        )}
      </div>
    </div>
  );
}

export function TaskFormDialog({
  action,
  trigger,
  title,
  defaultValues,
  allTags = [],
  open: controlledOpen,
  onOpenChange,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  trigger?: React.ReactNode;
  title: string;
  defaultValues?: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    tagIds?: string[];
  };
  allTags?: Tag[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const dialogOpen = isControlled ? controlledOpen : uncontrolledOpen;
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    defaultValues?.tagIds ?? []
  );

  // Reset tag selection when dialogue opens or a different task is edited.
  // Serialise tagIds to a string so the dependency is stable across renders
  // (defaultValues.tagIds is a new array reference each render).
  const tagIdsKey = (defaultValues?.tagIds ?? []).join(",");
  useEffect(() => {
    if (dialogOpen) {
      setSelectedTagIds(defaultValues?.tagIds ?? []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen, tagIdsKey]);

  function handleOpenChange(open: boolean) {
    if (isControlled) {
      onOpenChange?.(open);
    } else {
      setUncontrolledOpen(open);
    }
  }

  const [state, formAction, pending] = useActionState(action, {
    success: false,
  });

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            formAction(new FormData(e.currentTarget));
          }}
          className="space-y-4"
        >
          <input type="hidden" name="tagIds" value={selectedTagIds.join(",")} />

          <div className="space-y-2">
            <label htmlFor="title" className="block text-sm font-medium text-gray-300">
              Title *
            </label>
            <input
              id="title"
              name="title"
              defaultValue={defaultValues?.title}
              placeholder="Task title"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-colors"
            />
            {state.errors?.title && (
              <p className="text-sm text-red-400">{state.errors.title[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-300">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              defaultValue={defaultValues?.description}
              placeholder="Optional description"
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 resize-y focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="status" className="block text-sm font-medium text-gray-300">
                Status
              </label>
              <Select
                name="status"
                defaultValue={defaultValues?.status ?? "open"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="priority" className="block text-sm font-medium text-gray-300">
                Priority
              </label>
              <Select
                name="priority"
                defaultValue={defaultValues?.priority ?? "medium"}
              >
                <SelectTrigger>
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
          </div>

          <TagPicker
            allTags={allTags}
            selectedIds={selectedTagIds}
            onChange={setSelectedTagIds}
          />

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl text-sm font-medium transition-colors"
          >
            {pending ? "Saving..." : "Save Task"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
