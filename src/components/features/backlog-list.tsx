"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import Link from "next/link";
import {
  AlertTriangleIcon,
  CheckSquareIcon,
  FilterIcon,
  PlusIcon,
  Trash2Icon,
  UnlinkIcon,
  XSquareIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EntityIcon } from "@/components/ui/entity-icon";
import { StoryCard } from "@/components/features/story-card";
import { StoryFormDialog } from "@/components/features/story-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StoryWithTaskCount } from "@/lib/actions/stories";

type User = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};

type Customer = {
  id: string;
  name: string;
  color: string;
};

type Sprint = {
  id: string;
  name: string;
  status: string;
};

type UnlinkedTask = {
  id: string;
  sequenceNumber: number | null;
  title: string;
  status: string;
  priority: string;
  assignedTo: string | null;
};

const taskStatusConfig: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  open: { label: "Open", bg: "bg-amber-900/20", text: "text-amber-400", border: "border-amber-500/30", dot: "bg-amber-400" },
  in_progress: { label: "In Progress", bg: "bg-blue-900/20", text: "text-blue-400", border: "border-blue-500/30", dot: "bg-blue-400" },
  done: { label: "Done", bg: "bg-green-900/20", text: "text-green-400", border: "border-green-500/30", dot: "bg-green-400" },
};

const priorityConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
  low: { label: "Low", bg: "bg-gray-800", text: "text-gray-400", border: "border-gray-700" },
  medium: { label: "Medium", bg: "bg-blue-900/20", text: "text-blue-400", border: "border-blue-500/30" },
  high: { label: "High", bg: "bg-amber-900/20", text: "text-amber-400", border: "border-amber-500/30" },
  urgent: { label: "Urgent", bg: "bg-red-900/20", text: "text-red-400", border: "border-red-500/30" },
};

