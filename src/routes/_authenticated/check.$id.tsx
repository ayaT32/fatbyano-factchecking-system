import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { investigationOptions } from "@/lib/chat-queries";
import { InvestigationWorkspace } from "@/components/investigation-workspace";
import { pageMeta } from "@/lib/desk";
import type { UIMessage } from "ai";
export const Route = createFileRoute("/_authenticated/check/$id")({
  validateSearch: (s: Record<string, unknown>): { start?: boolean } => ({
    ...(s["start"] === true || s["start"] === "true" ? { start: true } : {}),
  }),
  head: () =>
    pageMeta(
      "Investigation conversation",
      "Review saved research messages and image-analysis tools in your private Fattabyno investigation.",
    ),
  loader: ({ params, context }) =>
    context.queryClient.ensureQueryData(investigationOptions(params.id)),
  component: Page,
});
function Page() {
  const { id } = Route.useParams();
  const { start } = Route.useSearch();
  const { data } = useSuspenseQuery(investigationOptions(id));
  const messages = JSON.parse(data.messagesJson) as UIMessage[];
  return (
    <InvestigationWorkspace
      key={id}
      id={id}
      title={data.title}
      initialMessages={messages}
      enabledTools={data.enabled_tools}
      start={start === true}
    />
  );
}
