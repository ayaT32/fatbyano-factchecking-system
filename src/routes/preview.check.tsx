import { createFileRoute, notFound } from "@tanstack/react-router";
import { FactCheckWorkspace } from "@/components/factcheck/workspace";

/** Development only: the fact-check screens with demo data and no sign-in, for checking
 * the layout. In a production build this route is "not found". */
export const Route = createFileRoute("/preview/check")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { id?: string } =>
    typeof s["id"] === "string" ? { id: s["id"] } : {},
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  component: Page,
});

function Page() {
  const { id } = Route.useSearch();
  return (
    <FactCheckWorkspace
      {...(id ? { id } : {})}
      link={(next) => (next ? `/preview/check?id=${next}` : "/preview/check")}
    />
  );
}
