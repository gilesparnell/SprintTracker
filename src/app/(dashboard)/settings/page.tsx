import { ClickUpHierarchyBrowser } from "@/components/features/clickup-hierarchy-browser";
import { getClickUpConfig } from "@/lib/actions/clickup-config";

export default async function SettingsPage() {
  const config = await getClickUpConfig();

  return (
    <div className="max-w-5xl">
      <h2 className="text-3xl font-bold text-white mb-2">Settings</h2>
      <p className="text-gray-400 text-sm mb-8">
        Configure integrations and preferences.
      </p>
      <ClickUpHierarchyBrowser savedConfig={config} />
    </div>
  );
}
