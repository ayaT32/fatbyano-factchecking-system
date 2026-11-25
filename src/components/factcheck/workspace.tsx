import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BellRing, FileText, LogOut, Menu, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Logo, LangSwitch } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useI18n, type TKey } from "@/lib/i18n";
import { useMe } from "@/lib/session";
import { getSource, useRun, useSessions } from "@/lib/factcheck/source";
import { MODE_NAMES } from "@/lib/factcheck/names";
import type { SessionSummary, StartInput } from "@/lib/factcheck/types";
import { Composer } from "./composer";
import { PauseCard } from "./pause-card";
import { ReviewPanel } from "./review-panel";
import { PlanCard, StatusLine, VerdictCard } from "./run-cards";

/** Where a session links to. */
export type SessionLink = (id?: string) => string;

function SessionsSidebar({
  activeId,
  link,
  onNavigate,
}: {
  activeId: string | undefined;
  link: SessionLink;
  onNavigate?: () => void;
}) {
  const { lang, t } = useI18n();
  const c = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const sessions = useSessions();
  const { data: me } = useMe();
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  }

  const statusLine = (s: SessionSummary) =>
    s.status === "paused"
      ? c("بانتظار قرارك", "Waiting for you")
      : s.status === "running" || s.status === "queued"
        ? c("قيد الفحص…", "Checking…")
        : s.status === "failed"
          ? c("فشل", "Failed")
          : null;

  return (
    <div className="flex h-full flex-col bg-sidebar p-3 text-sidebar-foreground">
      <div className="px-2 pb-4 pt-2">
        <Logo light />
      </div>
      <a
        href={link()}
        onClick={(e) => {
          e.preventDefault();
          void navigate({ href: link() });
          onNavigate?.();
        }}
        className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 text-sm font-semibold hover:bg-white/15"
      >
        <PenLine className="size-4" />
        {c("فحص جديد", "New fact-check")}
      </a>
      <p className="mb-2 mt-6 px-3 text-[11px] font-semibold uppercase tracking-wide text-sidebar-foreground/50">
        {c("الجلسات السابقة", "Previous sessions")}
      </p>
      <nav
        aria-label={c("الجلسات", "Sessions")}
        className="-mx-1 flex-1 space-y-0.5 overflow-y-auto px-1"
      >
        {sessions?.length === 0 && (
          <p className="px-3 text-xs text-sidebar-foreground/50">
            {c("لا جلسات بعد.", "No sessions yet.")}
          </p>
        )}
        {sessions?.map((s) => (
          <a
            key={s.id}
            href={link(s.id)}
            onClick={(e) => {
              e.preventDefault();
              void navigate({ href: link(s.id) });
              onNavigate?.();
            }}
            aria-current={s.id === activeId ? "page" : undefined}
            className={cn(
              "group flex items-start gap-2 rounded-lg px-3 py-2 text-sm",
              s.id === activeId ? "bg-white/15" : "hover:bg-white/10",
            )}
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate" dir="auto">
                {s.title}
              </span>
              {statusLine(s) ? (
                <span
                  className={cn(
                    "mt-0.5 flex items-center gap-1 text-[11px]",
                    s.status === "paused"
                      ? "font-semibold text-[#f3a3d3]"
                      : "text-sidebar-foreground/55",
                  )}
                >
                  {s.status === "paused" && <BellRing className="size-3" />}
                  {statusLine(s)}
                </span>
              ) : s.finalVerdict ? (
                <span className="mt-0.5 block text-[11px] text-sidebar-foreground/55">
                  {t(`v.${s.finalVerdict}` as TKey)}
                </span>
              ) : null}
            </span>
            {s.status === "paused" && (
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden />
            )}
          </a>
        ))}
      </nav>
      <div className="space-y-1 border-t border-sidebar-border pt-2">
        {me && (
          <div className="flex items-center gap-2 px-2 py-1.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-white">
              {(me.profile?.full_name || me.user.email || "?").slice(0, 1).toLocaleUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">
                {me.profile?.full_name || me.user.email}
              </span>
              <span className="block text-[11px] text-sidebar-foreground/55">
                {me.isAdmin ? t("management") : t("staff")}
              </span>
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void signOut()}
              aria-label={t("signOut")}
              className="text-sidebar-foreground hover:bg-white/10 hover:text-sidebar-foreground"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        )}
        <LangSwitch light />
      </div>
    </div>
  );
}

