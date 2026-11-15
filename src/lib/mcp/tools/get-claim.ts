import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_claim",
  title: "Read claim research",
  description: "Read one accessible claim's saved research, source, and preliminary AI assessment by its ID.",
  inputSchema: { id: z.string().uuid().describe("Claim ID returned by list_claims.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    const { data, error } = await supabaseForUser(ctx).from("claims").select("id, claim_text, source_url, verdict, confidence, category, status, summary, analysis, created_at").eq("id", id).maybeSingle();
    if (error) throw new ToolError("Claim research could not be loaded.");
    if (!data) throw new ToolError("Claim not found or not accessible to your account.");
    return { content: [{ type: "text", text: JSON.stringify(data) }] };
  },
});