function SelectionCheckbox({
  selected,
  onToggle,
}: {
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
        selected
          ? "bg-red-500 border-red-500"
          : "border-gray-600 hover:border-gray-400"
      }`}
    >
      {selected && (
        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}

function SortableStoryCard({
  story,
  index,
  allStories,
  users,
  customers,
  sprints,
  selected,
  onToggleSelect,
}: {
  story: StoryWithTaskCount;
  index: number;
  allStories: StoryWithTaskCount[];
  users: User[];
  customers: Customer[];
  sprints: Sprint[];
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const { ref, isDragSource } = useSortable({
    id: story.id,
    index,
    group: "backlog",
    type: "item",
    accept: "item",
  });

  return (
    <div
      ref={ref}
      className={`flex items-center gap-1 ${isDragSource ? "opacity-40 scale-95 transition-all" : "transition-all"} ${
        selected ? "border border-red-500/30 bg-red-900/10 rounded-lg" : ""
      }`}
    >
      <div className="pl-2 shrink-0">
        <SelectionCheckbox selected={selected} onToggle={onToggleSelect} />
      </div>
      <div className="flex-1 min-w-0">
        <StoryCard
          story={story}
          allStories={allStories}
          users={users}
          customers={customers}
          sprints={sprints}
        />
      </div>
    </div>
  );
}

type Product = {
  id: string;
  name: string;
  color: string;
};

export function BacklogList({
  stories: initialStories,
  totalStories = 0,
  pageSize = 50,
  users,
  customers,
  sprints,
  products = [],
  unlinkedTasks: initialUnlinkedTasks = [],
}: {
  stories: StoryWithTaskCount[];
  totalStories?: number;
  pageSize?: number;
  users: User[];
  customers: Customer[];
  sprints: Sprint[];
  products?: Product[];
  unlinkedTasks?: UnlinkedTask[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [stories, setStories] = useState(initialStories);
  const hasMore = initialStories.length < totalStories;

  function changePageSize(newSize: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pageSize", String(newSize));
    router.push(`${pathname}?${params.toString()}`);
  }
  const [filterAssignee, setFilterAssignee] = useState("__all__");
  const [filterCustomer, setFilterCustomer] = useState("__all__");
  const [createOpen, setCreateOpen] = useState(false);
  const snapshotRef = useRef<StoryWithTaskCount[] | null>(null);

  // Selection state
  const [selectedStoryIds, setSelectedStoryIds] = useState<string[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  // Delete dialogue state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [isDeleting, setIsDeleting] = useState(false);

  const hasStorySelections = selectedStoryIds.length > 0;
  const hasTaskSelections = selectedTaskIds.length > 0;
  const hasAnySelection = hasStorySelections || hasTaskSelections;

  // Compute impact of selected stories
  const selectedStories = stories.filter((s) => selectedStoryIds.includes(s.id));
  const totalTasksInSelectedStories = selectedStories.reduce((sum, s) => sum + s.taskCount, 0);

  function toggleStorySelection(storyId: string) {
    setSelectedStoryIds((prev) =>
      prev.includes(storyId) ? prev.filter((id) => id !== storyId) : [...prev, storyId]
    );
  }

  function toggleTaskSelection(taskId: string) {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  }

  function selectAllStories() {
    setSelectedStoryIds(filteredStories.map((s) => s.id));
  }

  function selectAllTasks() {
    setSelectedTaskIds(initialUnlinkedTasks.map((t) => t.id));
  }

  function deselectAll() {
    setSelectedStoryIds([]);
    setSelectedTaskIds([]);
  }

  function openDeleteDialog() {
    setDeleteStep(1);
    setDeleteDialogOpen(true);
  }

  async function handleBulkDelete() {
    setIsDeleting(true);
    try {
      // Delete stories with cascade mode
      await Promise.all(
        selectedStoryIds.map((id) =>
          fetch(`/api/stories/${id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "cascade" }),
          })
        )
      );
      // Delete tasks
      await Promise.all(
        selectedTaskIds.map((id) =>
          fetch(`/api/tasks/${id}`, { method: "DELETE" })
        )
      );
      setSelectedStoryIds([]);
      setSelectedTaskIds([]);
      setDeleteDialogOpen(false);
      setDeleteStep(1);
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  // Sync from server when props change (e.g. after router.refresh())
  const storiesKey = initialStories.map((s) => s.id + s.sortOrder).join(",");
  useEffect(() => {
    setStories(initialStories);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storiesKey]);

  // Filter stories
  const filteredStories = stories.filter((s) => {
    if (filterAssignee !== "__all__" && s.assignedTo !== filterAssignee) return false;
    if (filterCustomer !== "__all__" && s.customerId !== filterCustomer) return false;
    return true;
  });

  async function handleDragEnd(event: { operation: { source: { id: string | number; sortable?: { index: number } } | null; target: { id: string | number; sortable?: { index: number } } | null } }) {
    const source = event.operation.source;
    const target = event.operation.target;

    if (!source || !target || source.id === target.id) return;

    const sourceIndex = source.sortable?.index;
    const targetIndex = target.sortable?.index;

    if (sourceIndex === undefined || targetIndex === undefined) return;

    // Reorder local state
    const reordered = [...stories];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    // Compute new sort order as midpoint between neighbours
    let newSortOrder: number;
    if (targetIndex === 0) {
      newSortOrder = (reordered[1]?.sortOrder ?? 1000) / 2;
    } else if (targetIndex >= reordered.length - 1) {
      newSortOrder = (reordered[reordered.length - 2]?.sortOrder ?? 0) + 1000;
    } else {
      const prev = reordered[targetIndex - 1]?.sortOrder ?? 0;
      const next = reordered[targetIndex + 1]?.sortOrder ?? prev + 2000;
      newSortOrder = (prev + next) / 2;
    }

    moved.sortOrder = newSortOrder;

    // Optimistic update
    setStories(reordered);

    try {
      const res = await fetch("/api/stories/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId: moved.id, newSortOrder }),
      });

      if (!res.ok) throw new Error("Reorder failed");

      const result = await res.json();
      if (!result.success) throw new Error("Reorder failed");

      // If server re-indexed, refresh to get correct sort orders
      if (result.data?.reindexed) {
        router.refresh();
      }
    } catch {
      // Restore snapshot on failure
      if (snapshotRef.current) {
        setStories(snapshotRef.current);
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar: filters + create button */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <FilterIcon className="w-4 h-4" />
          <span>Filters:</span>
        </div>

        <Select value={filterAssignee} onValueChange={(v) => setFilterAssignee(v ?? "__all__")}>
          <SelectTrigger className="w-[160px]">
            <SelectValue>
              {filterAssignee === "__all__"
                ? "All assignees"
                : users.find((u) => u.id === filterAssignee)?.name ?? "Unassigned"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All assignees</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name ?? u.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterCustomer} onValueChange={(v) => setFilterCustomer(v ?? "__all__")}>
          <SelectTrigger className="w-[160px]">
            <SelectValue>
              {filterCustomer === "__all__"
                ? "All customers"
                : customers.find((c) => c.id === filterCustomer)?.name ?? "Unknown"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All customers</SelectItem>
            {customers.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: c.color }}
                  />
                  {c.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto">
          <StoryFormDialog
            mode="create"
            users={users}
            customers={customers}
            products={products}
            open={createOpen}
            onOpenChange={setCreateOpen}
            trigger={
              <span className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer">
                <PlusIcon className="w-4 h-4" />
                Create Story
              </span>
            }
          />
        </div>

        {/* Page size + count */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>
            Showing {initialStories.length} of {totalStories}
          </span>
          <select
            value={pageSize}
            onChange={(e) => changePageSize(parseInt(e.target.value, 10))}
            className="bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-gray-600"
          >
            <option value={10}>10</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Bulk action toolbar */}
      {hasAnySelection && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-red-500/30 bg-red-900/10">
          <span className="text-sm text-gray-300">
            {hasStorySelections && (
              <span>
                {selectedStoryIds.length} {selectedStoryIds.length === 1 ? "story" : "stories"}
              </span>
            )}
            {hasStorySelections && hasTaskSelections && <span> + </span>}
            {hasTaskSelections && (
              <span>
                {selectedTaskIds.length} {selectedTaskIds.length === 1 ? "task" : "tasks"}
              </span>
            )}
            <span className="text-gray-500"> selected</span>
          </span>
          {filteredStories.length > 0 && (
            <button
              onClick={selectAllStories}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 transition-colors"
            >
              <CheckSquareIcon className="w-3.5 h-3.5" />
              All Stories
            </button>
          )}
          {initialUnlinkedTasks.length > 0 && (
            <button
              onClick={selectAllTasks}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 transition-colors"
            >
              <CheckSquareIcon className="w-3.5 h-3.5" />
              All Tasks
            </button>
          )}
          <button
            onClick={deselectAll}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 transition-colors"
          >
            <XSquareIcon className="w-3.5 h-3.5" />
            Deselect All
          </button>
          <button
            onClick={openDeleteDialog}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg hover:bg-red-900/40 transition-colors"
          >
            <Trash2Icon className="w-3.5 h-3.5" />
            Delete Selected
          </button>
        </div>
      )}

      {/* Story list with drag and drop */}
      {filteredStories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-gray-800 rounded-xl">
          <p className="text-gray-500 text-sm">No stories in the backlog</p>
          <button
            onClick={() => setCreateOpen(true)}
            className="mt-3 flex items-center gap-2 px-4 py-2 text-sm text-green-400 hover:text-green-300 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Create your first story
          </button>
        </div>
      ) : (
        <DragDropProvider
          onDragStart={() => {
            snapshotRef.current = structuredClone(stories);
          }}
          onDragEnd={handleDragEnd}
        >
          <div className="divide-y divide-gray-800/50">
            {filteredStories.map((story, index) => (
              <SortableStoryCard
                key={story.id}
                story={story}
                index={index}
                allStories={stories}
                users={users}
                customers={customers}
                sprints={sprints}
                selected={selectedStoryIds.includes(story.id)}
                onToggleSelect={() => toggleStorySelection(story.id)}
              />
            ))}
          </div>
        </DragDropProvider>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => changePageSize(pageSize + 50)}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600 rounded-xl transition-colors"
          >
            Load more ({totalStories - initialStories.length} remaining)
          </button>
        </div>
      )}

      {/* Unlinked Tasks */}
      {initialUnlinkedTasks.length > 0 && (
        <div className="mt-8 space-y-3">
          <div className="flex items-center gap-2">
            <UnlinkIcon className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-medium text-gray-400">
              Unlinked Tasks
            </h2>
            <span className="text-xs text-gray-600">
              ({initialUnlinkedTasks.length})
            </span>
          </div>
          <p className="text-xs text-gray-600">
            Tasks not linked to any story or sprint
          </p>

          <div className="divide-y divide-gray-800/50">
            {initialUnlinkedTasks.map((t) => {
              const tStatus = taskStatusConfig[t.status] ?? taskStatusConfig.open;
              const tPriority = priorityConfig[t.priority] ?? priorityConfig.medium;
              const tAssignee = users.find((u) => u.id === t.assignedTo);
              const isSelected = selectedTaskIds.includes(t.id);

              const rowContent = (
                <>
                  <SelectionCheckbox
                    selected={isSelected}
                    onToggle={() => toggleTaskSelection(t.id)}
                  />
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded-full border ${tStatus.bg} ${tStatus.text} ${tStatus.border}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${tStatus.dot}`} />
                    {tStatus.label}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500 font-mono">
                    <EntityIcon type="task" />
                    T-{t.sequenceNumber}
                  </span>
                  <span className="text-sm text-gray-300 truncate flex-1">{t.title}</span>
                  <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded border ${tPriority.bg} ${tPriority.text} ${tPriority.border}`}>
                    {tPriority.label}
                  </span>
                  {tAssignee && (
                    tAssignee.image ? (
                      <img src={tAssignee.image} alt="" className="w-4 h-4 rounded-full" />
                    ) : (
                      <span className="w-4 h-4 rounded-full bg-gray-700 flex items-center justify-center text-[8px] font-bold text-gray-400">
                        {(tAssignee.name ?? "?").charAt(0).toUpperCase()}
                      </span>
                    )
                  )}
                </>
              );

              if (hasAnySelection) {
                return (
                  <div
                    key={t.id}
                    onClick={() => toggleTaskSelection(t.id)}
                    className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                      isSelected
                        ? "border border-red-500/30 bg-red-900/10 rounded-lg"
                        : "hover:bg-gray-800/40"
                    }`}
                  >
                    {rowContent}
                  </div>
                );
              }

              return (
                <Link
                  key={t.id}
                  href={`/tasks/${t.id}`}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-800/40 transition-colors"
                >
                  {rowContent}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Two-step bulk delete confirmation dialogue */}
      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialogOpen(false);
            setDeleteStep(1);
          }
        }}
      >
        <DialogContent className={deleteStep === 2 ? "sm:max-w-lg" : "sm:max-w-md"}>
          {deleteStep === 1 ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-400">
                  <AlertTriangleIcon className="w-5 h-5" />
                  Confirm Deletion
                </DialogTitle>
                <DialogDescription>
                  You are about to permanently delete:
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5 text-sm">
                {hasStorySelections && (
                  <div className="flex items-start gap-2">
                    <span className="text-red-400 font-medium">
                      {selectedStoryIds.length} {selectedStoryIds.length === 1 ? "story" : "stories"}
                    </span>
                  </div>
                )}
                {hasStorySelections && totalTasksInSelectedStories > 0 && (
                  <div className="flex items-start gap-2 text-amber-400">
                    <AlertTriangleIcon className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      {totalTasksInSelectedStories} {totalTasksInSelectedStories === 1 ? "task" : "tasks"} inside
                      {totalTasksInSelectedStories === 1 ? " that story" : " those stories"}, plus all subtasks and notes
                    </span>
                  </div>
                )}
                {hasTaskSelections && (
                  <div className="flex items-start gap-2">
                    <span className="text-red-400 font-medium">
                      {selectedTaskIds.length} unlinked {selectedTaskIds.length === 1 ? "task" : "tasks"}
                    </span>
                    <span className="text-gray-500">and their subtasks/notes</span>
                  </div>
                )}
              </div>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  Cancel
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteStep(2)}
                >
                  Continue
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="flex flex-col items-center text-center py-4 space-y-4">
                <span className="text-7xl">💀</span>
                <h2 className="text-2xl font-bold text-red-400 tracking-wide">
                  HERE BE DRAGONS !!!
                </h2>
                <p className="text-sm text-gray-400 max-w-sm">
                  All selected stories, their tasks, subtasks, notes, and notifications will be
                  <span className="text-red-400 font-semibold"> permanently destroyed</span>.
                  There is no undo. Are you absolutely sure?
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteStep(1)}>
                  Go Back
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  className="text-base px-6 py-3"
                >
                  <Trash2Icon className="w-5 h-5" />
                  {isDeleting ? "Deleting..." : "Delete Everything"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
