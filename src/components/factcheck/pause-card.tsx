import { useState } from "react";
import { BellRing, Bot, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VerdictBadge } from "@/components/verdict-badge";
import { cn } from "@/lib/utils";
import { useI18n, type TKey } from "@/lib/i18n";
import { MODE_NAMES, PAUSE_TITLES } from "@/lib/factcheck/names";
import {
  LABELS,
  verdictCode,
  type Answer,
  type Label,
  type Mode,
  type Pause,
} from "@/lib/factcheck/types";

// Full class names, so Tailwind generates them
const SELECTED: Record<Label, string> = {
  false: "bg-verdict-false",
  altered: "bg-verdict-altered",
  misleading: "bg-verdict-misleading",
  missing_context: "bg-verdict-missing-context",
  true: "bg-verdict-true",
  satire: "bg-verdict-satire",
};

function LabelPicker({ value, onChange }: { value: Label | null; onChange: (l: Label) => void }) {
  const { t } = useI18n();
  return (
    <div role="radiogroup" className="flex flex-wrap gap-2">
      {LABELS.map((label) => (
        <button
          key={label}
          type="button"
          role="radio"
          aria-checked={value === label}
          onClick={() => onChange(label)}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition",
            value === label
              ? `${SELECTED[label]} text-white ring-transparent`
              : "bg-card ring-border hover:ring-primary/50",
          )}
        >
          {t(`v.${label}` as TKey)}
        </button>
      ))}
    </div>
  );
}

const text = (v: unknown) => (typeof v === "string" ? v : "");

/** What DEFAME shows at the pause (its `context`), laid out per pause point. */
function PauseContext({ pause }: { pause: Pause }) {
  const { lang } = useI18n();
  const c = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const ctx = pause.context;
  if (pause.point === "plan") {
    const actions = Array.isArray(ctx["Proposed actions"])
      ? (ctx["Proposed actions"] as unknown[]).map(String)
      : [];
    return (
      <>
        <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground" dir="auto">
          {text(ctx["Planner's reasoning"])}
        </p>
        {actions.length > 0 && (
          <ol className="my-3 list-decimal space-y-1 ps-6 text-sm">
            {actions.map((a) => (
              <li key={a} dir="auto" className="break-words">
                {a}
              </li>
            ))}
          </ol>
        )}
      </>
    );
  }
  const agent = verdictCode(ctx["Agent's verdict"]);
  const reviewer = verdictCode(ctx["Reviewer's verdict"]);
  return (
    <>
      {(agent || reviewer) && (
        <div className="mb-3 grid gap-3 md:grid-cols-2">
          {(
            [
              [c("الوكيل", "Agent"), agent, text(ctx["Agent's reasoning"]), Bot],
              [c("المراجع", "Reviewer"), reviewer, text(ctx["Reviewer's reasoning"]), Scale],
            ] as const
          ).map(([who, verdict, reasoning, Icon]) =>
            verdict ? (
              <div key={who} className="rounded-xl border bg-background/60 p-3">
                <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Icon className="size-3.5" />
                  {who}
                  <VerdictBadge verdict={verdict} className="ms-auto" />
                </p>
                {reasoning && (
                  <p
                    className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap text-sm leading-6"
                    dir="auto"
                  >
                    {reasoning}
                  </p>
                )}
              </div>
            ) : null,
          )}
        </div>
      )}
      {text(ctx["Reasoning"]) && (
        <p
          className="max-h-56 overflow-y-auto whitespace-pre-wrap text-sm leading-7 text-muted-foreground"
          dir="auto"
        >
          {text(ctx["Reasoning"])}
        </p>
      )}
    </>
  );
}

type Choice = Exclude<Answer["action"], "continue">;

