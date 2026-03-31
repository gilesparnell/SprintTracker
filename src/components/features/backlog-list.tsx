"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { PlusIcon, FilterIcon } from "lucide-react";
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

function SortableStoryCard({
  story,
  index,
  users,
  customers,
  sprints,
}: {
  story: StoryWithTaskCount;
  index: number;
  users: User[];
  customers: Customer[];
  sprints: Sprint[];
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
      className={isDragSource ? "opacity-40 scale-95 transition-all" : "transition-all"}
    >
      <StoryCard
        story={story}
        users={users}
        customers={customers}
        sprints={sprints}
      />
    </div>
  );
}

export function BacklogList({
  stories: initialStories,
  users,
  customers,
  sprints,
}: {
  stories: StoryWithTaskCount[];
  users: User[];
  customers: Customer[];
  sprints: Sprint[];
}) {
  const router = useRouter();
  const [stories, setStories] = useState(initialStories);
  const [filterAssignee, setFilterAssignee] = useState("__all__");
  const [filterCustomer, setFilterCustomer] = useState("__all__");
  const [createOpen, setCreateOpen] = useState(false);
  const snapshotRef = useRef<StoryWithTaskCount[] | null>(null);

  // Sync from server when props change
  const storiesKey = initialStories.map((s) => s.id + s.sortOrder).join(",");
  useState(() => {
    setStories(initialStories);
  });

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
            open={createOpen}
            onOpenChange={setCreateOpen}
            trigger={
              <button className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-xl transition-colors">
                <PlusIcon className="w-4 h-4" />
                Create Story
              </button>
            }
          />
        </div>
      </div>

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
          <div className="space-y-2">
            {filteredStories.map((story, index) => (
              <SortableStoryCard
                key={story.id}
                story={story}
                index={index}
                users={users}
                customers={customers}
                sprints={sprints}
              />
            ))}
          </div>
        </DragDropProvider>
      )}
    </div>
  );
}
