import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { AnalysisView, DataState } from "@/components/desk-ui";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VerdictBadge } from "@/components/verdict-badge";
import { supabase } from "@/integrations/supabase/client";
import { employeeId, hasManagementRole } from "@/lib/auth";
import { pageMeta } from "@/lib/desk";
import { useI18n, VERDICTS, type TKey } from "@/lib/i18n";
import { useClaims, useProfiles, useReports, type ClaimRow } from "@/lib/session";
import { cn } from "@/lib/utils";

const TABS = ["claims", "reports", "ai"] as const;
type Tab = (typeof TABS)[number];

export const Route = createFileRoute("/_authenticated/management")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } =>
    TABS.includes(s["tab"] as Tab) && s["tab"] !== "claims" ? { tab: s["tab"] as Tab } : {},
  // Signed-in staff are sent to the management sign-in (signed-out visitors are redirected
  // there by the _authenticated layout)
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/management/login" });
    const { data: roles, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);
    if (error) throw error;
    if (!hasManagementRole(roles)) {
      throw redirect({ to: "/management/login", search: { denied: true } });
    }
  },
  head: () =>
    pageMeta(
      "Management",
      "Every claim and report submitted by the fact-checking team, with search and AI results.",
    ),
  component: ManagementPage,
});

type Copy = (ar: string, en: string) => string;

function useNames() {
  const { data: profiles = [] } = useProfiles();
  return useMemo(() => {
    const byId = new Map(profiles.map((p) => [p.id, p]));
    const name = (userId: string) => {
      const p = byId.get(userId);
      return p?.full_name || p?.email?.split("@")[0] || employeeId(userId);
    };
    return { name, profiles };
  }, [profiles]);
}

function ManagementPage() {
  const { lang } = useI18n();
  const c: Copy = (ar, en) => (lang === "ar" ? ar : en);
  const { tab = "claims" } = Route.useSearch();
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader
        eyebrow={c("بوابة الإدارة", "Management portal")}
        title={c("الإدارة", "Management")}
        actions={
          <Button asChild>
            <Link to="/check">{c("فحص جديد بالذكاء الاصطناعي", "New AI fact-check")}</Link>
          </Button>
        }
      />
      <Tabs
        value={tab}
        onValueChange={(v) =>
          void navigate({ to: "/management", search: v === "claims" ? {} : { tab: v as Tab } })
        }
        dir={lang === "ar" ? "rtl" : "ltr"}
      >
        <TabsList>
          <TabsTrigger value="claims">{c("الادعاءات", "Claims")}</TabsTrigger>
          <TabsTrigger value="reports">{c("التقارير", "Reports")}</TabsTrigger>
          <TabsTrigger value="ai">{c("الفحص بالذكاء الاصطناعي", "AI fact-check")}</TabsTrigger>
        </TabsList>
        <TabsContent value="claims" className="mt-6">
          <ClaimsTab c={c} />
        </TabsContent>
        <TabsContent value="reports" className="mt-6">
          <ReportsTab c={c} />
        </TabsContent>
        <TabsContent value="ai" className="mt-6">
          <AiTab c={c} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------- shared bits ---------- */

function useDateTime() {
  const { lang } = useI18n();
  const locale = lang === "ar" ? "ar" : "en-GB";
  return {
    date: (iso: string) =>
      new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" }),
    time: (iso: string) =>
      new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }),
  };
}

const PAGE = 50;

