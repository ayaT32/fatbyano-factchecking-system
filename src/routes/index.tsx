import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpenText,
  CheckCheck,
  FileSearch,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { Logo, LangSwitch } from "@/components/app-shell";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Fatabyyano — Staff Fact-Checking Workspace" },
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

function HomePage() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const copy = (arabic: string, english: string) => (ar ? arabic : english);

  const principles = [
    {
      icon: ShieldCheck,
      title: copy("ابدأ بالأدلة", "Start with evidence"),
      body: copy(
        "اجمع المصادر والسياق قبل اعتماد أي نتيجة.",
        "Gather sources and context before reaching a conclusion.",
      ),
    },
    {
      icon: FileSearch,
      title: copy("راجع كل ادعاء", "Review every claim"),
      body: copy(
        "استخدم مساحة العمل لتوثيق خطوات التحقق بوضوح.",
        "Use the desk to document each verification step clearly.",
      ),
    },
    {
      icon: Target,
      title: copy("انشر بمسؤولية", "Publish responsibly"),
      body: copy(
        "احتفظ بمسودة خاصة أو انشر التقرير للفريق بعد المراجعة.",
        "Keep a private draft or publish the reviewed report for the team.",
      ),
    },
  ];

  const services = [
    {
      icon: Sparkles,
      title: copy("ابدأ الفحص", "Start a check"),
      body: copy(
        "أدخل نص الادعاء أو رابطه لبدء التحليل ومراجعة المصادر.",
        "Submit a claim or link to start analysis and source review.",
      ),
    },
    {
      icon: BookOpenText,
      title: copy("وثّق بحثك", "Document your research"),
      body: copy(
        "أضف المصادر والأدلة والسياق إلى سجل الادعاء.",
        "Record sources, evidence, and context with each claim.",
      ),
    },
    {
      icon: CheckCheck,
      title: copy("اختر طريقة الحفظ", "Choose how to save"),
      body: copy(
        "احفظ مسودة خاصة أو انشر التقرير في قاعدة الفريق.",
        "Save a private draft or publish the report to the team database.",
      ),
    },
  ];

  const workspaceRoles = [
    {
      icon: FileSearch,
      title: copy("مدقق الحقائق", "Fact-checker"),
      body: copy(
        "ابدأ الفحوصات، راجع سجلّك، واحفظ المسودات بشكل خاص أو انشر التقارير المكتملة.",
        "Run checks, review your history, and keep drafts private or publish completed reports.",
      ),
    },
    {
      icon: ShieldCheck,
      title: copy("الإدارة", "Management"),
      body: copy(
        "تابع نشاط الفريق، راجع قاعدة البيانات الرئيسية، واطّلع على تقارير التدقيق.",
        "Monitor team activity, review the master database, and access audit reports.",
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-[#6e6e82] px-4 py-2 text-center text-xs font-semibold text-white sm:text-sm">
        {copy(
          "مساحة عمل داخلية — الدخول لموظفي التحقق والإدارة فقط.",
          "Internal workspace — for fact-checking staff and management.",
        )}
      </div>
      <header className="sticky top-0 z-40 border-b border-border/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-8">
          <Link to="/" aria-label={copy("الصفحة الرئيسية لفتبينوا", "Fatabyyano home")}>
            <Logo />
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="hidden rounded-full border border-border bg-[#f7f7fb] px-3 py-2 text-xs font-semibold text-ink sm:inline-flex">
              {copy("بوابة فريق التحقق", "Fact-checking staff portal")}
            </span>
            <LangSwitch />
            <Link
              to="/auth"
              search={{ mode: "in" }}
              className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 sm:px-5"
            >
              {copy("دخول الموظفين", "Staff sign in")}
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative isolate overflow-hidden bg-ink text-ink-foreground">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_75%_5%,rgba(197,70,153,0.42),transparent_35%),linear-gradient(125deg,#1e1e36_25%,#29243e_70%,#432848)]"
          />
          <div
            aria-hidden="true"
            className="absolute -end-24 top-20 size-80 rounded-full border border-white/10 sm:size-[30rem]"
          />
          <div
            aria-hidden="true"
            className="absolute -end-8 top-36 size-48 rounded-full border border-primary/40 sm:size-72"
          />
          <div className="mx-auto grid min-h-[570px] max-w-7xl items-center gap-12 px-4 py-20 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
            <div className="max-w-3xl">
              <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold tracking-wide text-white/85">
                <span className="size-2 rounded-full bg-primary" />
                {copy("مساحة عمل تحريرية داخلية", "Internal editorial workspace")}
              </span>
              <h1 className="text-4xl font-bold leading-[1.45] text-white sm:text-5xl lg:text-6xl">
                {copy("مساحة واحدة", "One workspace")}
                <span className="mt-1 block text-primary">
                  {copy("لتحقق دقيق ومسؤول.", "for careful fact-checking.")}
                </span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-white/70 sm:text-lg">
                {copy(
                  "بوابة فريق فتبينوا لمراجعة الادعاءات، توثيق الأدلة، وحفظ التقارير كمسودات خاصة أو نشرها لقاعدة بيانات الفريق.",
                  "The Fatabyyano team portal for reviewing claims, documenting evidence, and saving private drafts or publishing reports to the team database.",
                )}
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  to="/auth"
                  search={{ mode: "in" }}
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 font-semibold text-white shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:bg-primary/90"
                >
                  {copy("الدخول إلى مساحة العمل", "Sign in to the workspace")}
                  <ArrowUpRight className="size-4 rtl:rotate-[-90deg]" />
                </Link>
                <a
                  href="#workflow"
                  className="inline-flex h-12 items-center gap-2 rounded-full border border-white/20 px-6 font-medium text-white/90 transition hover:bg-white/10"
                >
                  {copy("عرض سير العمل", "View the workflow")}
                  <ArrowLeft className="size-4 rtl:rotate-180" />
                </a>
              </div>
            </div>
            <div
              className="relative hidden min-h-[380px] items-center justify-center lg:flex"
              aria-hidden="true"
            >
              <div className="absolute size-[330px] rounded-full bg-primary/15 blur-3xl" />
              <div className="relative grid size-64 place-items-center rounded-[3rem] border border-white/15 bg-white/[0.06] shadow-2xl backdrop-blur-sm">
                <div className="grid size-40 place-items-center rounded-full border border-primary/50 bg-ink shadow-[0_0_70px_rgba(197,70,153,0.24)]">
                  <ShieldCheck className="size-20 stroke-[1.2] text-primary" />
                </div>
                <div className="absolute -start-12 top-10 flex items-center gap-2 rounded-2xl border border-white/10 bg-[#292942] px-4 py-3 text-sm text-white shadow-xl">
                  <CheckCheck className="size-4 text-primary" />
                  {copy("مصادر موثقة", "Sources documented")}
                </div>
                <div className="absolute -end-12 bottom-10 rounded-2xl border border-white/10 bg-[#292942] px-4 py-3 text-sm text-white shadow-xl">
                  {copy("مسودة خاصة أو نشر للفريق", "Private draft or team publish")}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="standards" className="scroll-mt-24 border-b border-border bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-8 lg:py-20">
            <div className="mb-9 max-w-2xl">
              <p className="text-sm font-bold tracking-wide text-primary">
                {copy("معايير المراجعة", "REVIEW PRINCIPLES")}
              </p>
              <h2 className="mt-3 text-3xl font-bold text-ink sm:text-4xl">
                {copy("منهج واضح لكل ادعاء.", "A consistent process for every claim.")}
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {principles.map(({ icon: Icon, title, body }) => (
                <article
                  key={title}
                  className="rounded-2xl border border-border bg-[#f7f7fb] p-6 sm:p-7"
                >
                  <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="size-6" />
                  </span>
                  <h3 className="mt-5 text-lg font-bold text-ink">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="scroll-mt-24 bg-[#f7f7fb]">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-8 lg:py-20">
            <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-2xl">
                <p className="text-sm font-bold tracking-wide text-primary">
                  {copy("مسار العمل", "WORKFLOW")}
                </p>
                <h2 className="mt-3 text-3xl font-bold text-ink sm:text-4xl">
                  {copy("من الادعاء إلى التقرير.", "From claim to report.")}
                </h2>
              </div>
              <Link
                to="/auth"
                search={{ mode: "in" }}
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
              >
                {copy("افتح مساحة العمل", "Open the workspace")}
                <ArrowLeft className="size-4 rtl:rotate-180" />
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {services.map(({ icon: Icon, title, body }) => (
                <article
                  key={title}
                  className="group rounded-2xl border border-border bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg sm:p-7"
                >
                  <span className="grid size-12 place-items-center rounded-2xl bg-ink text-white transition group-hover:bg-primary">
                    <Icon className="size-6" />
                  </span>
                  <h3 className="mt-5 text-lg font-bold text-ink">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="workspace" className="scroll-mt-24 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-8 lg:py-20">
            <div className="max-w-2xl">
              <p className="text-sm font-bold tracking-wide text-primary">
                {copy("مساحة الفريق", "TEAM WORKSPACE")}
              </p>
              <h2 className="mt-3 text-3xl font-bold text-ink sm:text-4xl">
                {copy("أدوات تناسب دورك.", "Tools for your role.")}
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {copy(
                  "تختلف الصفحات والصلاحيات حسب دور الحساب. سجّل الدخول للوصول إلى مساحة العمل المخصصة لك.",
                  "Pages and permissions depend on your account role. Sign in to open your assigned workspace.",
                )}
              </p>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {workspaceRoles.map(({ icon: Icon, title, body }) => (
                <article
                  key={title}
                  className="rounded-2xl border border-border bg-[#f7f7fb] p-6 sm:p-8"
                >
                  <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="size-6" />
                  </span>
                  <h3 className="mt-5 text-lg font-bold text-ink">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-ink text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-8 px-4 py-12 sm:px-8 md:py-16">
          <div>
            <Logo light />
            <p className="mt-4 max-w-lg text-sm leading-7 text-white/65">
              {copy(
                "بوابة داخلية لفريق التحقق والإدارة. يتطلب الوصول حساباً معتمداً.",
                "An internal portal for fact-checking staff and management. An authorized account is required.",
              )}
            </p>
          </div>
          <Link
            to="/auth"
            search={{ mode: "in" }}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            {copy("تسجيل دخول الموظفين", "Staff sign in")}
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
        <div className="border-t border-white/10 px-4 py-5 text-center text-xs text-white/45">
          © {new Date().getFullYear()}{" "}
          {copy("فتبينوا. جميع الحقوق محفوظة.", "Fatabyyano. All rights reserved.")}
        </div>
      </footer>
    </div>
  );
}
