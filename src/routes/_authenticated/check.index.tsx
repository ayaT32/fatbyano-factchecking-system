import { createFileRoute } from "@tanstack/react-router";
import { InvestigationWorkspace } from "@/components/investigation-workspace";
import { pageMeta } from "@/lib/desk";
export const Route = createFileRoute("/_authenticated/check/")({
  head: () =>
    pageMeta(
      "AI investigation",
      "Start a private fact-checking conversation with Fattabyno's research assistant.",
    ),
  component: Page,
});
function Page() {
  const search = Route.useSearch();
  return (
    <InvestigationWorkspace initialText={[search.claim, search.url].filter(Boolean).join("\n\n")} />
  );
}
