import { createFileRoute, Outlet } from "@tanstack/react-router";
import { pageMeta } from "@/lib/desk";

export const Route = createFileRoute("/_authenticated/check")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { claim?: string | undefined; url?: string | undefined } => ({
    claim: typeof s["claim"] === "string" ? s["claim"].slice(0, 10000) : undefined,
    url: typeof s["url"] === "string" && /^https?:\/\//.test(s["url"]) ? s["url"] : undefined,
  }),
  head: () =>
    pageMeta(
      "AI fact-check",
      "Analyse claims, screenshots, and source material at Fattabyno verification desk.",
    ),
  component: CheckPage,
});

function CheckPage() { return <Outlet />; }
