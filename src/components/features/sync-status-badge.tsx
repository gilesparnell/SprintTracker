import { Badge } from "@/components/ui/badge";

type SyncState = "synced" | "error" | "unlinked";

const styles: Record<SyncState, string> = {
  synced: "bg-green-50 text-green-700 border-green-200",
  error: "bg-yellow-50 text-yellow-700 border-yellow-200",
  unlinked: "bg-gray-50 text-gray-500 border-gray-200",
};

const labels: Record<SyncState, string> = {
  synced: "Synced",
  error: "Sync Error",
  unlinked: "—",
};

export function SyncStatusBadge({ state }: { state: SyncState }) {
  if (state === "unlinked") {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  return (
    <Badge variant="outline" className={styles[state]}>
      {labels[state]}
    </Badge>
  );
}
