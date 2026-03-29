"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangleIcon,
  CheckIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";

const TAG_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280",
];

type Customer = {
  id: string;
  name: string;
  color: string;
};

type AffectedTask = {
  id: string;
  title: string;
  status: string;
  sprintId: string;
};

export function CustomerManager({ initialCustomers }: { initialCustomers: Customer[] }) {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);

  // Create state
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  // Delete confirmation state
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [affectedTasks, setAffectedTasks] = useState<AffectedTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  async function handleCreate() {
    if (!newName.trim()) return;
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), color: newColor }),
    });
    const customer = await res.json();
    if (customer?.id) {
      setCustomers((prev) => [...prev, customer].sort((a, b) => a.name.localeCompare(b.name)));
    }
    setNewName("");
    setNewColor(TAG_COLORS[0]);
    setCreating(false);
  }

  function startEdit(customer: Customer) {
    setEditingId(customer.id);
    setEditName(customer.name);
    setEditColor(customer.color);
  }

  async function handleSaveEdit(customerId: string) {
    if (!editName.trim()) return;
    const res = await fetch(`/api/customers/${customerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim(), color: editColor }),
    });
    const updated = await res.json();
    if (updated?.id) {
      setCustomers((prev) =>
        prev.map((c) => (c.id === customerId ? { ...c, name: updated.name, color: updated.color } : c))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    }
    setEditingId(null);
    router.refresh();
  }

  async function startDelete(customer: Customer) {
    setDeletingCustomer(customer);
    setLoadingTasks(true);
    const res = await fetch(`/api/customers/${customer.id}/tasks`);
    const tasks = await res.json();
    setAffectedTasks(tasks);
    setLoadingTasks(false);
  }

  async function confirmDelete() {
    if (!deletingCustomer) return;
    await fetch(`/api/customers/${deletingCustomer.id}`, { method: "DELETE" });
    setCustomers((prev) => prev.filter((c) => c.id !== deletingCustomer.id));
    setDeletingCustomer(null);
    setAffectedTasks([]);
    router.refresh();
  }

  async function removeCustomerFromTask(taskId: string) {
    if (!deletingCustomer) return;
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: "__none__" }),
    });
    setAffectedTasks((prev) => prev.filter((t) => t.id !== taskId));
    router.refresh();
  }

  const statusConfig: Record<string, { label: string; color: string }> = {
    open: { label: "Open", color: "text-amber-400" },
    in_progress: { label: "In Progress", color: "text-blue-400" },
    done: { label: "Done", color: "text-green-400" },
  };

  return (
    <div className="space-y-4">
      {/* Customer list */}
      {customers.length === 0 && !creating && (
        <p className="text-sm text-gray-500">No customers yet. Create one to get started.</p>
      )}

      <div className="space-y-1">
        {customers.map((customer) => (
          <div
            key={customer.id}
            className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-800 hover:bg-gray-800/30 transition-colors group"
          >
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: editingId === customer.id ? editColor : customer.color }}
            />

            {editingId === customer.id ? (
              <div className="flex flex-col gap-2 flex-1">
                <div className="flex items-center gap-2">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); handleSaveEdit(customer.id); }
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-green-500/50"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveEdit(customer.id)}
                    className="p-1 text-green-400 hover:text-green-300 hover:bg-green-900/20 rounded-md transition-colors"
                  >
                    <CheckIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-1 text-gray-500 hover:text-gray-300 rounded-md transition-colors"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-1">
                  {TAG_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditColor(c)}
                      className={`w-5 h-5 rounded-full border-2 transition-colors ${
                        editColor === c ? "border-white" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <>
                <span className="text-sm text-white flex-1">{customer.name}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEdit(customer)}
                    className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-gray-800 rounded-md transition-colors"
                  >
                    <PencilIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => startDelete(customer)}
                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-md transition-colors"
                  >
                    <Trash2Icon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Create new customer */}
      {creating ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-700 bg-gray-900/50">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); handleCreate(); }
              if (e.key === "Escape") setCreating(false);
            }}
            placeholder="Customer name"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50"
            autoFocus
          />
          <div className="flex gap-1">
            {TAG_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className={`w-5 h-5 rounded-full border-2 transition-colors ${
                  newColor === c ? "border-white" : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <button
            onClick={handleCreate}
            className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-500 rounded-lg transition-colors"
          >
            Add
          </button>
          <button
            onClick={() => { setCreating(false); setNewName(""); }}
            className="p-1 text-gray-500 hover:text-gray-300"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-400 hover:text-white border border-dashed border-gray-700 hover:border-gray-500 rounded-lg transition-colors w-full"
        >
          <PlusIcon className="w-4 h-4" />
          Create customer
        </button>
      )}

      {/* Delete confirmation overlay */}
      {deletingCustomer && (
        <div className="rounded-xl border border-red-500/30 bg-red-900/10 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangleIcon className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-white">
                Delete customer &ldquo;{deletingCustomer.name}&rdquo;?
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                This will remove the customer from all tasks. This cannot be undone.
              </p>
            </div>
          </div>

          {loadingTasks ? (
            <p className="text-xs text-gray-500 pl-7">Loading affected tasks...</p>
          ) : affectedTasks.length > 0 ? (
            <div className="pl-7">
              <p className="text-xs text-gray-400 mb-1.5">
                {affectedTasks.length} task{affectedTasks.length !== 1 ? "s" : ""} will lose this customer:
              </p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {affectedTasks.map((task) => {
                  const status = statusConfig[task.status] ?? { label: task.status, color: "text-gray-400" };
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 text-xs py-1.5 px-2 rounded bg-gray-900/50 border border-gray-800"
                    >
                      <span className="text-white truncate flex-1">{task.title}</span>
                      <span className={`shrink-0 ${status.color}`}>
                        {status.label}
                      </span>
                      <button
                        onClick={() => removeCustomerFromTask(task.id)}
                        className="shrink-0 px-2 py-0.5 text-[10px] font-medium text-red-400 hover:text-white border border-red-500/30 hover:bg-red-600 rounded transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500 pl-7">No tasks currently use this customer.</p>
          )}

          <div className="flex items-center gap-2 pl-7">
            <button
              onClick={confirmDelete}
              className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
            >
              Delete customer
            </button>
            <button
              onClick={() => { setDeletingCustomer(null); setAffectedTasks([]); }}
              className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white border border-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
