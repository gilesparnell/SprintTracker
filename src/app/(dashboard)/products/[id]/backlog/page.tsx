export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getStories } from "@/lib/actions/stories";
import { getActiveUsers } from "@/lib/actions/users";
import { getAllCustomers } from "@/lib/actions/customers";
import { getAllProducts } from "@/lib/actions/products";
import { sprints, products } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { BacklogList } from "@/components/features/backlog-list";

export default async function ProductBacklogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const product = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .get();

  if (!product) {
    notFound();
  }

  const [stories, users, customers, allSprints, allProducts] = await Promise.all([
    getStories(db, { status: "backlog", productId: id }),
    getActiveUsers(db),
    getAllCustomers(db),
    db
      .select({ id: sprints.id, name: sprints.name, status: sprints.status })
      .from(sprints)
      .orderBy(asc(sprints.createdAt))
      .all(),
    getAllProducts(db),
  ]);

  const activeSprints = allSprints.filter((s) => s.status !== "completed");

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: product.color }}
          />
          <h1 className="text-2xl font-bold text-white">{product.name}</h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {stories.length} {stories.length === 1 ? "story" : "stories"} in backlog
        </p>
      </div>

      <BacklogList
        stories={stories}
        users={users}
        customers={customers}
        sprints={activeSprints}
        products={allProducts}
      />
    </div>
  );
}
