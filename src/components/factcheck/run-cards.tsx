import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Download,
  PauseCircle,
  ExternalLink,
  FileText,
  Loader2,
  ListChecks,
  Star,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { VerdictBadge } from "@/components/verdict-badge";
import { cn } from "@/lib/utils";
import { useI18n, type TKey } from "@/lib/i18n";
import { PHASE_STEP_NAMES, STEP_NAMES } from "@/lib/factcheck/names";
import { getSource } from "@/lib/factcheck/source";
import type { FactCheckRun, Phase, Source, StepSummary } from "@/lib/factcheck/types";
import { ReviewChip } from "./review-chip";

function useCopy() {
  const { lang } = useI18n();
  return (ar: string, en: string) => (lang === "ar" ? ar : en);
}

function ReviewerNote({ step }: { step: StepSummary | undefined }) {
  const c = useCopy();
  if (!step?.reviewIssues) return null;
  return (
    <p className="mt-2 rounded-lg border border-dashed p-2.5 text-xs leading-6" dir="auto">
      <span className="font-semibold">{c("المراجع: ", "Reviewer: ")}</span>
      {step.reviewIssues}
    </p>
  );
}

/** The plan DEFAME made (moment 1, where the human can give feedback in supervised mode). */
export function PlanCard({ run }: { run: FactCheckRun }) {
  const c = useCopy();
  const [open, setOpen] = useState(false); // details only when pressed
  if (!run.plan?.summary) return null;
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-2xl border bg-card">
      <CollapsibleTrigger className="flex w-full items-center gap-3 px-4 py-3 text-start">
        <ListChecks className="size-4 text-primary" />
        <span className="flex-1 text-sm font-semibold">{c("خطة التحقق", "The plan")}</span>
        {run.plan.reviewStatus && <ReviewChip status={run.plan.reviewStatus} />}
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t px-4 pb-4 pt-3">
        <p className="whitespace-pre-wrap break-words text-sm leading-7" dir="auto">
          {run.plan.summary}
        </p>
        <ReviewerNote step={run.plan} />
      </CollapsibleContent>
    </Collapsible>
  );
}

function elapsed(from: string | undefined) {
  if (!from) return "";
  const s = Math.max(0, Math.floor((Date.now() - new Date(from).getTime()) / 1000));
  const m = Math.floor(s / 60);
  return m ? `${m}m ${String(s % 60).padStart(2, "0")}s` : `${s}s`;
}

const PHASE_ORDER: Phase[] = [
  "planning",
  "gathering_evidence",
  "analysing",
  "reviewing",
  "finalizing",
];

/** What DEFAME is doing, like an LLM's "thinking" line: one collapsed line (current phase and
 * elapsed time, with a chevron) that opens into the phase checklist only when pressed. It is
 * shown while the claim is queued, running or paused, and removed when it finishes
 * (DECISIONS.md #23, #28). */
