/**
 * The fact-check screens' data source: reads runs from the Supabase archive that DEFAME writes,
 * and listens with Realtime for changes to the claim and its pauses (DECISIONS.md #3, #23).
 * Starting a claim and answering a pause go through the app's server (server.functions.ts),
 * which calls DEFAME; the endorsement is the user's own row, written directly (its access rule
 * allows exactly that).
 */
import { supabase } from "@/integrations/supabase/client";
import { answerPause, startFactCheck } from "./server.functions";
import type {
  Answer,
  Endorsement,
  FactCheckRun,
  FactCheckSource,
  HumanDecision,
  Mode,
  Pause,
  PausePoint,
  Phase,
  ReviewStatus,
  RunStatus,
  SessionSummary,
  Source,
  StartInput,
  StepSummary,
  Verdict,
} from "./types";
import { verdictCode } from "./types";

// The archive's tables aren't in the generated Supabase types yet (regenerate them in Lovable)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from(table: string): any; storage: typeof supabase.storage };

type Row = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
const num = (v: unknown) =>
  typeof v === "number" ? v : typeof v === "string" && v ? Number(v) : undefined;

function step(rows: Row[], name: string): StepSummary | undefined {
  // The latest round of that step (an extra round replaces the first one's summary)
  const row = rows
    .filter((r) => r["step"] === name)
    .sort((a, b) => Number(b["round"]) - Number(a["round"]))[0];
  if (!row) return undefined;
  return {
    ...(str(row["summary"]) ? { summary: str(row["summary"])! } : {}),
    ...(str(row["review_status"]) ? { reviewStatus: row["review_status"] as ReviewStatus } : {}),
    ...(str(row["review_issues"]) ? { reviewIssues: str(row["review_issues"])! } : {}),
  };
}

function toPause(row: Row): Pause {
  const context = (row["context"] ?? {}) as Record<string, unknown>;
  const allowed = Array.isArray(context["allowed"])
    ? (context["allowed"] as Answer["action"][])
    : [];
  return {
    id: String(row["id"]),
    point: row["pause"] as PausePoint,
    context,
    allowed,
    askedAt: String(row["asked_at"]),
  };
}

function toDecision(row: Row): HumanDecision {
  const label = verdictCode(row["label"]);
  return {
    point: row["pause"] as PausePoint,
    ...(str(row["action"]) ? { action: row["action"] as Answer["action"] } : {}),
    ...(label && label !== "nei" ? { label } : {}),
    ...(str(row["reason"]) ? { reason: str(row["reason"])! } : {}),
    ...(str(row["feedback"]) ? { feedback: str(row["feedback"])! } : {}),
    ...(str(row["answered_at"]) ? { answeredAt: str(row["answered_at"])! } : {}),
  };
}

function toSource(row: Row): Source {
  const stance = str(row["stance"]) as Source["stance"];
  const credibility = num(row["credibility"]);
  return {
    url: String(row["url"]),
    ...(str(row["title"]) ? { title: str(row["title"])! } : {}),
    ...(str(row["published_on"]) ? { publishedOn: str(row["published_on"])! } : {}),
    ...(credibility !== undefined ? { credibility } : {}),
    ...(stance ? { stance } : {}),
    snippetOnly: Boolean(row["snippet_only"]),
    ...(str(row["archived_url"]) ? { archivedUrl: str(row["archived_url"])! } : {}),
    addedBy: row["added_by"] === "reviewer" ? "reviewer" : "agent",
  };
}

