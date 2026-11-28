import { Check, LoaderCircle, Quote } from "lucide-react";
import { useEffect, useState } from "react";
import { VerdictBadge } from "@/components/verdict-badge";
import { cn } from "@/lib/utils";

type Example = { claim: string; verdict: "false" | "misleading" | "true" };

/** The hero's "claim being checked" card: types an example claim, ticks through the four
 * steps, shows the verdict, then moves to the next example. Static with reduced motion. */
export function ClaimCard({ ar }: { ar: boolean }) {
  const examples: Example[] = ar
    ? [
        { claim: "صورة تُظهر انهيار جسر الملك فهد هذا الأسبوع", verdict: "false" },
        { claim: "فيديو قديم يُنشر على أنه من احتجاجات اليوم", verdict: "misleading" },
        { claim: "وزارة الصحة تعلن حملة تطعيم وطنية جديدة", verdict: "true" },
      ]
    : [
        { claim: "A photo shows the King Fahd Causeway collapsing this week", verdict: "false" },
        { claim: "An old video shared as footage from today's protests", verdict: "misleading" },
        {
          claim: "The health ministry announces a new national vaccination drive",
          verdict: "true",
        },
      ];
  const steps = ar
    ? ["الخطة", "الأدلة", "التحليل", "الحكم"]
    : ["Plan", "Evidence", "Analysis", "Verdict"];

  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState(0);
  const [done, setDone] = useState(0);
  const example = examples[index % examples.length]!;

  useEffect(() => {
    const text = example.claim;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const next = () => setIndex((i) => (i + 1) % examples.length);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTyped(text.length);
      setDone(steps.length);
      timers.push(setTimeout(next, 7000));
      return () => timers.forEach(clearTimeout);
    }
    setTyped(0);
    setDone(0);
    for (let c = 1; c <= text.length; c++) timers.push(setTimeout(() => setTyped(c), c * 42));
    const typedAt = text.length * 42 + 350;
    for (let s = 1; s <= steps.length; s++) {
      timers.push(setTimeout(() => setDone(s), typedAt + s * 520));
    }
    timers.push(setTimeout(next, typedAt + steps.length * 520 + 2800));
    return () => timers.forEach(clearTimeout);
    // examples/steps are rebuilt each render; the language and index are what matter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, ar]);

  return (
    <div className="w-full max-w-md rounded-3xl border border-white/15 bg-[#1c1c21]/85 p-5 shadow-2xl backdrop-blur-md sm:p-6">
      <div className="flex items-center justify-between text-xs text-white/55">
        <span className="flex items-center gap-2">
          <span className="size-1.5 animate-pulse rounded-full bg-primary" />
          {ar ? "ادعاء قيد الفحص" : "Claim under review"}
        </span>
        <span className="tabular-nums" dir="ltr">
          {(index % examples.length) + 1} / {examples.length}
        </span>
      </div>
      <div className="mt-4 flex gap-3 rounded-2xl bg-black/25 p-4">
        <Quote className="size-4 shrink-0 text-primary" />
        <p className="min-h-14 text-sm leading-7 text-white" dir="auto">
          {example.claim.slice(0, typed)}
          {typed < example.claim.length && (
            <span className="animate-caret ms-0.5 inline-block h-4 w-px translate-y-0.5 bg-white" />
          )}
        </p>
      </div>
      <ol className="mt-4 grid grid-cols-4 gap-2">
        {steps.map((label, s) => {
          const state =
            done > s ? "done" : done === s && typed >= example.claim.length ? "now" : "wait";
          return (
            <li key={s} className="flex flex-col items-center gap-1.5 text-[11px]">
              <span
                className={cn(
                  "grid size-7 place-items-center rounded-full transition-colors duration-500",
                  state === "done" ? "bg-primary text-white" : "bg-white/10 text-white/45",
                )}
              >
                {state === "done" ? (
                  <Check className="size-3.5" />
                ) : state === "now" ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                  <span className="size-1 rounded-full bg-current" />
                )}
              </span>
              <span
                className={cn(
                  "transition-colors duration-500",
                  state === "done" ? "text-white" : "text-white/45",
                )}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="mt-5 flex h-7 items-center justify-between border-t border-white/10 pt-4">
        <span className="text-xs text-white/55">{ar ? "الحكم" : "Verdict"}</span>
        <span
          className={cn(
            "transition-all duration-500",
            done >= steps.length ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
          )}
        >
          <VerdictBadge verdict={example.verdict} />
        </span>
      </div>
    </div>
  );
}
