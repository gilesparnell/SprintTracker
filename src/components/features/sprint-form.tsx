"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  };
}) {
  const [state, formAction, pending] = useActionState(action, {
    success: false,
  });

  return (
    <form action={formAction} className="space-y-4 max-w-lg">
      <div>
        <Label htmlFor="name">Sprint Name *</Label>
        <Input
          id="name"
          name="name"
          defaultValue={defaultValues?.name}
          placeholder="e.g. Sprint 1"
        />
        {state.errors?.name && (
          <p className="text-sm text-destructive mt-1">
            {state.errors.name[0]}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="goal">Goal</Label>
        <Textarea
          id="goal"
          name="goal"
          defaultValue={defaultValues?.goal}
          placeholder="What should this sprint achieve?"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startDate">Start Date *</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={defaultValues?.startDate}
          />
          {state.errors?.startDate && (
            <p className="text-sm text-destructive mt-1">
              {state.errors.startDate[0]}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="endDate">End Date *</Label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={defaultValues?.endDate}
          />
          {state.errors?.endDate && (
            <p className="text-sm text-destructive mt-1">
              {state.errors.endDate[0]}
            </p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="status">Status</Label>
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

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save Sprint"}
      </Button>
    </form>
  );
}
