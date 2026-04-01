import { signIn } from "@/lib/auth";
import { ZapIcon } from "lucide-react";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm mx-auto p-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-14 h-14 bg-green-900/30 border border-green-800 rounded-2xl flex items-center justify-center">
            <ZapIcon className="w-7 h-7 text-green-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Sprint Tracker</h1>
          <p className="text-sm text-gray-500">Sign in to continue</p>
        </div>

        {/* Error message */}
        {error === "AccessDenied" && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            Access denied. Your email is not on the approved list.
          </div>
        )}

        {/* Sign in form */}
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/sprints" });
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm font-medium text-white transition-all hover:border-gray-600 hover:bg-gray-800"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Sign in with Google
          </button>
        </form>

        {/* Dev login — development only */}
        {process.env.NODE_ENV === "development" && (
          <form
            action={async (formData: FormData) => {
              "use server";
              await signIn("dev-login", {
                email: formData.get("email") as string,
                redirectTo: "/sprints",
              });
            }}
            className="mt-4"
          >
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-800" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-gray-950 px-2 text-gray-600">DEV ONLY</span>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <input
                name="email"
                type="email"
                defaultValue="gilesparnell@gmail.com"
                placeholder="Email"
                className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
              />
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-400 transition-all hover:bg-amber-500/20"
              >
                Dev Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
