import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { ClaimCard } from "@/components/claim-card";
import { Reveal } from "@/components/motion";
import { RowsSection, SiteFooter, SiteHeader, useCopy } from "@/components/site";
import { VerdictBadge } from "@/components/verdict-badge";
import { UserGuide } from "@/components/user-guide";
import { WorkflowPhases } from "@/components/workflow-phases";
import { MODE_NAMES } from "@/lib/factcheck/names";
import { useI18n } from "@/lib/i18n";
import { useMe } from "@/lib/session";

export const Route = createFileRoute("/how-it-works")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "How it works — Fatabyyano" },
      {
        name: "description",
        content:
          "How a claim moves through the Fatabyyano workspace: plan, evidence, analysis, review, the fact-checker's decision and the report.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: HowItWorksPage,
});

function HowItWorksPage() {
  const copy = useCopy();
  const { lang } = useI18n();
  const { data: me } = useMe();

  const steps = [
    {
      title: copy("أرسل الادعاء", "Submit the claim"),
      body: copy(
        "الصق النص أو الرابط، أو أرفق صورة. اختر طريقة العمل، وأوقف أي أداة لا تحتاجها لهذا الادعاء.",
        "Paste the text or a link, or attach an image. Choose the mode, and switch off any tool you don't need for this claim.",
      ),
    },
    {
      title: copy("الخطة", "Plan"),
      body: copy(
        "يقسّم الوكيل الادعاء إلى أجزاء قابلة للتحقق، ويخطط لما سيبحث عنه.",
        "The agent splits the claim into checkable parts and plans what to look for.",
      ),
    },
    {
      title: copy("جمع الأدلة", "Gather evidence"),
      body: copy(
        "بحث الويب والبحث العكسي عن الصور وتحديد الموقع وكشف التلاعب تجمع المصادر، ويُحتفظ بأقواها.",
        "Web search, reverse image search, geolocation and manipulation checks collect sources, and the strongest are kept.",
      ),
    },
    {
      title: copy("التحليل", "Analysis"),
      body: copy(
        "يُقارَن كل جزء بالأدلة، ويتكوّن حكم أولي.",
        "Each part is weighed against the evidence, and a draft verdict is formed.",
      ),
    },
    {
      title: copy("مراجعة المراجع", "The Reviewer checks"),
      body: copy(
        "يراجع نموذج ثانٍ كل خطوة، ويعلّق على مسودة التقرير كما يفعل المحرر.",
        "A second model reviews every step and comments on the draft report, the way an editor would.",
      ),
    },
    {
      title: copy("قرارك", "Your decision"),
      body: copy(
        "إذا اختلف الوكيل والمراجع، أو لم تكفِ المعلومات، يتوقف الفحص وينتظرك. القرار النهائي دائماً للمدقق.",
        "If the agent and the Reviewer disagree, or there isn't enough information, the check pauses for you. The fact-checker always has the final say.",
      ),
    },
    {
      title: copy("التقرير", "The report"),
      body: copy(
        "يصدر الحكم بتصنيفات فتبينوا. نزّل التقرير بصيغة PDF أو Markdown، واحفظه مسودة خاصة أو انشره للفريق.",
        "The verdict uses Fatabyyano's labels. Download the report as PDF or Markdown, and keep it as a private draft or publish it to the team.",
      ),
    },
  ];

  const modes = (["auto", "disagreement", "supervised"] as const).map((m) => ({
    title: lang === "ar" ? MODE_NAMES[m].ar : MODE_NAMES[m].en,
    body: lang === "ar" ? MODE_NAMES[m].hintAr : MODE_NAMES[m].hintEn,
  }));

  const labels = [
    ["false", copy("الادعاء غير صحيح.", "The claim is inaccurate.")],
    [
      "altered",
      copy(
        "صورة أو فيديو أو صوت جرى تعديله أو التلاعب به.",
        "An image, video or audio clip that was edited or manipulated.",
      ),
    ],
    [
      "misleading",
      copy("يخلط معلومات صحيحة بأخرى غير صحيحة.", "Mixes accurate and inaccurate information."),
    ],
    [
      "missing_context",
      copy(
        "صحيح، لكنه يُعرض دون سياق يغيّر معناه.",
        "Accurate, but shown without context that changes its meaning.",
      ),
    ],
    ["true", copy("دقيق وتدعمه الأدلة.", "Accurate and supported by evidence.")],
    [
      "satire",
      copy("محتوى ساخر قد يُفهم على أنه حقيقة.", "Humour or parody that may be taken as fact."),
    ],
    [
      "nei",
      copy(
        "لا تتوفر معلومات كافية؛ القرار للمدقق.",
        "Not enough information; a fact-checker decides.",
      ),
    ],
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        <section className="relative isolate -mb-14 overflow-hidden bg-ink pt-24 text-white [clip-path:polygon(0_0,100%_0,100%_calc(100%-56px),0_100%)]">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_80%_0%,rgba(197,70,153,0.3),transparent_40%),linear-gradient(125deg,#111114_20%,#242429_70%,#303034)]"
          />
          <div aria-hidden="true" className="hairline-grid absolute inset-0 -z-10" />
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-28 pt-20 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:pb-32 lg:pt-16">
            <Reveal>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">
                {copy("كيف يعمل", "How it works")}
              </p>
              <h1 className="mt-5 max-w-3xl text-balance text-5xl leading-[1.12] sm:text-6xl [html[lang=ar]_&]:leading-[1.4]">
                {copy("من ادعاء إلى تقرير موثّق", "From a claim to a verified report")}
                <span className="text-shine block">{copy("خطوة بخطوة.", "step by step.")}</span>
              </h1>
              <span
                aria-hidden="true"
                className="animate-grow mt-6 block h-1 w-28 origin-left rounded-full bg-gradient-to-r from-primary to-primary/0 rtl:origin-right rtl:bg-gradient-to-l"
              />
              <p className="mt-7 max-w-2xl text-base leading-8 text-white/75 sm:text-lg">
                {copy(
                  "يعمل وكيل الذكاء الاصطناعي ومراجعه معاً، وتبقى أنت صاحب القرار. هذا ما يحدث لكل ادعاء.",
                  "An AI agent and a Reviewer work together, and you stay in charge. This is what happens to every claim.",
                )}
              </p>
            </Reveal>
            {/* Canon, the AI fact-checker character, peeking out of the same live example as
              the front page (a claim typed in, the steps ticking through, then the verdict).
              He sits in a window that ends at the card's top edge: he rises out of the card
              once, then bobs gently (`.canon-rise` / `.canon-bob` in styles.css). */}
            <Reveal delay={150} className="flex justify-center lg:justify-end">
              <div className="w-full max-w-md">
                <div className="relative h-52 overflow-hidden sm:h-56">
                  <div className="canon-rise absolute inset-x-0 -bottom-1 flex justify-center">
                    <img
                      src="/images/canon.webp"
                      alt={copy(
                        "كانون، شخصية المدقق الآلي في فتبينوا",
                        "Canon, Fatabyyano's AI fact-checker character",
                      )}
                      width={320}
                      height={303}
                      className="canon-bob w-56 drop-shadow-[0_18px_28px_rgba(0,0,0,0.55)] sm:w-60"
                    />
                  </div>
                  <span className="absolute start-1 top-4 rounded-full border border-white/25 bg-black/40 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                    {copy("كانون · المدقق الآلي", "Canon · AI fact-checker")}
                  </span>
                </div>
                <div className="relative z-10 -mt-1">
                  <ClaimCard ar={lang === "ar"} />
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* The process as one continuous line, no dots or numbers */}
        <section className="bg-white text-ink">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16 lg:py-24">
            <Reveal className="lg:sticky lg:top-28 lg:self-start">
              <p className="text-xs font-bold uppercase tracking-[0.2em]">
                {copy("مسار الفحص", "The process")}
              </p>
              <h2 className="mt-4 text-4xl leading-tight sm:text-5xl">
                {copy("ما يحدث لكل ادعاء.", "What happens to every claim.")}
              </h2>
              <p className="mt-5 max-w-md text-base leading-8">
                {copy(
                  "تظهر كل خطوة في الفحص كبطاقة قابلة للتوسيع، فترى البحث والمصادر وملاحظات المراجع.",
                  "Each step shows in the check as an expandable card, so you can see the searches, the sources and the Reviewer's notes.",
                )}
              </p>
            </Reveal>
            <ol className="relative ms-1.5 border-s-2 border-ink/15">
              {steps.map((step, i) => (
                <Reveal as="li" key={i} delay={i * 80} className="relative ps-8 pb-10 last:pb-0">
                  <h3 className="text-xl">{step.title}</h3>
                  <p className="mt-2 max-w-xl text-base leading-8">{step.body}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        <RowsSection
          className="border-y border-border bg-blush"
          eyebrow={copy("طرق العمل", "Modes")}
          title={copy("أنت تحدد متى يتوقف.", "You choose when it stops.")}
          intro={copy(
            "اختر طريقة العمل بجانب زر الإرسال قبل بدء الفحص.",
            "Pick the mode next to the Send button before the check starts.",
          )}
          rows={modes}
        />

        {/* The six labels as a 3 x 2 grid, with "not enough information" underneath */}
        <section className="bg-white text-ink">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-8 lg:py-24">
            <Reveal className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em]">
                {copy("التصنيفات", "Labels")}
              </p>
              <h2 className="mt-4 text-4xl leading-tight sm:text-5xl">
                {copy("تصنيفات فتبينوا.", "Fatabyyano's labels.")}
              </h2>
              <p className="mt-5 text-base leading-8">
                {copy(
                  "ستة تصنيفات، إضافة إلى «معلومات غير كافية» عندما لا يصل الفحص إلى نتيجة.",
                  "Six labels, plus 'not enough information' when the check reaches no conclusion.",
                )}
              </p>
            </Reveal>
            <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {labels
                .filter(([verdict]) => verdict !== "nei")
                .map(([verdict, body], i) => (
                  <Reveal
                    as="li"
                    key={verdict}
                    delay={i * 70}
                    className="rounded-2xl border border-border bg-white p-6 transition-colors duration-300 hover:bg-secondary/40"
                  >
                    <VerdictBadge verdict={verdict} className="px-3 py-1 text-sm" />
                    <p className="mt-4 text-base leading-7">{body}</p>
                  </Reveal>
                ))}
            </ul>
            {labels
              .filter(([verdict]) => verdict === "nei")
              .map(([verdict, body]) => (
                <Reveal
                  key={verdict}
                  className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl border border-dashed border-ink/20 px-6 py-4"
                >
                  <VerdictBadge verdict={verdict} className="px-3 py-1 text-sm" />
                  <p className="text-base leading-7">{body}</p>
                </Reveal>
              ))}
          </div>
        </section>

        {/* A guide for the people using the fact-checker, each step beside its screen */}
        <section id="guide" className="scroll-mt-28 border-t border-border bg-blush text-ink">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-8 lg:py-24">
            <Reveal className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em]">
                {copy("دليل المستخدم", "User guide")}
              </p>
              <h2 className="mt-4 text-4xl leading-tight sm:text-5xl">
                {copy("كيف تستخدم المدقق الآلي.", "How to use the AI fact-checker.")}
              </h2>
              <p className="mt-5 text-base leading-8">
                {copy(
                  "من كتابة الادعاء إلى حفظ التقرير: أين تضغط، وما الأدوات المتاحة، ومتى يحتاج الفحص قرارك.",
                  "From writing the claim to saving the report: where to click, which tools you have, and when the check needs your decision.",
                )}
              </p>
            </Reveal>
            <div className="mt-16">
              <UserGuide />
            </div>
          </div>
        </section>

        {/* The same workflow as phases, in the style fact-checking organisations use */}
        <section id="phases" className="scroll-mt-28 border-t border-border bg-white text-ink">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-8 lg:py-24">
            <Reveal className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em]">
                {copy("مراحل العمل", "Workflow phases")}
              </p>
              <h2 className="mt-4 text-4xl leading-tight sm:text-5xl">
                {copy("خمس مراحل، والقرار لك.", "Five phases, and the decision is yours.")}
              </h2>
              <p className="mt-5 text-base leading-8">
                {copy(
                  "اضغط على أي مرحلة لترى ما يحدث فيها ومن يقوم به.",
                  "Select a phase to see what happens in it and who does it.",
                )}
              </p>
            </Reveal>
            <Reveal delay={120} className="mt-12">
              <WorkflowPhases />
            </Reveal>
          </div>
        </section>

        <section className="bg-ink text-white">
          <Reveal className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-4 py-14 sm:px-8">
            <h2 className="text-3xl sm:text-4xl">
              {copy("جاهز لفحص ادعاء؟", "Ready to check a claim?")}
            </h2>
            <Link
              {...(me
                ? { to: "/check" as const }
                : { to: "/auth" as const, search: { mode: "in" as const } })}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 font-semibold text-white shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:bg-primary/90"
            >
              {me
                ? copy("ابدأ فحصاً", "Start a check")
                : copy("الدخول إلى مساحة العمل", "Sign in to the workspace")}
              <ArrowUpRight className="size-4 rtl:-scale-x-100" />
            </Link>
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
