"use client";

import { useActionState } from "react";
import { Field, SubmitButton, TextInput } from "@/components/form";
import { requestCode, verifyCode, type LoginState } from "./actions";

const INITIAL: LoginState = { step: "email" };

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    async (prev, formData) => (prev.step === "email" ? requestCode(prev, formData) : verifyCode(prev, formData)),
    INITIAL,
  );

  const onCodeStep = state.step === "code";

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      {onCodeStep ? (
        <>
          <input type="hidden" name="email" value={state.email ?? ""} />
          <p className="text-sm text-ink-muted">
            We sent a 6-digit code to <span className="font-medium text-ink">{state.email}</span>.
          </p>
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
      ) : (
        <Field label="Work email" required>
          <TextInput name="email" type="email" autoComplete="email" placeholder="you@company.com" autoFocus required />
        </Field>
      )}

      {state.error ? <p className="text-sm text-rag-bad">{state.error}</p> : null}

      <div className="flex items-center gap-4">
        <SubmitButton>{pending ? "Working…" : onCodeStep ? "Sign in" : "Send code"}</SubmitButton>
        {onCodeStep ? (
          <a href="/login" className="text-sm text-link hover:text-link-strong">
            Use a different email
          </a>
        ) : null}
      </div>
    </form>
  );
}