async function loadRun(id: string): Promise<FactCheckRun | null> {
  const { data: claim, error } = await db.from("claims").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!claim) return null;
  const c = claim as Row;
  const uid = (await supabase.auth.getUser()).data.user?.id ?? "";
  const [steps, decisions, sources, reports, feedback] = await Promise.all([
    db.from("fact_check_steps").select("*").eq("claim_id", id),
    db.from("human_decisions").select("*").eq("claim_id", id).order("asked_at"),
    db.from("evidence_sources").select("*").eq("claim_id", id).order("created_at"),
    db
      .from("reports")
      .select("markdown_path,pdf_path")
      .eq("claim_id", id)
      .order("created_at", { ascending: false })
      .limit(1),
    // The user's own endorsement (managers can read everyone's)
    db
      .from("report_feedback")
      .select("endorsed,rating,comment")
      .eq("claim_id", id)
      .eq("user_id", uid)
      .maybeSingle(),
  ]);
  const stepRows = (steps.data ?? []) as Row[];
  const decisionRows = (decisions.data ?? []) as Row[];
  const open = decisionRows.find((d) => !d["answered_at"]);
  const report = ((reports.data ?? []) as Row[])[0];
  const imagePath = str(c["image_path"]);
  const imageUrl = imagePath
    ? (await db.storage.from("claim-images").createSignedUrl(imagePath, 3600)).data?.signedUrl
    : undefined;
  const agent = verdictCode(c["agent_verdict"]);
  const reviewer = verdictCode(c["reviewer_verdict"]);
  const final: Verdict | undefined = c["status"] === "done" ? verdictCode(c["verdict"]) : undefined;
  const fb = feedback.data as Row | null;
  const plan = step(stepRows, "plan");
  const analysis = step(stepRows, "analysis");
  const verdictStep = step(stepRows, "verdict");
  return {
    id,
    claim: {
      text: c["claim_text"] === "(image)" ? "" : String(c["claim_text"] ?? ""),
      ...(imageUrl ? { imageUrl } : {}),
    },
    mode: (str(c["mode"]) ?? "auto") as Mode,
    status: normalizeStatus(c["status"]),
    ...(str(c["phase"]) ? { phase: c["phase"] as Phase } : {}),
    createdAt: String(c["created_at"]),
    ...(str(c["started_at"]) ? { startedAt: str(c["started_at"])! } : {}),
    ...(str(c["finished_at"]) ? { finishedAt: str(c["finished_at"])! } : {}),
    ...(plan ? { plan } : {}),
    ...(analysis ? { analysis } : {}),
    ...(verdictStep ? { verdictStep } : {}),
    ...(open ? { pause: toPause(open) } : {}),
    decisions: decisionRows.filter((d) => d["answered_at"]).map(toDecision),
    ...(agent ? { agentVerdict: agent } : {}),
    ...(reviewer ? { reviewerVerdict: reviewer } : {}),
    ...(final ? { finalVerdict: final } : {}),
    ...(str(c["settled_by"])
      ? { settledBy: c["settled_by"] as "agreement" | "human" | "unresolved" }
      : {}),
    needsHumanReview: Boolean(c["needs_human_review"]),
    sources: ((sources.data ?? []) as Row[]).map(toSource),
    ...(report
      ? {
          report: {
            ...(str(report["markdown_path"])
              ? { markdownPath: str(report["markdown_path"])! }
              : {}),
            ...(str(report["pdf_path"]) ? { pdfPath: str(report["pdf_path"])! } : {}),
          },
        }
      : {}),
    ...(fb
      ? {
          endorsement: {
            endorsed: Boolean(fb["endorsed"]),
            ...(num(fb["rating"]) !== undefined ? { rating: num(fb["rating"])! } : {}),
            ...(str(fb["comment"]) ? { comment: str(fb["comment"])! } : {}),
          },
        }
      : {}),
    ...(num(c["duration_seconds"]) !== undefined
      ? { durationSeconds: num(c["duration_seconds"])! }
      : {}),
    ...(num(c["cost_usd"]) !== undefined ? { costUsd: num(c["cost_usd"])! } : {}),
    ...(str(c["error"]) ? { error: str(c["error"])! } : {}),
  };
}

