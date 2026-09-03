import type { ReactNode } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { signOut } from "@/app/login/actions";
import { SubmitButton } from "@/components/form";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireUser("admin");

  return (
    <div className="min-h-screen bg-band">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-rule bg-panel px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-ledger bg-ink text-sm font-bold text-paper">
              EOS
            </span>
            <span className="text-sm font-semibold text-ink">Admin</span>
          </span>
          <Link href="/admin/projects" className="text-sm font-medium text-ink-muted hover:text-ink">
            Project Approvals
          </Link>
        </div>
        <div className="flex items-center gap-3 text-sm text-ink-muted">
          <span className="hidden sm:inline">{user.email}</span>
          <form action={signOut}>
            <SubmitButton variant="text" icon="pi pi-sign-out">Sign out</SubmitButton>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
