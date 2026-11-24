import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Eye, Loader2, MessageCircle, ScanSearch, Send, ShieldCheck, UserRoundCog, UsersRound } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DataState, useCopy } from "@/components/desk-ui";
import { PageHeader } from "@/components/page-header";
import { VerdictBadge } from "@/components/verdict-badge";
import { useClaims, useMe, useProfiles } from "@/lib/session";
import { useI18n } from "@/lib/i18n";
import { employeeId } from "@/lib/auth";
import { requireAdmin } from "@/lib/route-auth";
import { pageMeta } from "@/lib/desk";
import { supabase } from "@/integrations/supabase/client";
import { AnalysisView } from "@/components/desk-ui";
import type { ClaimRow } from "@/lib/session";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/team")({
  beforeLoad: requireAdmin,
  head: () =>
    pageMeta("Team activity", "Review published fact-checks and manage Fatabyyano staff access."),
  component: TeamPage,
});

function TeamPage() {
  const { lang, t } = useI18n();
  const c = useCopy();
  const { data: currentUser } = useMe();
  const claimsQuery = useClaims();
  const profilesQuery = useProfiles();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<ClaimRow | null>(null);
  const [changingUser, setChangingUser] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [chatText, setChatText] = useState("");
  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([]);
  const rolesQuery = useQuery({
    queryKey: ["team-roles"],
    queryFn: async () => {
      const { data, error: queryError } = await supabase
        .from("user_roles")
        .select("id,user_id,role");
      if (queryError) throw queryError;
      return data;
    },
  });

  const profiles = profilesQuery.data ?? [];
  const roles = rolesQuery.data ?? [];
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const allClaims = claimsQuery.data ?? [];
  const adminCount = roles.filter((role) => role.role === "manager").length;

  const normalizedEmployeeQuery = employeeQuery.trim().toLocaleLowerCase();
  const filteredClaims = allClaims.filter((claim) => {
    if (!normalizedEmployeeQuery) return true;
    const profile = profileById.get(claim.user_id);
    const employeeName = profile?.full_name || profile?.email || "";
    const searchableDate = new Date(claim.created_at).toLocaleString(lang === "ar" ? "ar" : "en-GB");
    const searchable = [
      employeeName,
      employeeId(claim.user_id),
      claim.claim_text,
      claim.verdict,
      searchableDate,
      claim.created_at.slice(0, 10),
    ].join(" ").toLocaleLowerCase();
    return searchable.includes(normalizedEmployeeQuery);
  });

  function askActivityAssistant(event: React.FormEvent) {
    event.preventDefault();
    const question = chatText.trim();
    if (!question) return;
    setChatMessages((messages) => [...messages, { role: "user", text: question }]);
    setChatText("");
    const query = question.toLocaleLowerCase();
    const matchingProfile = profiles.find((profile) =>
      [profile.full_name, profile.email, employeeId(profile.id)]
        .filter(Boolean)
        .some((value) => query.includes(value?.toLocaleLowerCase() ?? "")),
    );
    const dateMatch = question.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    let matches = allClaims;
    if (matchingProfile) matches = matches.filter((claim) => claim.user_id === matchingProfile.id);
    const dateValue = dateMatch?.[1];
    if (dateValue) matches = matches.filter((claim) => claim.created_at.startsWith(dateValue));
    const answer =
      matches.length === 0
        ? c(
            "لا توجد فحوصات تطابق الاسم أو التاريخ المطلوب.",
            "No checks match that employee or date.",
          )
        : matchingProfile
          ? c(
              `وجدت ${matches.length} فحصاً لـ ${matchingProfile.full_name || matchingProfile.email}. آخر نتيجة: ${matches[0]?.verdict || "غير متاح"}.`,
              `Found ${matches.length} check(s) for ${matchingProfile.full_name || matchingProfile.email}. Latest verdict: ${matches[0]?.verdict || "unavailable"}.`,
            )
          : dateValue
            ? c(
                  `وجدت ${matches.length} فحصاً في ${dateValue}.`,
                  `Found ${matches.length} check(s) on ${dateValue}.`,
              )
            : c(
                `يوجد حالياً ${allClaims.length} فحصاً مسجلاً للفريق.`,
                `There are currently ${allClaims.length} team checks.`,
              );
    setChatMessages((messages) => [...messages, { role: "assistant", text: answer }]);
  }

  async function changeRole(userId: string) {
    if (changingUser) return;
    const currentRole = roles.find((role) => role.user_id === userId);
    if (!currentRole) return;
    if (currentRole.role === "manager" && adminCount <= 1) {
      setError(c("لا يمكن إزالة صلاحية آخر مدير.", "The last administrator cannot be demoted."));
      return;
    }

    setChangingUser(userId);
    setError("");
    try {
      const { error: updateError } = await supabase
        .from("user_roles")
        .update({ role: currentRole.role === "manager" ? "fact_checker" : "manager" })
        .eq("id", currentRole.id);
      if (updateError) throw updateError;
      await queryClient.invalidateQueries({ queryKey: ["team-roles"] });
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setChangingUser(null);
    }
  }

  const loadError = claimsQuery.error || profilesQuery.error || rolesQuery.error;
  const isLoading = claimsQuery.isLoading || profilesQuery.isLoading || rolesQuery.isLoading;

  return (
    <div>
      <PageHeader
        eyebrow={c("بوابة الإدارة", "MANAGEMENT PORTAL")}
        title={c("نشاط الفريق", "Team activity")}
        actions={
          <Button asChild>
            <Link to="/check">
              <ScanSearch />
              {c("فحص كإدارة", "Check as management")}
            </Link>
          </Button>
        }
      />
      {loadError || isLoading ? (
        <DataState
          loading={isLoading}
          error={loadError}
          retry={() => {
            void claimsQuery.refetch();
            void profilesQuery.refetch();
            void rolesQuery.refetch();
          }}
        />
      ) : (
        <>
          <section className="mb-10">
            <div className="mb-4 flex items-center gap-2">
              <UserRoundCog className="size-5 text-primary" />
              <h2 className="text-lg font-bold text-ink">{c("صلاحيات الفريق", "Team access")}</h2>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full min-w-[620px] text-start text-sm">
                <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-start font-medium">{c("الموظف", "Employee")}</th>
                    <th className="px-4 py-3 text-start font-medium">{t("internalId")}</th>
                    <th className="px-4 py-3 text-start font-medium">{c("الدور", "Role")}</th>
                    <th className="px-4 py-3 text-end font-medium">{c("إجراء", "Action")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {profiles.map((profile, index) => {
                    const role = roles.find((item) => item.user_id === profile.id);
                    return (
                      <tr key={profile.id} className={index % 2 ? "bg-white" : "bg-card"}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="grid size-9 place-items-center rounded-full bg-primary/10 font-bold text-primary">
                              {(profile.full_name || profile.email || "?")
                                .slice(0, 1)
                                .toLocaleUpperCase()}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate font-semibold text-ink">
                                {profile.full_name || profile.email}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {profile.email}
                              </span>
                            </span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">
                          {employeeId(profile.id)}
                        </td>
                        <td className="px-4 py-3">
                          {role?.role === "manager"
                            ? c("الإدارة", "Management")
                            : c("مدقق", "Fact-checker")}
                        </td>
                        <td className="px-4 py-3 text-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={
                              !role ||
                              changingUser !== null ||
                              currentUser?.user.id === profile.id ||
                              (role.role === "manager" && adminCount <= 1)
                            }
                            onClick={() => void changeRole(profile.id)}
                          >
                            {changingUser === profile.id ? (
                              <Loader2 className="animate-spin" />
                            ) : (
                              <ShieldCheck />
                            )}
                            {role?.role === "manager"
                              ? c("تحويل لمدقق", "Make fact-checker")
                              : c("ترقية للإدارة", "Make management")}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {!profiles.length && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                        {c("لا يوجد أعضاء بعد.", "No team members yet.")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {error && (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {error}
              </p>
            )}
          </section>

          <section className="mb-10">
            <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
              <div className="rounded-2xl border border-border bg-card p-5">
                <label className="mb-3 block text-sm font-semibold text-ink">
                  {c("بحث في نشاط الموظفين", "Search employee activity")}
                </label>
                <Input
                  value={employeeQuery}
                  onChange={(event) => setEmployeeQuery(event.target.value)}
                  placeholder={c(
                    "اكتب اسم الموظف أو تاريخاً أو ادعاءً...",
                    "Type an employee name, date, or claim...",
                  )}
                />
              </div>
              <div className="rounded-2xl border border-border bg-ink p-5 text-white">
                <div className="mb-3 flex items-center gap-2">
                  <MessageCircle className="size-5 text-primary" />
                  <h2 className="font-bold">{c("مساعد نشاط الفريق", "Team activity assistant")}</h2>
                </div>
                <div className="mb-3 max-h-28 space-y-2 overflow-y-auto text-sm">
                  {!chatMessages.length ? (
                    <p className="text-white/55">
                      {c(
                        "اسألني عن اسم موظف أو تاريخ، مثل: فحوصات أحمد 2026-11-23",
                        "Ask about an employee or date, for example: Ahmed checks 2026-11-23",
                      )}
                    </p>
                  ) : (
                    chatMessages.map((message, index) => (
                      <p
                        key={`${message.role}-${index}`}
                        className={message.role === "user" ? "text-primary" : "text-white/80"}
                      >
                        {message.role === "assistant" ? "● " : ""}
                        {message.text}
                      </p>
                    ))
                  )}
                </div>
                <form onSubmit={askActivityAssistant} className="flex gap-2">
                  <Input
                    value={chatText}
                    onChange={(event) => setChatText(event.target.value)}
                    placeholder={c("اكتب سؤالاً...", "Type a question...")}
                    className="h-10 border-white/15 bg-white/10 text-white placeholder:text-white/40"
                  />
                  <Button type="submit" size="icon" disabled={!chatText.trim()} aria-label={c("إرسال", "Send")}>
                    <Send className="size-4" />
                  </Button>
                </form>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <UsersRound className="size-5 text-primary" />
                <h2 className="text-lg font-bold text-ink">
                  {c("سجل التحقيقات", "Investigation log")}
                </h2>
              </div>
              <span className="text-xs text-muted-foreground">
                {filteredClaims.length} {c("تحقيق", "reviews")}
              </span>
            </div>
            {!filteredClaims.length ? (
              <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
                {c(
                  "لا توجد تحقيقات تطابق بحثك.",
                  "No investigations match your search.",
                )}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                <table className="w-full min-w-[900px] text-start text-sm">
                  <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      {[
                        c("الموظف", "Employee"),
                        t("internalId"),
                        c("موضوع الادعاء", "Claim subject"),
                        c("التاريخ والوقت", "Processed at"),
                        t("verdict"),
                        c("التقرير", "Report"),
                      ].map((heading) => (
                        <th key={heading} className="px-4 py-3 text-start font-medium">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredClaims.map((claim, index) => {
                      const profile = profileById.get(claim.user_id);
                      return (
                        <tr key={claim.id} className={index % 2 ? "bg-white" : "bg-card"}>
                          <td className="whitespace-nowrap px-4 py-3">
                            <span className="inline-flex items-center gap-2">
                              <span className="grid size-8 place-items-center rounded-full bg-ink/5 text-xs font-bold text-ink">
                                {(profile?.full_name || profile?.email || "?")
                                  .slice(0, 1)
                                  .toLocaleUpperCase()}
                              </span>
                              {profile?.full_name ||
                                profile?.email ||
                                c("عضو الفريق", "Team member")}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">
                            {employeeId(claim.user_id)}
                          </td>
                          <td className="max-w-[260px] px-4 py-3">
                            <p className="line-clamp-2 leading-6" dir="auto">
                              {claim.claim_text}
                            </p>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                            {new Date(claim.created_at).toLocaleString(
                              lang === "ar" ? "ar" : "en-GB",
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <VerdictBadge verdict={claim.verdict} />
                          </td>
                          <td className="px-4 py-3">
                            <Button type="button" size="sm" onClick={() => setSelected(claim)}>
                              <Eye />
                              {c("عرض التقرير الكامل", "View full report")}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="pe-8 leading-8" dir="auto">
              {selected?.claim_text}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div>
              <div className="mb-6 flex flex-wrap items-center gap-3 border-b pb-5">
                <VerdictBadge verdict={selected.verdict} />
                <span className="text-sm text-muted-foreground">
                  {new Date(selected.created_at).toLocaleString(lang === "ar" ? "ar" : "en-GB")}
                </span>
                {selected.source_url && (
                  <a
                    className="break-all text-sm text-primary underline"
                    href={selected.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {selected.source_url}
                  </a>
                )}
              </div>
              <AnalysisView claim={selected} />
              <div className="mt-8 border-t-2 border-primary/40 bg-primary/5 px-4 py-3 text-center text-xs font-semibold tracking-wide text-ink">
                {c("نسخة مراجعة — الموظف المسؤول", "AUDIT COPY — RESPONSIBLE EMPLOYEE")}:{" "}
                {profileById.get(selected.user_id)?.full_name ||
                  profileById.get(selected.user_id)?.email ||
                  c("عضو الفريق", "Team member")}{" "}
                · {employeeId(selected.user_id)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
