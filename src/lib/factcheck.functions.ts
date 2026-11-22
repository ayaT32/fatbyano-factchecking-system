import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { geocodeAddress, runDefameFactCheck, verifyGeospatialImage } from "./ai/defame.server";

export const checkClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        claimText: z.string().min(3).max(10000),
        sourceUrl: z.string().url().optional().nullable(),
        imageBase64: z.string().max(14_000_000).optional().nullable(),
        imageMediaType: z.string().optional().nullable(),
        imagePath: z.string().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const result = await runDefameFactCheck(data);
    const { data: row, error } = await context.supabase
      .from("claims")
      .insert({
        user_id: context.userId,
        claim_text: data.claimText,
        source_url: data.sourceUrl ?? null,
        image_path: data.imagePath ?? null,
        verdict: result.verdict,
        confidence: result.confidence,
        category: result.category,
        summary: result.summary_ar,
        analysis: result as never,
        status: "checked",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string, result };
  });

export const verifyImageLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ imageBase64: z.string().min(1).max(14_000_000) }).parse(d))
  .handler(async ({ data }) => verifyGeospatialImage(data.imageBase64));

export const lookupAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ address: z.string().trim().min(1).max(1000) }).parse(d))
  .handler(async ({ data }) => geocodeAddress(data.address));