export function StatusLine({ run }: { run: FactCheckRun }) {
  const { lang } = useI18n();
  const c = useCopy();
  const [open, setOpen] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const queued = run.status === "queued";
  const current = queued ? -1 : PHASE_ORDER.indexOf(run.phase ?? "planning");
  const waiting = run.status === "paused";
  const currentName = current >= 0 ? PHASE_STEP_NAMES[PHASE_ORDER[current]!] : undefined;
  const headline = queued
    ? c("في قائمة الانتظار", "In the queue")
    : currentName
      ? lang === "ar"
        ? currentName.ar
        : currentName.en
      : c("جارٍ الفحص", "Checking");
  return (
    <Collapsible open={open} onOpenChange={setOpen} role="status" aria-live="polite">
      <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-start text-sm text-muted-foreground hover:text-foreground">
        {waiting ? (
          <PauseCircle className="size-4 shrink-0 text-primary" />
        ) : (
          <Loader2 className="size-4 shrink-0 animate-spin text-primary motion-reduce:animate-none" />
        )}
        <span className={cn(!waiting && "animate-pulse motion-reduce:animate-none")}>
          {headline}
        </span>
        {waiting && (
          <span className="text-xs text-primary">{c("بانتظار قرارك", "waiting for you")}</span>
        )}
        <span className="tabular-nums" dir="ltr">
          {elapsed(run.startedAt ?? run.createdAt)}
        </span>
        <ChevronRight
          className={cn(
            "size-4 shrink-0 transition-transform rtl:rotate-180",
            open && "rotate-90 rtl:rotate-90",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="ms-2 mt-1 space-y-2 border-s ps-4">
          {PHASE_ORDER.map((phase, i) => {
            const name = PHASE_STEP_NAMES[phase];
            const state = i < current ? "done" : i === current ? "current" : "todo";
            return (
              <li key={phase} className="flex items-center gap-2.5 text-sm">
                {state === "done" ? (
                  <CheckCircle2 className="size-4 shrink-0 text-muted-foreground" />
                ) : state === "current" ? (
                  waiting ? (
                    <PauseCircle className="size-4 shrink-0 text-primary" />
                  ) : (
                    <Loader2 className="size-4 shrink-0 animate-spin text-primary motion-reduce:animate-none" />
                  )
                ) : (
                  <CircleDashed className="size-4 shrink-0 text-muted-foreground/60" />
                )}
                <span
                  className={cn(
                    state === "current" ? "font-medium text-foreground" : "text-muted-foreground",
                    state === "todo" && "text-muted-foreground/70",
                  )}
                >
                  {lang === "ar" ? name.ar : name.en}
                </span>
              </li>
            );
          })}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

function SourceRow({ source }: { source: Source }) {
  const c = useCopy();
  const stance =
    source.stance === "refutes"
      ? c("ينفي", "Refutes")
      : source.stance === "supports"
        ? c("يؤيد", "Supports")
        : source.stance
          ? c("سياق", "Context")
          : null;
  const cred = source.credibility;
  return (
    <li className="rounded-lg border bg-background/60 p-2.5">
      <a
        href={source.url}
        target="_blank"
        rel="noreferrer"
        className="flex items-start gap-1.5 text-sm font-medium hover:text-primary hover:underline"
      >
        <span className="min-w-0 flex-1 break-words" dir="auto">
          {source.title || source.url}
        </span>
        <ExternalLink className="mt-0.5 size-3.5 shrink-0 opacity-60" />
      </a>
      <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
        {source.publishedOn && <span dir="ltr">{source.publishedOn}</span>}
        {cred !== undefined && (
          <span
            className={cn(
              "rounded px-1.5",
              cred < 0.4 ? "bg-verdict-false/10 text-verdict-false" : "bg-muted",
            )}
          >
            {c("الموثوقية", "Credibility")} {Math.round(cred * 100)}%
          </span>
        )}
        {stance && <span className="rounded bg-muted px-1.5">{stance}</span>}
        {source.snippetOnly && (
          <span className="rounded bg-muted px-1.5">{c("من المقتطف فقط", "Snippet only")}</span>
        )}
        {source.addedBy === "reviewer" && (
          <span className="rounded bg-muted px-1.5">
            {c("أضافه المراجع", "Added by the Reviewer")}
          </span>
        )}
        {source.archivedUrl && (
          <a
            href={source.archivedUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded bg-muted px-1.5 hover:underline"
          >
            {c("نسخة مؤرشفة", "Archived copy")}
          </a>
        )}
      </div>
    </li>
  );
}

function Endorse({ run }: { run: FactCheckRun }) {
  const c = useCopy();
  const [endorsed, setEndorsed] = useState<boolean | null>(run.endorsement?.endorsed ?? null);
  const [rating, setRating] = useState(run.endorsement?.rating ?? 0);
  const [comment, setComment] = useState(run.endorsement?.comment ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | string>("idle");
  async function save() {
    if (endorsed === null) return;
    setState("saving");
    try {
      await getSource().endorse(run.id, {
        endorsed,
        ...(rating ? { rating } : {}),
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      });
      setState("saved");
    } catch (e) {
      setState(e instanceof Error ? e.message : String(e));
    }
  }
  return (
    <div className="mt-4 rounded-xl border bg-background/60 p-3">
      <p className="text-sm font-medium">
        {c("هل تنشر هذا التفسير؟", "Would you publish this explanation?")}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {([true, false] as const).map((v) => (
          <Button
            key={String(v)}
            size="sm"
            variant={endorsed === v ? "default" : "outline"}
            onClick={() => setEndorsed(v)}
          >
            {v ? c("نعم", "Yes") : c("لا", "No")}
          </Button>
        ))}
        <span className="ms-2 flex" aria-label={c("التقييم", "Rating")}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n === rating ? 0 : n)}
              aria-label={`${n}/5`}
            >
              <Star
                className={cn(
                  "size-4",
                  n <= rating ? "fill-primary text-primary" : "text-muted-foreground",
                )}
              />
            </button>
          ))}
        </span>
      </div>
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        dir="auto"
        placeholder={c("تعليق (اختياري)", "Comment (optional)")}
        className="mt-2 min-h-14 bg-card"
      />
      <div className="mt-2 flex items-center gap-3">
        <Button
          size="sm"
          disabled={endorsed === null || state === "saving"}
          onClick={() => void save()}
        >
          {c("حفظ", "Save")}
        </Button>
        {state === "saved" && (
          <span className="text-xs text-verdict-true">{c("حُفظ", "Saved")}</span>
        )}
        {state !== "idle" && state !== "saving" && state !== "saved" && (
          <span className="text-xs text-destructive">{state}</span>
        )}
      </div>
    </div>
  );
}

/** The verdict with its analysis (moment 2): labels, analysis, sources, the Reviewer's issues,
 * the human's decisions, downloads and the endorsement. */
export function VerdictCard({
  run,
  onOpenReview,
}: {
  run: FactCheckRun;
  onOpenReview: () => void;
}) {
  const { lang, t } = useI18n();
  const c = useCopy();
  const decision = [...run.decisions]
    .reverse()
    .find((d) => d.action === "label" || d.action === "comment");
  async function download(path: string) {
    window.open(await getSource().reportUrl(path), "_blank", "noopener");
  }
  const settled = {
    agreement: c("اتفق الوكيل والمراجع", "The agent and the Reviewer agreed"),
    human: c("قرره المدقق", "Decided by the fact-checker"),
    unresolved: c("لم يُحسم: يحتاج إلى مدقق", "Unresolved: needs a fact-checker"),
  };
  return (
    <section className="rounded-2xl border bg-card p-4 md:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold">{c("الحكم النهائي", "Final verdict")}</span>
        <VerdictBadge verdict={run.finalVerdict ?? null} className="px-3 py-1 text-sm" />
        {run.settledBy && (
          <span className="text-xs text-muted-foreground">{settled[run.settledBy]}</span>
        )}
        <Button className="ms-auto" variant="outline" onClick={onOpenReview}>
          <FileText />
          {c("المراجعة", "Review")}
        </Button>
      </div>
      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <div className="flex items-center gap-2">
          <dt className="text-muted-foreground">{c("الوكيل:", "Agent:")}</dt>
          <dd>
            <VerdictBadge verdict={run.agentVerdict ?? null} />
          </dd>
        </div>
        {run.reviewerVerdict && (
          <div className="flex items-center gap-2">
            <dt className="text-muted-foreground">{c("المراجع:", "Reviewer:")}</dt>
            <dd>
              <VerdictBadge verdict={run.reviewerVerdict} />
            </dd>
          </div>
        )}
      </dl>
      {run.needsHumanReview && (
        <p className="mt-3 flex items-start gap-2 rounded-lg border border-verdict-missing-context/40 bg-verdict-missing-context/10 p-3 text-sm leading-6">
          <AlertTriangle className="mt-1 size-4 shrink-0 text-verdict-missing-context" />
          {c(
            "يحتاج إلى مراجعة بشرية: لم يصل النظام إلى نتيجة، والقرار للمدقق.",
            "Needs human review: the system reached no conclusion; a fact-checker decides.",
          )}
        </p>
      )}
      {decision && (
        <p
          className="mt-3 flex items-start gap-2 rounded-lg bg-primary-soft p-3 text-sm leading-6"
          dir="auto"
        >
          <UserRound className="mt-1 size-4 shrink-0 text-primary" />
          <span>
            <strong>
              {decision.action === "label"
                ? c("قرار المدقق: ", "Fact-checker's decision: ")
                : c("تعليق المدقق: ", "Fact-checker's comment: ")}
            </strong>
            {decision.label && t(`v.${decision.label}` as TKey)}
            {(decision.reason || decision.feedback) && (
              <> — {decision.reason ?? decision.feedback}</>
            )}
          </span>
        </p>
      )}

      {run.verdictStep?.summary && (
        <div className="mt-4">
          <h4 className="mb-1 flex items-center gap-2 text-sm font-semibold">
            {lang === "ar" ? STEP_NAMES.verdict.ar : STEP_NAMES.verdict.en}
            {run.verdictStep.reviewStatus && <ReviewChip status={run.verdictStep.reviewStatus} />}
          </h4>
          <p className="whitespace-pre-wrap text-sm leading-7" dir="auto">
            {run.verdictStep.summary}
          </p>
          <ReviewerNote step={run.verdictStep} />
        </div>
      )}
      {run.analysis?.summary && (
        <Collapsible className="mt-4">
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold hover:text-primary">
            {lang === "ar" ? STEP_NAMES.analysis.ar : STEP_NAMES.analysis.en}
            {run.analysis.reviewStatus && <ReviewChip status={run.analysis.reviewStatus} />}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <p
              className="mt-2 max-h-96 overflow-y-auto whitespace-pre-wrap text-sm leading-7"
              dir="auto"
            >
              {run.analysis.summary}
            </p>
            <ReviewerNote step={run.analysis} />
          </CollapsibleContent>
        </Collapsible>
      )}
      {run.sources.length > 0 && (
        <Collapsible className="mt-4">
          <CollapsibleTrigger className="text-sm font-semibold hover:text-primary">
            {c("المصادر", "Sources")} ({run.sources.length})
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="mt-2 space-y-1.5">
              {run.sources.map((s) => (
                <SourceRow key={`${s.url}-${s.addedBy}`} source={s} />
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}

      {(run.report?.markdownPath || run.report?.pdfPath) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {run.report.pdfPath && (
            <Button size="sm" variant="outline" onClick={() => void download(run.report!.pdfPath!)}>
              <Download />
              PDF
            </Button>
          )}
          {run.report.markdownPath && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void download(run.report!.markdownPath!)}
            >
              <Download />
              .md
            </Button>
          )}
        </div>
      )}
      <p className="mt-3 text-[11px] text-muted-foreground" dir="ltr">
        {run.durationSeconds !== undefined && `${Math.round(run.durationSeconds / 60)} min`}
        {run.costUsd !== undefined && ` · $${run.costUsd.toFixed(3)}`}
      </p>
      <Endorse run={run} />
    </section>
  );
}
