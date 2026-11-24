import { createFileRoute } from "@tanstack/react-router";
import { FactCheckWorkspace } from "@/components/factcheck/workspace";
import { pageMeta } from "@/lib/desk";

export const Route = createFileRoute("/_authenticated/check/$id")({
  head: () =>
    pageMeta(
      "Fact-check session",
      "One claim: its steps, the Reviewer's checks, any pauses for your input, and the report.",
    ),
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  return <FactCheckWorkspace id={id} link={(next) => (next ? `/check/${next}` : "/check")} />;
}
