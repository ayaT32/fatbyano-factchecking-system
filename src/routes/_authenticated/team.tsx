import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Eye, Loader2, ShieldCheck, UserRoundCog, UsersRound } from "lucide-react";
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
  const publishedClaims = (claimsQuery.data ?? []).filter((claim) => claim.is_published);
  const adminCount = roles.filter((role) => role.role === "admin").length;

  async function changeRole(userId: string) {
    if (changingUser) return;
    const currentRole = roles.find((role) => role.user_id === userId);
    if (!currentRole) return;
    if (currentRole.role === "admin" && adminCount <= 1) {
      setError(c("لا يمكن إزالة صلاحية آخر مدير.", "The last administrator cannot be demoted."));
      return;
    }

    setChangingUser(userId);
    setError("");
    try {
      const { error: updateError } = await supabase
        .from("user_roles")
        .update({ role: currentRole.role === "admin" ? "staff" : "admin" })
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
                          {role?.role === "admin"
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
                              (role.role === "admin" && adminCount <= 1)
                            }
                            onClick={() => void changeRole(profile.id)}
                          >
                            {changingUser === profile.id ? (
                              <Loader2 className="animate-spin" />
                            ) : (
                              <ShieldCheck />
                            )}
                            {role?.role === "admin"
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

          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <UsersRound className="size-5 text-primary" />
                <h2 className="text-lg font-bold text-ink">
                  {c("سجل التحقيقات المنشورة", "Published investigation log")}
                </h2>
              </div>
              <span className="text-xs text-muted-foreground">
                {publishedClaims.length} {c("تحقيق", "reviews")}
              </span>
            </div>
            {!publishedClaims.length ? (
              <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
                {c(
                  "ستظهر هنا التحقيقات بعد نشرها من قبل المدققين.",
                  "Published reviews will appear here after fact-checkers submit them.",
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
                    {publishedClaims.map((claim, index) => {
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
