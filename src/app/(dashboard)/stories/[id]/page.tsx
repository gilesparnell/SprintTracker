export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getStoryById, getStories } from "@/lib/actions/stories";
import { getTasksByStoryId } from "@/lib/actions/tasks";
import { getActiveUsers } from "@/lib/actions/users";
import { getAllCustomers } from "@/lib/actions/customers";
import { getAllProducts } from "@/lib/actions/products";
import { NotesList } from "@/components/features/notes-list";
import { StoryDetail } from "@/components/features/story-detail";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

export default async function StoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const story = await getStoryById(db, id);

  if (!story) {
    notFound();
  }

  const [storyTasks, users, customers, allStories, allProducts] = await Promise.all([
    getTasksByStoryId(db, id),
    getActiveUsers(db),
    getAllCustomers(db),
    getStories(db),
    getAllProducts(db),
  ]);

  const otherStories = allStories
    .filter((s) => s.id !== id)
    .map((s) => ({ id: s.id, sequenceNumber: s.sequenceNumber, title: s.title }));

  return (
    <div className="max-w-3xl">
      {/* Back link */}
      <div className="mb-3">
        <Link
          href="/backlog"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-white transition-colors"
        >
          <ArrowLeftIcon className="w-3.5 h-3.5" />
          Back to Backlog
        </Link>
      </div>

      <StoryDetail
        story={story}
        storyTasks={storyTasks}
        users={users}
        customers={customers}
        products={allProducts}
        otherStories={otherStories}
      />

      {/* Notes */}
      <NotesList entityType="story" entityId={id} />
    </div>
  );
}
