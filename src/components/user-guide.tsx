import type { ReactNode } from "react";
import {
  ArrowUp,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Loader2,
  PauseCircle,
  Plus,
  Wrench,
  X,
} from "lucide-react";
import { Reveal } from "@/components/motion";
import { VerdictBadge } from "@/components/verdict-badge";
import { useI18n } from "@/lib/i18n";
import { MODE_NAMES, PHASE_STEP_NAMES, TOOL_NAMES } from "@/lib/factcheck/names";
import { MODES, SWITCHABLE_TOOLS, TOOLS } from "@/lib/factcheck/types";
import { cn } from "@/lib/utils";

/** A guide for the people using the fact-checker: each step beside a picture of the screen
 * it happens on. The pictures are drawn from the app's own names (tools, modes, phases), so
 * they match the real screen in both languages; they are pictures, not working controls. */

export function UserGuide() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const c = (arabic: string, english: string) => (ar ? arabic : english);

  const steps: { where: string; title: string; body: ReactNode; photo: ReactNode }[] = [
    {
      where: c("مساحة العمل ← فحص جديد", "Workspace → New fact-check"),
      title: c("اكتب الادعاء أو أدرج صورة", "Write the claim or insert an image"),
      body: (
        <>
          <p>
            {c(
              "الصق الادعاء كما ورد تماماً، نصاً أو رابطاً. لإضافة صورة اضغط + ثم «إرفاق صورة»، أو الصقها مباشرة في الصندوق.",
              "Paste the claim exactly as it appeared, as text or a link. To add an image press + and then Attach image, or paste it straight into the box.",
            )}
          </p>
          <Note>
            {c(
              "صور PNG أو JPG أو WebP حتى 5 ميغابايت. يمكنك إرسال صورة وحدها دون نص.",
              "PNG, JPG or WebP images up to 5 MB. You can send an image on its own, without text.",
            )}
          </Note>
        </>
      ),
      photo: <ComposerPhoto c={c} lang={lang} showImage showAddMenu />,
    },
    {
      where: c("زر «تاريخ الادعاء»", "The Claim date button"),
      title: c("أضف تاريخ الادعاء", "Add the claim's date"),
      body: (
        <>
          <p>
            {c(
              "إن كنت تعرف متى نُشر الادعاء، اختر التاريخ من زر التقويم بجانب +. يفحص الذكاء الاصطناعي الادعاء كما كان في ذلك اليوم، ولا يستخدم إلا المصادر المنشورة قبله.",
              "If you know when the claim was published, pick the date from the calendar button next to +. The AI then checks it as of that day and only uses sources published before it.",
            )}
          </p>
          <Note>
            {c(
              "التاريخ اختياري. لا يمكن اختيار تاريخ في المستقبل، وزر × يزيله.",
              "The date is optional. Future dates can't be picked, and × clears it.",
            )}
          </Note>
        </>
      ),
      photo: <DatePhoto c={c} ar={ar} />,
    },
    {
      where: c("+ ← الأدوات", "+ → Tools"),
      title: c("اختر الأدوات", "Choose the tools"),
      body: (
        <>
          <p>
            {c(
              "يختار المخطط من الأدوات المفعّلة ما يناسب الادعاء. بحث الويب والبحث العكسي عن الصور يعملان دائماً، ويمكنك إيقاف البقية إن لم تحتجها.",
              "The planner picks what fits the claim from the tools that are on. Web search and reverse image search are always on; you can switch the others off if you don't need them.",
            )}
          </p>
          <Note>
            {c(
              "تحديد الموقع يقدّم مواقع محتملة لا إحداثيات مؤكدة، وكشف التلاعب تقييم بصري لا شهادة جنائية.",
              "Geolocation gives likely places, not confirmed coordinates, and manipulation detection is a visual assessment, not forensic certification.",
            )}
          </Note>
        </>
      ),
      photo: <ToolsPhoto c={c} lang={lang} />,
    },
    {
      where: c("القائمة بجانب زر الإرسال", "The menu next to Send"),
      title: c("حدّد مقدار تحكّمك", "Decide how much control you keep"),
      body: (
        <>
          <p>
            {c(
              "اختر قبل الإرسال متى يتوقف الفحص لينتظر قرارك:",
              "Before sending, choose when the check stops to wait for your decision:",
            )}
          </p>
          <ul className="mt-4 divide-y divide-border border-y border-border">
            {(
              [
                ["supervised", c("تحكّم كامل", "Full control")],
                ["disagreement", c("تحكّم جزئي", "Half control")],
                ["verdict", c("مراجعة كل حكم", "Review every verdict")],
                ["auto", c("دون توقف", "No pauses")],
              ] as const
            ).map(([m, level]) => (
              <li key={m} className="py-3">
                <span className="font-display font-bold">{level}</span>
                <span className="text-ink/60"> · {ar ? MODE_NAMES[m].ar : MODE_NAMES[m].en}</span>
                <span className="mt-1 block text-sm leading-6">
                  {ar ? MODE_NAMES[m].hintAr : MODE_NAMES[m].hintEn}
                </span>
              </li>
            ))}
          </ul>
        </>
      ),
      photo: <ModesPhoto c={c} lang={lang} />,
    },
    {
      where: c("أثناء الفحص", "While it runs"),
      title: c("المدقق الآلي والمراجع الآلي", "The AI checker and the AI Reviewer"),
      body: (
        <>
          <p>
            {c(
              "يعمل نموذجان معاً: المدقق الآلي يخطط ويبحث عن الأدلة ويحللها ويقترح حكماً، والمراجع الآلي يراجع كل خطوة كما يفعل المحرر ويعلّق على التقرير.",
              "Two models work together: the AI checker plans, searches for evidence, analyses it and proposes a verdict; the AI Reviewer checks every step the way an editor would and comments on the report.",
            )}
          </p>
          <Note>
            {c(
              "يمكنك مغادرة الصفحة؛ تجد الفحص لاحقاً في «الجلسات السابقة».",
              "You can leave the page; you'll find the check later under Previous sessions.",
            )}
          </Note>
        </>
      ),
      photo: <ProgressPhoto c={c} lang={lang} />,
    },
    {
      where: c("بطاقة «نحتاج إلى قرارك»", "The “Need your input” card"),
      title: c("أجب عندما يحتاجك", "Answer when it needs you"),
      body: (
        <p>
          {c(
            "عندما يتوقف الفحص ترى رأي المدقق الآلي والمراجع الآلي وأسبابهما. اعتمد الحكم، أو غيّره مع ذكر السبب، أو اطلب جولة بحث إضافية بملاحظتك. القرار النهائي دائماً لك.",
            "When the check pauses you see what the AI checker and the AI Reviewer think, and why. Confirm the verdict, change it with a reason, or ask for one more round of research with your note. The final say is always yours.",
          )}
        </p>
      ),
      photo: <PausePhoto c={c} />,
    },
    {
      where: c("الحكم النهائي ← المراجعة", "Final verdict → Review"),
      title: c("اقرأ الحكم واحفظ التقرير", "Read the verdict and save the report"),
      body: (
        <p>
          {c(
            "يصدر الحكم بأحد تصنيفات فتبينوا. افتح «المراجعة» لقراءة التقرير وملاحظات المراجع، ثم نزّله بصيغة PDF أو Markdown، واحفظه مسودة خاصة أو انشره للفريق.",
            "The verdict uses one of Fatabyyano's labels. Open Review to read the report and the Reviewer's notes, then download it as PDF or Markdown and keep it as a private draft or publish it to the team.",
          )}
        </p>
      ),
      photo: <VerdictPhoto c={c} />,
    },
  ];

  return (
    <div className="space-y-20 lg:space-y-28">
      {steps.map((s, i) => (
        <div key={i} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal className={cn(i % 2 === 1 && "lg:order-2")}>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink/60">{s.where}</p>
            <h3 className="mt-3 text-3xl leading-tight">{s.title}</h3>
            <div className="mt-4 max-w-lg text-base leading-8">{s.body}</div>
          </Reveal>
          <Reveal delay={120}>
            <Photo label={c("فحص بالذكاء الاصطناعي", "AI fact-check")}>{s.photo}</Photo>
          </Reveal>
        </div>
      ))}
    </div>
  );
}

