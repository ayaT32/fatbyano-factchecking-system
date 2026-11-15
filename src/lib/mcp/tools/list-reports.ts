import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_reports",
  title: "List saved reports",
  description: "Read recent fact-check reports accessible to the connected staff account.",
  inputSchema: { limit: z.number().int().min(1).max(20).default(10).describe("Maximum recent reports to return (1–20).") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    const { data, error } = await supabaseForUser(ctx).from("reports").select("id, claim_id, title, body, verdict, created_at").order("created_at", { ascending: false }).limit(limit);
    if (error) throw new ToolError("Reports could not be loaded.");
    return { content: [{ type: "text", text: JSON.stringify(data ?? []) }], structuredContent: { reports: (data ?? []).map(r => ({ ...r })) } };
  },
});