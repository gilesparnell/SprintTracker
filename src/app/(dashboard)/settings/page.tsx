import { ClickUpHierarchyBrowser } from "@/components/features/clickup-hierarchy-browser";
import { getClickUpConfig } from "@/lib/actions/clickup-config";

export default async function SettingsPage() {
  const config = await getClickUpConfig();

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Settings</h2>
      <ClickUpHierarchyBrowser savedConfig={config} />
    </div>
  );
}
