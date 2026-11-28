import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Briefcase,
  ChevronDown,
  FileText,
  Flame,
  History,
  LayoutDashboard,
  LogOut,
  MessagesSquare,
  ScanSearch,
  UserRound,
  Users,
  Languages,
} from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useMe } from "@/lib/session";
import { employeeId } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Logo({ light }: { light?: boolean }) {
  const { t } = useI18n();
  return (
    <Link
      to="/"
      aria-label={t("appName")}
      className="group flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <img
        src={light ? "/fattabyyano-logo-light.png" : "/fattabyyano-logo-dark.png"}
        alt=""
        className="h-9 w-auto max-w-28 shrink-0 object-contain transition-transform group-hover:scale-[1.03]"
      />
      <div className="leading-tight">
        <p
          className={
            light ? "text-[11px] text-sidebar-foreground/60" : "text-[11px] text-muted-foreground"
          }
        >
          {t("tagline")}
        </p>
      </div>
    </Link>
  );
}

export function LangSwitch({ light }: { light?: boolean }) {
  const { lang, setLang } = useI18n();
  return (
    <button
      onClick={() => setLang(lang === "ar" ? "en" : "ar")}
      className={
        light
          ? "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent"
          : "inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-accent"
      }
    >
      <Languages className="size-4" />
      {lang === "ar" ? "English" : "العربية"}
    </button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t, lang } = useI18n();
  const { data: me } = useMe();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const items = [
    ...(me?.isAdmin
      ? [
          { to: "/management", label: t("management"), icon: Briefcase },
          { to: "/team", label: t("teamActivity"), icon: Users },
        ]
      : [{ to: "/dashboard", label: t("dashboard"), icon: LayoutDashboard }]),
    ...(!me?.isAdmin ? [{ to: "/trends", label: t("trends"), icon: Flame }] : []),
    { to: "/check", label: t("check"), icon: ScanSearch },
    { to: "/investigate", label: t("investigate"), icon: MessagesSquare },
    { to: "/history", label: me?.isAdmin ? t("masterDatabase") : t("history"), icon: History },
    { to: "/reports", label: t("reports"), icon: FileText },
    ...(me?.isAdmin ? [{ to: "/analytics", label: t("analytics"), icon: BarChart3 }] : []),
  ] as const;

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen">
      <aside className="no-print sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar p-5 md:flex">
        <Logo light />
        <nav className="mt-10 flex flex-1 flex-col gap-1">
          {items.map((it) => (
            <Link
              key={it.to}
              to={it.to}
              className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{
                className:
                  "!bg-sidebar-primary !text-sidebar-primary-foreground font-semibold shadow-sm",
              }}
            >
              <it.icon className="size-4 group-data-[status=active]:text-ink" />
              {it.label}
            </Link>
          ))}
        </nav>
        <div className="space-y-2 border-t border-sidebar-border pt-4">
          {me && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-start hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary font-bold text-white">
                    {(me.profile?.full_name || me.user.email || "?")
                      .slice(0, 1)
                      .toLocaleUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-sidebar-foreground">
                      {me.profile?.full_name || me.user.email}
                    </span>
                    <span className="block text-xs text-sidebar-foreground/60">
                      {me.isAdmin ? t("management") : t("staff")}
                    </span>
                  </span>
                  <ChevronDown className="size-4 text-sidebar-foreground/60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top" className="w-64">
                <DropdownMenuLabel>{me.profile?.full_name || me.user.email}</DropdownMenuLabel>
                <DropdownMenuLabel className="pt-0 text-xs font-normal text-muted-foreground">
                  {t("internalId")}: {employeeId(me.user.id)}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile">
                    <UserRound />
                    {lang === "ar" ? "الملف الشخصي" : "Profile"}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void signOut()}>
                  <LogOut />
                  {t("signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <LangSwitch light />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="no-print h-1.5 bg-gold" />
        <header className="no-print flex items-center justify-between gap-2 border-b border-border bg-card px-4 py-3 md:hidden">
          <Logo />
          <div className="flex gap-2">
            <LangSwitch />
            <button
              onClick={signOut}
              aria-label={t("signOut")}
              className="rounded-lg border border-border p-2"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </header>
        <nav className="no-print flex gap-1 overflow-x-auto border-b border-border bg-card px-3 py-2 md:hidden">
          {items.map((it) => (
            <Link
              key={it.to}
              to={it.to}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-muted-foreground"
              activeProps={{ className: "!bg-primary !text-primary-foreground" }}
            >
              {it.label}
            </Link>
          ))}
        </nav>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-10 md:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
