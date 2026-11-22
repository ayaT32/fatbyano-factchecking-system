import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { ScanSearch, Loader2, Globe2, LockKeyhole, ArrowUpRight } from "lucide-react";
import type { UIMessage } from "ai";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AnalysisView, useCopy } from "@/components/desk-ui";
import { checkClaim } from "@/lib/factcheck.functions";
import { useMe, type ClaimRow } from "@/lib/session";
import { supabase } from "@/integrations/supabase/client";

export function InvestigationReview({
  messages,
  disabled,
}: {
  messages: UIMessage[];
  disabled: boolean;
}) {
  const c = useCopy();
  const { data: me } = useMe();
  const run = useServerFn(checkClaim);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ClaimRow | null>(null);
  const latest = [...messages].reverse().find((m) => m.role === "user");
  async function verify() {
    if (!me || !latest || busy) return;
    setOpen(true);
    setBusy(true);
    setError("");
    setResult(null);
    let path: string | null = null;
    try {
      const claimText = latest.parts
        .filter((p) => p.type === "text")
        .map((p) => p.text)
        .join("\n");
      const image = [...messages]
        .reverse()
        .flatMap((m) => m.parts)
        .find((p) => p.type === "file");
      if (image?.type === "file") {
        const blob = await (await fetch(image.url)).blob();
        path = `${me.user.id}/${crypto.randomUUID()}.${image.mediaType.split("/")[1]}`;
        const upload = await supabase.storage.from("claim-images").upload(path, blob);
        if (upload.error) throw upload.error;
      }
      const sourceUrl = claimText.match(/https?:\/\/[^\s]+/)?.[0] ?? null;
      const out = await run({
        data: {
          claimText,
          sourceUrl,
          imageBase64: image?.type === "file" ? image.url.split(",")[1] : null,
          imageMediaType: image?.type === "file" ? image.mediaType : null,
          imagePath: path,
        },
      });
      setResult({
        id: out.id,
        user_id: me.user.id,
        claim_text: claimText,
        source_url: sourceUrl,
        image_path: path,
        verdict: out.result.verdict,
        confidence: out.result.confidence,
        category: out.result.category,
        summary: out.result.summary_ar,
        analysis: out.result,
        status: "checked",
        is_published: false,
        created_at: new Date().toISOString(),
      });
      await qc.invalidateQueries({ queryKey: ["claims"] });
    } catch (e) {
      if (path) await supabase.storage.from("claim-images").remove([path]);
      setError(e instanceof Error ? e.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  }
  async function publish(published: boolean) {
    if (!result || !me || busy) return;
    setBusy(true);
    setError("");
    const { error } = await supabase
      .from("claims")
      .update({ is_published: published })
      .eq("id", result.id)
      .eq("user_id", me.user.id);
    if (error) setError(error.message);
    else {
      setResult({ ...result, is_published: published });
      await qc.invalidateQueries({ queryKey: ["claims"] });
    }
    setBusy(false);
  }
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || !latest || busy}
        onClick={() => void verify()}
      >
        <ScanSearch />
        {c("تشغيل التحقق", "Run fact-check")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{c("نتيجة التحقق", "Fact-check result")}</DialogTitle>
          </DialogHeader>
          {busy && !result && (
            <p role="status" className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              {c("جارٍ التحقق…", "Verification in progress…")}
            </p>
          )}
          {error && (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          )}
          {result && (
            <>
              <AnalysisView claim={result} />
              <div className="mt-6 flex flex-wrap gap-3">
                <Button disabled={busy || result.is_published} onClick={() => void publish(true)}>
                  <Globe2 />
                  {c("نشر في قاعدة البيانات", "Publish to master database")}
                </Button>
                <Button
                  variant="outline"
                  disabled={busy || !result.is_published}
                  onClick={() => void publish(false)}
                >
                  <LockKeyhole />
                  {c("مسودة خاصة", "Private draft")}
                </Button>
                <Button asChild variant="ghost">
                  <Link to="/history/$id" params={{ id: result.id }}>
                    <ArrowUpRight />
                    {c("ملف الادعاء", "Claim file")}
                  </Link>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
