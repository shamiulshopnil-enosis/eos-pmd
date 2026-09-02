import { MILESTONE_REVIEW_DIMENSIONS } from "@/lib/constants";
import type { MilestoneReview } from "@/lib/types";
import { Field, SubmitButton, TextArea } from "@/components/form";

/**
 * The client milestone review form — the five Enosis feedback dimensions on
 * their labelled 5-point scales plus one overall comment. Submitted via a bound
 * server action (submit or edit-own).
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
  return (
    <form action={action} className="mt-3 space-y-5 border-t border-slate-100 pt-3 dark:border-slate-800">
      {intro ? <p className="text-sm text-slate-500 dark:text-slate-400">{intro}</p> : null}
      {MILESTONE_REVIEW_DIMENSIONS.map((dim, i) => {
        const current = defaultReview ? defaultReview[dim.key] : null;
        return (
          <fieldset key={dim.key} className="space-y-1.5">
            <legend className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {i + 1}. {dim.question} <span className="text-rose-500">*</span>
            </legend>
            <div className="space-y-1">
              {dim.options.map((opt, idx) => {
                const value = 5 - idx;
                return (
                  <label key={opt} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <input type="radio" name={dim.key} value={value} required defaultChecked={current === value} />
                    {opt}
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
