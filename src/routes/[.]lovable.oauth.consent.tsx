import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Logo, LangSwitch } from "@/components/app-shell";
import { pageMeta } from "@/lib/desk";
import { useI18n } from "@/lib/i18n";

type ConsentDetails = {
  client?: { name?: string; client_name?: string };
  redirect_uri?: string;
  scope?: string;
  scopes?: string[] | string;
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthResult = { data: ConsentDetails | null; error: { message: string } | null };
const oauth = (supabase.auth as unknown as { oauth: {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
} }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  head: () => pageMeta("Connect an assistant", "Review and approve an assistant's access to your Fattabyno account."),
  validateSearch: (s: Record<string, unknown>) => ({ authorization_id: typeof s["authorization_id"] === "string" ? s["authorization_id"] : "" }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing connection request. Start again from your assistant.");
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!data.session) throw redirect({ to: "/auth", search: { next: location.pathname + location.searchStr + location.hash } });
  },
  loader: async ({ location }) => {
    const id = new URLSearchParams(location.searchStr).get("authorization_id");
    if (!id) throw new Error("Missing connection request.");
    const [{ data, error }, session] = await Promise.all([oauth.getAuthorizationDetails(id), supabase.auth.getUser()]);
    if (error) throw new Error(error.message);
    if (session.error) throw session.error;
    if (!data) throw new Error("This connection request is invalid or expired. Start again from your assistant.");
    const immediate = data.redirect_url ?? data.redirect_to;
    if (immediate && !data.client) throw redirect({ href: immediate });
    return { details: data, email: session.data.user?.email };
  },
  pendingComponent: () => <main className="grid min-h-screen place-items-center text-muted-foreground">Loading connection request…</main>,
  errorComponent: ({ error }) => <main className="mx-auto max-w-lg px-6 py-16"><Logo /><h1 className="mt-8 text-2xl font-semibold">Connection unavailable / تعذر الاتصال</h1><p role="alert" className="mt-4 text-muted-foreground">{error instanceof Error ? error.message : "This connection request could not be loaded."}</p></main>,
  component: Consent,
});

function Consent() {
  const { details, email } = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const { lang } = useI18n();
  const c = (ar: string, en: string) => lang === "ar" ? ar : en;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const client = details.client?.name ?? details.client?.client_name ?? c("المساعد", "the assistant");
  const scopes = Array.isArray(details.scopes) ? details.scopes : (details.scopes ?? details.scope ?? "").split(" ").filter(Boolean);
  async function switchAccount() {
    setBusy(true); setError("");
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      const next = window.location.pathname + window.location.search + window.location.hash;
      window.location.assign(`/auth?next=${encodeURIComponent(next)}`);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not switch account."); setBusy(false); }
  }
  async function decide(approve: boolean) {
    setBusy(true); setError("");
    try {
      const result = approve ? await oauth.approveAuthorization(authorization_id) : await oauth.denyAuthorization(authorization_id);
      if (result.error) throw new Error(result.error.message);
      const target = result.data?.redirect_url ?? result.data?.redirect_to;
      if (!target) throw new Error(c("لم يكتمل الاتصال. حاول مجدداً.", "The connection could not finish. Please try again."));
      window.location.assign(target);
    } catch (e) { setError(e instanceof Error ? e.message : "Connection failed."); setBusy(false); }
  }
  return <main className="mx-auto min-h-screen w-full max-w-lg px-6 py-12">
    <div className="flex items-center justify-between gap-4"><Logo /><LangSwitch /></div>
    <h1 className="mt-12 break-words text-2xl font-semibold">{c(`ربط ${client} بحساب فتبينوا`, `Connect ${client} to Fattabyno`)}</h1>
    <p className="mt-4 break-all text-muted-foreground">{email}</p>
    <Button className="mt-2" variant="ghost" size="sm" disabled={busy} onClick={() => void switchAccount()}>{c("تبديل الحساب", "Switch account")}</Button>
    {details.redirect_uri && <p className="mt-2 break-all text-sm text-muted-foreground" dir="ltr">{details.redirect_uri}</p>}
    <p className="mt-6">{c("يسمح هذا للمساعد باستخدام أدوات التطبيق بصلاحيات حسابك.", "This lets the assistant use this app as you.")}</p>
    <ul className="mt-5 list-inside list-disc space-y-2 text-sm">
      <li>{c("قراءة الادعاءات المحفوظة ومصادرها ونتائج البحث", "Read saved claims, their sources and research")}</li>
      <li>{c("قراءة تقارير التحقق المحفوظة", "Read saved fact-check reports")}</li>
      {scopes.map(scope => <li key={scope}>{scope === "email" ? c("مشاركة عنوان بريدك", "Share your email address") : scope === "profile" ? c("مشاركة ملفك الأساسي", "Share your basic profile") : scope === "openid" ? c("تأكيد هوية حسابك", "Confirm your account identity") : c(`إذن إضافي: ${scope}`, `Additional permission: ${scope}`)}</li>)}
    </ul>
    <p className="mt-6 text-sm text-muted-foreground">{c("تبقى صلاحيات حسابك وسياسات الوصول سارية. لا يسمح هذا بتعديل البيانات أو حذفها أو نشرها.", "Your account permissions still apply. This does not allow editing, deleting or publishing records.")}</p>
    {error && <p role="alert" className="mt-5 text-destructive">{error}</p>}
    <div className="mt-8 flex flex-wrap gap-3"><Button disabled={busy} onClick={() => void decide(true)}>{busy ? c("يرجى الانتظار…", "Please wait…") : c("السماح بالاتصال", "Approve connection")}</Button><Button variant="outline" disabled={busy} onClick={() => void decide(false)}>{c("إلغاء الاتصال", "Cancel connection")}</Button></div>
  </main>;
}