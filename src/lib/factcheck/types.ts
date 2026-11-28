/**
 * The data contract between the fact-check screens and the backend, shaped like the Supabase
 * archive DEFAME writes to (supabase/migrations/*factcheck_archive*, *verdict_mode*, *claim_phase*).
 * The screens show two moments where the human can give feedback: the plan and, at the end, the
 * verdict with its analysis (DECISIONS.md #23); pauses in between (disagreement, NEI) too.
 */

/** Review modes, chosen per claim (DEFAME DECISIONS.md #37, #43, #44). */
export type Mode = "auto" | "disagreement" | "supervised" | "verdict";
export const MODES: readonly Mode[] = ["auto", "disagreement", "supervised", "verdict"];

export type PausePoint = "plan" | "disagree" | "nei" | "verdict";

/** Fatabyyano's six labels (a human can only choose one of these). */
export type Label = "false" | "altered" | "misleading" | "missing_context" | "true" | "satire";
export const LABELS: readonly Label[] = [
  "false",
  "altered",
  "misleading",
  "missing_context",
  "true",
  "satire",
];
/** A verdict can also be NEI: no conclusion, a human decides. */
export type Verdict = Label | "nei";

/** DEFAME's label text ("missing context", "not enough information") -> the database code. */
export function verdictCode(value: unknown): Verdict | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const code = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return (LABELS as readonly string[]).includes(code) ? (code as Label) : "nei";
}

/** The tool switches in the + menu. Web search (with reverse image search) is always on. */
export type ToolId = "web_search" | "reverse_image" | "geolocation" | "manipulation" | "metadata";
export const TOOLS: readonly ToolId[] = [
  "web_search",
  "reverse_image",
  "geolocation",
  "manipulation",
  "metadata",
];
/** Tools DEFAME can switch per claim; the others are part of web search. */
export const SWITCHABLE_TOOLS: readonly ToolId[] = ["manipulation", "metadata", "geolocation"];
export const DEFAULT_TOOLS: readonly ToolId[] = [
  "web_search",
  "reverse_image",
  "manipulation",
  "metadata",
];

export type RunStatus = "queued" | "running" | "paused" | "done" | "failed" | "cancelled";
export type Phase = "planning" | "gathering_evidence" | "analysing" | "reviewing" | "finalizing";

/** The Reviewer's evaluation of a step (DEFAME's ReviewStatus). */
export type ReviewStatus = "approved" | "incomplete" | "misleading" | "flagged" | "not_reviewed";

/** A stored step (fact_check_steps): the plan, the analysis or the verdict. */
export interface StepSummary {
  summary?: string;
  reviewStatus?: ReviewStatus;
  reviewIssues?: string;
}

export interface Source {
  url: string;
  title?: string;
  publishedOn?: string;
  credibility?: number;
  stance?: "supports" | "refutes" | "neutral";
  snippetOnly: boolean;
  archivedUrl?: string;
  addedBy: "agent" | "reviewer";
}

/** An open pause: what DEFAME shows the human, and which answers it accepts. */
export interface Pause {
  id: string;
  point: PausePoint;
  context: Record<string, unknown>;
  allowed: Answer["action"][];
  askedAt: string;
}

/** The human's answer to a pause (DEFAME defame/graph/human.py). */
export interface Answer {
  action: "continue" | "feedback" | "label" | "comment";
  label?: Label;
  reason?: string;
  text?: string;
  /** Changes the review mode for the rest of the claim. */
  mode?: Mode;
}

export interface HumanDecision {
  point: PausePoint;
  action?: Answer["action"];
  label?: Label;
  reason?: string;
  feedback?: string;
  answeredAt?: string;
}

export interface Endorsement {
  endorsed: boolean;
  rating?: number;
  comment?: string;
}

export interface FactCheckRun {
  id: string;
  claim: { text: string; imageUrl?: string };
  mode: Mode;
  status: RunStatus;
  phase?: Phase;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  plan?: StepSummary;
  analysis?: StepSummary;
  verdictStep?: StepSummary;
  pause?: Pause;
  decisions: HumanDecision[];
  agentVerdict?: Verdict;
  reviewerVerdict?: Verdict;
  finalVerdict?: Verdict;
  settledBy?: "agreement" | "human" | "unresolved";
  needsHumanReview: boolean;
  sources: Source[];
  report?: { markdownPath?: string; pdfPath?: string };
  endorsement?: Endorsement;
  durationSeconds?: number;
  costUsd?: number;
  error?: string;
}

export interface SessionSummary {
  id: string;
  title: string;
  status: RunStatus;
  finalVerdict?: Verdict;
  createdAt: string;
}

export interface StartInput {
  text: string;
  image?: File;
  mode: Mode;
  tools: ToolId[];
  model: string;
}

/** Where runs come from. The screens never talk to the backend directly. */
export interface FactCheckSource {
  subscribeSessions(callback: (sessions: SessionSummary[]) => void): () => void;
  subscribeRun(id: string, callback: (run: FactCheckRun | null) => void): () => void;
  start(input: StartInput): Promise<string>;
  answer(id: string, answer: Answer): Promise<void>;
  endorse(id: string, endorsement: Endorsement): Promise<void>;
  /** A short-lived download link for a stored report file. */
  reportUrl(path: string): Promise<string>;
}

/** Models the user may pick; the picker only shows the choice once there are two or more. */
export const MODELS: readonly { id: string; name: string }[] = [
  { id: "gpt_5_mini", name: "GPT-5 mini" },
];