type Copy = (arabic: string, english: string) => string;

function Note({ children }: { children: ReactNode }) {
  return <p className="mt-4 border-s-2 border-primary ps-4 text-sm leading-7 text-ink/75">{children}</p>;
}

/** A screen picture: a window frame with the app's look; not interactive. */
function Photo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure
      aria-hidden="true"
      className="pointer-events-none select-none overflow-hidden rounded-2xl border border-border bg-background shadow-[0_24px_60px_-30px_rgba(23,23,27,0.45)]"
    >
      <div className="flex items-center justify-between border-b border-border bg-white px-4 py-2.5">
        <span className="text-xs font-semibold text-ink/70">{label}</span>
        <span className="h-2 w-16 rounded-full bg-border" />
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </figure>
  );
}

function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-2xl border bg-card p-4 shadow-sm", className)}>{children}</div>;
}

function Highlight({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("rounded-full ring-2 ring-primary ring-offset-2 ring-offset-card", className)}>
      {children}
    </span>
  );
}

function ComposerBar({
  c,
  lang,
  date,
  highlightDate,
  highlightMode,
}: {
  c: Copy;
  lang: string;
  date?: string;
  highlightDate?: boolean;
  highlightMode?: boolean;
}) {
  const datePill = (
    <span
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs",
        date ? "border-ink/25 bg-muted text-ink" : "border-transparent text-muted-foreground",
      )}
    >
      <CalendarDays className="size-3.5 text-ink" />
      {date ?? c("تاريخ الادعاء", "Claim date")}
      {date && <X className="size-3 text-muted-foreground" />}
    </span>
  );
  const modePill = (
    <span className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-xs text-ink">
      {lang === "ar" ? MODE_NAMES.disagreement.ar : MODE_NAMES.disagreement.en}
      <ChevronDown className="size-3.5 opacity-60" />
    </span>
  );
  return (
    <div className="flex items-center gap-1.5">
      <span className="grid size-8 place-items-center rounded-full text-ink">
        <Plus className="size-4" />
      </span>
      {highlightDate ? <Highlight>{datePill}</Highlight> : datePill}
      <span className="ms-auto flex items-center gap-1.5">
        {highlightMode ? <Highlight>{modePill}</Highlight> : modePill}
        <span className="grid size-8 place-items-center rounded-full bg-primary text-white">
          <ArrowUp className="size-4" />
        </span>
      </span>
    </div>
  );
}

