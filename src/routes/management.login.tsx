import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Logo, LangSwitch } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { hasManagementRole } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

async function isManager(userId: string) {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw error;
  return hasManagementRole(data);
}

/** The management portal's own sign-in. Same accounts as the staff sign-in, but it only
 * lets management accounts through; anyone else is signed straight back out. */
export const Route = createFileRoute("/management/login")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { denied?: boolean } =>
    s["denied"] === true || s["denied"] === "true" ? { denied: true } : {},
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user && (await isManager(data.user.id))) throw redirect({ to: "/management" });
  },
  head: () => ({
    meta: [
      { title: "Management sign in — Fatabyyano" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ManagementLogin,
});

function ManagementLogin() {
  const { lang } = useI18n();
  const c = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const { denied } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(
    denied
      ? c("هذا الحساب ليس لديه صلاحية الإدارة.", "This account doesn't have management access.")
      : "",
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
      if (!(await isManager(data.user.id))) {
        await supabase.auth.signOut();
        qc.clear();
        setError(
          c(
            "هذا الحساب ليس لديه صلاحية الإدارة. استخدم دخول الموظفين.",
            "This account doesn't have management access. Use the staff sign-in instead.",
          ),
        );
        return;
      }
      await qc.invalidateQueries({ queryKey: ["me"] });
      await navigate({ to: "/management" });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-ink text-white">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_80%_0%,rgba(197,70,153,0.28),transparent_45%),linear-gradient(140deg,#111114_20%,#242429_75%,#303034)]"
      />
      <div aria-hidden="true" className="hairline-grid absolute inset-0 -z-10" />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
        <Logo light />
        <LangSwitch light />
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-4 pb-16 sm:px-8 lg:grid-cols-2">
        <div className="max-w-md">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/55">
            {c("بوابة الإدارة", "Management portal")}
          </p>
          <h1 className="mt-4 text-4xl leading-tight sm:text-5xl">
            {c("كل ادعاء وتقرير", "Every claim and report")}
            <span className="text-shine block">{c("في مكان واحد.", "in one place.")}</span>
          </h1>
          <p className="mt-5 text-base leading-8 text-white/70">
            {c(
              "تابع ما يقدّمه فريق التحقق، وابحث في الادعاءات والتقارير، وراجع نتائج الذكاء الاصطناعي.",
              "Follow what the fact-checking team submits, search claims and reports, and review the AI's results.",
            )}
          </p>
        </div>

        <section className="w-full max-w-md justify-self-center rounded-3xl bg-white p-6 text-ink shadow-2xl sm:p-8 lg:justify-self-end">
          <h2 className="text-2xl">{c("دخول الإدارة", "Management sign in")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {c("لحسابات الإدارة فقط.", "For management accounts only.")}
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="mgmt-email">{c("البريد الإلكتروني", "Email")}</Label>
              <Input
                id="mgmt-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 h-11"
              />
            </div>
            <div>
              <Label htmlFor="mgmt-password">{c("كلمة المرور", "Password")}</Label>
              <Input
                id="mgmt-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 h-11"
              />
            </div>
            {error && (
              <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="h-11 w-full" disabled={busy}>
              {busy ? c("جارٍ الدخول…", "Signing in…") : c("دخول", "Sign in")}
            </Button>
          </form>
          <p className="mt-6 border-t border-border pt-5 text-sm text-muted-foreground">
            {c("لست من الإدارة؟", "Not management?")}{" "}
            <Link to="/auth" search={{ mode: "in" }} className="font-semibold text-ink underline">
              {c("دخول الموظفين", "Staff sign in")}
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
