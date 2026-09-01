import { redirect } from "next/navigation";
import { getCurrentUser, homePathForRole } from "@/lib/auth";
import { VENDOR_NAME } from "@/lib/constants";
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
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
          EOS
        </div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Sign in to {VENDOR_NAME}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Enter your email and we&apos;ll send a one-time code. No password needed.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <LoginForm next={safeNext} />
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
        <p className="mb-1 font-medium text-slate-600 dark:text-slate-300">Prototype sign-in</p>
        <p>
          No email is sent. After &ldquo;Send code&rdquo; the 6-digit code appears on the next screen (and in the
          server console).
        </p>
        <p className="mt-2 font-medium text-slate-600 dark:text-slate-300">Seeded accounts</p>
        <ul className="mt-0.5 space-y-0.5">
          <li>
            <span className="font-mono">admin@eos.local</span> &mdash; platform admin
          </li>
          <li>
            <span className="font-mono">vendor@eos.local</span> &mdash; vendor workspace
          </li>
        </ul>
        <p className="mt-2">Any other email signs in as a new client (Buyer) account.</p>
      </div>
    </div>
  );
}
