"use client";

import { useActionState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FormState = {
  success: boolean;
  errors?: Record<string, string[]>;
};

export function SprintForm({
  action,
  defaultValues,
  folders,
}: {
  action: (
    prevState: FormState,
    formData: FormData
  ) => Promise<FormState>;
  defaultValues?: {
    name?: string;
    goal?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    folderId?: string;
  };
  folders?: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, {
    success: false,
  });

  return (
    <form action={formAction} className="space-y-6 max-w-lg">
      <div className="space-y-2">
        <label htmlFor="name" className="block text-sm font-medium text-gray-300">
          Sprint Name *
        </label>
        <input
          id="name"
          name="name"
          defaultValue={defaultValues?.name}
          placeholder="e.g. Sprint 1"
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-colors"
        />
        {state.errors?.name && (
          <p className="text-sm text-red-400">{state.errors.name[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="goal" className="block text-sm font-medium text-gray-300">
          Goal
        </label>
        <textarea
          id="goal"
          name="goal"
          defaultValue={defaultValues?.goal}
          placeholder="What should this sprint achieve?"
          rows={3}
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-colors"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-300">
            Start Date *
          </label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={defaultValues?.startDate}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-colors"
          />
          {state.errors?.startDate && (
            <p className="text-sm text-red-400">{state.errors.startDate[0]}</p>
          )}
        </div>
        <div className="space-y-2">
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-300">
            End Date *
          </label>
          <input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={defaultValues?.endDate}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-colors"
          />
          {state.errors?.endDate && (
            <p className="text-sm text-red-400">{state.errors.endDate[0]}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="status" className="block text-sm font-medium text-gray-300">
            Status
          </label>
          <Select name="status" defaultValue={defaultValues?.status ?? "planning"}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {folders && folders.length > 0 && (
          <div className="space-y-2">
            <label htmlFor="folderId" className="block text-sm font-medium text-gray-300">
              Folder
            </label>
            <Select name="folderId" defaultValue={defaultValues?.folderId ?? "__none__"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No folder</SelectItem>
                {folders.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl text-sm font-medium transition-colors"
      >
        {pending ? "Saving..." : "Save Sprint"}
      </button>
    </form>
  );
}
