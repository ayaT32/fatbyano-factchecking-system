import { Fragment, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VerdictBadge } from "@/components/verdict-badge";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { STEP_NAMES } from "@/lib/factcheck/names";
import { getSource } from "@/lib/factcheck/source";
import type { FactCheckRun, ReviewStatus } from "@/lib/factcheck/types";
import { ReviewChip } from "./review-chip";

type StepName = "plan" | "analysis" | "verdict";
interface Block {
  id: StepName | "claim";
  heading: string;
  text: string;
}
/** A Reviewer comment anchored to a quote in a block (Google Docs style). */
interface Comment {
  id: string;
  blockId: Block["id"];
  quote: string;
  body: string;
  stage: StepName;
  status: ReviewStatus;
}

/** The first sentence (or first 60 characters) of a text: where a step's comment is anchored.
 * DEFAME's Reviewer reviews each step without quoting the text yet. */
function anchorOf(text: string) {
  const sentence = text.split(/(?<=[.!?؟。])\s/)[0] ?? text;
  return sentence.length > 60 ? sentence.slice(0, 60) : sentence;
}

function renderBlock(
  block: Block,
  comments: Comment[],
  active: string | null,
  setActive: (id: string) => void,
  markRefs: Map<string, HTMLElement>,
) {
  const parts: ReactNode[] = [];
  let rest = block.text;
  for (const c of comments) {
    const at = rest.indexOf(c.quote);
    if (at < 0) continue;
    parts.push(rest.slice(0, at));
    parts.push(
      <span
        key={c.id}
        ref={(el) => void (el ? markRefs.set(c.id, el) : markRefs.delete(c.id))}
        onClick={() => setActive(c.id)}
        className={cn(
          "cursor-pointer rounded-sm border-b-2 transition-colors",
          active === c.id ? "border-primary bg-primary/25" : "border-primary/50 bg-primary/10",
        )}
      >
        {c.quote}
      </span>,
    );
    rest = rest.slice(at + c.quote.length);
  }
  parts.push(rest);
  return parts;
}

function CommentCard({
  comment,
  active,
  onClick,
}: {
  comment: Comment;
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
      <p className="whitespace-pre-wrap leading-6" dir="auto">
        {comment.body}
      </p>
    </button>
  );
}

export function ReviewPanel({ run, onClose }: { run: FactCheckRun; onClose: () => void }) {
  const { lang } = useI18n();
  const c = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const [active, setActive] = useState<string | null>(null);
  const [tops, setTops] = useState<Record<string, number>>({});
  const doc = useRef<HTMLDivElement>(null);
  const markRefs = useRef(new Map<string, HTMLElement>()).current;
  const cardRefs = useRef(new Map<string, HTMLElement>()).current;

  const { blocks, comments } = useMemo(() => {
    const name = (s: StepName) => (lang === "ar" ? STEP_NAMES[s].ar : STEP_NAMES[s].en);
    const steps: [StepName, FactCheckRun["plan"]][] = [
      ["verdict", run.verdictStep],
      ["analysis", run.analysis],
      ["plan", run.plan],
    ];
    const blocks: Block[] = [
      { id: "claim", heading: c("الادعاء", "Claim"), text: run.claim.text || c("صورة", "Image") },
    ];
    const comments: Comment[] = [];
    for (const [id, step] of steps) {
      if (!step?.summary) continue;
      blocks.push({ id, heading: name(id), text: step.summary });
      if (step.reviewIssues) {
        comments.push({
          id: `c-${id}`,
          blockId: id,
          quote: anchorOf(step.summary),
          body: step.reviewIssues,
          stage: id,
          status: step.reviewStatus ?? "not_reviewed",
        });
      }
    }
    return { blocks, comments };
  }, [run, lang]); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [comments, markRefs, cardRefs]);

  async function download(path: string) {
    window.open(await getSource().reportUrl(path), "_blank", "noopener");
  }

  const marginHeight = Math.max(
    0,
    ...comments.map((cm) => (tops[cm.id] ?? 0) + (cardRefs.get(cm.id)?.offsetHeight ?? 120)),
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-muted/40">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-card px-4">
        <h2 className="text-sm font-semibold">{c("المراجعة", "Review")}</h2>
        <span className="rounded-full bg-primary-soft px-2 text-xs font-semibold text-primary">
          {comments.length}
        </span>
        <div className="ms-auto flex items-center gap-1">
          {run.report?.markdownPath && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void download(run.report!.markdownPath!)}
            >
              <Download />
              .md
            </Button>
          )}
          {run.report?.pdfPath && (
            <Button variant="ghost" size="sm" onClick={() => void download(run.report!.pdfPath!)}>
              <Download />
              PDF
            </Button>
          )}
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
                <h3 className="mb-2 text-base font-bold">{block.heading}</h3>
                <p className="whitespace-pre-wrap text-[15px] leading-8" dir="auto">
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
            {run.reviewerEnabled
              ? c("لا ملاحظات من المراجع.", "No Reviewer comments.")
              : c("كان المراجع متوقفًا في هذا الفحص.", "The Reviewer was off for this check.")}
          </p>
        )}
      </div>
    </div>
  );
}
