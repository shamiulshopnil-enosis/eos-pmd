import { redirect } from "next/navigation";
import { getCurrentUser, homePathForRole } from "@/lib/auth";
import { VENDOR_NAME } from "@/lib/constants";
import { AuthShell } from "@/components/AuthShell";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next = "" } = await searchParams;
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "";

  const user = await getCurrentUser();
  if (user) redirect(safeNext || homePathForRole(user.role));

  return (
    <AuthShell
      title={`Sign in to ${VENDOR_NAME}`}
      intro="Enter your email and we'll send a one-time code. No password."
      footer={
        <div className="rounded-ledger border border-rule bg-panel px-4 py-3 text-xs text-ink-muted">
          <p className="mb-1 font-semibold uppercase tracking-[0.06em]">Prototype sign-in</p>
          <p>
            No email is sent. After &ldquo;Send code&rdquo; the 6-digit code appears on the next
            screen and in the server console.
          </p>
          <p className="mt-2 font-semibold uppercase tracking-[0.06em]">Seeded accounts</p>
          <ul className="mt-0.5 space-y-0.5 font-mono">
            <li>admin@eos.local &mdash; platform admin</li>
            <li>vendor@eos.local &mdash; workspace</li>
          </ul>
          <p className="mt-2">Any other email signs in as a new account.</p>
        </div>
      }
    >
      <LoginForm next={safeNext} />
    </AuthShell>
  );
}
