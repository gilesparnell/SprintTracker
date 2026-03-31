export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { getStories } from "@/lib/actions/stories";
import { getUnlinkedTasks } from "@/lib/actions/tasks";
import { getActiveUsers } from "@/lib/actions/users";
import { getAllCustomers } from "@/lib/actions/customers";
import { sprints } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { BacklogList } from "@/components/features/backlog-list";
import { getAllProducts } from "@/lib/actions/products";

export default async function BacklogPage() {
  const [stories, users, customers, allSprints, unlinkedTasks, allProducts] = await Promise.all([
    getStories(db, { status: "backlog" }),
    getActiveUsers(db),
    getAllCustomers(db),
    db
      .select({ id: sprints.id, name: sprints.name, status: sprints.status })
      .from(sprints)
      .orderBy(asc(sprints.createdAt))
      .all(),
    getUnlinkedTasks(db),
    getAllProducts(db),
  ]);

  // Only show non-completed sprints for the "Move to Sprint" dropdown
  const activeSprints = allSprints.filter((s) => s.status !== "completed");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Backlog</h1>
        <p className="text-sm text-gray-500 mt-1">
          {stories.length} {stories.length === 1 ? "story" : "stories"}
        </p>
      </div>

      <BacklogList
        stories={stories}
        users={users}
        customers={customers}
        sprints={activeSprints}
        products={allProducts}
        unlinkedTasks={unlinkedTasks}
      />
    </div>
  );
}
