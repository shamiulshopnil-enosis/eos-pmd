"use client";

import { useState } from "react";
import { MILESTONE_REVIEW_DIMENSIONS } from "@/lib/constants";
import type { MilestoneReview, MilestoneReviewNotes } from "@/lib/types";
import { Field, SubmitButton, TextArea } from "@/components/form";

/**
 * The client milestone review form — the five Enosis feedback dimensions, each
 * on a labelled 5-point scale, each with an optional free-text note, plus one
 * overall comment. The scale is a segmented control; the picked value for every
 * dimension is mirrored into a hidden input so the bound server action still
 * reads plain FormData (`<dim>` = 1–5, `<dim>Note` = the note).
 */
export default function MilestoneReviewForm({
  action,
  submitLabel,
  intro,
  defaultReview,
  defaultNotes,
  defaultComment = "",
}: {
  action: (formData: FormData) => void;
  submitLabel: string;
  intro?: string;
  defaultReview?: MilestoneReview | null;
  defaultNotes?: MilestoneReviewNotes | null;
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
    <form action={action} className="mt-3 space-y-4 border-t border-rule pt-4">
      {intro ? <p className="text-sm text-ink-muted">{intro}</p> : null}

      {MILESTONE_REVIEW_DIMENSIONS.map((dim, i) => {
        const current = values[dim.key];
        return (
          <fieldset
            key={dim.key}
            className="rounded-ledger border border-rule bg-panel p-4"
          >
            <input type="hidden" name={dim.key} value={current ?? ""} required />
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-xs text-ink-muted">{i + 1}</span>
              <span className="text-sm font-semibold text-ink">
                {dim.label} <span className="text-rag-bad">*</span>
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-muted">{dim.question}</p>

            <div
              role="radiogroup"
              aria-label={dim.label}
              className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-5"
            >
              {dim.options.map((opt, idx) => {
                const value = 5 - idx;
                const checked = current === value;
                return (
                  <button
                    key={opt}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    onClick={() => setValues((v) => ({ ...v, [dim.key]: value }))}
                    className={`flex flex-col items-center gap-0.5 rounded-[6px] border px-2 py-2 text-center text-xs leading-tight transition-colors ${
                      checked
                        ? "border-link bg-[var(--link-subtle-bg)] font-semibold text-link-strong"
                        : "border-rule text-ink-muted hover:border-[var(--input-border)] hover:text-ink"
                    }`}
                  >
                    <span className="font-mono text-[0.6875rem] opacity-70">{value}</span>
                    {opt}
                  </button>
                );
              })}
            </div>

            <TextArea
              name={`${dim.key}Note`}
              rows={2}
              defaultValue={defaultNotes?.[dim.key] ?? ""}
              placeholder="Add a note about this rating (optional)"
              className="mt-2.5 !text-sm"
            />
          </fieldset>
        );
      })}

      <Field label="Additional feedback" hint="Optional — one comment for the whole review">
        <TextArea
          name="comment"
          rows={3}
          defaultValue={defaultComment}
          placeholder="Anything else about this milestone?"
        />
      </Field>

      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}
