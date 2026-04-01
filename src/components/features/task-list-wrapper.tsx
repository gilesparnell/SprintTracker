"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TaskList } from "./task-list";
import { KanbanBoard } from "./kanban-board";
import { TaskFormDialog } from "./task-form";
import { TaskDeleteDialog } from "./task-delete-dialog";
import { ConvertToStoryDialog } from "./convert-to-story-dialog";
import { RemoveFromSprintDialog } from "./remove-from-sprint-dialog";
import Link from "next/link";
import { BookOpenIcon, BugIcon, KanbanIcon, ListIcon, ListTodoIcon, PlusIcon, SparklesIcon, XIcon } from "lucide-react";

type Tag = {
  id: string;
  name: string;
  color: string;
};

type Customer = { id: string; name: string; color: string };

type Product = { id: string; name: string; color: string };

type User = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};

type Task = {
  id: string;
  sequenceNumber?: number | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignedTo?: string | null;
  userStoryId?: string | null;
  clickupTaskId: string | null;
  tags: Tag[];
  customer: { id: string; name: string; color: string } | null;
};

type SprintStory = {
  id: string;
  sequenceNumber: number | null;
  title: string;
  type: string;
  status: string;
  productId: string | null;
  customerId: string | null;
  taskCount: number;
};

const storyTypeIcons: Record<string, { icon: typeof BookOpenIcon; color: string }> = {
  user_story: { icon: BookOpenIcon, color: "text-gray-400" },
  feature_request: { icon: SparklesIcon, color: "text-purple-400" },
  bug: { icon: BugIcon, color: "text-red-400" },
};

