import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminUsersManager } from "@/components/features/admin-users-manager";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    redirect("/");
  }

  return <AdminUsersManager currentUserId={session.user.id} />;
}
