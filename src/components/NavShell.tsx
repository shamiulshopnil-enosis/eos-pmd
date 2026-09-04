import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "primereact/button";
import { getMyCompany, recentActivities } from "@/lib/data";
import type { SessionUser } from "@/lib/session";
import { signOut } from "@/app/login/actions";
import { ThemeToggle } from "@/components/theme";
import { NavLinks } from "@/components/NavLinks";
import { ActivityMenu, MobileMenu } from "@/components/AppChrome";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { BrandLogo } from "@/components/BrandLogo";

export default async function NavShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  const [recentActivity, company] = await Promise.all([
    recentActivities(8),
    getMyCompany().catch(() => null),
  ]);

  return (
    <div className="flex min-h-screen bg-paper">
      {/* Index rail */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-rule bg-panel md:flex">
        <Link href="/dashboard" className="flex items-center border-b border-rule px-3 py-3">
          <BrandLogo variant="compact" className="h-auto w-full" priority />
        </Link>

        <div className="flex-1 overflow-y-auto px-2.5 py-4">
          <div className="mb-2 px-2.5 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink-muted">
            Register
          </div>
          <NavLinks />
        </div>

        <div className="border-t border-rule px-4 py-3">
          <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-muted">
            Signed in
          </div>
          <div className="mt-0.5 truncate font-mono text-xs text-ink" title={user.email}>
            {user.email}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <form action={signOut}>
              <Button type="submit" text severity="secondary" size="small" label="Sign out" icon="pi pi-sign-out" />
            </form>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-rule bg-panel px-4 py-2.5 md:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <MobileMenu email={user.email} signOut={signOut} />
            <Link href="/dashboard" className="shrink-0 md:hidden">
              <BrandLogo variant="icon" className="h-7 w-auto" priority />
            </Link>
            <div className="min-w-0 flex-1">
              <Breadcrumbs company={company?.name ?? "Enosis"} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ActivityMenu activities={recentActivity} />
            <div className="md:hidden">
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="w-full flex-1 px-4 py-7 md:px-8">{children}</main>
      </div>
    </div>
  );
}