export function TaskListWrapper({
  sprintId,
  initialTasks,
  allTags,
  allCustomers,
  allUsers = [],
  stories = [],
  allProducts = [],
}: {
  sprintId: string;
  initialTasks: Task[];
  allTags: Tag[];
  allCustomers: Customer[];
  allUsers?: User[];
  stories?: SprintStory[];
  allProducts?: Product[];
}) {
  const router = useRouter();
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [convertingTaskId, setConvertingTaskId] = useState<string | null>(null);
  const [removingTaskId, setRemovingTaskId] = useState<string | null>(null);

  const hasActiveFilters = selectedTagIds.length > 0 || selectedCustomerIds.length > 0;

  const filteredTasks = initialTasks.filter((t) => {
    const matchesTags =
      selectedTagIds.length === 0 ||
      selectedTagIds.some((tagId) => t.tags.some((tt) => tt.id === tagId));
    const matchesCustomer =
      selectedCustomerIds.length === 0 ||
      (t.customer && selectedCustomerIds.includes(t.customer.id));
    return matchesTags && matchesCustomer;
  });

  // Filter stories by customer (stories don't have tags)
  const filteredStories = stories.filter((s) => {
    if (selectedCustomerIds.length === 0) return true;
    return s.customerId && selectedCustomerIds.includes(s.customerId);
  });

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }

  function toggleCustomer(customerId: string) {
    setSelectedCustomerIds((prev) =>
      prev.includes(customerId)
        ? prev.filter((id) => id !== customerId)
        : [...prev, customerId]
    );
  }

  function clearAllFilters() {
    setSelectedTagIds([]);
    setSelectedCustomerIds([]);
  }

  async function handleStatusChange(taskId: string, status: string) {
    await fetch(`/api/tasks/${taskId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  function handleDelete(taskId: string) {
    const task = initialTasks.find((t) => t.id === taskId);
    if (task) {
      setDeletingTask(task);
    }
  }

  async function confirmDelete() {
    if (!deletingTask) return;
    await fetch(`/api/tasks/${deletingTask.id}`, {
      method: "DELETE",
    });
    setDeletingTask(null);
    router.refresh();
  }

  async function handleRemoveFromSprint(taskId: string) {
    const task = initialTasks.find((t) => t.id === taskId);
    if (task?.userStoryId) {
      // Task is linked to a story — just remove from sprint, stays in story's backlog
      const res = await fetch(`/api/tasks/${taskId}/remove-from-sprint`, {
        method: "POST",
      });
      if (res.ok) router.refresh();
    } else {
      // Orphan task — show modal to pick backlog or delete
      setRemovingTaskId(taskId);
    }
  }

  async function handleRemoveToBacklog(productId: string) {
    if (!removingTaskId) return;
    // Convert to story in the selected backlog, then the story has no sprint
    const res = await fetch(`/api/tasks/${removingTaskId}/convert-to-story`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, removeFromSprint: true }),
    });
    const result = await res.json();
    setRemovingTaskId(null);
    if (result.success) {
      router.refresh();
    }
  }

  async function handleRemoveAndDelete() {
    if (!removingTaskId) return;
    await fetch(`/api/tasks/${removingTaskId}`, { method: "DELETE" });
    setRemovingTaskId(null);
    router.refresh();
  }

  function handleConvertToStory(taskId: string) {
    setConvertingTaskId(taskId);
  }

  async function confirmConvertToStory(productId: string) {
    if (!convertingTaskId) return;
    const res = await fetch(`/api/tasks/${convertingTaskId}/convert-to-story`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    const result = await res.json();
    setConvertingTaskId(null);
    if (result.success && result.storyId) {
      router.push(`/stories/${result.storyId}`);
    }
  }

  async function handleEditTask(
    _prevState: { success: boolean; errors?: Record<string, string[]> },
    formData: FormData
  ): Promise<{ success: boolean; errors?: Record<string, string[]> }> {
    if (!editingTask) return { success: false };

    const res = await fetch(`/api/tasks/${editingTask.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formData.get("title") as string,
        description: (formData.get("description") as string) || undefined,
        status: formData.get("status") as string,
        priority: formData.get("priority") as string,
        customerId: formData.get("customerId") as string,
        assignedTo: formData.get("assignedTo") as string,
      }),
    });

    const result = await res.json();
    if (!result.success) {
      return { success: false, errors: result.errors };
    }

    // Save tags
    const tagIdsRaw = formData.get("tagIds") as string;
    const tagIds = tagIdsRaw ? tagIdsRaw.split(",").filter(Boolean) : [];
    await fetch(`/api/tasks/${editingTask.id}/tags`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagIds }),
    });

    setEditingTask(null);
    router.refresh();
    return { success: true };
  }

  async function handleCreateTask(
    _prevState: { success: boolean; errors?: Record<string, string[]> },
    formData: FormData
  ): Promise<{ success: boolean; errors?: Record<string, string[]> }> {
    const tagIdsRaw = formData.get("tagIds") as string;
    const tagIds = tagIdsRaw ? tagIdsRaw.split(",").filter(Boolean) : [];

    const res = await fetch(`/api/sprints/${sprintId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formData.get("title") as string,
        description: (formData.get("description") as string) || undefined,
        status: formData.get("status") as string,
        priority: formData.get("priority") as string,
        customerId: formData.get("customerId") as string,
        assignedTo: formData.get("assignedTo") as string,
        tagIds,
      }),
    });

    const result = await res.json();
    if (!result.success) {
      return { success: false, errors: result.errors };
    }

    router.refresh();
    return { success: true };
  }

  return (
    <div>
      {/* Filters + Add Task + View toggle — single row */}
      <div className="flex items-start gap-3 mb-3">
        {/* Filter chips */}
        {(allTags.length > 0 || allCustomers.length > 0) && (
          <div className="flex items-center gap-1.5 flex-1 flex-wrap min-w-0">
            <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider shrink-0">Filters</span>
            {allTags.map((tag) => {
              const active = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full border transition-colors ${
                    active
                      ? "border-white/30 text-white bg-gray-700"
                      : "border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600"
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                  {active && <XIcon className="w-2.5 h-2.5 ml-0.5" />}
                </button>
              );
            })}
            {allTags.length > 0 && allCustomers.length > 0 && (
              <span className="text-gray-800 select-none">|</span>
            )}
            {allCustomers.map((customer) => {
              const active = selectedCustomerIds.includes(customer.id);
              return (
                <button
                  key={customer.id}
                  onClick={() => toggleCustomer(customer.id)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full border transition-colors ${
                    active
                      ? "border-purple-400/40 text-white bg-purple-900/30"
                      : "border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600"
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: customer.color }}
                  />
                  {customer.name}
                  {active && <XIcon className="w-2.5 h-2.5 ml-0.5" />}
                </button>
              );
            })}
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-red-400 hover:text-red-300 bg-red-900/20 border border-red-500/30 rounded-full hover:bg-red-900/30 transition-colors"
              >
                <XIcon className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>
        )}

        {/* Add Task + View toggle — right side */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <TaskFormDialog
            action={handleCreateTask}
            trigger={
              <span className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-500 rounded-lg transition-colors cursor-pointer">
                <PlusIcon className="w-3 h-3" />
                Add Task
              </span>
            }
            title="New Task"
            allTags={allTags}
            allCustomers={allCustomers}
            allUsers={allUsers}
          />
          <div className="flex items-center bg-gray-900 border border-gray-800 rounded-lg p-0.5">
            <button
              onClick={() => setView("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                view === "kanban"
                  ? "bg-gray-800 text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <KanbanIcon className="w-3.5 h-3.5" />
              Board
            </button>
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                view === "list"
                  ? "bg-gray-800 text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <ListIcon className="w-3.5 h-3.5" />
              List
            </button>
          </div>
        </div>
      </div>

      {/* Sprint stories */}
      {filteredStories.length > 0 && (
        <div className="mb-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Stories</h3>
          <div className="flex flex-col gap-1">
            {filteredStories.map((story) => {
              const typeConf = storyTypeIcons[story.type] ?? storyTypeIcons.user_story;
              const TypeIcon = typeConf.icon;
              const storyProduct = allProducts.find((p) => p.id === story.productId);
              return (
                <Link
                  key={story.id}
                  href={`/stories/${story.id}`}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-800 bg-gray-900 hover:border-gray-700 hover:bg-gray-800/50 transition-colors group"
                >
                  <TypeIcon className={`w-3.5 h-3.5 shrink-0 ${typeConf.color}`} />
                  <span className="text-[11px] font-mono text-gray-500">S-{story.sequenceNumber}</span>
                  <span className="text-xs text-gray-300 truncate group-hover:text-white transition-colors">{story.title}</span>
                  {storyProduct && (
                    <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded-full border border-gray-700 bg-gray-800/50 text-gray-400">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: storyProduct.color }} />
                      {storyProduct.name}
                    </span>
                  )}
                  {story.taskCount > 0 && (
                    <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded border border-gray-700 bg-gray-800 text-gray-300">
                      <ListTodoIcon className="w-3 h-3 text-gray-400" />
                      {story.taskCount}
                    </span>
                  )}
                  <span
                    className={`ml-auto shrink-0 inline-flex items-center px-1.5 py-0.5 text-[10px] rounded-full border ${
                      story.status === "done"
                        ? "bg-green-900/20 text-green-400 border-green-500/30"
                        : story.status === "in_sprint"
                          ? "bg-blue-900/20 text-blue-400 border-blue-500/30"
                          : "bg-gray-800 text-gray-400 border-gray-700"
                    }`}
                  >
                    {story.status === "in_sprint" ? "In Sprint" : story.status === "done" ? "Done" : "Backlog"}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Tasks heading */}
      {filteredStories.length > 0 && (
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tasks</h3>
      )}

      {view === "kanban" ? (
        <KanbanBoard
          tasks={filteredTasks}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          onEdit={setEditingTask}
          onRemoveFromSprint={handleRemoveFromSprint}
          onConvertToStory={handleConvertToStory}
          allUsers={allUsers}
        />
      ) : (
        <TaskList
          tasks={filteredTasks}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          onEdit={setEditingTask}
          onRemoveFromSprint={handleRemoveFromSprint}
          onConvertToStory={handleConvertToStory}
          allUsers={allUsers}
        />
      )}

      {editingTask && (
        <TaskFormDialog
          action={handleEditTask}
          title="Edit Task"
          taskId={editingTask.id}
          defaultValues={{
            title: editingTask.title,
            description: editingTask.description ?? undefined,
            status: editingTask.status,
            priority: editingTask.priority,
            tagIds: editingTask.tags.map((t) => t.id),
            customerId: editingTask.customer?.id,
            assignedTo: editingTask.assignedTo ?? undefined,
            sequenceNumber: editingTask.sequenceNumber,
          }}
          allTags={allTags}
          allCustomers={allCustomers}
          allUsers={allUsers}
          open={!!editingTask}
          onOpenChange={(open) => {
            if (!open) setEditingTask(null);
          }}
          onDelete={() => {
            const task = editingTask;
            setEditingTask(null);
            setDeletingTask(task);
          }}
        />
      )}

      {deletingTask && (
        <TaskDeleteDialog
          task={deletingTask}
          open={!!deletingTask}
          onOpenChange={(open) => {
            if (!open) setDeletingTask(null);
          }}
          onConfirm={confirmDelete}
        />
      )}

      {convertingTaskId && (
        <ConvertToStoryDialog
          taskTitle={initialTasks.find((t) => t.id === convertingTaskId)?.title ?? ""}
          open={!!convertingTaskId}
          onOpenChange={(open) => {
            if (!open) setConvertingTaskId(null);
          }}
          onConfirm={confirmConvertToStory}
        />
      )}

      {removingTaskId && (
        <RemoveFromSprintDialog
          taskTitle={initialTasks.find((t) => t.id === removingTaskId)?.title ?? ""}
          open={!!removingTaskId}
          onOpenChange={(open) => {
            if (!open) setRemovingTaskId(null);
          }}
          onMoveToBacklog={handleRemoveToBacklog}
          onDelete={handleRemoveAndDelete}
        />
      )}
    </div>
  );
}
