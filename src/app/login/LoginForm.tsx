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
          <p className="text-sm text-slate-600 dark:text-slate-300">
            We sent a 6-digit code to <span className="font-medium">{state.email}</span>.
          </p>
          {state.devCode ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
              No email is sent in this prototype. Your code is{" "}
              <span className="font-mono font-semibold tracking-widest">{state.devCode}</span>.
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
            />
          </Field>
        </>
      ) : (
        <Field label="Work email" required>
          <TextInput name="email" type="email" autoComplete="email" placeholder="you@company.com" autoFocus required />
        </Field>
      )}

      {state.error ? <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p> : null}

      <div className="flex items-center gap-3">
        <SubmitButton>{pending ? "Working…" : onCodeStep ? "Sign in" : "Send code"}</SubmitButton>
        {onCodeStep ? (
          <a href="/login" className="text-sm text-slate-500 hover:underline">
            Use a different email
          </a>
        ) : null}
      </div>
    </form>
  );
}
