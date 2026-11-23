import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { selectedToolsSchema } from "./chat/schema";
import { validateSavedMessages } from "./chat/messages";

export const listInvestigations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("investigation_chats")
      .select("id,title,updated_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error("Your investigations could not be loaded.");
    return data;
  });
export const createInvestigation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) =>
    z
      .object({
        title: z.string().max(160),
        enabledTools: selectedToolsSchema,
        firstMessage: z.unknown().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { validateUIMessages } = await import("ai");
    const messages = data.firstMessage
      ? await validateUIMessages({ messages: [data.firstMessage] })
      : [];
    if (messages.some((m) => m.role !== "user")) throw new Error("Start with a user message.");
    const { data: row, error } = await context.supabase
      .from("investigation_chats")
      .insert({
        title: data.title || "New investigation",
        user_id: context.userId,
        enabled_tools: data.enabledTools,
        messages: JSON.parse(JSON.stringify(messages)),
      })
      .select("id")
      .single();
    if (error) throw new Error("The investigation could not be created.");
    return row;
  });
export const getInvestigation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("investigation_chats")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error || !row) throw new Error("Investigation not found or unavailable to your account.");
    const messages = await validateSavedMessages(row.messages);
    return {
      id: row.id,
      title: row.title,
      enabled_tools: row.enabled_tools,
      messagesJson: JSON.stringify(messages),
    };
  });
