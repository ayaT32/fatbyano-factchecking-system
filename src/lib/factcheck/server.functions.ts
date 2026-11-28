/**
 * Server functions for the fact-check screen (DECISIONS.md #25). They run on the app's server
 * with the signed-in user's Supabase session, and are the only code that calls DEFAME, with the
 * secret DEFAME_API_KEY:
 *   startFactCheck: creates the claim row as the user, then asks DEFAME to start it;
 *   answerPause:    sends the human's answer at a pause to DEFAME.
 * DEFAME writes its progress and results to Supabase; the screen reads them from there.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getDefameConfig } from "@/lib/ai/defame.server";

const modeSchema = z.enum(["auto", "disagreement", "supervised", "verdict"]);
const labelSchema = z.enum(["false", "altered", "misleading", "missing_context", "true", "satire"]);

/** Calls one of DEFAME's /claims endpoints; DEFAME's error text is passed on to the screen. */
async function callDefame(path: string, body: unknown) {
  const { baseUrl, apiKey } = getDefameConfig();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": apiKey },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("The fact-checking service can't be reached. Is DEFAME running?");
  }
  if (!response.ok) {
    const detail = await response
      .json()
      .then((b: { detail?: unknown }) => (typeof b.detail === "string" ? b.detail : ""))
      .catch(() => "");
    throw new Error(detail || `The fact-checking service answered HTTP ${response.status}.`);
  }
}

export const startFactCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        text: z.string().max(10000),
        imagePath: z.string().max(500).optional(),
        mode: modeSchema,
        tools: z.array(z.string().max(40)).max(10),
        model: z.string().max(60),
      })
      .refine((v) => v.text.trim() || v.imagePath, "A claim needs text or an image.")
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // The image must be in the user's own folder (the storage rules allow nothing else)
    if (data.imagePath && !data.imagePath.startsWith(`${context.userId}/`)) {
      throw new Error("The image must be uploaded to your own folder.");
    }
    const db = context.supabase as unknown as UntypedClient;
    const { data: row, error } = await db
      .from("claims")
      .insert({
        user_id: context.userId,
        claim_text: data.text.trim() || "(image)",
        image_path: data.imagePath ?? null,
        mode: data.mode,
        tools: data.tools,
        model: data.model,
        status: "queued",
      })
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message ?? "The claim could not be saved.");
    const id = (row as { id: string }).id;
    try {
      await callDefame("/claims/start", {
        claim_id: id,
        mode: data.mode,
        tools: data.tools.filter((t) => ["manipulation", "metadata", "geolocation"].includes(t)),
        model: data.model,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await db.from("claims").update({ status: "failed", error: message }).eq("id", id);
      throw e;
    }
    return { id };
  });

export const answerPause = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        claimId: z.string().uuid(),
        answer: z.object({
          action: z.enum(["continue", "feedback", "label", "comment"]),
          label: labelSchema.optional(),
          reason: z.string().max(2000).optional(),
          text: z.string().max(4000).optional(),
          mode: modeSchema.optional(),
        }),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // Only someone who can read the claim may answer for it (the user's own access rules decide)
    const db = context.supabase as unknown as UntypedClient;
    const { data: row } = await db.from("claims").select("id").eq("id", data.claimId).maybeSingle();
    if (!row) throw new Error("This claim wasn't found.");
    const { label, ...rest } = data.answer;
    await callDefame(`/claims/${data.claimId}/resume`, {
      ...rest,
      // DEFAME takes the label as its text ("missing context")
      ...(label ? { label: label.replace("_", " ") } : {}),
      decided_by: context.userId,
    });
    return { ok: true };
  });

/** The archive's tables aren't in the generated Supabase types yet (regenerate them in Lovable). */
type UntypedClient = {
  from(table: string): any; // eslint-disable-line @typescript-eslint/no-explicit-any
};
