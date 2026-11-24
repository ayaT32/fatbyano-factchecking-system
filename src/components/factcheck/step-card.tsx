import { useState } from "react";
import {
  Check,
  ChevronDown,
  Circle,
  ExternalLink,
  Loader2,
  MessageSquareQuote,
  UserRound,
  X,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { REVIEW_NAMES, STEP_NAMES } from "@/lib/factcheck/names";
import type { ReviewStatus, Source, Step } from "@/lib/factcheck/types";

export function ReviewChip({ status, className }: { status: ReviewStatus; className?: string }) {
  const { lang } = useI18n();
  const name = REVIEW_NAMES[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
        name.tone,
        className,
      )}
    >
      <MessageSquareQuote className="size-3" />
      {lang === "ar" ? name.ar : name.en}
    </span>
  );
}

function StatusIcon({ status }: { status: Step["status"] }) {
  if (status === "running")
    return <Loader2 className="size-4 animate-spin text-primary motion-reduce:animate-none" />;
  if (status === "done")
    return (
      <span className="grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
        <Check className="size-3" />
      </span>
    );
  if (status === "failed")
    return (
      <span className="grid size-5 place-items-center rounded-full bg-destructive text-white">
        <X className="size-3" />
      </span>
    );
  return <Circle className="size-4 text-muted-foreground/50" />;
}

function SourceRow({ source }: { source: Source }) {
  const { lang } = useI18n();
  const c = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const stance =
    source.stance === "refutes"
      ? c("ينفي", "Refutes")
      : source.stance === "supports"
        ? c("يؤيد", "Supports")
        : source.stance
          ? c("محايد", "Neutral")
          : null;
  const cred =
    source.credibility === "high"
      ? c("موثوقية عالية", "High credibility")
      : source.credibility === "medium"
        ? c("موثوقية متوسطة", "Medium credibility")
        : source.credibility
          ? c("موثوقية ضعيفة", "Low credibility")
          : null;
  return (
    <li className="rounded-lg border bg-background/60 p-2.5">
      <a
        href={source.url}
        target="_blank"
        rel="noreferrer"
        className="flex items-start gap-1.5 text-sm font-medium hover:text-primary hover:underline"
      >
        <span className="min-w-0 flex-1" dir="auto">
          {source.title}
        </span>
        <ExternalLink className="mt-0.5 size-3.5 shrink-0 opacity-60" />
      </a>
      <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
        {source.date && <span dir="ltr">{source.date}</span>}
        {cred && (
          <span
            className={cn(
              "rounded px-1.5",
              source.credibility === "low" ? "bg-verdict-false/10 text-verdict-false" : "bg-muted",
            )}
          >
            {cred}
          </span>
        )}
        {stance && <span className="rounded bg-muted px-1.5">{stance}</span>}
      </div>
    </li>
  );
}

export function StepCard({ step, defaultOpen = false }: { step: Step; defaultOpen?: boolean }) {
  const { lang } = useI18n();
  const [open, setOpen] = useState(defaultOpen);
  const name = STEP_NAMES[step.key];
  const pending = step.status === "pending";
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      disabled={pending}
      className={cn(
        "rounded-2xl border bg-card transition-shadow",
        step.status === "running" && "shadow-md shadow-primary/10 ring-1 ring-primary/30",
        pending && "opacity-55",
      )}
    >
      <CollapsibleTrigger className="flex w-full items-center gap-3 px-4 py-3 text-start disabled:cursor-default">
        <StatusIcon status={step.status} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-semibold">{lang === "ar" ? name.ar : name.en}</span>
          {step.summary && !open && (
            <span className="truncate text-xs text-muted-foreground">{step.summary}</span>
          )}
          {step.status === "running" && !step.summary && (
            <span className="text-xs text-primary">
              {lang === "ar" ? "جارٍ العمل…" : "Working…"}
            </span>
          )}
        </span>
        {step.review && <ReviewChip status={step.review.status} />}
        {!pending && (
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t px-4 pb-4 pt-3 text-sm">
        {step.summary && (
          <p className="leading-7" dir="auto">
            {step.summary}
          </p>
        )}
        {step.items.length > 0 && (
          <ul className="mt-3 space-y-2">
            {step.items.map((item, i) => (
              <li
                key={i}
                className={cn(item.kind === "human" && "rounded-lg bg-primary-soft p-2.5")}
              >
                <p className="flex items-center gap-2 text-[13px] font-medium" dir="auto">
                  {item.kind === "human" ? (
                    <UserRound className="size-3.5 text-primary" />
                  ) : (
                    <span className="size-1.5 rounded-full bg-muted-foreground/50" />
                  )}
                  {item.title}
                </p>
                {item.detail && (
                  <p className="mt-1 ps-5 text-xs leading-6 text-muted-foreground" dir="auto">
                    {item.detail}
                  </p>
                )}
                {item.sources && item.sources.length > 0 && (
                  <ul className="mt-2 space-y-1.5 ps-5">
                    {item.sources.map((s) => (
                      <SourceRow key={s.url} source={s} />
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
        {step.review?.comment && (
          <div className="mt-3 flex gap-2 rounded-lg border border-dashed p-2.5 text-xs leading-6">
            <MessageSquareQuote className="mt-1 size-3.5 shrink-0 text-muted-foreground" />
            <p dir="auto">
              <span className="font-semibold">{lang === "ar" ? "المراجع: " : "Reviewer: "}</span>
              {step.review.comment}
            </p>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