function ClaimText({ c }: { c: Copy }) {
  return (
    <p className="px-1 pb-3 text-sm leading-6 text-ink">
      {c(
        "صورة متداولة تُظهر فيضاناً في وسط المدينة أمس…",
        "A widely shared photo shows the city centre flooded yesterday…",
      )}
    </p>
  );
}

function ComposerPhoto({
  c,
  lang,
  showImage,
  showAddMenu,
}: {
  c: Copy;
  lang: string;
  showImage?: boolean;
  showAddMenu?: boolean;
}) {
  return (
    <div className="relative">
      <Card className="rounded-3xl">
        {showImage && (
          <div className="mb-3 flex items-center gap-3">
            <Highlight className="rounded-xl">
              <span className="relative block size-14 overflow-hidden rounded-xl bg-[linear-gradient(160deg,#8fb3d9_0%,#5d7fa6_45%,#3d4f63_46%,#6b7d8f_100%)]">
                <span className="absolute inset-x-0 bottom-0 h-4 bg-[#4a6b8a]/80" />
              </span>
            </Highlight>
            <span className="text-xs text-muted-foreground">flood-photo.jpg</span>
          </div>
        )}
        <ClaimText c={c} />
        <ComposerBar c={c} lang={lang} />
      </Card>
      {showAddMenu && (
        <div className="relative z-10 -mt-2 ms-2 w-52 rounded-xl border bg-popover p-1 text-sm shadow-lg">
          <span className="flex items-center gap-2 rounded-md bg-accent px-2 py-1.5 text-ink">
            <ImagePlus className="size-4 text-ink" />
            {c("إرفاق صورة", "Attach image")}
          </span>
          <span className="flex items-center gap-2 px-2 py-1.5 text-ink">
            <Wrench className="size-4 text-ink" />
            {c("الأدوات", "Tools")}
            <span className="ms-auto text-xs text-muted-foreground">4/5</span>
          </span>
        </div>
      )}
    </div>
  );
}

