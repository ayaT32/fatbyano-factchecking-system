import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** The workflow as phases on one line, the way established fact-checkers present their
 * method (Full Fact: choose, check, then follow up; AFP: open enough that a reader could
 * retrace it) in the common "how it works" stepper style: the phases sit on a connector line
 * and the selected one opens below. No numbers or icons, to match the rest of the site. */

type Who = "fc" | "agent" | "reviewer" | "management";

export function WorkflowPhases() {
  const { lang } = useI18n();
  const c = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const [active, setActive] = useState(0);

  const who: Record<Who, string> = {
    fc: c("المدقق", "Fact-checker"),
    agent: c("وكيل الذكاء الاصطناعي", "AI agent"),
    reviewer: c("المراجع", "Reviewer"),
    management: c("الإدارة", "Management"),
  };

  const phases: { name: string; lead: string; steps: string[]; by: Who[] }[] = [
    {
      name: c("الاختيار", "Choose"),
      lead: c(
        "نبدأ بادعاء يستحق الفحص: منتشر، وقد يضر، وقابل للتحقق، لا مجرد رأي.",
        "It starts with a claim worth checking: spreading, potentially harmful, and checkable rather than an opinion.",
      ),
      steps: [
        c("الصق النص أو الرابط كما ورد، أو أرفق الصورة.", "Paste the text or link as it appeared, or attach the image."),
        c("أضف تاريخ الادعاء إن كان معروفاً.", "Add the claim's date if you know it."),
        c("اختر الأدوات ومتى يتوقف الفحص لينتظرك.", "Choose the tools and when the check should stop for you."),
      ],
      by: ["fc"],
    },
    {
      name: c("البحث", "Research"),
      lead: c(
        "يقسّم الوكيل الادعاء إلى أجزاء، ويبحث عن الأدلة لكل جزء.",
        "The agent breaks the claim into parts and looks for evidence on each.",
      ),
      steps: [
        c("بحث في الويب، وبحث عكسي عن الصور.", "Web search and reverse image search."),
        c("كشف التلاعب، وقراءة بيانات الصورة، وتحديد الموقع.", "Manipulation checks, image metadata and geolocation."),
        c("يُحتفظ بأقوى المصادر مع درجة موثوقيتها.", "The strongest sources are kept, each with a credibility score."),
      ],
      by: ["agent"],
    },
    {
      name: c("المراجعة", "Review"),
      lead: c(
        "نموذج ثانٍ يراجع العمل كما يفعل المحرر قبل أي حكم.",
        "A second model checks the work the way an editor would, before any verdict.",
      ),
      steps: [
        c("يراجع الخطة والأدلة والتحليل خطوة بخطوة.", "Checks the plan, the evidence and the analysis step by step."),
        c("يعلّق على مسودة التقرير.", "Comments on the draft report."),
        c("يقارن حكمه بحكم الوكيل.", "Compares its verdict with the agent's."),
      ],
      by: ["agent", "reviewer"],
    },
    {
      name: c("القرار", "Decide"),
      lead: c(
        "القرار النهائي دائماً للمدقق، خاصة إذا اختلفا أو لم تكفِ المعلومات.",
        "The fact-checker always has the final say, above all when they disagree or the information isn't enough.",
      ),
      steps: [
        c("اعتمد الحكم، أو غيّره مع ذكر السبب.", "Confirm the verdict, or change it with a reason."),
        c("أو اطلب جولة بحث إضافية بملاحظتك.", "Or ask for one more round of research with your note."),
        c("يُعطى الادعاء أحد تصنيفات فتبينوا.", "The claim gets one of Fatabyyano's labels."),
      ],
      by: ["fc"],
    },
    {
      name: c("النشر والمتابعة", "Publish & follow up"),
      lead: c(
        "لا ينتهي العمل بالحكم: يُحفظ التقرير ويُتابَع.",
        "The work doesn't end at the verdict: the report is kept and followed up.",
      ),
      steps: [
        c("احفظه مسودة خاصة أو انشره لقاعدة بيانات الفريق.", "Keep it as a private draft or publish it to the team database."),
        c("نزّله بصيغة PDF أو Markdown.", "Download it as PDF or Markdown."),
        c("تراجع الإدارة الادعاءات والتقارير وتتابع عمل الفريق.", "Management reviews claims and reports and follows the team's work."),
      ],
      by: ["fc", "management"],
    },
  ];

  const phase = phases[active] ?? phases[0]!;

  return (
    <div>
      {/* The phases on one connector line (a scrollable row on small screens) */}
      <div className="relative -mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0">
        <div role="tablist" aria-label={c("مراحل العمل", "Workflow phases")} className="relative flex min-w-[640px]">
          {/* The line runs between the first and last markers (the centres of the outer
              columns); the pink part grows up to the open phase */}
          <span
            aria-hidden="true"
            className="absolute top-[22px] h-0.5 bg-ink/15"
            style={{ insetInline: `${50 / phases.length}%` }}
          />
          <span
            aria-hidden="true"
            className="absolute top-[22px] h-0.5 bg-primary transition-[width] duration-500 ease-out motion-reduce:transition-none"
            style={{
              insetInlineStart: `${50 / phases.length}%`,
              width: `${(active / (phases.length - 1)) * (100 - 100 / phases.length)}%`,
            }}
          />
          {phases.map((p, i) => (
            <button
              key={p.name}
              type="button"
              role="tab"
              id={`phase-tab-${i}`}
              aria-selected={i === active}
              aria-controls="phase-panel"
              onClick={() => setActive(i)}
              className="group relative flex flex-1 flex-col items-center gap-3 px-2 text-center focus-visible:outline-none"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "mt-[15px] h-4 w-10 rounded-full border-2 transition-colors duration-300",
                  i < active && "border-primary bg-primary",
                  i === active && "border-primary bg-white",
                  i > active && "border-ink/25 bg-white group-hover:border-ink/60",
                )}
              />
              <span
                className={cn(
                  "font-display text-base font-bold transition-colors group-focus-visible:underline",
                  i === active ? "text-ink" : "text-ink/55 group-hover:text-ink",
                )}
              >
                {p.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* The open phase */}
      <div
        id="phase-panel"
        role="tabpanel"
        aria-labelledby={`phase-tab-${active}`}
        key={active}
        className="animate-[page-in_0.4s_ease-out] mt-8 grid gap-8 rounded-3xl border border-border bg-white p-6 sm:p-8 lg:grid-cols-[1fr_1.2fr] motion-reduce:animate-none"
      >
        <div>
          <h3 className="text-3xl">{phase.name}</h3>
          <p className="mt-3 text-base leading-8">{phase.lead}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {phase.by.map((w) => (
              <span
                key={w}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  w === "fc" || w === "management"
                    ? "bg-primary text-white"
                    : w === "reviewer"
                      ? "bg-ink text-white"
                      : "border border-ink/25 text-ink",
                )}
              >
                {who[w]}
              </span>
            ))}
          </div>
        </div>
        <ul className="divide-y divide-border border-y border-border">
          {phase.steps.map((s) => (
            <li key={s} className="py-4 text-base leading-7">
              {s}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-2xl text-sm leading-7 text-ink/70">
          {c(
            "كل بحث ومصدر وقرار يُحفظ في الأرشيف، فيستطيع أي عضو في الفريق إعادة تتبّع الفحص من بدايته.",
            "Every search, source and decision is saved in the archive, so anyone on the team can retrace a check from the start.",
          )}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActive((a) => Math.max(0, a - 1))}
            disabled={active === 0}
            className="h-10 rounded-full border border-ink/20 px-4 text-sm font-semibold text-ink transition hover:border-ink disabled:opacity-40"
          >
            {c("السابق", "Previous")}
          </button>
          <button
            type="button"
            onClick={() => setActive((a) => Math.min(phases.length - 1, a + 1))}
            disabled={active === phases.length - 1}
            className="h-10 rounded-full bg-ink px-4 text-sm font-semibold text-white transition hover:bg-ink/85 disabled:opacity-40"
          >
            {c("التالي", "Next")}
          </button>
        </div>
      </div>
    </div>
  );
}
