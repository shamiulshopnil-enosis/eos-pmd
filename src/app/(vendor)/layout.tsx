import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth";
import NavShell from "@/components/NavShell";

export default async function VendorLayout({ children }: { children: ReactNode }) {
  const user = await requireUser("vendor");
  return <NavShell user={user}>{children}</NavShell>;
}
