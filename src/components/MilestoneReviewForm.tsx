"use client";

import { useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "primereact/button";
import { MILESTONE_REVIEW_DIMENSIONS } from "@/lib/constants";
import type { MilestoneReview, MilestoneReviewNotes } from "@/lib/types";
import { Icon } from "@/components/icon";
import { toastError, toastSuccess } from "@/components/toast";

const NOTE_MAX = 300;
const DIMS = MILESTONE_REVIEW_DIMENSIONS;

type Values = Record<string, number | null>;
type Strings = Record<string, string>;

const seedValues = (r?: MilestoneReview | null): Values =>
  Object.fromEntries(DIMS.map((d) => [d.key, r ? r[d.key] : null]));
const seedNotes = (r?: MilestoneReviewNotes | null): Strings =>
  Object.fromEntries(DIMS.map((d) => [d.key, (r ? r[d.key] : null) ?? ""]));

/**
 * The client milestone review — the five Enosis feedback dimensions, each on a
 * 1–5 dot scale with an optional per-dimension comment, plus one overall
 * comment. "Submit" mode also offers "Save Draft" (persists a partly-filled
 * review server-side without submitting it).
 */
export default function MilestoneReviewForm({
  submitAction,
  draftAction,
  mode,
  defaultReview,
  defaultNotes,
  defaultComment = "",
  draftLoaded = false,
}: {
  submitAction: (formData: FormData) => void;
  draftAction?: (formData: FormData) => void;
  mode: "submit" | "edit";
  defaultReview?: MilestoneReview | null;
  defaultNotes?: MilestoneReviewNotes | null;
  defaultComment?: string;
  draftLoaded?: boolean;
}) {
  const [values, setValues] = useState<Values>(() => seedValues(defaultReview));
  const [notes, setNotes] = useState<Strings>(() => seedNotes(defaultNotes));
  const [comment, setComment] = useState(defaultComment);
  const [savingDraft, startSavingDraft] = useTransition();

  const allAnswered = DIMS.every((d) => values[d.key] != null);
  const setRating = (key: string, v: number) =>
    setValues((prev) => ({ ...prev, [key]: prev[key] === v ? null : v }));

  const handleSaveDraft = () => {
    if (!draftAction) return;
    const fd = new FormData();
    for (const d of DIMS) {
      fd.set(d.key, values[d.key] != null ? String(values[d.key]) : "");
      fd.set(`${d.key}Note`, notes[d.key]);
    }
    fd.set("comment", comment);
    startSavingDraft(async () => {
      try {
        await draftAction(fd);
        toastSuccess("Draft saved.");
      } catch {
        toastError("Couldn't save the draft. Please try again.");
      }
    });
  };

  return (
    <div className="overflow-hidden rounded-[10px] border border-rule bg-panel">
      <div className="flex items-start gap-3 border-b border-rule p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[var(--link-subtle-bg)] text-link">
          <Icon name="rate_review" className="text-[18px]" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-ink">Milestone review</h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            Your feedback helps us improve and deliver better outcomes.
          </p>
        </div>
      </div>

      {draftLoaded ? (
        <p className="border-b border-rule bg-[var(--link-subtle-bg)] px-5 py-2 text-xs text-link-strong">
          Your saved draft has been loaded.
        </p>
      ) : null}

      <form action={submitAction}>
        {DIMS.map((dim, i) => {
          const current = values[dim.key];
          const note = notes[dim.key];
          return (
            <fieldset
              key={dim.key}
              className="grid grid-cols-1 gap-x-8 gap-y-5 border-b border-rule p-5 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,1.1fr)_minmax(0,1fr)]"
            >
              <input type="hidden" name={dim.key} value={current ?? ""} />

              {/* Question */}
              <div className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[var(--link-subtle-bg)] font-mono text-sm font-semibold text-link-strong">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-ink">{dim.label}</span>
                    <span title={dim.question} className="inline-flex text-ink-subtle">
                      <Icon name="info" className="text-[13px]" />
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-snug text-ink-muted">{dim.question}</p>
                </div>
              </div>

              {/* Scale */}
              <div>
                <div className="text-xs font-medium text-ink-muted">
                  Rate your experience <span className="text-rag-bad">*</span>
                </div>
                <div
                  role="radiogroup"
                  aria-label={`${dim.label} — 1 to 5`}
                  className="relative mt-3"
                >
                  <div
                    className="absolute left-3 right-3 top-3 h-px bg-rule-strong"
                    aria-hidden="true"
                  />
                  <div className="relative flex justify-between">
                    {[1, 2, 3, 4, 5].map((v) => {
                      const checked = current === v;
                      return (
                        <button
                          key={v}
                          type="button"
                          role="radio"
                          aria-checked={checked}
                          aria-label={`${v} of 5`}
                          onClick={() => setRating(dim.key, v)}
                          className={`flex h-6 w-6 items-center justify-center rounded-full border-2 bg-panel transition-colors ${
                            checked
                              ? "border-link bg-link"
                              : "border-rule-strong hover:border-link"
                          }`}
                        >
                          {checked ? (
                            <span className="h-2 w-2 rounded-full bg-white" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex justify-between px-0.5 font-mono text-xs text-ink-muted">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <span key={v}>{v}</span>
                    ))}
                  </div>
                  <div className="mt-1 flex justify-between text-xs">
                    <span className="text-ink-muted">{dim.options[4]}</span>
                    <span className="font-medium text-link">{dim.options[0]}</span>
                  </div>
                </div>
              </div>

              {/* Per-dimension comment */}
              <div>
                <label
                  htmlFor={`${dim.key}-note`}
                  className="text-xs font-medium text-ink-muted"
                >
                  Additional comments (optional)
                </label>
                <div className="relative mt-1.5">
                  <textarea
                    id={`${dim.key}-note`}
                    name={`${dim.key}Note`}
                    rows={3}
                    maxLength={NOTE_MAX}
                    value={note}
                    onChange={(e) =>
                      setNotes((prev) => ({ ...prev, [dim.key]: e.target.value }))
                    }
                    placeholder="Write your comments…"
                    className="w-full resize-y rounded-[6px] border border-rule bg-[var(--input-bg)] px-3 py-2 pb-6 text-sm text-ink outline-none focus:border-link"
                  />
                  <span className="pointer-events-none absolute bottom-1.5 right-2.5 font-mono text-[0.6875rem] text-ink-subtle">
                    {note.length} / {NOTE_MAX}
                  </span>
                </div>
              </div>
            </fieldset>
          );
        })}

        {/* Overall comment */}
        <div className="border-b border-rule p-5">
          <label htmlFor="review-comment" className="text-sm font-semibold text-ink">
            Additional feedback{" "}
            <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <p className="mt-0.5 text-xs text-ink-muted">One comment for the whole review.</p>
          <div className="relative mt-2">
            <textarea
              id="review-comment"
              name="comment"
              rows={3}
              maxLength={NOTE_MAX}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Anything else about this milestone?"
              className="w-full resize-y rounded-[6px] border border-rule bg-[var(--input-bg)] px-3 py-2 pb-6 text-sm text-ink outline-none focus:border-link"
            />
            <span className="pointer-events-none absolute bottom-1.5 right-2.5 font-mono text-[0.6875rem] text-ink-subtle">
              {comment.length} / {NOTE_MAX}
            </span>
          </div>
        </div>

        {/* Thank-you callout */}
        <div className="m-5 flex items-start gap-3 rounded-[8px] bg-[var(--link-subtle-bg)] p-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-panel text-link">
            <Icon name="verified" className="text-[16px]" />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">Thank you for your time!</p>
            <p className="mt-0.5 text-sm text-ink-muted">
              Your feedback is valuable and helps us ensure continued success on this project.
            </p>
          </div>
        </div>

        <Footer
          mode={mode}
          allAnswered={allAnswered}
          savingDraft={savingDraft}
          onSaveDraft={draftAction ? handleSaveDraft : undefined}
        />
      </form>
    </div>
  );
}

function Footer({
  mode,
  allAnswered,
  savingDraft,
  onSaveDraft,
}: {
  mode: "submit" | "edit";
  allAnswered: boolean;
  savingDraft: boolean;
  onSaveDraft?: () => void;
}) {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule p-5">
      <div className="flex items-center gap-3">
        {onSaveDraft ? (
          <Button
            type="button"
            outlined
            severity="secondary"
            icon="pi pi-save"
            label="Save Draft"
            loading={savingDraft}
            disabled={pending}
            onClick={onSaveDraft}
          />
        ) : null}
        {!allAnswered ? (
          <span className="text-xs text-ink-muted">Answer all 5 questions to submit.</span>
        ) : null}
      </div>
      <Button
        type="submit"
        icon="pi pi-send"
        iconPos="right"
        label={mode === "edit" ? "Update Review" : "Submit Review"}
        loading={pending}
        disabled={pending || !allAnswered}
      />
    </div>
  );
}
