import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Logo } from "@/components/app-shell";
import { Reveal } from "@/components/motion";
import { useI18n } from "@/lib/i18n";
import { useMe } from "@/lib/session";
import { cn } from "@/lib/utils";

/** Shared chrome for the public pages (front page and How it works). */

export function useCopy() {
  const { lang } = useI18n();
  return (arabic: string, english: string) => (lang === "ar" ? arabic : english);
}

function useScrolled(threshold = 12) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > threshold);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [threshold]);
  return scrolled;
}

/** One row over the dark hero: logo, section links, language and sign-in. Transparent with
 * white text at the top of the page; solid white with dark text once the page scrolls. The
 * links never highlight or change as you scroll. */
export function SiteHeader() {
  const copy = useCopy();
  const { lang, setLang } = useI18n();
  const { data: me } = useMe();
  const solid = useScrolled();

  const links = [
    { href: "/#overview", label: copy("نظرة عامة", "Overview") },
    { href: "/#standards", label: copy("معايير المراجعة", "Principles") },
    { to: "/how-it-works" as const, label: copy("كيف يعمل", "How it works") },
    { href: "/#workspace", label: copy("مساحة الفريق", "Workspace") },
  ];
  const linkClass = cn(
    "shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors",
    solid ? "text-ink/75 hover:bg-secondary hover:text-ink" : "text-white/85 hover:text-white",
  );

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-[background-color,box-shadow,backdrop-filter] duration-300",
        solid ? "bg-white/95 shadow-[0_1px_0_var(--border)] backdrop-blur" : "bg-transparent",
      )}
    >
      {/* The same arrangement in both languages: logo on the right, sign-in on the left
          (in English the row is reversed so it doesn't flip with the page direction) */}
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-8 ltr:flex-row-reverse">
        {/* In English the logo also sits to the right of its tagline, as in Arabic */}
        <div className="max-sm:[&_p]:hidden ltr:[&>a]:flex-row-reverse">
          <Logo light={!solid} />
        </div>
        <nav
          aria-label={copy("أقسام الموقع", "Site sections")}
          className="hidden items-center gap-1 lg:flex"
        >
          {links.map((l) =>
            l.to ? (
              <Link key={l.label} to={l.to} className={linkClass}>
                {l.label}
              </Link>
            ) : (
              <a key={l.label} href={l.href} className={linkClass}>
                {l.label}
              </a>
            ),
          )}
        </nav>
        <div className="flex items-center gap-1.5 sm:gap-3 ltr:flex-row-reverse">
          <button
            type="button"
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            className={cn(
              "inline-flex h-10 items-center rounded-lg px-2 text-sm font-semibold transition-colors sm:px-3",
              solid ? "text-ink/75 hover:text-ink" : "text-white/85 hover:text-white",
            )}
          >
            {lang === "ar" ? "EN" : "ع"}
            <span className="sr-only">{lang === "ar" ? "English" : "العربية"}</span>
          </button>
          {me ? (
            /* Signed in: the outlined button opens the profile */
            <Link
              to="/profile"
              aria-label={copy("الملف الشخصي", "Profile")}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-lg border-2 ps-1.5 pe-2 text-sm font-semibold transition-colors sm:pe-3",
                solid
                  ? "border-ink/15 text-ink hover:border-ink/40"
                  : "border-white/80 text-white hover:bg-white hover:text-ink",
              )}
            >
              <span className="grid size-7 place-items-center rounded-md bg-primary text-xs font-bold text-white">
                {(me.profile?.full_name || me.user.email || "?").slice(0, 1).toLocaleUpperCase()}
              </span>
              <span className="hidden max-w-28 truncate sm:inline">
                {me.profile?.full_name?.split(" ")[0] || copy("ملفي", "Profile")}
              </span>
            </Link>
          ) : (
            <Link
              to="/auth"
              search={{ mode: "up" }}
              className={cn(
                "inline-flex h-10 items-center whitespace-nowrap rounded-lg border-2 px-3 text-sm font-semibold transition-colors sm:px-4",
                solid
                  ? "border-ink/15 text-ink hover:border-ink/40"
                  : "border-white/80 text-white hover:bg-white hover:text-ink",
              )}
            >
              {copy("إنشاء حساب", "Sign up")}
            </Link>
          )}
          <Link
            {...(me
              ? { to: "/dashboard" as const }
              : { to: "/auth" as const, search: { mode: "in" as const } })}
            className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 sm:px-5"
          >
            {me ? copy("مساحة العمل", "Workspace") : copy("تسجيل الدخول", "Sign in")}
          </Link>
        </div>
      </div>
      {/* Smaller screens: the same links in a scrollable row */}
      <nav
        aria-label={copy("أقسام الموقع", "Site sections")}
        className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 pb-2 [scrollbar-width:none] sm:px-7 lg:hidden"
      >
        {links.map((l) =>
          l.to ? (
            <Link key={l.label} to={l.to} className={linkClass}>
              {l.label}
            </Link>
          ) : (
            <a key={l.label} href={l.href} className={linkClass}>
              {l.label}
            </a>
          ),
        )}
      </nav>
    </header>
  );
}

