import type { ReactNode } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { signOut } from "@/app/login/actions";
import { SubmitButton } from "@/components/form";
import { BreadcrumbProvider, Breadcrumbs } from "@/components/Breadcrumbs";
import { BrandLogo } from "@/components/BrandLogo";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireUser("admin");

  return (
    <BreadcrumbProvider>
      <div className="min-h-screen bg-band">
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-rule bg-panel px-4 py-2.5 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Link href="/admin/projects" className="shrink-0">
              <BrandLogo variant="compact" className="h-9 w-auto" priority />
            </Link>
            <div className="min-w-0 flex-1">
              <Breadcrumbs company="Admin" rootHref="/admin/projects" />
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-ink-muted">
            <span className="hidden sm:inline">{user.email}</span>
            <form action={signOut}>
              <SubmitButton variant="text" icon="pi pi-sign-out">Sign out</SubmitButton>
            </form>
          </div>
        </header>
        <main className="w-full px-4 py-8 sm:px-6">{children}</main>
      </div>
    </BreadcrumbProvider>
  );
}
