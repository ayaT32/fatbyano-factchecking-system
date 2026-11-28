import { useState } from "react";
import { BellRing, Bot, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VerdictBadge } from "@/components/verdict-badge";
import { cn } from "@/lib/utils";
import { useI18n, type TKey } from "@/lib/i18n";
import { MODE_NAMES } from "@/lib/factcheck/names";
import {
  LABELS,
  MODES,
  type Answer,
  type Label,
  type Mode,
  type Pause,
} from "@/lib/factcheck/types";

type Props = {
  pause: Pause;
  mode: Mode;
  onAnswer: (answer: Answer) => Promise<void>;
  onModeChange: (mode: Mode) => Promise<void>;
};

/** Typed "/auto", "/disagreement" or "/supervised" changes the mode for the rest of the claim. */
function parseModeCommand(text: string): Mode | null {
  const m = text
    .trim()
    .toLowerCase()
    .match(/^\/(\w+)$/);
  return m && (MODES as readonly string[]).includes(m[1] ?? "") ? (m[1] as Mode) : null;
}

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

export function PauseCard({ pause, mode, onAnswer, onModeChange }: Props) {
  const { lang } = useI18n();
  const c = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const [text, setText] = useState("");
  const [label, setLabel] = useState<Label | null>(null);
  const [neiChoice, setNeiChoice] = useState<"label" | "feedback" | "leave">("label");
  const [busy, setBusy] = useState(false);

  async function send(answer: Answer) {
    setBusy(true);
    try {
      await onAnswer(answer);
    } finally {
      setBusy(false);
    }
  }

  async function changeModeFromText() {
    const next = parseModeCommand(text);
    if (!next) return false;
    await onModeChange(next);
    setText("");
    return true;
  }

  const titles = {
    plan: c("راجع الخطة قبل التنفيذ", "Check the plan before it runs"),
    disagree: c("الوكيل والمراجع مختلفان", "The agent and the Reviewer disagree"),
    nei: c("لا توجد نتيجة تلقائية", "No automatic conclusion"),
  };
  const reasonOk = text.trim().length >= 3;

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
          <h3 className="text-base font-semibold">{titles[pause.kind]}</h3>
        </div>
      </header>

      {pause.kind === "plan" && (
        <>
          <p className="text-sm leading-7 text-muted-foreground" dir="auto">
            {pause.reasoning}
          </p>
          <ol className="my-3 list-decimal space-y-1 ps-6 text-sm">
            {pause.actions.map((a) => (
              <li key={a} dir="auto">
                {a}
              </li>
            ))}
          </ol>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void (async () => {
                  if (await changeModeFromText()) return;
                  await send(
                    text.trim() ? { kind: "plan", feedback: text.trim() } : { kind: "plan" },
                  );
                })();
              }
            }}
            disabled={busy}
            dir="auto"
            placeholder={c(
              "Enter للمتابعة بهذه الخطة، أو اكتب ملاحظة ليعيد المخطط التخطيط بها…",
              "Press Enter to keep this plan, or type a note for the Planner to plan again…",
            )}
            className="min-h-20 bg-background"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => void send({ kind: "plan" })}>
              {c("متابعة بهذه الخطة", "Keep this plan")}
            </Button>
            <Button
              variant="outline"
              disabled={busy || !text.trim() || !!parseModeCommand(text)}
              onClick={() => void send({ kind: "plan", feedback: text.trim() })}
            >
              {c("أعد التخطيط بملاحظتي", "Re-plan with my note")}
            </Button>
          </div>
        </>
      )}

      {pause.kind === "disagree" && (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            {(
              [
                [c("الوكيل", "Agent"), pause.agent, Bot],
                [c("المراجع", "Reviewer"), pause.reviewer, Scale],
              ] as const
            ).map(([who, v, Icon]) => (
              <div key={who} className="rounded-xl border bg-background/60 p-3">
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Icon className="size-3.5" />
                  {who}
                  <VerdictBadge verdict={v.label} className="ms-auto" />
                </p>
                <p className="text-sm leading-6" dir="auto">
                  {v.reasoning}
                </p>
              </div>
            ))}
          </div>
          <p className="mb-2 mt-4 text-sm font-medium">
            {c("اختر الحكم النهائي", "Choose the final label")}
          </p>
          <LabelPicker value={label} onChange={setLabel} />
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={busy}
            dir="auto"
            placeholder={c("السبب (مطلوب)", "Reason (required)")}
            className="mt-3 min-h-20 bg-background"
          />
          <Button
            className="mt-3"
            disabled={busy || !label || !reasonOk}
            onClick={() => label && void send({ kind: "disagree", label, reason: text.trim() })}
          >
            {c("اعتماد الحكم", "Confirm label")}
          </Button>
        </>
      )}

      {pause.kind === "nei" && (
        <>
          <p className="text-sm leading-7 text-muted-foreground" dir="auto">
            {pause.reasoning}
          </p>
          <div role="radiogroup" className="my-3 grid gap-2 sm:grid-cols-3">
            {(
              [
                ["label", c("أعطِ الحكم", "Give the label"), true],
                [
                  "feedback",
                  c("جولة إضافية بملاحظتي", "One more round with my note"),
                  pause.feedbackAllowed,
                ],
                ["leave", c("اتركه «معلومات غير كافية»", "Leave it as NEI"), true],
              ] as const
            ).map(([value, name, enabled]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={neiChoice === value}
                disabled={!enabled}
                onClick={() => setNeiChoice(value)}
                className={cn(
                  "rounded-xl border p-3 text-start text-sm font-medium transition disabled:opacity-40",
                  neiChoice === value
                    ? "border-primary bg-primary-soft"
                    : "hover:border-primary/50",
                )}
              >
                {name}
              </button>
            ))}
          </div>
          {!pause.feedbackAllowed && (
            <p className="mb-2 text-xs text-muted-foreground">
              {c(
                "الجولة الإضافية متاحة مرة واحدة لكل ادعاء، وقد استُخدمت.",
                "The extra round is allowed once per claim and has been used.",
              )}
            </p>
          )}
          {neiChoice === "label" && <LabelPicker value={label} onChange={setLabel} />}
          {neiChoice !== "leave" && (
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={busy}
              dir="auto"
              placeholder={
                neiChoice === "label"
                  ? c("السبب (مطلوب)", "Reason (required)")
                  : c("ما الذي يجب أن يبحث عنه الوكيل؟", "What should the agent look for?")
              }
              className="mt-3 min-h-20 bg-background"
            />
          )}
          <Button
            className="mt-3"
            disabled={
              busy ||
              (neiChoice === "label" && (!label || !reasonOk)) ||
              (neiChoice === "feedback" && !reasonOk)
            }
            onClick={() =>
              void send(
                neiChoice === "label" && label
                  ? { kind: "nei", choice: "label", label, reason: text.trim() }
                  : neiChoice === "feedback"
                    ? { kind: "nei", choice: "feedback", feedback: text.trim() }
                    : { kind: "nei", choice: "leave" },
              )
            }
          >
            {c("إرسال", "Submit")}
          </Button>
        </>
      )}

      <footer className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
        <span>
          {c("الوضع:", "Mode:")}{" "}
          <strong className="text-foreground">
            {lang === "ar" ? MODE_NAMES[mode].ar : MODE_NAMES[mode].en}
          </strong>
        </span>
        {mode !== "auto" && (
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            disabled={busy}
            onClick={() => void onModeChange("auto")}
          >
            {c("أكمل هذا الادعاء دون توقف (/auto)", "Finish this claim without pauses (/auto)")}
          </button>
        )}
      </footer>
    </section>
  );
}
