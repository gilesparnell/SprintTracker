"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookOpenIcon,
  BugIcon,
  PencilIcon,
  PlusIcon,
  ListTodoIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react";
import { EntityIcon } from "@/components/ui/entity-icon";
import { StoryFormDialog } from "@/components/features/story-form";
import { StoryDeleteDialog } from "@/components/features/story-delete-dialog";
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

type Product = {
  id: string;
  name: string;
  color: string;
};

type Story = {
  id: string;
  sequenceNumber: number | null;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: string;
  productId: string | null;
  assignedTo: string | null;
  customerId: string | null;
};

const storyTypeConfig: Record<string, { icon: typeof BookOpenIcon; color: string; label: string; bg: string; border: string }> = {
  user_story: { icon: BookOpenIcon, color: "text-gray-400", label: "Story", bg: "bg-gray-800/50", border: "border-gray-700" },
  feature_request: { icon: SparklesIcon, color: "text-purple-400", label: "Feature", bg: "bg-purple-900/20", border: "border-purple-500/30" },
  bug: { icon: BugIcon, color: "text-red-400", label: "Bug", bg: "bg-red-900/20", border: "border-red-500/30" },
};

type Task = {
  id: string;
  sequenceNumber: number | null;
  title: string;
  status: string;
  priority: string;
  assignedTo: string | null;
};

const statusConfig: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  backlog: { label: "Backlog", bg: "bg-gray-800/50", text: "text-gray-400", border: "border-gray-700", dot: "bg-gray-400" },
  in_sprint: { label: "In Sprint", bg: "bg-blue-900/20", text: "text-blue-400", border: "border-blue-500/30", dot: "bg-blue-400" },
  done: { label: "Done", bg: "bg-green-900/20", text: "text-green-400", border: "border-green-500/30", dot: "bg-green-400" },
};

const taskStatusConfig: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  open: { label: "Open", bg: "bg-amber-900/20", text: "text-amber-400", border: "border-amber-500/30", dot: "bg-amber-400" },
  in_progress: { label: "In Progress", bg: "bg-blue-900/20", text: "text-blue-400", border: "border-blue-500/30", dot: "bg-blue-400" },
  done: { label: "Done", bg: "bg-green-900/20", text: "text-green-400", border: "border-green-500/30", dot: "bg-green-400" },
};

const priorityConfig: Record<string, { label: string; color: string; bg: string; text: string; border: string }> = {
  low: { label: "Low", color: "text-gray-400", bg: "bg-gray-800", text: "text-gray-400", border: "border-gray-700" },
  medium: { label: "Medium", color: "text-blue-400", bg: "bg-blue-900/20", text: "text-blue-400", border: "border-blue-500/30" },
  high: { label: "High", color: "text-amber-400", bg: "bg-amber-900/20", text: "text-amber-400", border: "border-amber-500/30" },
  urgent: { label: "Urgent", color: "text-red-400", bg: "bg-red-900/20", text: "text-red-400", border: "border-red-500/30" },
};

// ─── Add Task Dialogue ──────────────────────────────────────

