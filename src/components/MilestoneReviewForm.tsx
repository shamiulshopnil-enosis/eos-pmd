"use client";

import { useState } from "react";
import { RadioButton } from "primereact/radiobutton";
import { MILESTONE_REVIEW_DIMENSIONS } from "@/lib/constants";
import type { MilestoneReview } from "@/lib/types";
import { Field, SubmitButton, TextArea } from "@/components/form";

/**
 * The client milestone review form — the five Enosis feedback dimensions on
 * their labelled 5-point scales plus one overall comment. Each option is a
 * PrimeReact <RadioButton> inside a full-width tappable row; the selected value
 * for every dimension is mirrored into a hidden input so the bound server
 * action still reads plain FormData.
 */
export default function MilestoneReviewForm({
  action,
  submitLabel,
  intro,
  defaultReview,
  defaultComment = "",
}: {
  action: (formData: FormData) => void;
  submitLabel: string;
  intro?: string;
  defaultReview?: MilestoneReview | null;
  defaultComment?: string;
}) {
  const [values, setValues] = useState<Record<string, number | null>>(() => {
    const seed: Record<string, number | null> = {};
    for (const dim of MILESTONE_REVIEW_DIMENSIONS) {
      seed[dim.key] = defaultReview ? defaultReview[dim.key] : null;
    }
    return seed;
  });

  return (
    <form action={action} className="mt-3 space-y-6 border-t border-rule pt-4">
      {intro ? <p className="text-sm text-ink-muted">{intro}</p> : null}
      {MILESTONE_REVIEW_DIMENSIONS.map((dim, i) => {
        const current = values[dim.key];
        return (
          <fieldset key={dim.key} className="space-y-2">
            <input type="hidden" name={dim.key} value={current ?? ""} required />
            <legend className="text-sm font-medium text-ink">
              <span className="font-mono text-ink-muted">{i + 1}.</span> {dim.question}{" "}
              <span className="text-rag-bad">*</span>
            </legend>
            <div className="grid gap-1.5 sm:grid-cols-5">
              {dim.options.map((opt, idx) => {
                const value = 5 - idx;
                const checked = current === value;
                return (
                  <label
                    key={opt}
                    className={`flex cursor-pointer items-center gap-2 rounded-[6px] border px-3 py-2.5 text-sm transition-colors sm:flex-col sm:gap-1.5 sm:px-2 sm:py-3 sm:text-center ${
                      checked
                        ? "border-link bg-[var(--link-subtle-bg)] font-medium text-ink"
                        : "border-rule text-ink-muted hover:border-[var(--input-border)] hover:text-ink"
                    }`}
                  >
                    <RadioButton
                      checked={checked}
                      onChange={() => setValues((v) => ({ ...v, [dim.key]: value }))}
                    />
                    <span className="leading-tight">{opt}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}
      <Field label="Additional feedback" hint="Optional — one comment for the whole review">
        <TextArea name="comment" rows={3} defaultValue={defaultComment} placeholder="Anything else about this milestone?" />
      </Field>
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}
