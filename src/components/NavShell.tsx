import Link from "next/link";
import type { ReactNode } from "react";
import { getMyCompany, recentActivities } from "@/lib/data";
import { ACTIVITY_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import type { SessionUser } from "@/lib/session";
import { signOut } from "@/app/login/actions";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/projects", label: "Projects", icon: "📁" },
  { href: "/milestones", label: "Milestones", icon: "🚀" },
  { href: "/team", label: "My Company", icon: "👥" },
  { href: "/companies", label: "Companies", icon: "🏢" },
];

export default async function NavShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  const [recentActivity, company] = await Promise.all([
    recentActivities(8),
    getMyCompany().catch(() => null),
  ]);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white px-4 py-5 dark:border-slate-800 dark:bg-slate-900 md:block">
        <div className="mb-6 flex items-center gap-2 px-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
            EOS
          </span>
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Project Delivery</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Performance Monitoring</div>
          </div>
        </div>

        <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Project Management
        </div>
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-8 border-t border-slate-200 pt-4 dark:border-slate-800">
          <div className="px-2 text-xs uppercase tracking-wide text-slate-400">Signed in as</div>
          <div className="truncate px-2 text-sm font-medium text-slate-700 dark:text-slate-200">{user.email}</div>
          <form action={signOut} className="mt-2 px-2">
            <button
              type="submit"
              className="text-sm text-slate-500 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-white"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
          <Link href="/dashboard" className="text-sm font-semibold text-slate-900 dark:text-slate-50 md:hidden">
            EOS Performance Monitoring
          </Link>
          <div className="hidden text-sm text-slate-500 dark:text-slate-400 md:block">
            {company?.name ?? "EOS"} <span className="mx-1 text-slate-300">·</span> Workspace
          </div>

          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
              <span aria-hidden>🔔</span>
              <span>Activity</span>
              {recentActivity.length > 0 ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-xs font-semibold text-white">
                  {recentActivity.length}
                </span>
              ) : null}
            </summary>
            <div className="absolute right-0 z-10 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-slate-900">
              <div className="px-2 py-1 text-xs font-semibold uppercase text-slate-400">Recent activity</div>
              {recentActivity.length === 0 ? (
                <div className="px-2 py-3 text-sm text-slate-400">Nothing yet.</div>
              ) : (
                <ul className="max-h-80 overflow-y-auto">
                  {recentActivity.map((a) => (
                    <li key={a.id} className="rounded-lg px-2 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                      <div className="font-medium text-slate-700 dark:text-slate-200">
                        {ACTIVITY_LABELS[a.type] ?? a.type}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400">{a.message}</div>
                      <div className="mt-0.5 flex items-center justify-between text-xs text-slate-400">
                        <span>{a.project.name}</span>
                        <span>{formatDateTime(a.createdAt)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </details>
        </header>

        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