function AddTaskDialog({
  storyId,
  users,
  customers,
  open,
  onOpenChange,
}: {
  storyId: string;
  users: User[];
  customers: Customer[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [priority, setPriority] = useState("medium");
  const [assignee, setAssignee] = useState("__none__");
  const [customerId, setCustomerId] = useState("__none__");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const body = {
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || null,
      status: "open",
      priority,
      userStoryId: storyId,
      assignedTo: assignee === "__none__" ? null : assignee,
      customerId: customerId === "__none__" ? null : customerId,
    };

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        setErrors({ form: [`Server error: ${res.status}`] });
        return;
      }

      const result = await res.json();
      if (result.success) {
        onOpenChange(false);
        router.refresh();
      } else if (result.errors) {
        setErrors(result.errors);
      }
    } catch {
      setErrors({ form: ["Something went wrong. Please try again."] });
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Task to Story</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="task-title" className="block text-sm font-medium text-gray-300">Title *</label>
            <input
              id="task-title"
              name="title"
              placeholder="Task title"
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-colors"
            />
            {errors.title && <p className="text-sm text-red-400">{errors.title[0]}</p>}
          </div>

          <div className="space-y-1">
            <label htmlFor="task-description" className="block text-sm font-medium text-gray-300">Description</label>
            <textarea
              id="task-description"
              name="description"
              placeholder="Optional description"
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 resize-y focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-300 shrink-0">Priority</label>
              <Select value={priority} onValueChange={(v) => setPriority(v ?? "medium")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-300 shrink-0">Assignee</label>
              <Select value={assignee} onValueChange={(v) => setAssignee(v ?? "__none__")}>
                <SelectTrigger>
                  <SelectValue>
                    {assignee === "__none__" ? "Unassigned" : users.find((u) => u.id === assignee)?.name ?? "Unassigned"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Unassigned</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name ?? u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {Object.keys(errors).length > 0 && (
            <div className="space-y-1">
              {Object.entries(errors).map(([field, msgs]) => (
                <p key={field} className="text-sm text-red-400">
                  {field !== "form" ? `${field}: ` : ""}{msgs[0]}
                </p>
              ))}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl text-sm font-medium transition-colors"
          >
            {pending ? "Creating..." : "Create Task"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Story Detail Component ───────────────────────────────

type OtherStory = { id: string; sequenceNumber: number | null; title: string };

export function StoryDetail({
  story,
  storyTasks,
  users,
  customers,
  products = [],
  otherStories,
}: {
  story: Story;
  storyTasks: Task[];
  users: User[];
  customers: Customer[];
  products?: Product[];
  otherStories: OtherStory[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const status = statusConfig[story.status] ?? statusConfig.backlog;
  const priority = priorityConfig[story.priority] ?? priorityConfig.medium;
  const typeConf = storyTypeConfig[story.type] ?? storyTypeConfig.user_story;
  const TypeIcon = typeConf.icon;
  const assignee = users.find((u) => u.id === story.assignedTo);
  const customer = customers.find((c) => c.id === story.customerId);
  const product = products.find((p) => p.id === story.productId);

  return (
    <>
      {/* Header: ID + Title + Edit button */}
      <div className="flex items-start gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-base md:text-lg font-bold text-white inline-flex items-center gap-1.5">
            <EntityIcon type="story" className="w-4 h-4" />
            <span className="text-gray-500 font-normal">US-{story.sequenceNumber}</span>{" "}
            {story.title}
          </h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors"
          >
            <PencilIcon className="w-3 h-3" />
            Edit
          </button>
          <button
            onClick={() => setDeleteOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400/70 hover:text-red-400 bg-gray-800 hover:bg-red-900/20 border border-gray-700 hover:border-red-500/30 rounded-lg transition-colors"
          >
            <Trash2Icon className="w-3 h-3" />
            Delete
          </button>
        </div>
      </div>

      {/* Attributes row */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full border ${typeConf.bg} ${typeConf.color} ${typeConf.border}`}>
          <TypeIcon className="w-3 h-3" />
          {typeConf.label}
        </span>
        {product && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded-full border border-gray-700 bg-gray-800/50 text-gray-300">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: product.color }} />
            {product.name}
          </span>
        )}
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full border ${status.bg} ${status.text} ${status.border}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
        <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded border ${priority.bg} ${priority.text} ${priority.border}`}>
          {priority.label}
        </span>
        {customer && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded-full border border-purple-500/30 bg-purple-900/20 text-purple-300">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: customer.color }} />
            {customer.name}
          </span>
        )}
        {assignee && (
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
            {assignee.image ? (
              <img src={assignee.image} alt="" className="w-4 h-4 rounded-full" />
            ) : (
              <span className="w-4 h-4 rounded-full bg-gray-700 flex items-center justify-center text-[8px] font-bold text-gray-400">
                {(assignee.name ?? assignee.email).charAt(0).toUpperCase()}
              </span>
            )}
            {assignee.name ?? assignee.email}
          </span>
        )}
      </div>

      {/* Description */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Description</p>
        {story.description ? (
          <p className="text-sm text-gray-300 whitespace-pre-wrap">{story.description}</p>
        ) : (
          <p className="text-sm text-gray-600 italic">No description</p>
        )}
      </div>

      {/* Tasks section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <ListTodoIcon className="w-3.5 h-3.5" />
            Tasks ({storyTasks.length})
          </h3>
          <button
            onClick={() => setAddTaskOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-500 rounded-lg transition-colors"
          >
            <PlusIcon className="w-3 h-3" />
            Add Task
          </button>
        </div>

        {storyTasks.length > 0 ? (
          <div className="space-y-1.5">
            {storyTasks.map((t) => {
              const tStatus = taskStatusConfig[t.status] ?? taskStatusConfig.open;
              const tPriority = priorityConfig[t.priority] ?? priorityConfig.medium;
              const tAssignee = users.find((u) => u.id === t.assignedTo);
              return (
                <Link
                  key={t.id}
                  href={`/tasks/${t.id}`}
                  className="flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-800/30 px-3 py-2 hover:bg-gray-800/60 transition-colors"
                >
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
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-800 rounded-xl p-8 text-center">
            <p className="text-sm text-gray-500">No tasks yet</p>
            <button
              onClick={() => setAddTaskOpen(true)}
              className="mt-2 text-sm text-green-400 hover:text-green-300 transition-colors"
            >
              Add the first task
            </button>
          </div>
        )}
      </div>

      {/* Edit Story Dialogue */}
      <StoryFormDialog
        mode="edit"
        defaults={{
          id: story.id,
          title: story.title,
          description: story.description,
          type: story.type,
          status: story.status,
          priority: story.priority,
          productId: story.productId,
          assignedTo: story.assignedTo,
          customerId: story.customerId,
        }}
        users={users}
        customers={customers}
        products={products}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      {/* Add Task Dialogue */}
      <AddTaskDialog
        storyId={story.id}
        users={users}
        customers={customers}
        open={addTaskOpen}
        onOpenChange={setAddTaskOpen}
      />

      {/* Delete Story Dialogue */}
      <StoryDeleteDialog
        story={{ id: story.id, sequenceNumber: story.sequenceNumber, title: story.title }}
        taskCount={storyTasks.length}
        otherStories={otherStories}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        redirectTo="/backlog"
      />
    </>
  );
}
