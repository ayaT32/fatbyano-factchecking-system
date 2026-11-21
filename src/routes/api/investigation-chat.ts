import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/investigation-chat")({ server: { handlers: { POST: async ({ request }) => {
  const { handleInvestigationChat } = await import("@/lib/chat/handler.server");
  return handleInvestigationChat(request);
} } } });