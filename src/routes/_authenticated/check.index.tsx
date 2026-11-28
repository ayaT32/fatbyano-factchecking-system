import { createFileRoute } from "@tanstack/react-router";
import { FactCheckWorkspace } from "@/components/factcheck/workspace";
import { pageMeta } from "@/lib/desk";

export const Route = createFileRoute("/_authenticated/check/")({
  head: () =>
    pageMeta(
      "Fact-check",
      "Submit a claim or image and follow the agent and the Reviewer step by step.",
    ),
  component: Page,
});

function Page() {
  // Other pages can open /check?claim=…&url=… with the claim filled in
  const search = Route.useSearch();
  const initialText = [search.claim, search.url].filter(Boolean).join("\n\n");
  return (
    <FactCheckWorkspace initialText={initialText} link={(id) => (id ? `/check/${id}` : "/check")} />
  );
}
