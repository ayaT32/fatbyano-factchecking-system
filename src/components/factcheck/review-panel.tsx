import { Fragment, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Download, FileText, MessageSquareQuote, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { VerdictBadge } from "@/components/verdict-badge";
import { cn } from "@/lib/utils";
import { useI18n, type TKey } from "@/lib/i18n";
import { STEP_NAMES } from "@/lib/factcheck/names";
import type { FactCheckRun, ReportBlock, ReviewComment } from "@/lib/factcheck/types";
import { ReviewChip } from "./step-card";

/** Splits a block's text around the quotes its comments are anchored to. */
function renderBlock(
  block: ReportBlock,
  comments: ReviewComment[],
  active: string | null,
  setActive: (id: string) => void,
  markRefs: Map<string, HTMLElement>,
) {
  const parts: ReactNode[] = [];
  let rest = block.text;
  const ordered = comments
    .map((c) => ({ c, at: block.text.indexOf(c.quote) }))
    .filter((x) => x.at >= 0)
    .sort((a, b) => a.at - b.at);
  let offset = 0;
  for (const { c, at } of ordered) {
    const local = at - offset;
    if (local < 0) continue; // overlapping quotes: keep the first
    parts.push(rest.slice(0, local));
    const isActive = active === c.id;
    parts.push(
      <span
        key={c.id}
        ref={(el) => void (el ? markRefs.set(c.id, el) : markRefs.delete(c.id))}
        onClick={() => setActive(c.id)}
        className={cn(
          "cursor-pointer rounded-sm border-b-2 transition-colors",
          isActive ? "border-primary bg-primary/25" : "border-primary/50 bg-primary/10",
        )}
      >
        {c.suggestion ? (
          <>
            <del className="text-muted-foreground decoration-verdict-false/70">{c.quote}</del>
            <ins className="ms-1 text-verdict-true no-underline decoration-verdict-true underline-offset-4 [text-decoration-line:underline]">
              {c.suggestion}
            </ins>
          </>
        ) : (
          c.quote
        )}
      </span>,
    );
    rest = rest.slice(local + c.quote.length);
    offset = at + c.quote.length;
  }
  parts.push(rest);
  return parts;
}

function CommentCard({
  comment,
  active,
  onClick,
}: {
  comment: ReviewComment;
  active: boolean;
  onClick: () => void;
}) {
  const { lang } = useI18n();
  const c = (ar: string, en: string) => (lang === "ar" ? ar : en);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border bg-card p-3 text-start text-sm shadow-sm transition",
        active ? "border-primary shadow-md ring-1 ring-primary/30" : "hover:border-primary/40",
      )}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <span className="grid size-6 place-items-center rounded-full bg-ink text-[11px] font-bold text-ink-foreground">
          {c("م", "R")}
        </span>
        <span className="text-xs font-semibold">{c("المراجع", "Reviewer")}</span>
        <span className="text-[11px] text-muted-foreground">
          · {lang === "ar" ? STEP_NAMES[comment.stage].ar : STEP_NAMES[comment.stage].en}
        </span>
        <ReviewChip status={comment.status} className="ms-auto" />
      </div>
      <p className="leading-6" dir="auto">
        {comment.body}
      </p>
      {comment.suggestion && (
        <p className="mt-2 rounded-lg bg-muted/70 p-2 text-xs leading-5" dir="auto">
          <span className="font-semibold">{c("اقتراح: ", "Suggestion: ")}</span>
          <del className="text-muted-foreground">{comment.quote}</del> →{" "}
          <span className="text-verdict-true">{comment.suggestion}</span>
        </p>
      )}
    </button>
  );
}

function markdownOf(run: FactCheckRun, lang: "ar" | "en", t: (k: TKey) => string) {
  const c = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const name = (v?: string) => (v ? t(`v.${v}` as TKey) : "—");
  const lines = [`# ${c("تقرير التحقق", "Fact-check report")}`, ""];
  for (const b of run.report?.blocks ?? []) lines.push(`## ${b.heading ?? ""}`, "", b.text, "");
  lines.push(
    `## ${c("الأحكام", "Verdicts")}`,
    "",
    `- ${c("الوكيل", "Agent")}: ${name(run.agentVerdict)}`,
    `- ${c("المراجع", "Reviewer")}: ${name(run.reviewerVerdict)}`,
    `- ${c("النهائي", "Final")}: ${name(run.finalVerdict)}`,
    "",
  );
  for (const d of run.humanDecisions)
    lines.push(
      `- ${c("قرار المدقق", "Human decision")} (${d.pause}, ${d.at}): ${d.label ? name(d.label) : d.left ? name("nei") : ""} ${d.reason ?? d.feedback ?? ""}`.trim(),
    );
  lines.push("", `## ${c("ملاحظات المراجع", "Reviewer comments")}`, "");
  for (const cm of run.report?.comments ?? [])
    lines.push(
      `- «${cm.quote}»: ${cm.body}${cm.suggestion ? ` (${c("اقتراح", "suggestion")}: ${cm.suggestion})` : ""}`,
    );
  return lines.join("\n");
}

