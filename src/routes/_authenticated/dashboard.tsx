import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  FileText,
  Flame,
  History,
  MessagesSquare,
  ScanSearch,
  Send,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useClaims, useMe, useReports } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { Reveal, trackSpotlight } from "@/components/motion";
import { VerdictBadge } from "@/components/verdict-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { hasManagementRole } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);
      if (hasManagementRole(roles)) {
        throw redirect({ to: "/team" });
      }
    }
  },
  head: () => ({
    meta: [
      { title: "Dashboard — Fattabyno" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "description", content: "Overview of claims and reports at Fattabyno." },
      { property: "og:title", content: "Dashboard — Fattabyno" },
      { property: "og:description", content: "Overview of claims and reports at Fattabyno." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { t, lang } = useI18n();
  const { data: me } = useMe();
  const { data: claims = [] } = useClaims();
  const { data: reports = [] } = useReports();
  const navigate = useNavigate();
  const [quickClaim, setQuickClaim] = useState("");
  const visibleClaims = me?.isAdmin ? claims.filter((claim) => claim.is_published) : claims;
  const weekAgo = Date.now() - 7 * 864e5;
  const week = visibleClaims.filter((c) => new Date(c.created_at).getTime() > weekAgo).length;
  const flaggedCount = visibleClaims.filter((c) =>
    ["false", "altered", "misleading", "missing_context"].includes(c.verdict ?? ""),
  ).length;
  const confidenceRows = visibleClaims.filter((claim) => claim.confidence !== null);
  const trustScore = confidenceRows.length
    ? Math.round(
        confidenceRows.reduce((total, claim) => total + (claim.confidence ?? 0), 0) /
          confidenceRows.length,
      )
    : null;

  function startQuickCheck(event: React.FormEvent) {
    event.preventDefault();
    const claim = quickClaim.trim();
    if (claim.length >= 3) void navigate({ to: "/check", search: { claim } });
  }

  const quickActions = [
    { to: "/check", label: t("newCheck"), icon: ScanSearch, primary: true },
    { to: "/investigate", label: t("investigate"), icon: MessagesSquare },
    { to: "/history", label: t("history"), icon: History },
    { to: "/reports", label: t("reports"), icon: FileText },
    ...(!me?.isAdmin ? [{ to: "/trends", label: t("trends"), icon: Flame }] : []),
  ] as const;

  return (
    <div>
      <PageHeader
        eyebrow={new Date().toLocaleDateString(lang === "ar" ? "ar" : "en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
        title={`${t("welcome")}، ${me?.profile?.full_name ?? ""}`.replace(
          "، ",
          lang === "ar" ? "، " : ", ",
        )}
      />

      {/* Quick-actions bar */}
      <Reveal
        as="nav"
        aria-label={lang === "ar" ? "إجراءات سريعة" : "Quick actions"}
        className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0"
      >
        {quickActions.map(({ to, label, icon: Icon, ...rest }) => (
          <Link
            key={to}
            to={to}
            className={
              "primary" in rest
                ? "inline-flex shrink-0 items-center gap-2 rounded-full border border-primary/30 bg-primary-soft px-4 py-2 text-sm font-semibold text-ink shadow-sm hover:-translate-y-0.5 hover:border-primary"
                : "inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-ink hover:-translate-y-0.5 hover:border-ink/40"
            }
          >
            <Icon className="size-4 text-ink" />
            {label}
          </Link>
        ))}
      </Reveal>

      {/* Bento grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Reveal
          as="form"
          onSubmit={startQuickCheck}
          onPointerMove={trackSpotlight}
          className="spotlight relative flex flex-col justify-between overflow-hidden rounded-3xl bg-ink p-6 text-white sm:col-span-2 lg:row-span-2 lg:p-8"
        >
          <div
            aria-hidden="true"
            className="animate-drift pointer-events-none absolute -end-16 -top-16 size-56 rounded-full border border-primary/40"
          />
          <div>
            <h2 className="text-2xl text-white">
              {lang === "ar" ? "ابدأ التحقق الآن" : "Start a fact-check"}
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-7 text-white/65">
              {lang === "ar"
                ? "الصق رابطاً أو اكتب الادعاء الذي تريد فحصه."
                : "Paste a link or type the claim you want to verify."}
            </p>
          </div>
          <div className="mt-6 flex gap-2">
            <Input
              value={quickClaim}
              onChange={(event) => setQuickClaim(event.target.value)}
              placeholder={t("claimPlaceholder")}
              className="h-11 min-w-0 border-white/15 bg-white/10 text-white placeholder:text-white/45"
            />
            <Button type="submit" className="h-11 shrink-0" disabled={quickClaim.trim().length < 3}>
              <Send className="rtl:rotate-180" />
              <span className="hidden sm:inline">{t("newCheck")}</span>
            </Button>
          </div>
        </Reveal>

        {[
          { label: t("totalClaims"), value: visibleClaims.length, accent: true },
          { label: t("thisWeek"), value: week },
          { label: t("avgConfidence"), value: trustScore === null ? "—" : `${trustScore}%` },
          { label: t("reportsCount"), value: reports.length },
        ].map(({ label, value, accent }, i) => (
          <Reveal
            key={i}
            delay={80 + i * 70}
            onPointerMove={trackSpotlight}
            className={
              accent
                ? "spotlight rounded-3xl border border-primary/15 bg-primary-soft p-5"
                : "spotlight rounded-3xl border border-border bg-card p-5"
            }
          >
            <p
              className={
                accent ? "text-sm font-medium text-gold-ink" : "text-sm text-muted-foreground"
              }
            >
              {label}
            </p>
            <p className="mt-3 font-display text-4xl font-extrabold tabular-nums text-ink">
              {value}
            </p>
          </Reveal>
        ))}

        <Reveal
          as="section"
          delay={120}
          className="rounded-3xl border border-border bg-card p-6 shadow-sheet sm:col-span-2 lg:col-span-3 lg:row-span-2"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl text-ink">{t("recentClaims")}</h2>
            <Link
              to="/history"
              className="group inline-flex items-center gap-1 text-sm font-medium text-primary"
            >
              {t("viewAll")}
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5 ltr:rotate-180 ltr:group-hover:translate-x-0.5" />
            </Link>
          </div>
          {visibleClaims.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">{t("empty")}</p>
          ) : (
            <ul className="divide-y divide-border">
              {visibleClaims.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <Link
                    to="/history/$id"
                    params={{ id: c.id }}
                    className="-mx-3 flex items-center gap-4 rounded-xl px-3 py-3.5 hover:bg-secondary hover:text-primary"
                  >
                    <VerdictBadge verdict={c.verdict} />
                    <span className="line-clamp-1 flex-1 text-sm">{c.claim_text}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString(lang === "ar" ? "ar" : "en-GB")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Reveal>

        {[
          {
            value: flaggedCount,
            label: lang === "ar" ? "ادعاءات كاذبة أو مضللة" : "False or misleading claims",
            to: "/history" as const,
          },
          {
            value: me?.isAdmin
              ? lang === "ar"
                ? "فريق التحقق"
                : "Fact-checking team"
              : lang === "ar"
                ? "مساحة خاصة"
                : "Private workspace",
            label: lang === "ar" ? "مساحة العمل" : "Workspace",
            to: "/reports" as const,
          },
        ].map(({ value, label, to }, i) => (
          <Reveal key={i} delay={180 + i * 70}>
            <Link
              to={to}
              onPointerMove={trackSpotlight}
              className="spotlight group flex h-full flex-col justify-end gap-4 rounded-3xl border border-border bg-card p-5"
            >
              <div>
                <p className="font-display text-2xl font-extrabold text-ink">{value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{label}</p>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
