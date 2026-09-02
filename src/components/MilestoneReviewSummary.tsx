import {
  MILESTONE_RATING_LABEL,
  MILESTONE_REVIEW_DIMENSIONS,
  reviewScoreLabel,
} from "@/lib/constants";
import type { Milestone } from "@/lib/types";
import { StarRating } from "@/components/ui";

/**
 * Read-only breakdown of a client milestone review: the overall score (average,
 * which drives all project scoring) plus each of the five Enosis feedback
 * dimensions with the option the client picked.
 */
export default function MilestoneReviewSummary({
  milestone,
  compact = false,
}: {
  milestone: Milestone;
  compact?: boolean;
}) {
  return (
    <div className="space-y-1.5 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium text-slate-600 dark:text-slate-300">{MILESTONE_RATING_LABEL}</span>
        <StarRating value={milestone.rating} />
      </div>
      {!compact ? (
        <dl className="divide-y divide-slate-100 dark:divide-slate-800">
          {MILESTONE_REVIEW_DIMENSIONS.map((dim) => (
            <div key={dim.key} className="flex items-center justify-between gap-4 py-1">
              <dt className="text-slate-500 dark:text-slate-400">{dim.label}</dt>
              <dd className="text-slate-700 dark:text-slate-200">
                {reviewScoreLabel(dim.key, milestone.ratings ? milestone.ratings[dim.key] : null)}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
