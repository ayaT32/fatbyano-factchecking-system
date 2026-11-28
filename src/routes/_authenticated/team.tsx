import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, ScanSearch, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataState, useCopy } from "@/components/desk-ui";
import { PageHeader } from "@/components/page-header";
import { useClaims, useMe, useProfiles } from "@/lib/session";
import { useI18n } from "@/lib/i18n";
import { employeeId, hasManagementRole, isManagementRole, roleNames } from "@/lib/auth";
import { requireAdmin } from "@/lib/route-auth";
import { pageMeta } from "@/lib/desk";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/team")({
  beforeLoad: requireAdmin,
  head: () =>
    pageMeta("Team activity", "Review published fact-checks and manage Fatabyyano staff access."),
  component: TeamPage,
});

function TeamPage() {
  const { t } = useI18n();
  const c = useCopy();
  const { data: currentUser } = useMe();
  const claimsQuery = useClaims();
  const profilesQuery = useProfiles();
  const queryClient = useQueryClient();
  const [changingUser, setChangingUser] = useState<string | null>(null);
  const [error, setError] = useState("");
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
  // People (not rows) with a management role; an account can hold both roles
  const adminCount = new Set(
    roles.filter((role) => isManagementRole(role.role)).map((role) => role.user_id),
  ).size;

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
    const userRoles = roles.filter((role) => role.user_id === userId);
    if (!userRoles.length) return;
    const isManager = hasManagementRole(userRoles);
    if (isManager && adminCount <= 1) {
      setError(c("لا يمكن إزالة صلاحية آخر مدير.", "The last administrator cannot be demoted."));
      return;
    }
    const names = roleNames(roles);

    setChangingUser(userId);
    setError("");
    try {
      const managerRows = userRoles.filter((role) => isManagementRole(role.role));
      const staffRows = userRoles.filter((role) => !isManagementRole(role.role));
      // Role names differ between databases, so they are plain strings here
      const roleTable = supabase.from("user_roles") as unknown as {
        update: (v: { role: string }) => { eq: (k: string, v: string) => PromiseLike<{ error: unknown }> };
        delete: () => { in: (k: string, v: string[]) => PromiseLike<{ error: unknown }> };
      };
      let result: { error: unknown };
      if (isManager) {
        // Demote: drop the management row(s), or rename the only row to the staff role
        result = staffRows.length
          ? await roleTable.delete().in("id", managerRows.map((r) => r.id))
          : await roleTable.update({ role: names.staff }).eq("id", managerRows[0]!.id);
      } else {
        result = await roleTable.update({ role: names.manager }).eq("id", staffRows[0]!.id);
      }
      if (result.error) throw result.error;
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
            <h2 className="mb-4 text-lg font-bold text-ink">{c("صلاحيات الفريق", "Team access")}</h2>
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
                    const userRoles = roles.filter((item) => item.user_id === profile.id);
                    const role = userRoles[0];
                    const isManager = hasManagementRole(userRoles);
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
                          {isManager
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
                              (isManager && adminCount <= 1)
                            }
                            onClick={() => void changeRole(profile.id)}
                          >
                            {changingUser === profile.id ? (
                              <Loader2 className="animate-spin" />
                            ) : (
                              <ShieldCheck />
                            )}
                            {isManager
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
            <div className="grid gap-4">
              <div className="rounded-2xl border border-border bg-ink p-5 text-white">
                <h2 className="mb-3 font-bold">{c("مساعد نشاط الفريق", "Team activity assistant")}</h2>
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

          <p className="rounded-2xl border border-dashed border-border bg-card px-6 py-8 text-center text-sm text-muted-foreground">
            {c(
              "سجل الادعاءات والتقارير والبحث فيها انتقل إلى صفحة الإدارة.",
              "The claims and reports log, with search, is now on the Management page.",
            )}{" "}
            <Link to="/management" className="font-semibold text-ink underline">
              {c("افتح الإدارة", "Open Management")}
            </Link>
          </p>
        </>
      )}

    </div>
  );
}
