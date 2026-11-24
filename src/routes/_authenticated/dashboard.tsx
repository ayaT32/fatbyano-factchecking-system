import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  ScanSearch,
  Send,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useClaims, useMe, useReports } from "@/lib/session";
import { PageHeader, StatCard } from "@/components/page-header";
import { VerdictBadge } from "@/components/verdict-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);
      if (roles?.some((role) => role.role === "manager")) {
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
  const falseCount = visibleClaims.filter(
    (c) => c.verdict === "false" || c.verdict === "misleading",
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
        actions={
          <Button asChild size="lg">
            <Link to="/check">
              <ScanSearch />
              {t("newCheck")}
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard accent label={t("totalClaims")} value={visibleClaims.length} />
        <StatCard label={t("thisWeek")} value={week} />
        <StatCard label={t("avgConfidence")} value={trustScore === null ? "—" : `${trustScore}%`} />
        <StatCard label={t("reportsCount")} value={reports.length} />
      </div>

      <form
        onSubmit={startQuickCheck}
        className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-sheet sm:flex sm:items-center sm:gap-4 sm:p-6"
      >
        <div className="mb-4 flex-1 sm:mb-0">
          <p className="font-semibold text-ink">
            {lang === "ar" ? "ابدأ التحقق الآن" : "Start a fact-check"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {lang === "ar"
              ? "الصق رابطاً أو اكتب الادعاء الذي تريد فحصه."
              : "Paste a link or type the claim you want to verify."}
          </p>
        </div>
        <div className="flex flex-1 gap-2">
          <Input
            value={quickClaim}
            onChange={(event) => setQuickClaim(event.target.value)}
            placeholder={t("claimPlaceholder")}
            className="h-11 min-w-0 bg-background"
          />
          <Button type="submit" className="h-11 shrink-0" disabled={quickClaim.trim().length < 3}>
            <Send className="rtl:rotate-180" />
            <span className="hidden sm:inline">{t("newCheck")}</span>
          </Button>
        </div>
      </form>

      <section className="sheet mt-8 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-ink">{t("recentClaims")}</h2>
          <Link
            to="/history"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary"
          >
            {t("viewAll")} <ArrowLeft className="size-4 ltr:rotate-180" />
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
                  className="flex items-center gap-4 py-3.5 hover:text-primary"
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
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          {
            icon: CheckCircle2,
            value: week,
            label: lang === "ar" ? "فحص هذا الأسبوع" : "Checks this week",
          },
          {
            icon: ShieldCheck,
            value: falseCount,
            label: lang === "ar" ? "ادعاءات كاذبة أو مضللة" : "False or misleading claims",
          },
          {
            icon: UsersRound,
            value: me?.isAdmin
              ? lang === "ar"
                ? "فريق التحقق"
                : "Fact-checking team"
              : lang === "ar"
                ? "مساحة خاصة"
                : "Private workspace",
          },
        ].map(({ icon: Icon, value, label }) => (
          <div
            key={label}
            className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-ink">{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{label}</p>
            </div>
            <ArrowUpRight className="ms-auto size-4 text-muted-foreground" />
          </div>
        ))}
      </section>
    </div>
  );
}
