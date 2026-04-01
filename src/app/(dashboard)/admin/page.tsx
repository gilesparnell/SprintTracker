import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserById } from "@/lib/actions/users";
import { AdminUsersManager } from "@/components/features/admin-users-manager";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  // Fallback: if session JWT is stale (minted before role column existed),
  // check the DB directly so existing sessions self-heal
  let isAdmin = session.user.role === "admin";
  if (!isAdmin) {
    const dbUser = await getUserById(db, session.user.id);
    isAdmin = dbUser?.role === "admin";
  }

  if (!isAdmin) {
    redirect("/");
  }

  return <AdminUsersManager currentUserId={session.user.id} />;
}