export function SiteFooter() {
  const copy = useCopy();
  const { data: me } = useMe();
  const heading = "text-xs font-semibold uppercase tracking-[0.2em] text-white/45";
  const link =
    "text-sm text-white/75 underline-offset-4 transition-colors hover:text-white hover:underline";

  return (
    <footer className="relative isolate overflow-hidden bg-ink text-white">
      {/* A soft pink glow and a fading pink rule along the top edge */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_15%_0%,rgba(197,70,153,0.22),transparent_45%)] rtl:bg-[radial-gradient(ellipse_at_85%_0%,rgba(197,70,153,0.22),transparent_45%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
      />

      <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-12 pt-16 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr] md:pt-20">
        <div>
          <Logo light />
          <p className="mt-6 max-w-sm text-sm leading-7 text-white/65">
            {copy(
              "بوابة داخلية لفريق التحقق والإدارة. يتطلب الوصول حساباً معتمداً.",
              "An internal portal for fact-checking staff and management. An authorized account is required.",
            )}
          </p>
          <Link
            {...(me
              ? { to: "/dashboard" as const }
              : { to: "/auth" as const, search: { mode: "in" as const } })}
            className="mt-7 inline-flex h-11 items-center rounded-full border border-white/25 px-6 text-sm font-semibold text-white transition hover:border-primary hover:bg-primary"
          >
            {me
              ? copy("افتح مساحة العمل", "Open the workspace")
              : copy("دخول الموظفين", "Staff sign in")}
          </Link>
        </div>

        <nav aria-label={copy("روابط الموقع", "Site links")}>
          <p className={heading}>{copy("الموقع", "Site")}</p>
          <ul className="mt-5 space-y-3">
            <li>
              <a href="/#overview" className={link}>
                {copy("نظرة عامة", "Overview")}
              </a>
            </li>
            <li>
              <a href="/#standards" className={link}>
                {copy("معايير المراجعة", "Principles")}
              </a>
            </li>
            <li>
              <Link to="/how-it-works" className={link}>
                {copy("كيف يعمل", "How it works")}
              </Link>
            </li>
            <li>
              <a href="/#workspace" className={link}>
                {copy("مساحة الفريق", "Workspace")}
              </a>
            </li>
          </ul>
        </nav>

        <nav aria-label={copy("روابط مساحة العمل", "Workspace links")}>
          <p className={heading}>{copy("مساحة العمل", "Workspace")}</p>
          <ul className="mt-5 space-y-3">
            <li>
              <Link to="/check" className={link}>
                {copy("فحص بالذكاء الاصطناعي", "AI fact-check")}
              </Link>
            </li>
            <li>
              <Link to="/history" className={link}>
                {copy("سجل الادعاءات", "Claims history")}
              </Link>
            </li>
            <li>
              <Link to="/reports" className={link}>
                {copy("التقارير", "Reports")}
              </Link>
            </li>
            <li>
              <Link to="/dashboard" className={link}>
                {copy("لوحة التحكم", "Dashboard")}
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 border-t border-white/10 px-4 py-6 text-xs text-white/45 sm:px-8">
        <span>
          © {new Date().getFullYear()}{" "}
          {copy("فتبينوا. جميع الحقوق محفوظة.", "Fatabyyano. All rights reserved.")}
        </span>
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="transition-colors hover:text-white"
        >
          {copy("العودة إلى الأعلى", "Back to top")}
        </a>
      </div>
    </footer>
  );
}

export type Row = {
  title: string;
  body: string;
  /** Shown before the title, e.g. a verdict badge */
  lead?: ReactNode;
  /** Makes the whole row a link */
  link?: { to: "/check" | "/team" | "/auth"; search?: { mode: "in" } };
};

/** A heading column beside evenly spaced rows separated by thin lines. Text is one colour
 * (ink); the section heading is the largest type, then row titles, then descriptions. */
export function RowsSection({
  id,
  eyebrow,
  title,
  intro,
  rows,
  footer,
  className,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  intro?: string;
  rows: Row[];
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-32 text-ink", className)}>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16 lg:py-24">
        <Reveal className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-xs font-bold uppercase tracking-[0.2em]">{eyebrow}</p>
          <h2 className="mt-4 text-4xl leading-tight sm:text-5xl">{title}</h2>
          {intro && <p className="mt-5 max-w-md text-base leading-8">{intro}</p>}
          {footer && <div className="mt-7">{footer}</div>}
        </Reveal>
        <ol className="divide-y divide-border border-y border-border">
          {rows.map(({ title: rowTitle, body, lead, link }, i) => {
            const content = (
              <>
                {lead && <span className="mb-3 block">{lead}</span>}
                {rowTitle && (
                  <span className="mb-2 block font-display text-xl font-bold decoration-2 underline-offset-8 group-hover:underline">
                    {rowTitle}
                  </span>
                )}
                <span className="block text-base leading-8">{body}</span>
              </>
            );
            const rowClass =
              "group block px-2 py-7 transition-colors duration-300 hover:bg-secondary/60 sm:px-5";
            return (
              <Reveal as="li" key={i} delay={i * 90}>
                {link ? (
                  <Link
                    to={link.to}
                    {...(link.search ? { search: link.search } : {})}
                    className={rowClass}
                  >
                    {content}
                  </Link>
                ) : (
                  <div className={rowClass}>{content}</div>
                )}
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
