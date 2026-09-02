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
        <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-ink-muted">
          {MILESTONE_RATING_LABEL}
        </span>
        <StarRating value={milestone.rating} />
      </div>
      {!compact ? (
        <dl className="divide-y divide-rule">
          {MILESTONE_REVIEW_DIMENSIONS.map((dim) => (
            <div key={dim.key} className="flex items-center justify-between gap-4 py-1">
              <dt className="text-ink-muted">{dim.label}</dt>
              <dd className="text-ink">
                {reviewScoreLabel(dim.key, milestone.ratings ? milestone.ratings[dim.key] : null)}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
