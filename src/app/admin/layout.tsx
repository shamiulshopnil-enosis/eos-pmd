import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth";
import { signOut } from "@/app/login/actions";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireUser("admin");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white dark:bg-slate-100 dark:text-slate-900">
            EOS
          </span>
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">Admin</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          <span className="hidden sm:inline">{user.email}</span>
          <form action={signOut}>
            <button type="submit" className="hover:text-slate-900 hover:underline dark:hover:text-white">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
