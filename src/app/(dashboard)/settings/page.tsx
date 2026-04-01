export const dynamic = "force-dynamic";

import { ClickUpHierarchyBrowser } from "@/components/features/clickup-hierarchy-browser";
import { CustomerManager } from "@/components/features/customer-manager";
import { ProductManager } from "@/components/features/product-manager";
import { SettingsTabs } from "@/components/features/settings-tabs";
import { TagManager } from "@/components/features/tag-manager";
import { getClickUpConfig, getClickUpToken } from "@/lib/actions/clickup-config";
import { getAllCustomers } from "@/lib/actions/customers";
import { getAllProducts } from "@/lib/actions/products";
import { getAllTags } from "@/lib/actions/tags";
import { db } from "@/lib/db";

export default async function SettingsPage() {
  const config = await getClickUpConfig();
  const hasToken = !!(await getClickUpToken());
  const allTags = await getAllTags(db);
  const allCustomers = await getAllCustomers(db);
  const allProducts = await getAllProducts(db);

  return (
    <div className="max-w-5xl">
      <h2 className="text-3xl font-bold text-white mb-2">Settings</h2>
      <p className="text-gray-400 text-sm mb-8">
        Configure integrations and preferences.
      </p>

      <SettingsTabs>
        {/* Tab 0: Tags */}
        <div className="bg-gray-900/30 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Tags</h3>
          <TagManager initialTags={allTags} />
        </div>

        {/* Tab 1: Customers */}
        <div className="bg-gray-900/30 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Customers</h3>
          <CustomerManager initialCustomers={allCustomers} />
        </div>

        {/* Tab 2: Products */}
        <div className="bg-gray-900/30 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Products</h3>
          <ProductManager initialProducts={allProducts} />
        </div>

        {/* Tab 3: ClickUp */}
        <div className="space-y-6">
          <div className="bg-gray-900/30 border border-gray-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-2">How ClickUp sync works</h3>
            <div className="space-y-3 text-sm text-gray-400">
              <p>
                Sprint Tracker can push tasks to ClickUp so your team stays in sync without duplicating work.
                Here&apos;s how it works:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-gray-300">
                <li>
                  <strong>Choose a root folder below</strong> &mdash; this is the ClickUp folder where all your sprint Lists will be created.
                </li>
                <li>
                  <strong>Create a sprint</strong> in this app, then link it to ClickUp from the sprint detail page. This creates a new List inside your chosen folder, named after the sprint.
                </li>
                <li>
                  <strong>Add tasks</strong> to the sprint &mdash; they&apos;ll automatically be pushed to the linked ClickUp List. Status changes sync too.
                </li>
              </ol>
              <p className="text-gray-500">
                Sync is one-way (push only). Changes made in ClickUp won&apos;t flow back into this app.
              </p>
            </div>
          </div>

          <ClickUpHierarchyBrowser savedConfig={config} hasToken={hasToken} />
        </div>
      </SettingsTabs>
    </div>
  );
}
