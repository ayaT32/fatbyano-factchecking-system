import { createFileRoute, Link } from "@tanstack/react-router";
import { Canon } from "@/components/canon";
import { ClaimCard } from "@/components/claim-card";
import { Reveal } from "@/components/motion";
import { RowsSection, SiteFooter, SiteHeader, type Row } from "@/components/site";
import { useI18n } from "@/lib/i18n";
import { useMe } from "@/lib/session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Fatabyyano — Staff Fact-Checking Workspace" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      {
        name: "description",
        content:
          "A private workspace for Fatabyyano fact-checkers to review claims and publish verified reports.",
      },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Fatabyyano — Staff Fact-Checking Workspace" },
      {
        property: "og:description",
        content: "A private workspace for Fatabyyano fact-checkers and management.",
      },
    ],
  }),
  component: HomePage,
});

/** Soft 3D-style shapes in the site colours: a pink ring, spheres and slanted sticks that
 * float gently behind the claim card. Purely decorative. From the small breakpoint up, Canon
 * stands on the card's near side, so the shapes there (grey spheres, sticks, zigzag) are
 * hidden and only the pink ring and pink sphere remain. */
function HeroArt() {
  const sphere = (light: string, base: string, dark: string) =>
    `radial-gradient(circle at 32% 28%, ${light} 0%, ${base} 45%, ${dark} 100%)`;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {/* Ring */}
      <svg
        viewBox="0 0 200 200"
        className="animate-float absolute end-[2%] top-[0%] w-56 drop-shadow-[0_25px_35px_rgba(0,0,0,0.45)] [animation-duration:9s] sm:w-72"
      >
        <defs>
          <linearGradient id="hero-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f6c7e4" />
            <stop offset="45%" stopColor="#c54699" />
            <stop offset="100%" stopColor="#6e1f53" />
          </linearGradient>
        </defs>
        <ellipse
          cx="100"
          cy="100"
          rx="70"
          ry="52"
          fill="none"
          stroke="url(#hero-ring)"
          strokeWidth="26"
          transform="rotate(-24 100 100)"
        />
        <ellipse
          cx="100"
          cy="100"
          rx="70"
          ry="52"
          fill="none"
          stroke="white"
          strokeOpacity="0.28"
          strokeWidth="4"
          transform="rotate(-24 100 100) translate(-4 -6)"
        />
      </svg>
      {/* Spheres */}
      <span
        className="animate-float absolute start-[6%] top-[6%] size-16 rounded-full shadow-[0_18px_30px_rgba(0,0,0,0.45)] [animation-delay:-2s] sm:hidden"
        style={{ background: sphere("#8b8b92", "#3a3a41", "#111114") }}
      />
      <span
        className="animate-float absolute bottom-[8%] end-[6%] size-20 rounded-full shadow-[0_18px_30px_rgba(0,0,0,0.45)] [animation-delay:-4s] sm:size-24"
        style={{ background: sphere("#f6c7e4", "#c54699", "#5e1a47") }}
      />
      <span
        className="animate-float absolute bottom-[36%] start-[0%] size-9 rounded-full [animation-delay:-1s] sm:hidden"
        style={{ background: sphere("#ffffff", "#ceced3", "#68686e") }}
      />
      {/* Slanted sticks */}
      <div className="absolute bottom-[0%] start-[16%] flex rotate-[-38deg] gap-5 sm:hidden">
        {[
          "from-[#f6c7e4] to-[#c54699]",
          "from-white to-[#8b8b92]",
          "from-[#c54699] to-[#6e1f53]",
        ].map((g, i) => (
          <span
            key={i}
            className={cn(
              "animate-float block h-32 w-3 rounded-full bg-gradient-to-b shadow-lg",
              g,
            )}
            style={{ animationDelay: `${-i * 1.3}s` }}
          />
        ))}
      </div>
      {/* Zigzag lines */}
      <svg
        viewBox="0 0 120 40"
        className="absolute start-[24%] top-[3%] w-24 text-white/30 sm:hidden"
      >
        {[8, 20, 32].map((y) => (
          <polyline
            key={y}
            points={[0, 15, 30, 45, 60, 75, 90, 105, 120]
              .map((x, k) => `${x},${k % 2 ? y - 5 : y}`)
              .join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
    </div>
  );
}

function HomePage() {
  const { lang } = useI18n();
  const { data: me } = useMe();
  const ar = lang === "ar";
  const copy = (arabic: string, english: string) => (ar ? arabic : english);

  const principles: Row[] = [
    {
      title: copy("ابدأ بالأدلة", "Start with evidence"),
      body: copy(
        "اجمع المصادر والسياق قبل اعتماد أي نتيجة.",
        "Gather sources and context before reaching a conclusion.",
      ),
    },
    {
      title: copy("راجع كل ادعاء", "Review every claim"),
      body: copy(
        "استخدم مساحة العمل لتوثيق خطوات التحقق بوضوح.",
        "Use the desk to document each verification step clearly.",
      ),
    },
    {
      title: copy("انشر بمسؤولية", "Publish responsibly"),
      body: copy(
        "احتفظ بمسودة خاصة أو انشر التقرير للفريق بعد المراجعة.",
        "Keep a private draft or publish the reviewed report for the team.",
      ),
    },
  ];

  const workspaceRoles: Row[] = [
    {
      title: copy("مدقق الحقائق", "Fact-checker"),
      body: copy(
        "ابدأ الفحوصات، راجع سجلّك، واحفظ المسودات بشكل خاص أو انشر التقارير المكتملة.",
        "Run checks, review your history, and keep drafts private or publish completed reports.",
      ),
      link: me ? { to: "/check" } : { to: "/auth", search: { mode: "in" } },
    },
    {
      title: copy("الإدارة", "Management"),
      body: copy(
        "تابع نشاط الفريق، راجع قاعدة البيانات الرئيسية، واطّلع على تقارير التدقيق.",
        "Monitor team activity, review the master database, and access audit reports.",
      ),
      link: me?.isAdmin ? { to: "/team" } : { to: "/auth", search: { mode: "in" } },
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        <section
          id="overview"
          className="relative isolate -mb-[72px] overflow-hidden bg-ink pb-28 pt-40 text-ink-foreground [clip-path:polygon(0_0,100%_0,100%_calc(100%-72px),0_100%)] lg:pb-36 lg:pt-36"
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_75%_5%,rgba(197,70,153,0.35),transparent_35%),linear-gradient(125deg,#111114_20%,#242429_70%,#303034)]"
          />
          {/* Wavy layers sweeping in from the far side */}
          <svg
            aria-hidden="true"
            viewBox="0 0 800 700"
            preserveAspectRatio="none"
            className="absolute inset-y-0 end-0 -z-10 h-full w-[75%] rtl:-scale-x-100"
          >
            <path
              d="M260 0 C 160 120 330 230 250 360 C 180 470 300 600 230 700 L 800 700 L 800 0 Z"
              fill="#303034"
              fillOpacity="0.55"
            />
            <path
              d="M430 0 C 340 140 520 250 430 400 C 360 520 470 610 420 700 L 800 700 L 800 0 Z"
              fill="#c54699"
              fillOpacity="0.16"
            />
            <path
              d="M600 0 C 530 160 660 260 600 420 C 560 540 640 620 610 700 L 800 700 L 800 0 Z"
              fill="#17171b"
              fillOpacity="0.5"
            />
          </svg>

          <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-8 lg:grid-cols-2">
            <Reveal className="max-w-xl">
              {/* Two balanced lines; the compound word never breaks, the second line shimmers */}
              <h1 className="text-balance text-5xl font-extrabold leading-[1.12] text-white sm:text-6xl [html[lang=ar]_&]:leading-[1.4]">
                <span className="block">{copy("مساحة واحدة", "One workspace")}</span>
                <span className="text-shine mt-2 block pb-2">
                  {ar ? (
                    "لتحقق دقيق ومسؤول."
                  ) : (
                    <>
                      for careful <span className="whitespace-nowrap">fact-checking.</span>
                    </>
                  )}
                </span>
              </h1>
              <span
                aria-hidden="true"
                className="animate-grow mt-6 block h-1 w-14 origin-left rounded-full bg-primary rtl:origin-right"
              />
              <p className="mt-7 max-w-md text-base leading-8 text-white/80">
                {copy(
                  "بوابة فريق فتبينوا لمراجعة الادعاءات، توثيق الأدلة، وحفظ التقارير كمسودات خاصة أو نشرها لقاعدة بيانات الفريق.",
                  "The Fatabyyano team portal for reviewing claims, documenting evidence, and saving private drafts or publishing reports to the team database.",
                )}
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-6">
                <Link
                  {...(me
                    ? { to: "/dashboard" as const }
                    : { to: "/auth" as const, search: { mode: "in" as const } })}
                  className="inline-flex h-12 items-center rounded-lg bg-primary px-8 font-semibold text-white shadow-lg shadow-black/30 transition hover:-translate-y-0.5 hover:bg-primary/90"
                >
                  {me
                    ? copy("افتح مساحة العمل", "Open the workspace")
                    : copy("الدخول إلى مساحة العمل", "Sign in to the workspace")}
                </Link>
              </div>
            </Reveal>
            <Reveal
              delay={150}
              className="relative flex min-h-[430px] items-center justify-center sm:min-h-[480px]"
            >
              <HeroArt />
              <div className="relative z-10 flex w-full max-w-[36rem] justify-center sm:justify-end">
                <div className="relative w-full sm:w-[68%] sm:max-w-sm">
                  {/* Canon leans on the card as in the artwork: 50.75% of the card's width,
                      his ear over its left edge, the card's top at a quarter of his height.
                      Hidden on phones, where there's no room beside the card. */}
                  <div className="absolute end-[94.06%] top-0 z-20 -mt-[23.8%] hidden w-[50.75%] sm:block rtl:-scale-x-100">
                    <Canon
                      alt={copy(
                        "كانون، المدقق الآلي، يقرأ ورقة.",
                        "Canon, the AI fact-checker, reading a paper.",
                      )}
                    />
                  </div>
                  <ClaimCard ar={ar} />
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <RowsSection
          id="standards"
          className="border-b border-border bg-white pt-8"
          eyebrow={copy("معايير المراجعة", "Review principles")}
          title={copy("منهج واضح لكل ادعاء.", "A consistent process for every claim.")}
          rows={principles}
          footer={
            <>
              <Link
                to="/how-it-works"
                className="inline-flex items-center gap-2 text-base font-semibold text-ink underline decoration-2 underline-offset-8 hover:decoration-primary"
              >
                {copy("اطّلع على خطوات العمل", "See how a check works")}
              </Link>
              {/* A claim circled and stamped by hand, in the site's pink */}
              <img
                src="/images/fact-check-hand.webp"
                alt={copy(
                  "يد تحيط ادعاءً بدائرة على ورقة وتختمه بكلمة «خطأ»",
                  "A hand circling a claim on a printed page, stamped FALSE",
                )}
                width={680}
                height={580}
                loading="lazy"
                className="mt-10 w-full max-w-md -rotate-1 rounded-3xl border border-border shadow-[0_30px_60px_-30px_rgba(23,23,27,0.45)] transition-transform duration-500 hover:rotate-0"
              />
            </>
          }
        />

        <RowsSection
          id="workspace"
          className="bg-blush"
          eyebrow={copy("مساحة الفريق", "Team workspace")}
          title={copy("أدوات تناسب دورك.", "Tools for your role.")}
          intro={copy(
            "تختلف الصفحات والصلاحيات حسب دور الحساب. سجّل الدخول للوصول إلى مساحة العمل المخصصة لك.",
            "Pages and permissions depend on your account role. Sign in to open your assigned workspace.",
          )}
          rows={workspaceRoles}
        />
      </main>

      <SiteFooter />
    </div>
  );
}
