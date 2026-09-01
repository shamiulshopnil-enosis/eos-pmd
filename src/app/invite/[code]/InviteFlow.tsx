"use client";

import { useActionState } from "react";
import { Field, SubmitButton, TextInput } from "@/components/form";
import { acceptWithCode, sendInviteCode, type InviteState } from "./actions";

const INITIAL: InviteState = { step: "start" };

export function InviteFlow({ invitationId, email }: { invitationId: string; email: string }) {
  const [state, formAction, pending] = useActionState<InviteState, FormData>(
    async (prev, formData) =>
      prev.step === "start" ? sendInviteCode(invitationId) : acceptWithCode(invitationId, formData),
    INITIAL,
  );

  const onCodeStep = state.step === "code";

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Sign in as <span className="font-medium">{email}</span> to accept. We&apos;ll send a one-time code &mdash; no
        password.
      </p>

      {onCodeStep ? (
        <>
          {state.devCode ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
              No email is sent in this prototype. Your code is{" "}
              <span className="font-mono font-semibold tracking-widest">{state.devCode}</span>.
            </p>
          ) : null}
          <Field label="6-digit code" required>
            <TextInput name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" autoFocus required />
          </Field>
        </>
      ) : null}

      {state.error ? <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p> : null}

      <SubmitButton>{pending ? "Working…" : onCodeStep ? "Accept invitation" : "Send code"}</SubmitButton>
    </form>
  );
}
