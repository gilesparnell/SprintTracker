import Link from "next/link";
import {
  FolderIcon,
  LayoutDashboardIcon,
  ListIcon,
  SettingsIcon,
  ZapIcon,
} from "lucide-react";
import { SidebarNavLink } from "@/components/features/sidebar-nav-link";
import { LoveNotes } from "@/components/features/love-notes";
import { MobileSidebarContent } from "@/components/features/mobile-sidebar";
import { UserMenu } from "@/components/features/user-menu";
import { NotificationBell } from "@/components/features/notification-bell";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sprints, folders, userStories } from "@/lib/db/schema";
import { asc, desc, eq, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";

// Cache sidebar data for 30s — avoids re-querying on every navigation
const getSidebarData = unstable_cache(
  async () => {
    const [allFolders, allSprints, backlogCountResult] = await Promise.all([
      db
        .select({ id: folders.id, name: folders.name })
        .from(folders)
        .orderBy(asc(folders.sortOrder), asc(folders.createdAt))
        .all(),
      db
        .select({ id: sprints.id, name: sprints.name, status: sprints.status, folderId: sprints.folderId })
        .from(sprints)
        .orderBy(desc(sprints.createdAt))
        .all(),
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(userStories)
        .where(eq(userStories.status, "backlog"))
        .get(),
    ]);

    return {
      allFolders,
      activeSprints: allSprints.filter((s) => s.status !== "completed"),
      completedSprints: allSprints.filter((s) => s.status === "completed"),
      backlogCount: backlogCountResult?.count ?? 0,
    };
  },
  ["sidebar-data"],
  { revalidate: 30, tags: ["sidebar"] }
);

function SidebarNav({
  allFolders,
  activeSprints,
  completedSprints,
  backlogCount,
}: {
  allFolders: { id: string; name: string }[];
  activeSprints: { id: string; name: string; status: string; folderId: string | null }[];
  completedSprints: { id: string; name: string; status: string; folderId: string | null }[];
  backlogCount: number;
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
        <SidebarNavLink
          href="/backlog"
          matchPrefixes={["/backlog", "/stories"]}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
          activeClassName="bg-green-500/10 text-green-400 border border-green-500/30"
          inactiveClassName="text-gray-400 hover:bg-gray-800 hover:text-gray-200"
        >
          <ListIcon className="w-4 h-4" />
          Backlog
          {backlogCount > 0 && (
            <span className="ml-auto text-xs font-mono px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-400">
              {backlogCount}
            </span>
          )}
        </SidebarNavLink>
        <SidebarNavLink
          href="/sprints"
          matchPrefixes={["/sprints", "/tasks"]}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
          activeClassName="bg-green-500/10 text-green-400 border border-green-500/30"
          inactiveClassName="text-gray-400 hover:bg-gray-800 hover:text-gray-200"
        >
          <LayoutDashboardIcon className="w-4 h-4" />
          Sprints
          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-400" />
        </SidebarNavLink>
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
        <SidebarNavLink
          href="/settings"
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
          activeClassName="bg-green-500/10 text-green-400 border border-green-500/30"
          inactiveClassName="text-gray-400 hover:bg-gray-800 hover:text-gray-200"
        >
          <SettingsIcon className="w-4 h-4" />
          Settings
        </SidebarNavLink>
        <SidebarNavLink
          href="/admin"
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
          activeClassName="bg-green-500/10 text-green-400 border border-green-500/30"
          inactiveClassName="text-gray-400 hover:bg-gray-800 hover:text-gray-200"
        >
          <SettingsIcon className="w-4 h-4" />
          Admin
        </SidebarNavLink>
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
  const [session, sidebarData] = await Promise.all([
    auth(),
    getSidebarData(),
  ]);

  const sidebarContent = (
    <SidebarNav
      allFolders={sidebarData.allFolders}
      activeSprints={sidebarData.activeSprints}
      completedSprints={sidebarData.completedSprints}
      backlogCount={sidebarData.backlogCount}
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
        {/* Header bar with user menu */}
        <div className="hidden md:flex items-center justify-end gap-2 px-8 py-3 border-b border-gray-800">
          {session?.user && <NotificationBell />}
          {session?.user && <UserMenu user={session.user} />}
        </div>
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
