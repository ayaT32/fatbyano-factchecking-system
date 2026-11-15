import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, MailCheck, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useI18n } from "@/lib/i18n";
import { Logo, LangSwitch } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPasswordRequirements, isStrongPassword, type PasswordRequirement } from "@/lib/auth";
import { oauthReturnPath } from "@/lib/oauth-return-path";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { mode?: "in" | "up"; next?: string } => ({
    mode: search["mode"] === "up" ? "up" : "in",
    next: oauthReturnPath(search["next"]),
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Fattabyno" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      {
        name: "description",
        content: "Staff and management sign-in for Fattabyno fact-checking desk.",
      },
      { property: "og:title", content: "Sign in — Fattabyno" },
      {
        property: "og:description",
        content: "Staff and management sign-in for Fattabyno fact-checking desk.",
      },
    ],
  }),
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      if (search.next && search.next !== "/" && !search.next.startsWith("/auth")) throw redirect({ href: search.next });
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);
      if (error) throw error;
      throw redirect({ to: roles?.some((role) => role.role === "admin") ? "/team" : "/dashboard" });
    }
  },
  component: AuthPage,
});

function AuthPage() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const next = search.next ?? "/";
  const returnUrl = () => new URL(next === "/" ? "/auth" : next, window.location.origin).href;
  const [mode, setMode] = useState<"in" | "up">(search.mode ?? "in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(60);
  const requirements = getPasswordRequirements(password);

  useEffect(() => {
    if (!pendingVerification || resendSeconds <= 0) return;
    const timer = window.setTimeout(() => setResendSeconds((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [pendingVerification, resendSeconds]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "up" && !isStrongPassword(password)) return;
    setBusy(true);
    try {
      if (mode === "in") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (next !== "/") { window.location.assign(next); return; }
        const { data: roles, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id);
        if (roleError) throw roleError;
        navigate({ to: roles?.some((role) => role.role === "admin") ? "/team" : "/dashboard" });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: returnUrl(), data: { full_name: name } },
        });
        if (error) throw error;
        if (data.session && data.user?.email_confirmed_at) {
          if (next !== "/") window.location.assign(next);
          else navigate({ to: "/dashboard" });
        } else {
          if (data.session) await supabase.auth.signOut();
          setPendingVerification(true);
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function resendVerification() {
    if (resendSeconds > 0 || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: returnUrl() } });
      if (error) throw error;
      setResendSeconds(60);
      toast.success(
        lang === "ar" ? "أُرسل رابط تأكيد جديد." : "A new verification link has been sent.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: new URL(`/auth?next=${encodeURIComponent(next)}`, window.location.origin).href,
    });
    if (r.error) toast.error(String(r.error.message ?? r.error));
    else if (!r.redirected) {
      if (next !== "/") window.location.assign(next);
      else navigate({ to: "/dashboard" });
    }
  }

  const ruleLabels: Record<PasswordRequirement, string> = {
    length: lang === "ar" ? "8 أحرف على الأقل" : "At least 8 characters",
    uppercase: lang === "ar" ? "حرف كبير" : "Uppercase letter",
    lowercase: lang === "ar" ? "حرف صغير" : "Lowercase letter",
    number: lang === "ar" ? "رقم" : "Number",
    symbol: lang === "ar" ? "رمز خاص" : "Special character",
  };
  const score = Object.values(requirements).filter(Boolean).length;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f0eff5] px-4 py-10">
      <div
        aria-hidden="true"
        className="absolute -start-40 -top-40 size-96 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-48 -end-24 size-[30rem] rounded-full bg-ink/5 blur-3xl"
      />
      <div className="absolute end-5 top-5 z-10">
        <LangSwitch />
      </div>
      <main className="relative z-10 w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <section className="overflow-hidden rounded-3xl bg-ink p-6 text-white shadow-2xl shadow-ink/20 sm:p-9">
          <div className="mb-7 flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold tracking-wide text-white/55">
                {lang === "ar" ? "مساحة عمل خاصة" : "PRIVATE WORKSPACE"}
              </p>
              <h1 className="mt-1 text-2xl font-bold">
                {pendingVerification
                  ? lang === "ar"
                    ? "تحقق من بريدك"
                    : "Verify your email"
                  : mode === "in"
                    ? t("signIn")
                    : t("signUp")}
              </h1>
            </div>
          </div>

          {pendingVerification ? (
            <div className="space-y-5 text-center">
              <span className="mx-auto grid size-20 place-items-center rounded-full bg-primary/15 text-primary">
                <MailCheck className="size-10" />
              </span>
              <div>
                <h2 className="font-semibold">
                  {lang === "ar"
                    ? "خطوة أخيرة لتفعيل حسابك"
                    : "One last step to activate your account"}
                </h2>
                <p className="mt-2 break-all text-sm text-white/65">{email}</p>
                <p className="mt-3 text-sm leading-7 text-white/65">
                  {lang === "ar"
                    ? "أرسلنا إليك رابط تأكيد. افتح الرسالة لتفعيل حسابك قبل تسجيل الدخول."
                    : "We sent you a verification link. Open the email to activate your account before signing in."}
                </p>
              </div>
              <Button
                type="button"
                className="w-full"
                onClick={() => void resendVerification()}
                disabled={busy || resendSeconds > 0}
              >
                {busy
                  ? lang === "ar"
                    ? "جارٍ الإرسال…"
                    : "Sending…"
                  : resendSeconds > 0
                    ? `${lang === "ar" ? "إعادة الإرسال بعد" : "Resend in"} 00:${String(resendSeconds).padStart(2, "0")}`
                    : lang === "ar"
                      ? "إعادة إرسال الرابط"
                      : "Resend verification link"}
              </Button>
              <button
                type="button"
                className="text-sm text-white/65 underline-offset-4 hover:text-white hover:underline"
                onClick={() => {
                  setPendingVerification(false);
                  setMode("in");
                }}
              >
                {lang === "ar" ? "العودة إلى تسجيل الدخول" : "Back to sign in"}
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {mode === "up" && (
                <div className="space-y-1.5">
                  <Label className="text-white/80">{t("fullName")}</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                    className="border-white/15 bg-white/10 text-white placeholder:text-white/40"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-white/80">{t("email")}</Label>
                <Input
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="border-white/15 bg-white/10 text-white placeholder:text-white/40"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/80">{t("password")}</Label>
                <Input
                  type="password"
                  dir="ltr"
                  minLength={mode === "up" ? 8 : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={mode === "in" ? "current-password" : "new-password"}
                  className="border-white/15 bg-white/10 text-white placeholder:text-white/40"
                />
              </div>
              {mode === "up" && (
                <div
                  aria-live="polite"
                  className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <div className="flex items-center justify-between text-xs text-white/65">
                    <span>{lang === "ar" ? "قوة كلمة المرور" : "Password strength"}</span>
                    <span>{score === 5 ? (lang === "ar" ? "قوية" : "Strong") : `${score}/5`}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${score < 2 ? "bg-red-400" : score < 4 ? "bg-amber-400" : score === 4 ? "bg-lime-400" : "bg-emerald-400"}`}
                      style={{ width: `${score * 20}%` }}
                    />
                  </div>
                  <ul className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-white/70">
                    {(Object.keys(ruleLabels) as PasswordRequirement[]).map((rule) => (
                      <li
                        key={rule}
                        className={`flex items-center gap-1.5 ${requirements[rule] ? "text-emerald-300" : ""}`}
                      >
                        <Check
                          className={`size-3.5 ${requirements[rule] ? "" : "text-white/30"}`}
                        />
                        {ruleLabels[rule]}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <Button
                type="submit"
                className="mt-2 w-full"
                disabled={busy || (mode === "up" && !isStrongPassword(password))}
              >
                {busy
                  ? lang === "ar"
                    ? "يرجى الانتظار…"
                    : "Please wait…"
                  : mode === "in"
                    ? t("signIn")
                    : t("signUp")}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                onClick={() => void google()}
              >
                {t("google")}
              </Button>
              <p className="pt-1 text-center text-sm text-white/60">
                {mode === "in" ? t("noAccount") : t("haveAccount")}{" "}
                <button
                  type="button"
                  className="font-semibold text-primary hover:underline"
                  onClick={() => {
                    setMode(mode === "in" ? "up" : "in");
                    setPassword("");
                  }}
                >
                  {mode === "in" ? t("signUp") : t("signIn")}
                </button>
              </p>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
