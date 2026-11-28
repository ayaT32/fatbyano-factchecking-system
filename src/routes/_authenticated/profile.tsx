import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VerdictBadge } from "@/components/verdict-badge";
import { supabase } from "@/integrations/supabase/client";
import { employeeId, getPasswordRequirements, isStrongPassword } from "@/lib/auth";
import { pageMeta } from "@/lib/desk";
import { useI18n } from "@/lib/i18n";
import { useClaims, useMe, type ClaimRow } from "@/lib/session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () =>
    pageMeta("Profile", "Your Fatabyyano account: your claims history, name and settings."),
  component: ProfilePage,
});

function ProfilePage() {
  const { lang } = useI18n();
  const c = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const { data: me } = useMe();
  const { data: claims = [], isLoading } = useClaims();

  const mine = useMemo(
    () => (me ? claims.filter((claim) => claim.user_id === me.user.id) : []),
    [claims, me],
  );
  const monthAgo = Date.now() - 30 * 864e5;
  const stats = [
    { label: c("كل ادعاءاتي", "All my claims"), value: mine.length },
    { label: c("منشورة للفريق", "Published"), value: mine.filter((x) => x.is_published).length },
    {
      label: c("آخر 30 يوماً", "Last 30 days"),
      value: mine.filter((x) => new Date(x.created_at).getTime() > monthAgo).length,
    },
  ];

  if (!me) return null;
  const name = me.profile?.full_name || me.user.email?.split("@")[0] || "";
  const date = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "ar" ? "ar" : "en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  return (
    <div>
      <PageHeader eyebrow={c("الملف الشخصي", "Profile")} title={name} />

      <div className="grid gap-6 lg:grid-cols-[300px_1fr] lg:items-start">
        {/* Account summary */}
        <aside className="sheet p-6">
          <span className="grid size-16 place-items-center rounded-2xl bg-ink font-display text-2xl font-extrabold text-white">
            {name.slice(0, 1).toLocaleUpperCase()}
          </span>
          <p className="mt-4 font-display text-xl font-bold text-ink">{name}</p>
          <p className="mt-1 break-all text-sm text-muted-foreground">{me.user.email}</p>
          <span className="mt-3 inline-flex rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-ink">
            {me.isAdmin ? c("الإدارة", "Management") : c("مدقق حقائق", "Fact-checker")}
          </span>

          <dl className="mt-6 space-y-3 border-t border-border pt-5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{c("الرقم الداخلي", "Internal ID")}</dt>
              <dd className="font-medium tabular-nums text-ink">{employeeId(me.user.id)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{c("عضو منذ", "Member since")}</dt>
              <dd className="font-medium text-ink">{date(me.user.created_at)}</dd>
            </div>
          </dl>

          <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-border pt-5 text-center">
            {stats.map((s) => (
              <div key={s.label}>
                <dd className="font-display text-2xl font-extrabold tabular-nums text-ink">
                  {s.value}
                </dd>
                <dt className="mt-1 text-[11px] leading-4 text-muted-foreground">{s.label}</dt>
              </div>
            ))}
          </dl>
        </aside>

        <Tabs defaultValue="history" dir={lang === "ar" ? "rtl" : "ltr"}>
          <TabsList>
            <TabsTrigger value="history">{c("سجل الادعاءات", "Claims history")}</TabsTrigger>
            <TabsTrigger value="settings">{c("الإعدادات", "Settings")}</TabsTrigger>
          </TabsList>
          <TabsContent value="history" className="mt-4">
            <ClaimsHistory claims={mine} loading={isLoading} />
          </TabsContent>
          <TabsContent value="settings" className="mt-4 space-y-6">
            <NameSettings initial={me.profile?.full_name ?? ""} userId={me.user.id} />
            <LanguageSettings />
            <PasswordSettings />
            <SignOutSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ClaimsHistory({ claims, loading }: { claims: ClaimRow[]; loading: boolean }) {
  const { lang } = useI18n();
  const c = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const [query, setQuery] = useState("");
  const shown = claims.filter((x) =>
    x.claim_text.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );

  return (
    <section className="sheet p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl text-ink">{c("ادعاءاتي", "My claims")}</h2>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={c("ابحث في ادعاءاتك…", "Search your claims…")}
          className="h-10 w-full sm:w-64"
        />
      </div>
      {loading ? (
        <p className="py-10 text-center text-muted-foreground">{c("جارٍ التحميل…", "Loading…")}</p>
      ) : shown.length === 0 ? (
        <div className="py-10 text-center text-muted-foreground">
          <p>
            {claims.length === 0
              ? c("لم تفحص أي ادعاء بعد.", "You haven't checked any claims yet.")
              : c("لا نتائج مطابقة.", "No matching claims.")}
          </p>
          {claims.length === 0 && (
            <Button asChild className="mt-4">
              <Link to="/check">{c("ابدأ فحصاً", "Start a check")}</Link>
            </Button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {shown.map((claim) => (
            <li key={claim.id}>
              <Link
                to="/history/$id"
                params={{ id: claim.id }}
                className="-mx-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl px-3 py-3.5 hover:bg-secondary"
              >
                <VerdictBadge verdict={claim.verdict} />
                <span className="min-w-0 flex-1 basis-56 line-clamp-1 text-sm text-ink" dir="auto">
                  {claim.claim_text}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium",
                    claim.is_published ? "bg-ink text-white" : "bg-secondary text-ink",
                  )}
                >
                  {claim.status !== "checked"
                    ? c("قيد الفحص", "In progress")
                    : claim.is_published
                      ? c("منشور", "Published")
                      : c("مسودة خاصة", "Private draft")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(claim.created_at).toLocaleDateString(lang === "ar" ? "ar" : "en-GB")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="sheet p-6">
      <h2 className="text-lg text-ink">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function NameSettings({ initial, userId }: { initial: string; userId: string }) {
  const { lang } = useI18n();
  const c = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const qc = useQueryClient();
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  useEffect(() => setName(initial), [initial]);
  const trimmed = name.trim();

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!trimmed || trimmed === initial) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: trimmed.slice(0, 120) })
        .eq("id", userId);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["me"] });
      toast.success(c("تم حفظ الاسم", "Name saved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsCard
      title={c("الاسم", "Name")}
      description={c("يظهر لفريقك وفي التقارير.", "Shown to your team and on reports.")}
    >
      <form onSubmit={save} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Label htmlFor="profile-name">{c("الاسم الكامل", "Full name")}</Label>
          <Input
            id="profile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            autoComplete="name"
            className="mt-2 h-11"
          />
        </div>
        <Button type="submit" className="h-11" disabled={busy || !trimmed || trimmed === initial}>
          {busy ? c("جارٍ الحفظ…", "Saving…") : c("حفظ", "Save")}
        </Button>
      </form>
    </SettingsCard>
  );
}

function LanguageSettings() {
  const { lang, setLang } = useI18n();
  const c = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const options = [
    { value: "ar" as const, label: "العربية" },
    { value: "en" as const, label: "English" },
  ];
  return (
    <SettingsCard
      title={c("لغة الواجهة", "Interface language")}
      description={c("تُحفظ على هذا الجهاز.", "Saved on this device.")}
    >
      <div role="radiogroup" className="inline-flex rounded-xl bg-secondary p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={lang === o.value}
            onClick={() => setLang(o.value)}
            className={cn(
              "rounded-lg px-5 py-2 text-sm font-semibold",
              lang === o.value
                ? "bg-card text-ink shadow-sm"
                : "text-muted-foreground hover:text-ink",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </SettingsCard>
  );
}

function PasswordSettings() {
  const { lang } = useI18n();
  const c = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const rules = getPasswordRequirements(password);
  const ruleLabels: Record<keyof typeof rules, string> = {
    length: c("8 أحرف على الأقل", "At least 8 characters"),
    uppercase: c("حرف كبير", "An uppercase letter"),
    lowercase: c("حرف صغير", "A lowercase letter"),
    number: c("رقم", "A number"),
    symbol: c("رمز", "A symbol"),
  };
  const ready = isStrongPassword(password) && password === confirm;

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!ready) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setConfirm("");
      toast.success(c("تم تغيير كلمة المرور", "Password changed"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsCard title={c("كلمة المرور", "Password")}>
      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="new-password">{c("كلمة المرور الجديدة", "New password")}</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="mt-2 h-11"
            />
          </div>
          <div>
            <Label htmlFor="confirm-password">{c("تأكيد كلمة المرور", "Confirm password")}</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className="mt-2 h-11"
            />
          </div>
        </div>
        {password && (
          <ul className="flex flex-wrap gap-2 text-xs">
            {(Object.keys(rules) as (keyof typeof rules)[]).map((k) => (
              <li
                key={k}
                className={cn(
                  "rounded-full px-2.5 py-1",
                  rules[k] ? "bg-ink text-white" : "bg-secondary text-muted-foreground",
                )}
              >
                {ruleLabels[k]}
              </li>
            ))}
            {confirm && password !== confirm && (
              <li className="rounded-full bg-destructive/10 px-2.5 py-1 text-destructive">
                {c("كلمتا المرور غير متطابقتين", "Passwords don't match")}
              </li>
            )}
          </ul>
        )}
        <Button type="submit" className="h-11" disabled={busy || !ready}>
          {busy ? c("جارٍ الحفظ…", "Saving…") : c("تغيير كلمة المرور", "Change password")}
        </Button>
      </form>
    </SettingsCard>
  );
}

function SignOutSettings() {
  const { lang } = useI18n();
  const c = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  }

  return (
    <SettingsCard
      title={c("تسجيل الخروج", "Sign out")}
      description={c("أنهِ جلستك على هذا الجهاز.", "End your session on this device.")}
    >
      <Button variant="outline" className="h-11" onClick={() => void signOut()}>
        {c("تسجيل الخروج", "Sign out")}
      </Button>
    </SettingsCard>
  );
}
