"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

type StoryDefaults = {
  id?: string;
  title?: string;
  description?: string | null;
  priority?: string;
  assignedTo?: string | null;
  customerId?: string | null;
};

export function StoryFormDialog({
  mode,
  defaults,
  users,
  customers,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  mode: "create" | "edit";
  defaults?: StoryDefaults;
  users: User[];
  customers: Customer[];
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const dialogOpen = isControlled ? controlledOpen : uncontrolledOpen;

  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [priority, setPriority] = useState(defaults?.priority ?? "medium");
  const [assignee, setAssignee] = useState(defaults?.assignedTo ?? "__none__");
  const [customer, setCustomer] = useState(defaults?.customerId ?? "__none__");

  // Reset form state when dialogue opens or defaults change
  const defaultsKey = [
    defaults?.id,
    defaults?.title,
    defaults?.priority,
    defaults?.assignedTo,
    defaults?.customerId,
  ].join("|");

  useEffect(() => {
    if (dialogOpen) {
      setPriority(defaults?.priority ?? "medium");
      setAssignee(defaults?.assignedTo ?? "__none__");
      setCustomer(defaults?.customerId ?? "__none__");
      setErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen, defaultsKey]);

  function handleOpenChange(open: boolean) {
    if (isControlled) {
      onOpenChange?.(open);
    } else {
      setUncontrolledOpen(open);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || null,
      priority,
      assignedTo: assignee === "__none__" ? null : assignee,
      customerId: customer === "__none__" ? null : customer,
    };

    try {
      const url =
        mode === "edit" && defaults?.id
          ? `/api/stories/${defaults.id}`
          : "/api/stories";
      const method = mode === "edit" ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await res.json();

      if (result.success) {
        handleOpenChange(false);
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
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Edit Story" : "Create Story"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <label htmlFor="story-title" className="block text-sm font-medium text-gray-300">
              Title *
            </label>
            <input
              id="story-title"
              name="title"
              defaultValue={defaults?.title ?? ""}
              placeholder="Story title"
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-colors"
            />
            {errors.title && (
              <p className="text-sm text-red-400">{errors.title[0]}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="story-description" className="block text-sm font-medium text-gray-300">
              Description
            </label>
            <textarea
              id="story-description"
              name="description"
              defaultValue={defaults?.description ?? ""}
              placeholder="Optional description"
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 resize-y focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-colors"
            />
          </div>

          {/* Priority + Assignee row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Priority
              </label>
              <Select value={priority} onValueChange={(v) => setPriority(v ?? "medium")}>
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

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Assignee
              </label>
              <Select value={assignee} onValueChange={(v) => setAssignee(v ?? "__none__")}>
                <SelectTrigger>
                  <SelectValue>
                    {assignee === "__none__"
                      ? "Unassigned"
                      : users.find((u) => u.id === assignee)?.name ?? "Unassigned"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Unassigned</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name ?? u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Customer */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Customer
            </label>
            <Select value={customer} onValueChange={(v) => setCustomer(v ?? "__none__")}>
              <SelectTrigger>
                <SelectValue>
                  {customer === "__none__"
                    ? "No customer"
                    : (() => {
                        const c = customers.find((c) => c.id === customer);
                        return c ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: c.color }}
                            />
                            {c.name}
                          </span>
                        ) : (
                          "No customer"
                        );
                      })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No customer</SelectItem>
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
          </div>

          {/* Form-level error */}
          {errors.form && (
            <p className="text-sm text-red-400">{errors.form[0]}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={pending}
            className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl text-sm font-medium transition-colors"
          >
            {pending ? "Saving..." : mode === "edit" ? "Update Story" : "Create Story"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
