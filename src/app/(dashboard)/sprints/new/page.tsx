import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSprint } from "@/lib/actions/sprints";
import { SprintForm } from "@/components/features/sprint-form";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

export default function NewSprintPage() {
  async function handleCreate(
    _prevState: { success: boolean; errors?: Record<string, string[]> },
    formData: FormData
  ) {
    "use server";

    const result = await createSprint(db, {
      name: formData.get("name") as string,
      goal: (formData.get("goal") as string) || undefined,
      startDate: formData.get("startDate") as string,
      endDate: formData.get("endDate") as string,
      status: (formData.get("status") as "planning" | "active" | "completed") || "planning",
    });

    if (!result.success) {
      return { success: false, errors: result.errors };
    }

    redirect("/sprints");
  }

  return (
    <div className="max-w-5xl">
      <Link
        href="/sprints"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeftIcon className="w-3.5 h-3.5" />
        Back to Sprints
      </Link>
      <h2 className="text-3xl font-bold text-white mb-2">New Sprint</h2>
      <p className="text-gray-400 text-sm mb-8">
        Define your sprint goals, timeline, and get started.
      </p>
      <SprintForm action={handleCreate} />
    </div>
  );
}