export function ReviewPanel({ run, onClose }: { run: FactCheckRun; onClose: () => void }) {
  const { lang, t } = useI18n();
  const c = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const [active, setActive] = useState<string | null>(null);
  const [tops, setTops] = useState<Record<string, number>>({});
  const doc = useRef<HTMLDivElement>(null);
  const markRefs = useRef(new Map<string, HTMLElement>()).current;
  const cardRefs = useRef(new Map<string, HTMLElement>()).current;
  const blocks = run.report?.blocks ?? [];
  const comments = useMemo(() => run.report?.comments ?? [], [run.report?.comments]);

  // Place each comment next to its highlighted quote, pushing cards down so they don't overlap
  useLayoutEffect(() => {
    const place = () => {
      const base = doc.current?.getBoundingClientRect().top ?? 0;
      const order = comments
        .map((cm) => ({
          id: cm.id,
          top: (markRefs.get(cm.id)?.getBoundingClientRect().top ?? base) - base,
        }))
        .sort((a, b) => a.top - b.top);
      const next: Record<string, number> = {};
      let bottom = 0;
      for (const { id, top } of order) {
        const y = Math.max(top - 8, bottom);
        next[id] = y;
        bottom = y + (cardRefs.get(id)?.offsetHeight ?? 120) + 10;
      }
      setTops((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };
    place();
    const ro = new ResizeObserver(place);
    if (doc.current) ro.observe(doc.current);
    return () => ro.disconnect();
  }, [comments, markRefs, cardRefs, lang]);

  function download() {
    const blob = new Blob([markdownOf(run, lang, t)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: `fact-check-${run.id.slice(0, 8)}.md`,
    });
    a.click();
    URL.revokeObjectURL(url);
  }

  const marginHeight = Math.max(
    0,
    ...comments.map((cm) => (tops[cm.id] ?? 0) + (cardRefs.get(cm.id)?.offsetHeight ?? 120)),
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-muted/40">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-card px-4">
        <FileText className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">{c("المراجعة", "Review")}</h2>
        <span className="rounded-full bg-primary-soft px-2 text-xs font-semibold text-primary">
          {comments.length}
        </span>
        <div className="ms-auto flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={download}>
            <Download />
            .md
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!run.report?.pdfUrl}
                  asChild={!!run.report?.pdfUrl}
                >
                  {run.report?.pdfUrl ? (
                    <a href={run.report.pdfUrl} download>
                      <Download />
                      PDF
                    </a>
                  ) : (
                    <>
                      <Download />
                      PDF
                    </>
                  )}
                </Button>
              </span>
            </TooltipTrigger>
            {!run.report?.pdfUrl && (
              <TooltipContent>
                {c(
                  "يتوفر PDF عند الاتصال بالخادم",
                  "PDF is available once the backend is connected",
                )}
              </TooltipContent>
            )}
          </Tooltip>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label={c("إغلاق", "Close")}>
            <X />
          </Button>
        </div>
      </header>
      <div className="@container min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        <div className="flex gap-4">
          <article
            ref={doc}
            className="min-w-0 flex-1 rounded-xl bg-card px-6 py-7 shadow-sm ring-1 ring-border md:px-9"
          >
            <div className="mb-5 flex flex-wrap items-center gap-2 border-b pb-4">
              <span className="text-xs text-muted-foreground">
                {c("الحكم النهائي", "Final verdict")}
              </span>
              <VerdictBadge verdict={run.finalVerdict ?? null} />
              <span className="ms-auto text-xs text-muted-foreground">
                {c("مسودة — تتطلب مراجعة تحريرية", "Draft — needs editorial review")}
              </span>
            </div>
            {blocks.map((block) => (
              <section key={block.id} className="mb-5">
                {block.heading && <h3 className="mb-2 text-base font-bold">{block.heading}</h3>}
                <p className="text-[15px] leading-8" dir="auto">
                  {renderBlock(
                    block,
                    comments.filter((cm) => cm.blockId === block.id),
                    active,
                    setActive,
                    markRefs,
                  ).map((p, i) => (
                    <Fragment key={i}>{p}</Fragment>
                  ))}
                </p>
                {/* Narrow screens: comments under their paragraph instead of in the margin */}
                <div className="mt-2 space-y-2 @xl:hidden">
                  {comments
                    .filter((cm) => cm.blockId === block.id)
                    .map((cm) => (
                      <CommentCard
                        key={cm.id}
                        comment={cm}
                        active={active === cm.id}
                        onClick={() => setActive(cm.id)}
                      />
                    ))}
                </div>
              </section>
            ))}
          </article>
          <aside
            aria-label={c("ملاحظات المراجع", "Reviewer comments")}
            className="relative hidden w-56 shrink-0 @xl:block"
            style={{ minHeight: marginHeight }}
          >
            {comments.map((cm) => (
              <div
                key={cm.id}
                ref={(el) => void (el ? cardRefs.set(cm.id, el) : cardRefs.delete(cm.id))}
                className="absolute inset-x-0 transition-[top] duration-200"
                style={{ top: tops[cm.id] ?? 0 }}
              >
                <CommentCard
                  comment={cm}
                  active={active === cm.id}
                  onClick={() => setActive(cm.id)}
                />
              </div>
            ))}
          </aside>
        </div>
        {comments.length === 0 && (
          <p className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <MessageSquareQuote className="size-4" />
            {c("لا ملاحظات من المراجع.", "No Reviewer comments.")}
          </p>
        )}
      </div>
    </div>
  );
}
