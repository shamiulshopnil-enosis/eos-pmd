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
      <p className="text-sm text-ink-muted">
        Sign in as <span className="font-medium text-ink">{email}</span> to accept. We&apos;ll send a
        one-time code &mdash; no password.
      </p>

      {onCodeStep ? (
        <>
          {state.devCode ? (
            <p className="rounded-ledger border border-rule bg-band px-3 py-2 text-sm text-ink-muted">
              No email is sent in this prototype. Your code is{" "}
              <span className="font-mono text-base font-semibold tracking-[0.2em] text-ink">{state.devCode}</span>.
            </p>
          ) : null}
          <Field label="6-digit code" required>
            <TextInput
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              autoFocus
              required
              className="font-mono tracking-[0.3em]"
            />
          </Field>
        </>
      ) : null}

      {state.error ? <p className="text-sm text-rag-bad">{state.error}</p> : null}

      <SubmitButton>{pending ? "Working…" : onCodeStep ? "Accept invitation" : "Send code"}</SubmitButton>
    </form>
  );
}
