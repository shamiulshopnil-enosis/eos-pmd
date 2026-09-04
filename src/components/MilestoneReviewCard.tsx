import {
  MILESTONE_REVIEW_DIMENSIONS,
  reviewScoreLabel,
  type MilestoneReviewDimensionKey,
} from "@/lib/constants";
import type { Milestone } from "@/lib/types";
import { Icon } from "@/components/icon";

type Tone = "good" | "warn" | "bad" | "slate";

function toneOf(score: number | null): Tone {
  if (score == null) return "slate";
  if (score >= 4) return "good";
  if (score >= 3) return "warn";
  return "bad";
}

const TONE_TEXT: Record<Tone, string> = {
  good: "text-rag-good",
  warn: "text-rag-warn",
  bad: "text-rag-bad",
  slate: "text-ink-subtle",
};

const TONE_PILL: Record<Tone, string> = {
  good: "bg-[var(--rag-good-bg,rgba(27,120,58,0.12))] text-rag-good",
  warn: "bg-[var(--rag-warn-bg,rgba(127,95,1,0.12))] text-rag-warn",
  bad: "bg-[var(--rag-bad-bg,rgba(174,46,36,0.12))] text-rag-bad",
  slate: "bg-band text-ink-muted",
};

const DIMENSION_ICONS: Record<MilestoneReviewDimensionKey, string> = {
  deliverables: "box",
  timeliness: "clock",
  understanding: "check_square",
  planning: "groups",
  communication: "comments",
};

function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${TONE_PILL[tone]}`}>
      {children}
    </span>
  );
}

/** Five filled/empty stars for a whole 1–5 dimension score — no partial star
 *  since a dimension is always a whole number. */
function DimensionStars({ score, tone }: { score: number | null; tone: Tone }) {
  if (score == null) return <span className="text-xs text-ink-muted">Not rated</span>;
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon
          key={i}
          name={i <= score ? "star_fill" : "star"}
          className={`text-[13px] ${i <= score ? TONE_TEXT[tone] : "text-ink-subtle/50"}`}
        />
      ))}
    </span>
  );
}

/** The overall score is a decimal average, so its star row fills proportionally
 *  rather than star-by-star. */
function OverallStars({ value, tone }: { value: number; tone: Tone }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <span className="relative inline-flex" aria-hidden="true">
      <span className="flex gap-0.5 text-ink-subtle/40">
        {[1, 2, 3, 4, 5].map((i) => (
          <Icon key={i} name="star" className="text-[17px]" />
        ))}
      </span>
      <span
        className={`absolute inset-0 flex gap-0.5 overflow-hidden ${TONE_TEXT[tone]}`}
        style={{ width: `${pct}%` }}
      >
        {[1, 2, 3, 4, 5].map((i) => (
          <Icon key={i} name="star_fill" className="text-[17px]" />
        ))}
      </span>
    </span>
  );
}

/**
 * The client's milestone review, laid out as a standalone card: overall score
 * up top, each of the five Enosis feedback dimensions below with its own
 * star row and word rating. A dimension's quote only appears when the client
 * left a note on that specific dimension — most reviews only carry the one
 * overall comment, rendered separately by the caller.
 */
export default function MilestoneReviewCard({ milestone }: { milestone: Milestone }) {
  const overallTone = toneOf(milestone.rating);
  // The five dimensions don't share one word scale (timeliness reads
  // Satisfied/Dissatisfied, the rest read Good/Poor) — the "deliverables"
  // scale doubles as the generic one for the overall average.
  const overallLabel =
    milestone.rating != null ? reviewScoreLabel("deliverables", Math.round(milestone.rating)) : "—";

  return (
    <div className="rounded-ledger border border-rule bg-panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-rule pb-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[var(--link-subtle-bg)] text-link">
            <Icon name="comments" className="text-[18px]" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-ink">Client review</h3>
            <p className="mt-0.5 text-xs text-ink-muted">How the client rated this milestone.</p>
          </div>
        </div>
        {milestone.rating != null ? (
          <div className="text-right">
            <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.07em] text-ink-muted">
              Overall score
            </div>
            <div className="mt-1 flex items-center justify-end gap-2">
              <span className="text-2xl font-bold leading-none tabular-nums text-ink">
                {milestone.rating.toFixed(1)}
              </span>
              <OverallStars value={milestone.rating} tone={overallTone} />
            </div>
            <div className="mt-1.5 flex justify-end">
              <Pill tone={overallTone}>{overallLabel}</Pill>
            </div>
          </div>
        ) : null}
      </div>

      <ul className="divide-y divide-rule">
        {MILESTONE_REVIEW_DIMENSIONS.map((dim) => {
          const score = milestone.ratings ? milestone.ratings[dim.key] : null;
          const note = milestone.ratingNotes?.[dim.key] ?? null;
          const tone = toneOf(score);
          return (
            <li
              key={dim.key}
              className={`flex flex-wrap justify-between gap-3 py-3 ${note ? "items-start" : "items-center"}`}
            >
              <div className={`flex min-w-0 gap-3 ${note ? "items-start" : "items-center"}`}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--link-subtle-bg)] text-link">
                  <Icon name={DIMENSION_ICONS[dim.key]} className="text-[14px]" />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-ink">{dim.label}</div>
                  {note ? <p className="mt-0.5 text-xs italic text-ink-muted">&ldquo;{note}&rdquo;</p> : null}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <DimensionStars score={score} tone={tone} />
                <Pill tone={tone}>{reviewScoreLabel(dim.key, score)}</Pill>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
