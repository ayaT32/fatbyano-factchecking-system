import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, actions }: { eyebrow?: string | undefined; title: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
      <div>
        {eyebrow && (
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gold-ink">
            <span className="h-3 w-1 rounded-full bg-gold" />
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl text-ink md:text-4xl">{title}</h1>
      </div>
      {actions}
    </div>
  );
}

export function StatCard({ label, value, hint, accent }: { label: string; value: ReactNode; hint?: string; accent?: boolean }) {
  return (
    <div
      className={
        accent
          ? "rounded-2xl border border-primary/15 bg-primary-soft p-5 shadow-sm"
          : "sheet rounded-2xl p-5"
      }
    >
      <p className={accent ? "text-sm font-medium text-gold-ink" : "text-sm text-muted-foreground"}>
        {label}
      </p>
      <p className="mt-2 font-sans text-4xl font-bold tabular-nums text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
