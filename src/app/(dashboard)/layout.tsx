import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r bg-muted/40 p-6">
        <h1 className="text-xl font-bold mb-8">Sprint Tracker</h1>
        <nav className="space-y-2">
          <Link
            href="/sprints"
            className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            Sprints
          </Link>
          <Link
            href="/settings"
            className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            Settings
          </Link>
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