function normalizeStatus(value: unknown): RunStatus {
  // Older rows from Aya's earlier screens say "pending" or "checked"
  if (value === "checked") return "done";
  if (value === "pending") return "queued";
  return (["queued", "running", "paused", "done", "failed", "cancelled"] as const).includes(
    value as RunStatus,
  )
    ? (value as RunStatus)
    : "queued";
}

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Sign in to continue.");
  return data.user.id;
}

export class SupabaseSource implements FactCheckSource {
  subscribeSessions(callback: (sessions: SessionSummary[]) => void) {
    let stopped = false;
    let channel: ReturnType<typeof supabase.channel> | undefined;
    const load = async () => {
      const uid = await currentUserId().catch(() => undefined);
      if (!uid || stopped) return;
      const { data } = await db
        .from("claims")
        .select("id,claim_text,status,verdict,created_at")
        .eq("user_id", uid) // only the user's own sessions in the sidebar (managers can read more)
        .order("created_at", { ascending: false })
        .limit(50);
      if (stopped) return;
      callback(
        ((data ?? []) as Row[]).map((r) => {
          const status = normalizeStatus(r["status"]);
          const verdict = status === "done" ? verdictCode(r["verdict"]) : undefined;
          return {
            id: String(r["id"]),
            title: String(r["claim_text"] ?? "").slice(0, 80),
            status,
            ...(verdict ? { finalVerdict: verdict } : {}),
            createdAt: String(r["created_at"]),
          };
        }),
      );
      channel ??= supabase
        .channel(`sessions-${uid}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "claims", filter: `user_id=eq.${uid}` },
          () => void load(),
        )
        .subscribe();
    };
    void load();
    return () => {
      stopped = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }

  subscribeRun(id: string, callback: (run: FactCheckRun | null) => void) {
    let stopped = false;
    let pending: ReturnType<typeof setTimeout> | undefined;
    const load = () =>
      loadRun(id)
        .then((run) => !stopped && callback(run))
        .catch(() => !stopped && callback(null));
    // Several rows change at the end of a run; reload once they've all arrived
    const reload = () => {
      clearTimeout(pending);
      pending = setTimeout(load, 300);
    };
    void load();
    const channel = supabase
      .channel(`run-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "claims", filter: `id=eq.${id}` },
        reload,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "human_decisions", filter: `claim_id=eq.${id}` },
        reload,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fact_check_steps", filter: `claim_id=eq.${id}` },
        reload,
      )
      .subscribe();
    return () => {
      stopped = true;
      clearTimeout(pending);
      void supabase.removeChannel(channel);
    };
  }

  async start(input: StartInput) {
    let imagePath: string | undefined;
    if (input.image) {
      const uid = await currentUserId();
      const ext =
        input.image.name
          .split(".")
          .pop()
          ?.toLowerCase()
          .replace(/[^a-z0-9]/g, "") || "png";
      imagePath = `${uid}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("claim-images")
        .upload(imagePath, input.image, { contentType: input.image.type });
      if (error) throw new Error(error.message);
    }
    const { id } = await startFactCheck({
      data: {
        text: input.text,
        mode: input.mode,
        tools: input.tools,
        model: input.model,
        ...(imagePath ? { imagePath } : {}),
        ...(input.claimDate ? { claimDate: input.claimDate } : {}),
      },
    });
    return id;
  }

  async answer(id: string, answer: Answer) {
    await answerPause({ data: { claimId: id, answer } });
  }

  async endorse(id: string, endorsement: Endorsement) {
    const uid = await currentUserId();
    const { error } = await db.from("report_feedback").upsert(
      {
        claim_id: id,
        user_id: uid,
        endorsed: endorsement.endorsed,
        rating: endorsement.rating ?? null,
        comment: endorsement.comment ?? null,
      },
      { onConflict: "claim_id,user_id" },
    );
    if (error) throw new Error(error.message);
  }

  async reportUrl(path: string) {
    const { data, error } = await db.storage.from("reports").createSignedUrl(path, 600);
    if (error || !data) throw new Error(error?.message ?? "The report could not be opened.");
    return data.signedUrl;
  }
}
