import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSprint } from "@/lib/actions/sprints";
import { SprintForm } from "@/components/features/sprint-form";

export default function NewSprintPage() {
  async function handleCreate(
    _prevState: { success: boolean; errors?: Record<string, string[]> },
    formData: FormData
  ) {
    "use server";

    const result = createSprint(db, {
      name: formData.get("name") as string,
      goal: (formData.get("goal") as string) || undefined,
      startDate: formData.get("startDate") as string,
      endDate: formData.get("endDate") as string,
      status: (formData.get("status") as string) || "planning",
    });

    if (!result.success) {
      return { success: false, errors: result.errors };
    }

    redirect("/sprints");
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">New Sprint</h2>
      <SprintForm action={handleCreate} />
    </div>
  );
}
