import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_claims",
  title: "List saved claims",
  description: "Read recent saved claims accessible to the connected staff account, including sources and preliminary verdicts.",
  inputSchema: { limit: z.number().int().min(1).max(50).default(20).describe("Maximum recent claims to return (1–50).") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    const { data, error } = await supabaseForUser(ctx).from("claims").select("id, claim_text, source_url, verdict, confidence, category, status, created_at").order("created_at", { ascending: false }).limit(limit);
    if (error) throw new ToolError("Saved claims could not be loaded.");
    return { content: [{ type: "text", text: JSON.stringify(data ?? []) }], structuredContent: { claims: (data ?? []).map(r => ({ ...r })) } };
  },
});