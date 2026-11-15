import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useWebMCP } from "use-webmcp-tool";
import { runWebMCPTool } from "@/lib/webmcp-telemetry";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, ScanSearch, ArrowUpRight, Printer, Image as ImageIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ClaimFilters, DataState, useCopy } from "@/components/desk-ui";
import { VerdictBadge } from "@/components/verdict-badge";
import { useClaims, useMe } from "@/lib/session";
import { useI18n } from "@/lib/i18n";
import { pageMeta, downloadText } from "@/lib/desk";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/history/")({
  head: () =>
    pageMeta("Claims history", "Search Fattabyno's saved claims and verification research."),
  component: HistoryPage,
});

function HistoryPage() {
  const { t, lang } = useI18n();
  const c = useCopy();
  const q = useClaims();
  const navigate = useNavigate();
  const { data: me } = useMe();
  const [search, setSearch] = useState("");
  const [verdict, setVerdict] = useState("all");
  const [status, setStatus] = useState("all");
  const [media, setMedia] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const allClaims = me?.isAdmin ? (q.data ?? []).filter((r) => r.is_published) : (q.data ?? []);
  const rows = allClaims.filter((r) => {
    const isVerified = r.verdict === "true" || r.verdict === "partly_true";
    const isDebunked = r.verdict === "false" || r.verdict === "misleading";
    const date = r.created_at.slice(0, 10);
    return (
      (verdict === "all" || r.verdict === verdict) &&
      (status === "all" ||
        (status === "pending" && r.status !== "checked") ||
        (status === "verified" && isVerified) ||
        (status === "debunked" && isDebunked)) &&
      (media === "all" || (media === "image" ? Boolean(r.image_path) : !r.image_path)) &&
      (!fromDate || date >= fromDate) &&
      (!toDate || date <= toDate) &&
      `${r.claim_text} ${r.category ?? ""}`.toLowerCase().includes(search.toLowerCase())
    );
  });
  const statusTabs = [
    { value: "all", label: c("الكل", "All") },
    { value: "pending", label: c("قيد المراجعة", "Pending") },
    { value: "verified", label: c("تم التحقق", "Verified") },
    { value: "debunked", label: c("تم دحضه", "Debunked") },
  ] as const;
  function openVisibleClaim(id: string) {
    if (typeof id !== "string" || !rows.some(row => row.id === id)) throw new Error("Claim is not in the current view.");
    return navigate({ to: "/history/$id", params: { id } });
  }
  useWebMCP({
    name: "read_visible_claims",
    description: "Read the claims currently shown in the archive, respecting all active filters.",
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: () => runWebMCPTool("read_visible_claims", () => {
      if (q.isLoading) return "Claims are still loading.";
      if (q.error) throw new Error("Claims could not be loaded.");
      return rows.length ? rows.slice(0, 40).map(row => `${row.id}: ${row.claim_text.slice(0, 240)} — ${row.verdict ?? "pending"}`).join("\n") + (rows.length > 40 ? `\nShowing first 40 of ${rows.length} visible claims.` : "") : "No matching claims.";
    }),
  });
  useWebMCP<{ id: string }>({
    name: "open_claim_research",
    description: "Open research for a claim currently shown in the archive, using its visible ID.",
    enabled: !q.isLoading && !q.error,
    inputSchema: { type: "object", properties: { id: { type: "string", description: "Claim ID from read_visible_claims." } }, required: ["id"], additionalProperties: false },
    execute: ({ id }) => runWebMCPTool("open_claim_research", async () => { await openVisibleClaim(id); return "Claim research opened."; }),
  });
  const imagePaths = [
    ...new Set(rows.slice(0, 40).flatMap((claim) => (claim.image_path ? [claim.image_path] : []))),
  ];
  const thumbnails = useQuery({
    queryKey: ["claim-thumbnails", imagePaths],
    enabled: imagePaths.length > 0,
    queryFn: async () => {
      const signed = await Promise.all(
        imagePaths.map(async (path) => {
          const { data, error } = await supabase.storage
            .from("claim-images")
            .createSignedUrl(path, 1800);
          if (error) throw error;
          return [path, data.signedUrl] as const;
        }),
      );
      return Object.fromEntries(signed);
    },
  });
  return (
    <div>
      <PageHeader
        eyebrow={c("أرشيف التحقق", "VERIFICATION ARCHIVE")}
        title={me?.isAdmin ? t("masterDatabase") : t("history")}
        actions={
          <Button asChild>
            <Link to="/check">
              <ScanSearch />
              {t("newCheck")}
            </Link>
          </Button>
        }
      />
      <div
        role="tablist"
        aria-label={c("حالة الادعاء", "Claim status")}
        className="no-print mb-5 flex flex-wrap gap-2"
      >
        {statusTabs.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={status === value}
            onClick={() => setStatus(value)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${status === value ? "bg-primary text-white" : "border border-border bg-card text-muted-foreground hover:text-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <ClaimFilters {...{ search, setSearch, verdict, setVerdict }} />
      <div className="no-print mb-5 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label htmlFor="history-from" className="text-xs font-medium text-muted-foreground">
            {c("من تاريخ", "From")}
          </label>
          <Input
            id="history-from"
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            className="h-10 w-40 bg-card"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="history-to" className="text-xs font-medium text-muted-foreground">
            {c("إلى تاريخ", "To")}
          </label>
          <Input
            id="history-to"
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            className="h-10 w-40 bg-card"
          />
        </div>
        <Select value={media} onValueChange={setMedia}>
          <SelectTrigger aria-label={c("نوع الوسيط", "Media type")} className="h-10 w-44 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{c("كل الوسائط", "All media")}</SelectItem>
            <SelectItem value="text">{c("نص فقط", "Text only")}</SelectItem>
            <SelectItem value="image">{c("صورة", "Image")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {rows.length} {c("ادعاء", "claims")}
        </p>
        <div className="no-print flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!rows.length}
            onClick={() => window.print()}
          >
            <Printer />
            {c("حفظ PDF", "Save as PDF")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={!rows.length}
            onClick={() =>
              downloadText(
                "fattabyno-claims.csv",
                [
                  ["Claim", "Verdict", "Confidence", "Category", "Date", "Media"],
                  ...rows.map((r) => [
                    r.claim_text,
                    r.verdict,
                    r.confidence,
                    r.category,
                    r.created_at,
                    r.image_path ? "image" : "text",
                  ]),
                ]
                  .map((row) =>
                    row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","),
                  )
                  .join("\n"),
                "text/csv;charset=utf-8",
              )
            }
          >
            <Download />
            {c("تصدير CSV", "Export CSV")}
          </Button>
        </div>
      </div>
      {q.isLoading || q.error || !rows.length ? (
        <DataState
          loading={q.isLoading}
          error={q.error}
          retry={() => void q.refetch()}
          empty={c("لا توجد ادعاءات مطابقة", "No matching claims")}
        />
      ) : (
        <>
          {thumbnails.error && (
            <p role="alert" className="mb-4 text-sm text-destructive">
              {thumbnails.error.message}
            </p>
          )}
          <div className="overflow-x-auto border-y bg-card">
            <table className="w-full min-w-[700px] text-start text-sm">
              <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  {[t("claimText"), t("verdict"), t("category"), t("date"), ""].map((h, i) => (
                    <th key={i} className="px-5 py-4 text-start font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="max-w-sm px-5 py-5">
                      <Link
                        to="/history/$id"
                        params={{ id: r.id }}
                        className="flex items-center gap-3 hover:text-primary"
                        onClick={(event) => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) { event.preventDefault(); void openVisibleClaim(r.id); } }}
                      >
                        <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted">
                          {r.image_path && thumbnails.data?.[r.image_path] ? (
                            <img
                              src={thumbnails.data[r.image_path]}
                              alt=""
                              className="size-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="size-5 text-muted-foreground" />
                          )}
                        </span>
                        <span className="line-clamp-2 font-medium leading-7" dir="auto">
                          {r.claim_text}
                        </span>
                      </Link>
                    </td>
                    <td className="px-5 py-5">
                      <VerdictBadge verdict={r.verdict} />
                    </td>
                    <td className="px-5 py-5 text-muted-foreground">{r.category ?? "—"}</td>
                    <td className="whitespace-nowrap px-5 py-5 text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString(lang === "ar" ? "ar" : "en-GB")}
                    </td>
                    <td className="px-3">
                      <Button asChild variant="ghost" size="icon" title={t("viewClaim")}>
                        <Link to="/history/$id" params={{ id: r.id }} aria-label={t("viewClaim")} onClick={(event) => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) { event.preventDefault(); void openVisibleClaim(r.id); } }}>
                          <ArrowUpRight />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