export function FactCheckWorkspace({
  id,
  link,
  initialText,
}: {
  id?: string;
  link: SessionLink;
  initialText?: string;
}) {
  const { lang } = useI18n();
  const c = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const navigate = useNavigate();
  const run = useRun(id);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [isWide, setIsWide] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const source = getSource();

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    setReviewOpen(false);
  }, [id]);
  // Follow the run as new steps and pauses arrive. (Braces matter: newer browsers make
  // scrollIntoView return a Promise, which React would take for a cleanup function.)
  const progress = run ? `${run.status}:${run.phase}:${run.pause?.id}:${run.plan ? 1 : 0}` : "";
  useEffect(() => {
    void bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [progress]);

  async function start(input: StartInput) {
    const newId = await source.start(input);
    await navigate({ href: link(newId) });
  }

  const side = lang === "ar" ? "right" : "left";
  const reviewSide = lang === "ar" ? "left" : "right";

  return (
    <TooltipProvider>
      <div className="flex h-dvh overflow-hidden bg-background">
        <aside className="hidden w-64 shrink-0 lg:block">
          <SessionsSidebar activeId={id} link={link} />
        </aside>
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent side={side} className="w-72 border-none p-0 [&>button]:hidden">
            <SheetTitle className="sr-only">{c("الجلسات", "Sessions")}</SheetTitle>
            <SessionsSidebar activeId={id} link={link} onNavigate={() => setMenuOpen(false)} />
          </SheetContent>
        </Sheet>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-card/70 px-3 backdrop-blur md:px-5">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label={c("الجلسات", "Sessions")}
            >
              <Menu />
            </Button>
            <h1 className="min-w-0 flex-1 truncate text-sm font-semibold" dir="auto">
              {run ? run.claim.text || c("صورة", "Image") : c("فحص جديد", "New fact-check")}
            </h1>
            {run && (
              <span className="hidden rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground sm:inline">
                {lang === "ar" ? MODE_NAMES[run.mode].ar : MODE_NAMES[run.mode].en}
              </span>
            )}
            {run?.status === "done" && !reviewOpen && (
              <Button variant="outline" size="sm" onClick={() => setReviewOpen(true)}>
                <FileText />
                {c("المراجعة", "Review")}
              </Button>
            )}
          </header>

          {!id && (
            <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 pb-10">
              <div className="mb-8 text-center">
                <h2 className="text-3xl font-bold tracking-tight">
                  {c("ما الذي نتحقق منه اليوم؟", "What are we checking today?")}
                </h2>
                <p className="mt-3 text-sm text-muted-foreground">
                  {c(
                    "الصق ادعاءً أو أرفق صورة. يخطط الوكيل ويجمع الأدلة، ويراجع المراجع كل خطوة.",
                    "Paste a claim or attach an image. The agent plans and gathers evidence; the Reviewer checks every step.",
                  )}
                </p>
              </div>
              <div className="w-full max-w-2xl">
                <Composer onSubmit={start} {...(initialText ? { initialText } : {})} />
                <p className="mt-3 text-center text-[11px] text-muted-foreground">
                  {c(
                    "نتائج أولية — القرار النهائي للمدقق.",
                    "Preliminary findings — the fact-checker has the final say.",
                  )}
                </p>
              </div>
            </div>
          )}

          {id && run === null && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
              <p>{c("لم يُعثر على هذه الجلسة.", "This session wasn't found.")}</p>
              <Button variant="outline" asChild>
                <Link to="/check">{c("فحص جديد", "New fact-check")}</Link>
              </Button>
            </div>
          )}

          {run && (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6 md:px-8">
                <div className="ms-auto w-fit max-w-[85%] rounded-2xl rounded-se-sm bg-ink px-4 py-3 text-ink-foreground">
                  {run.claim.imageUrl && (
                    <img
                      src={run.claim.imageUrl}
                      alt={c("الصورة المرفقة", "Attached image")}
                      className="mb-2 max-h-56 rounded-lg object-contain"
                    />
                  )}
                  {run.claim.text && (
                    <p className="whitespace-pre-wrap leading-7" dir="auto">
                      {run.claim.text}
                    </p>
                  )}
                </div>
                <PlanCard run={run} />
                {(run.status === "queued" ||
                  run.status === "running" ||
                  run.status === "paused") && <StatusLine run={run} />}
                {run.status === "paused" && run.pause && (
                  <PauseCard
                    key={run.pause.id}
                    pause={run.pause}
                    mode={run.mode}
                    onAnswer={(a) => source.answer(run.id, a)}
                  />
                )}
                {run.status === "done" && (
                  <VerdictCard run={run} onOpenReview={() => setReviewOpen(true)} />
                )}
                {run.status === "failed" && (
                  <p
                    role="alert"
                    className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
                  >
                    {run.error ?? c("فشل الفحص.", "The check failed.")}
                  </p>
                )}
                <div ref={bottom} />
              </div>
            </div>
          )}
        </main>

        {run?.status === "done" && reviewOpen && isWide && (
          <aside className="w-[min(52vw,820px)] shrink-0 border-s">
            <ReviewPanel run={run} onClose={() => setReviewOpen(false)} />
          </aside>
        )}
        {run?.status === "done" && (
          <Sheet open={reviewOpen && !isWide} onOpenChange={setReviewOpen}>
            <SheetContent
              side={reviewSide}
              className="w-full max-w-none p-0 sm:max-w-none [&>button]:hidden"
            >
              <SheetTitle className="sr-only">{c("المراجعة", "Review")}</SheetTitle>
              <ReviewPanel run={run} onClose={() => setReviewOpen(false)} />
            </SheetContent>
          </Sheet>
        )}
      </div>
    </TooltipProvider>
  );
}
