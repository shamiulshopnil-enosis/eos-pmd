"use client";

import type { ReactNode } from "react";
import { toastError, toastSuccess } from "@/components/toast";

function isRedirect(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "digest" in e &&
    typeof (e as { digest?: unknown }).digest === "string" &&
    ((e as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
      (e as { digest: string }).digest === "NEXT_NOT_FOUND")
  );
}

/**
 * A <form> bound to a server action that shows a flag on success and a
 * generic error flag on failure. Use for same-page mutations that
 * revalidate rather than redirect.
 */
export function ActionForm({
  action,
  success,
  error = "Something went wrong. Please try again.",
  className,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  success?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  async function run(formData: FormData) {
    try {
      await action(formData);
      if (success) toastSuccess(success);
    } catch (e) {
      if (isRedirect(e)) throw e;
      toastError(error);
    }
  }
  return (
    <form action={run} className={className}>
      {children}
    </form>
  );
}