export function PauseCard({
  pause,
  mode,
  onAnswer,
}: {
  pause: Pause;
  mode: Mode;
  onAnswer: (answer: Answer) => Promise<void>;
}) {
  const { lang } = useI18n();
  const c = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const choices = pause.allowed.filter((a): a is Choice => a !== "continue");
  const canContinue = pause.allowed.includes("continue");
  const [choice, setChoice] = useState<Choice | null>(canContinue ? null : (choices[0] ?? null));
  const [label, setLabel] = useState<Label | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(answer: Answer) {
    setBusy(true);
    setError("");
    try {
      await onAnswer(answer);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  const continueText: Record<Pause["point"], string> = {
    plan: c("متابعة بهذه الخطة", "Keep this plan"),
    disagree: "",
    nei: c("اتركه «معلومات غير كافية»", "Leave it as NEI"),
    verdict: c("اعتماد الحكم", "Confirm the verdict"),
  };
  const choiceText: Record<Choice, string> = {
    label:
      pause.point === "verdict"
        ? c("غيّر الحكم", "Change the label")
        : c("أعطِ الحكم", "Give the label"),
    feedback:
      pause.point === "plan"
        ? c("أعد التخطيط بملاحظتي", "Re-plan with my note")
        : c("جولة إضافية بملاحظتي", "One more round with my note"),
    comment: c("اعتماد مع تعليق", "Confirm with a comment"),
  };
  const placeholder: Record<Choice, string> = {
    label: c("السبب (مطلوب)", "Reason (required)"),
    feedback: c("ما الذي يجب أن يفعله الوكيل؟", "What should the agent do?"),
    comment: c("ملاحظتك للسجل", "Your note for the record"),
  };
  const ready = note.trim().length >= 3 && (choice !== "label" || label !== null);
  const title = PAUSE_TITLES[pause.point];

  return (
    <section
      aria-live="polite"
      className="rounded-2xl border-2 border-primary/40 bg-card p-4 shadow-lg shadow-primary/10 md:p-5"
    >
      <header className="mb-3 flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-full bg-primary-soft text-primary">
          <BellRing className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
            {c("نحتاج إلى قرارك", "Need your input")}
          </p>
          <h3 className="text-base font-semibold">{lang === "ar" ? title.ar : title.en}</h3>
        </div>
      </header>

      <PauseContext pause={pause} />

      {choices.length > 0 && (
        <div role="radiogroup" className="my-3 flex flex-wrap gap-2">
          {choices.map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={choice === value}
              disabled={busy}
              onClick={() => setChoice(choice === value && canContinue ? null : value)}
              className={cn(
                "rounded-xl border px-3 py-2 text-start text-sm font-medium transition",
                choice === value ? "border-primary bg-primary-soft" : "hover:border-primary/50",
              )}
            >
              {choiceText[value]}
            </button>
          ))}
        </div>
      )}
      {pause.point === "nei" && !pause.allowed.includes("feedback") && (
        <p className="mb-2 text-xs text-muted-foreground">
          {c(
            "الجولة الإضافية متاحة مرة واحدة لكل ادعاء، وقد استُخدمت.",
            "The extra round is allowed once per claim and has been used.",
          )}
        </p>
      )}

      {choice === "label" && <LabelPicker value={label} onChange={setLabel} />}
      {choice && (
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={busy}
          dir="auto"
          placeholder={placeholder[choice]}
          className="mt-3 min-h-20 bg-background"
        />
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {choice ? (
          <Button
            disabled={busy || !ready}
            onClick={() =>
              void send(
                choice === "label" && label
                  ? { action: "label", label, reason: note.trim() }
                  : { action: choice, text: note.trim() },
              )
            }
          >
            {c("إرسال", "Submit")}
          </Button>
        ) : (
          canContinue && (
            <Button disabled={busy} onClick={() => void send({ action: "continue" })}>
              {continueText[pause.point]}
            </Button>
          )
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <footer className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
        <span>
          {c("الوضع:", "Mode:")}{" "}
          <strong className="text-foreground">
            {lang === "ar" ? MODE_NAMES[mode].ar : MODE_NAMES[mode].en}
          </strong>
        </span>
        {mode !== "auto" && canContinue && (
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            disabled={busy}
            onClick={() => void send({ action: "continue", mode: "auto" })}
          >
            {c(
              "تابع، وأكمل هذا الادعاء دون توقف",
              "Continue, and finish this claim without pauses",
            )}
          </button>
        )}
      </footer>
    </section>
  );
}
