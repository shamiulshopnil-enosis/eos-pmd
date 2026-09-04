import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth";
import NavShell from "@/components/NavShell";
import { BreadcrumbProvider } from "@/components/Breadcrumbs";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  return (
    <BreadcrumbProvider>
      <NavShell user={user}>{children}</NavShell>
    </BreadcrumbProvider>
  );
}