function DatePhoto({ c, ar }: { c: Copy; ar: boolean }) {
  const days = Array.from({ length: 28 }, (_, i) => i + 1);
  return (
    <div>
      <Card className="rounded-3xl">
        <ClaimText c={c} />
        <ComposerBar c={c} lang={ar ? "ar" : "en"} date={c("21 فبراير 2025", "21 Feb 2025")} highlightDate />
      </Card>
      <Card className="mt-3 w-64 p-3">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-ink">
          <ChevronLeft className="size-4 rtl:rotate-180" />
          {c("فبراير 2025", "February 2025")}
          <ChevronRight className="size-4 rtl:rotate-180" />
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
          {days.map((d) => (
            <span
              key={d}
              className={cn(
                "rounded-md py-1 tabular-nums",
                d === 21 ? "bg-primary font-bold text-white" : "text-ink/75",
              )}
            >
              {d}
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ToolsPhoto({ c, lang }: { c: Copy; lang: string }) {
  return (
    <Card className="p-2">
      <p className="px-2 pb-2 pt-1 text-xs text-muted-foreground">
        {c("المخطط يختار منها ما يناسب الادعاء", "The planner picks what fits the claim")}
      </p>
      {TOOLS.map((tool) => {
        const fixed = !SWITCHABLE_TOOLS.includes(tool);
        const on = tool !== "geolocation";
        return (
          <div
            key={tool}
            className={cn("flex items-start gap-3 rounded-lg px-2 py-2", fixed && "opacity-60")}
          >
            <span
              className={cn(
                "mt-0.5 grid size-4 shrink-0 place-items-center rounded border",
                on ? "border-ink bg-ink text-white" : "border-ink/40",
              )}
            >
              {on && <Check className="size-3" />}
            </span>
            <span className="flex flex-col">
              <span className="text-sm text-ink">
                {lang === "ar" ? TOOL_NAMES[tool].ar : TOOL_NAMES[tool].en}
                {fixed && (
                  <span className="ms-2 text-[11px] text-muted-foreground">
                    {c("يعمل دائماً", "always on")}
                  </span>
                )}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {lang === "ar" ? TOOL_NAMES[tool].hintAr : TOOL_NAMES[tool].hintEn}
              </span>
            </span>
          </div>
        );
      })}
    </Card>
  );
}

function ModesPhoto({ c, lang }: { c: Copy; lang: string }) {
  return (
    <div>
      <Card className="rounded-3xl">
        <ClaimText c={c} />
        <ComposerBar c={c} lang={lang} highlightMode />
      </Card>
      <Card className="ms-auto mt-3 w-full max-w-sm p-1">
        <p className="px-3 pb-1 pt-2 text-xs text-muted-foreground">
          {c("وضع المراجعة البشرية", "Human review mode")}
        </p>
        {MODES.map((m) => (
          <div
            key={m}
            className={cn("flex items-start gap-2 rounded-lg px-3 py-2", m === "disagreement" && "bg-accent")}
          >
            <Check className={cn("mt-0.5 size-4 shrink-0 text-ink", m !== "disagreement" && "invisible")} />
            <span className="flex flex-col">
              <span className="text-sm font-medium text-ink">
                {lang === "ar" ? MODE_NAMES[m].ar : MODE_NAMES[m].en}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {lang === "ar" ? MODE_NAMES[m].hintAr : MODE_NAMES[m].hintEn}
              </span>
            </span>
          </div>
        ))}
      </Card>
    </div>
  );
}

function ProgressPhoto({ c, lang }: { c: Copy; lang: string }) {
  const phases = ["planning", "gathering_evidence", "analysing", "reviewing", "finalizing"] as const;
  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Loader2 className="size-4 text-ink" />
          {c("يراجع المراجع…", "The Reviewer is checking…")}
        </div>
        <ul className="mt-3 space-y-1.5 text-sm">
          {phases.map((p, i) => (
            <li key={p} className={cn("flex items-center gap-2", i > 3 && "text-muted-foreground")}>
              {i < 3 ? (
                <Check className="size-4 text-verdict-true" />
              ) : i === 3 ? (
                <Loader2 className="size-4 text-ink" />
              ) : (
                <span className="size-4" />
              )}
              <span className={cn(i < 3 && "text-ink/70")}>
                {lang === "ar" ? PHASE_STEP_NAMES[p].ar : PHASE_STEP_NAMES[p].en}
              </span>
              <span className="ms-auto text-[11px] font-semibold text-muted-foreground">
                {i < 3 ? c("المدقق الآلي", "AI checker") : i === 3 ? c("المراجع الآلي", "AI Reviewer") : ""}
              </span>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="border-s-4 border-s-ink">
        <p className="text-xs font-semibold text-ink">{c("المراجع", "Reviewer")}</p>
        <p className="mt-1 text-sm leading-6 text-ink/80">
          {c(
            "المصدر الثاني أقدم من الحدث بعامين؛ الصورة على الأرجح من فيضان سابق.",
            "The second source predates the event by two years; the photo is likely from an earlier flood.",
          )}
        </p>
      </Card>
    </div>
  );
}

function PausePhoto({ c }: { c: Copy }) {
  return (
    <Card className="border-primary/40">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
        <PauseCircle className="size-4 text-ink" />
        {c("نحتاج إلى قرارك", "Need your input")}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {c("الوكيل والمراجع مختلفان", "The agent and the Reviewer disagree")}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl border p-3">
          <p className="text-xs text-muted-foreground">{c("المدقق الآلي", "AI checker")}</p>
          <VerdictBadge verdict="false" className="mt-1.5" />
        </div>
        <div className="rounded-xl border p-3">
          <p className="text-xs text-muted-foreground">{c("المراجع الآلي", "AI Reviewer")}</p>
          <VerdictBadge verdict="missing_context" className="mt-1.5" />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
        <span className="rounded-full bg-ink px-3 py-1.5 text-white">{c("اعتماد الحكم", "Confirm the verdict")}</span>
        <span className="rounded-full border px-3 py-1.5 text-ink">{c("غيّر الحكم", "Change the label")}</span>
        <span className="rounded-full border px-3 py-1.5 text-ink">
          {c("جولة إضافية بملاحظتي", "One more round with my note")}
        </span>
      </div>
    </Card>
  );
}

function VerdictPhoto({ c }: { c: Copy }) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-ink">{c("الحكم النهائي", "Final verdict")}</span>
        <span className="rounded-full border px-3 py-1 text-xs font-semibold text-ink">{c("المراجعة", "Review")}</span>
      </div>
      <VerdictBadge verdict="missing_context" className="mt-3 px-3 py-1 text-sm" />
      <p className="mt-3 text-sm text-muted-foreground">{c("قرره المدقق", "Decided by the fact-checker")}</p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
        <span className="rounded-full bg-primary px-3 py-1.5 text-white">PDF</span>
        <span className="rounded-full border px-3 py-1.5 text-ink">Markdown</span>
        <span className="rounded-full border px-3 py-1.5 text-ink">{c("مسودة خاصة", "Private draft")}</span>
        <span className="rounded-full border px-3 py-1.5 text-ink">{c("نشر للفريق", "Publish to team")}</span>
      </div>
    </Card>
  );
}
