import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { REVIEW_NAMES } from "@/lib/factcheck/names";
import type { ReviewStatus } from "@/lib/factcheck/types";

/** The Reviewer's status of a step (approved / incomplete / misleading / flagged / not reviewed). */
export function ReviewChip({ status, className }: { status: ReviewStatus; className?: string }) {
  const { lang } = useI18n();
  const name = REVIEW_NAMES[status] ?? REVIEW_NAMES.not_reviewed;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
        name.tone,
        className,
      )}
    >
      {lang === "ar" ? name.ar : name.en}
    </span>
  );
}
