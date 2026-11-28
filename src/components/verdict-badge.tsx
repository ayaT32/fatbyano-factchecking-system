import { cn } from "@/lib/utils";
import { useI18n, type TKey } from "@/lib/i18n";

const styles: Record<string, string> = {
  false: "bg-verdict-false text-primary-foreground ring-verdict-false",
  altered: "bg-verdict-altered text-primary-foreground ring-verdict-altered",
  misleading: "bg-verdict-misleading text-primary-foreground ring-verdict-misleading",
  missing_context: "bg-verdict-missing-context text-primary-foreground ring-verdict-missing-context",
  true: "bg-verdict-true text-primary-foreground ring-verdict-true",
  satire: "bg-verdict-satire text-primary-foreground ring-verdict-satire",
  nei: "bg-verdict-nei text-primary-foreground ring-verdict-nei",
};

// Values saved before the switch to Fatabyyano's labels
const legacy: Record<string, string> = { unverifiable: "nei", partly_true: "misleading" };

export function VerdictBadge({ verdict, className }: { verdict?: string | null; className?: string }) {
  const { t } = useI18n();
  const known = verdict ? (legacy[verdict] ?? verdict) : undefined;
  const v = known && styles[known] ? known : "nei";
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1", styles[v], className)}>
      <span className="size-1.5 rounded-full bg-current" />
      {t(`v.${v}` as TKey)}
    </span>
  );
}

export const verdictColor: Record<string, string> = {
  false: "var(--verdict-false)",
  altered: "var(--verdict-altered)",
  misleading: "var(--verdict-misleading)",
  missing_context: "var(--verdict-missing-context)",
  true: "var(--verdict-true)",
  satire: "var(--verdict-satire)",
  nei: "var(--verdict-nei)",
};