function ResultsTable({
  heading,
  columns,
  rows,
  empty,
}: {
  heading: string;
  columns: string[];
  rows: { key: string; cells: ReactNode[]; onOpen: () => void }[];
  empty: string;
}) {
  const { lang } = useI18n();
  const [limit, setLimit] = useState(PAGE);
  const shown = rows.slice(0, limit);
  return (
    <section className="rounded-2xl border border-border bg-card shadow-sheet">
      <h2 className="border-b border-border px-5 py-4 text-base text-ink">{heading}</h2>
      {rows.length === 0 ? (
        <p className="px-5 py-12 text-center text-muted-foreground">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-start text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                {columns.map((col) => (
                  <th key={col} className="px-5 py-3 text-start font-medium">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shown.map((row) => (
                <tr
                  key={row.key}
                  tabIndex={0}
                  onClick={row.onOpen}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      row.onOpen();
                    }
                  }}
                  className="cursor-pointer transition-colors hover:bg-secondary/70 focus-visible:bg-secondary focus-visible:outline-none"
                >
                  {row.cells.map((cell, i) => (
                    <td key={i} className="px-5 py-3.5 align-middle">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > limit && (
            <div className="border-t border-border p-4 text-center">
              <Button variant="outline" onClick={() => setLimit((l) => l + PAGE)}>
                {lang === "ar"
                  ? `عرض المزيد (${rows.length - limit})`
                  : `Show more (${rows.length - limit})`}
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <Label htmlFor={htmlFor} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

const selectClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function statusLabel(claim: ClaimRow | undefined, c: Copy) {
  if (!claim) return c("—", "—");
  if (claim.status !== "checked") return c("قيد الفحص", "In progress");
  return claim.is_published ? c("منشور", "Published") : c("مسودة خاصة", "Private draft");
}

function StatusPill({ claim, c }: { claim: ClaimRow | undefined; c: Copy }) {
  return (
    <span
      className={cn(
        "whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
        claim?.is_published ? "bg-ink text-white" : "bg-secondary text-ink",
      )}
    >
      {statusLabel(claim, c)}
    </span>
  );
}

/* ---------- Claims ---------- */

function ClaimsTab({ c }: { c: Copy }) {
  const { t } = useI18n();
  const q = useClaims();
  const { name, profiles } = useNames();
  const { date, time } = useDateTime();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [person, setPerson] = useState("all");
  const [verdict, setVerdict] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const claims = useMemo(() => q.data ?? [], [q.data]);
  const searching = Boolean(text.trim() || person !== "all" || verdict !== "all" || from || to);
  const needle = text.trim().toLocaleLowerCase();
  const results = searching
    ? claims.filter((claim) => {
        const day = claim.created_at.slice(0, 10);
        return (
          (!needle ||
            claim.claim_text.toLocaleLowerCase().includes(needle) ||
            (claim.source_url ?? "").toLocaleLowerCase().includes(needle)) &&
          (person === "all" || claim.user_id === person) &&
          (verdict === "all" || claim.verdict === verdict) &&
          (!from || day >= from) &&
          (!to || day <= to)
        );
      })
    : claims.slice(0, 10);

  // People who have submitted at least one claim, by name
  const submitters = useMemo(() => {
    const ids = new Set(claims.map((x) => x.user_id));
    return profiles
      .filter((p) => ids.has(p.id))
      .map((p) => ({ id: p.id, label: name(p.id) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [claims, profiles, name]);

  function clear() {
    setText("");
    setPerson("all");
    setVerdict("all");
    setFrom("");
    setTo("");
  }

  if (q.isLoading || q.error) {
    return <DataState loading={q.isLoading} error={q.error} retry={() => void q.refetch()} />;
  }

  return (
    <div className="space-y-5">
      <form
        role="search"
        onSubmit={(e) => e.preventDefault()}
        className="grid gap-4 rounded-2xl border border-border bg-card p-5 shadow-sheet sm:grid-cols-2 lg:grid-cols-[2fr_1.2fr_1fr_1fr_1fr_auto] lg:items-end"
      >
        <Field label={c("الادعاء", "Claim")} htmlFor="m-text">
          <Input
            id="m-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={c("ابحث في نص الادعاء أو الرابط…", "Search claim text or link…")}
            className="h-10"
          />
        </Field>
        <Field label={c("مقدّم الادعاء", "Submitted by")} htmlFor="m-person">
          <select
            id="m-person"
            value={person}
            onChange={(e) => setPerson(e.target.value)}
            className={selectClass}
          >
            <option value="all">{c("الجميع", "Everyone")}</option>
            {submitters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label={c("الحكم النهائي", "Final verdict")} htmlFor="m-verdict">
          <select
            id="m-verdict"
            value={verdict}
            onChange={(e) => setVerdict(e.target.value)}
            className={selectClass}
          >
            <option value="all">{c("كل الأحكام", "All verdicts")}</option>
            {VERDICTS.map((v) => (
              <option key={v} value={v}>
                {t(`v.${v}` as TKey)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={c("من تاريخ", "From")} htmlFor="m-from">
          <Input
            id="m-from"
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
            className="h-10"
          />
        </Field>
        <Field label={c("إلى تاريخ", "To")} htmlFor="m-to">
          <Input
            id="m-to"
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
            className="h-10"
          />
        </Field>
        <Button
          type="button"
          variant="outline"
          className="h-10"
          onClick={clear}
          disabled={!searching}
        >
          {c("مسح", "Clear")}
        </Button>
      </form>

      <ResultsTable
        heading={
          searching
            ? c(
                `${results.length} نتيجة`,
                `${results.length} result${results.length === 1 ? "" : "s"}`,
              )
            : c("أحدث 10 ادعاءات", "Latest 10 claims")
        }
        columns={[
          c("التاريخ", "Date"),
          c("الوقت", "Time"),
          c("الادعاء", "Claim"),
          c("مقدّم الادعاء", "Submitted by"),
          c("الحكم النهائي", "Final verdict"),
          c("الحالة", "Status"),
        ]}
        empty={
          searching
            ? c("لا توجد ادعاءات مطابقة.", "No claims match this search.")
            : c("لم يقدّم الفريق أي ادعاء بعد.", "The team hasn't submitted any claims yet.")
        }
        rows={results.map((claim) => ({
          key: claim.id,
          onOpen: () => void navigate({ to: "/history/$id", params: { id: claim.id } }),
          cells: [
            <span className="whitespace-nowrap text-ink">{date(claim.created_at)}</span>,
            <span className="whitespace-nowrap tabular-nums text-muted-foreground">
              {time(claim.created_at)}
            </span>,
            <span className="line-clamp-2 max-w-md text-ink" dir="auto">
              {claim.claim_text}
            </span>,
            <span className="whitespace-nowrap font-medium text-ink">{name(claim.user_id)}</span>,
            <VerdictBadge verdict={claim.verdict} />,
            <StatusPill claim={claim} c={c} />,
          ],
        }))}
      />
    </div>
  );
}

/* ---------- Reports ---------- */

type ReportRow = {
  id: string;
  title: string;
  body: string;
  verdict: string | null;
  claim_id: string | null;
  user_id: string;
  created_at: string;
};

function ReportsTab({ c }: { c: Copy }) {
  const q = useReports();
  const { data: claims = [] } = useClaims();
  const { name } = useNames();
  const { date, time } = useDateTime();
  const [text, setText] = useState("");
  const [open, setOpen] = useState<ReportRow | null>(null);

  const claimById = useMemo(() => new Map(claims.map((x) => [x.id, x])), [claims]);
  const reports = (q.data ?? []) as ReportRow[];
  const needle = text.trim().toLocaleLowerCase();
  const searching = Boolean(needle);
  const results = searching
    ? reports.filter((r) =>
        [r.title, r.body, name(r.user_id)].some((s) => s.toLocaleLowerCase().includes(needle)),
      )
    : reports.slice(0, 10);

  if (q.isLoading || q.error) {
    return <DataState loading={q.isLoading} error={q.error} retry={() => void q.refetch()} />;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sheet">
        <Field label={c("بحث في التقارير", "Search reports")} htmlFor="r-text">
          <Input
            id="r-text"
            role="searchbox"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={c("العنوان أو النص أو اسم الموظف…", "Title, text or staff name…")}
            className="h-10 max-w-xl"
          />
        </Field>
      </div>

      <ResultsTable
        heading={
          searching
            ? c(
                `${results.length} نتيجة`,
                `${results.length} result${results.length === 1 ? "" : "s"}`,
              )
            : c("أحدث 10 تقارير", "Latest 10 reports")
        }
        columns={[
          c("التاريخ", "Date"),
          c("الوقت", "Time"),
          c("التقرير", "Report"),
          c("مقدّم التقرير", "Submitted by"),
          c("الحكم", "Verdict"),
          c("حالة الادعاء", "Claim status"),
        ]}
        empty={
          searching
            ? c("لا توجد تقارير مطابقة.", "No reports match this search.")
            : c("لا توجد تقارير بعد.", "No reports yet.")
        }
        rows={results.map((r) => ({
          key: r.id,
          onOpen: () => setOpen(r),
          cells: [
            <span className="whitespace-nowrap text-ink">{date(r.created_at)}</span>,
            <span className="whitespace-nowrap tabular-nums text-muted-foreground">
              {time(r.created_at)}
            </span>,
            <span className="line-clamp-2 max-w-md font-medium text-ink" dir="auto">
              {r.title}
            </span>,
            <span className="whitespace-nowrap text-ink">{name(r.user_id)}</span>,
            <VerdictBadge verdict={r.verdict} />,
            <StatusPill claim={r.claim_id ? claimById.get(r.claim_id) : undefined} c={c} />,
          ],
        }))}
      />

      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="pe-8 leading-8" dir="auto">
              {open?.title}
            </DialogTitle>
          </DialogHeader>
          {open && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <VerdictBadge verdict={open.verdict} />
                <span>{name(open.user_id)}</span>
                <span>
                  {date(open.created_at)} · {time(open.created_at)}
                </span>
              </div>
              <pre
                className="whitespace-pre-wrap rounded-xl bg-secondary p-4 font-sans text-sm leading-7 text-ink"
                dir="auto"
              >
                {open.body}
              </pre>
              {open.claim_id && (
                <Button asChild variant="outline">
                  <Link to="/history/$id" params={{ id: open.claim_id }}>
                    {c("افتح الادعاء المرتبط", "Open the linked claim")}
                  </Link>
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- AI fact-check results ---------- */

function AiTab({ c }: { c: Copy }) {
  const q = useClaims();
  const { name } = useNames();
  const { date, time } = useDateTime();
  const [text, setText] = useState("");
  const [open, setOpen] = useState<ClaimRow | null>(null);

  // Claims the AI has analysed (it sets confidence and the analysis)
  const checked = (q.data ?? []).filter((x) => x.status === "checked" && x.confidence !== null);
  const needle = text.trim().toLocaleLowerCase();
  const searching = Boolean(needle);
  const results = searching
    ? checked.filter((x) =>
        [x.claim_text, x.summary ?? "", name(x.user_id)].some((s) =>
          s.toLocaleLowerCase().includes(needle),
        ),
      )
    : checked.slice(0, 10);

  if (q.isLoading || q.error) {
    return <DataState loading={q.isLoading} error={q.error} retry={() => void q.refetch()} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-sheet">
        <div className="w-full max-w-xl">
          <Field label={c("بحث في نتائج الذكاء الاصطناعي", "Search AI results")} htmlFor="a-text">
            <Input
              id="a-text"
              role="searchbox"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={c("الادعاء أو الملخص أو اسم الموظف…", "Claim, summary or staff name…")}
              className="h-10"
            />
          </Field>
        </div>
        <Button asChild>
          <Link to="/check">{c("شغّل فحصاً جديداً", "Run a new AI check")}</Link>
        </Button>
      </div>

      <ResultsTable
        heading={
          searching
            ? c(
                `${results.length} نتيجة`,
                `${results.length} result${results.length === 1 ? "" : "s"}`,
              )
            : c("أحدث 10 فحوص بالذكاء الاصطناعي", "Latest 10 AI checks")
        }
        columns={[
          c("التاريخ", "Date"),
          c("الوقت", "Time"),
          c("الادعاء", "Claim"),
          c("مقدّم الادعاء", "Submitted by"),
          c("حكم الذكاء الاصطناعي", "AI verdict"),
          c("الثقة", "Confidence"),
        ]}
        empty={
          searching
            ? c("لا توجد نتائج مطابقة.", "No AI results match this search.")
            : c(
                "لم يُفحص أي ادعاء بالذكاء الاصطناعي بعد.",
                "No claims have been checked by the AI yet.",
              )
        }
        rows={results.map((claim) => ({
          key: claim.id,
          onOpen: () => setOpen(claim),
          cells: [
            <span className="whitespace-nowrap text-ink">{date(claim.created_at)}</span>,
            <span className="whitespace-nowrap tabular-nums text-muted-foreground">
              {time(claim.created_at)}
            </span>,
            <span className="block max-w-md">
              <span className="line-clamp-1 text-ink" dir="auto">
                {claim.claim_text}
              </span>
              {claim.summary && (
                <span className="mt-0.5 line-clamp-1 text-xs text-muted-foreground" dir="auto">
                  {claim.summary}
                </span>
              )}
            </span>,
            <span className="whitespace-nowrap text-ink">{name(claim.user_id)}</span>,
            <VerdictBadge verdict={claim.verdict} />,
            <span className="tabular-nums text-ink">{claim.confidence}%</span>,
          ],
        }))}
      />

      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="pe-8 leading-8" dir="auto">
              {open?.claim_text}
            </DialogTitle>
          </DialogHeader>
          {open && (
            <>
              <p className="text-sm text-muted-foreground">
                {name(open.user_id)} · {date(open.created_at)} · {time(open.created_at)}
              </p>
              <AnalysisView claim={open} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
