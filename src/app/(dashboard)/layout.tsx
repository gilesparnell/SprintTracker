export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  FolderIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  ZapIcon,
} from "lucide-react";
import { LoveNotes } from "@/components/features/love-notes";
import { MobileSidebarContent } from "@/components/features/mobile-sidebar";
import { db } from "@/lib/db";
import { sprints, folders } from "@/lib/db/schema";
import { asc, desc } from "drizzle-orm";

function SidebarNav({
  allFolders,
  activeSprints,
  completedSprints,
}: {
  allFolders: { id: string; name: string }[];
  activeSprints: { id: string; name: string; status: string; folderId: string | null }[];
  completedSprints: { id: string; name: string; status: string; folderId: string | null }[];
}) {
  return (
    <>
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
        {(activeSprints.length > 0 || allFolders.length > 0) && (
          <div className="ml-4 pl-3 border-l border-gray-800 space-y-0.5 py-1">
            {allFolders.map((folder) => {
              const folderSprints = activeSprints.filter((s) => s.folderId === folder.id);
              return (
                <details key={folder.id} open>
                  <summary className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs text-gray-500 hover:text-gray-300 cursor-pointer select-none">
                    <FolderIcon className="w-3 h-3 text-amber-400/60" />
                    <span className="truncate">{folder.name}</span>
                    <span className="ml-auto text-[10px] text-gray-700">{folderSprints.length}</span>
                  </summary>
                  <div className="ml-3 space-y-0.5">
                    {folderSprints.map((s) => (
                      <Link
                        key={s.id}
                        href={`/sprints/${s.id}`}
                        className="block px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-gray-200 hover:bg-gray-800/50 transition-colors truncate"
                      >
                        {s.name}
                      </Link>
                    ))}
                  </div>
                </details>
              );
            })}
            {activeSprints.filter((s) => !s.folderId).map((s) => (
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
        {completedSprints.length > 0 && (
          <div className="ml-4 pl-3 border-l border-gray-800/50 space-y-0.5 py-1 mt-1">
            <span className="block px-3 py-1 text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
              Completed
            </span>
            {completedSprints.map((s) => (
              <Link
                key={s.id}
                href={`/sprints/${s.id}`}
                className="block px-3 py-1.5 rounded-lg text-xs text-gray-600 hover:text-gray-400 hover:bg-gray-800/50 transition-colors truncate"
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

      {/* Love Notes */}
      <div className="border-t border-pink-500/10">
        <LoveNotes />
      </div>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-gray-800">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          ClickUp sync ready
        </div>
      </div>
    </>
  );
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const allFolders = await db
    .select({ id: folders.id, name: folders.name })
    .from(folders)
    .orderBy(asc(folders.sortOrder), asc(folders.createdAt))
    .all();

  const allSprints = await db
    .select({ id: sprints.id, name: sprints.name, status: sprints.status, folderId: sprints.folderId })
    .from(sprints)
    .orderBy(desc(sprints.createdAt))
    .all();

  const activeSprints = allSprints.filter((s) => s.status !== "completed");
  const completedSprints = allSprints.filter((s) => s.status === "completed");

  const sidebarContent = (
    <SidebarNav
      allFolders={allFolders}
      activeSprints={activeSprints}
      completedSprints={completedSprints}
    />
  );

  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Mobile sidebar (slide-out drawer) */}
      <MobileSidebarContent>
        {sidebarContent}
      </MobileSidebarContent>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 border-r border-gray-800 bg-gray-950 flex-col shrink-0">
        {sidebarContent}
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
