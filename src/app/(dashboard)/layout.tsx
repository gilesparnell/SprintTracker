export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  LayoutDashboardIcon,
  SettingsIcon,
  ZapIcon,
} from "lucide-react";
import { BackgroundSlideshow } from "@/components/features/background-slideshow";
import { db } from "@/lib/db";
import { sprints } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const allSprints = await db
    .select({ id: sprints.id, name: sprints.name })
    .from(sprints)
    .orderBy(desc(sprints.createdAt))
    .all();

  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-800 bg-gray-950 flex flex-col">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6">
          <div className="w-10 h-10 bg-green-900/30 border border-green-800 rounded-xl flex items-center justify-center">
            <ZapIcon className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Sprint Tracker</h1>
            <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">
              v1.0
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <Link
            href="/sprints"
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium bg-green-500/10 text-green-400 border border-green-500/30 transition-all"
          >
            <LayoutDashboardIcon className="w-4 h-4" />
            Sprints
            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-400" />
          </Link>
          {allSprints.length > 0 && (
            <div className="ml-4 pl-3 border-l border-gray-800 space-y-0.5 py-1">
              {allSprints.map((s) => (
                <Link
                  key={s.id}
                  href={`/sprints/${s.id}`}
                  className="block px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-gray-200 hover:bg-gray-800/50 transition-colors truncate"
                >
                  {s.name}
                </Link>
              ))}
            </div>
          )}
          <Link
            href="/settings"
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-all"
          >
            <SettingsIcon className="w-4 h-4" />
            Settings
          </Link>
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-gray-800">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            ClickUp sync ready
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <BackgroundSlideshow />
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
