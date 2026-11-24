/**
 * The data contract between the fact-check screens and the backend.
 * The screens only read these shapes; a "source" (the demo source now, a Supabase
 * Realtime source once DEFAME writes its progress to Supabase) produces them.
 * Field names follow DEFAME's graph: the agent's verdict, the Reviewer's verdict,
 * the three pause points (plan, disagree, nei) and the review modes (DEFAME decision #43).
 */

/** Review modes, chosen per claim. auto: no pauses. disagreement: pause when the
 * agent and the Reviewer disagree, and at NEI. supervised: also after the first plan. */
export type Mode = "auto" | "disagreement" | "supervised";
export const MODES: readonly Mode[] = ["auto", "disagreement", "supervised"];

export type PausePoint = "plan" | "disagree" | "nei";
export const MODE_PAUSES: Record<Mode, readonly PausePoint[]> = {
  auto: [],
  disagreement: ["disagree", "nei"],
  supervised: ["plan", "disagree", "nei"],
};

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

export type ToolId = "web_search" | "reverse_image" | "geolocation" | "manipulation" | "metadata";
export const TOOLS: readonly ToolId[] = [
  "web_search",
  "reverse_image",
  "geolocation",
  "manipulation",
  "metadata",
];

/** The four steps the chat shows (decision #7); each groups several graph nodes. */
export type StepKey = "plan" | "evidence" | "analysis" | "verdict";
export const STEPS: readonly StepKey[] = ["plan", "evidence", "analysis", "verdict"];
export type StepStatus = "pending" | "running" | "done" | "failed";

/** The Reviewer's evaluation of a step (DEFAME's ReviewStatus). */
export type ReviewStatus = "approved" | "incomplete" | "misleading" | "flagged" | "not_reviewed";

export interface Source {
  title: string;
  url: string;
  date?: string;
  credibility?: "high" | "medium" | "low";
  stance?: "supports" | "refutes" | "neutral";
  snippet?: string;
}

export interface StepItem {
  kind: "action" | "search" | "tool" | "note" | "human";
  title: string;
  detail?: string;
  sources?: Source[];
}

export interface Step {
  key: StepKey;
  status: StepStatus;
  summary?: string;
  items: StepItem[];
  review?: { status: ReviewStatus; comment?: string };
}

export type Pause =
  | { kind: "plan"; reasoning: string; actions: string[] }
  | {
      kind: "disagree";
      agent: { label: Verdict; reasoning: string };
      reviewer: { label: Verdict; reasoning: string };
    }
  | { kind: "nei"; reasoning: string; feedbackAllowed: boolean };

/** The human's answer to a pause. */
export type Answer =
  | { kind: "plan"; feedback?: string }
  | { kind: "disagree"; label: Label; reason: string }
  | { kind: "nei"; choice: "label"; label: Label; reason: string }
  | { kind: "nei"; choice: "feedback"; feedback: string }
  | { kind: "nei"; choice: "leave" };

export interface HumanDecision {
  pause: PausePoint;
  at: string;
  label?: Label;
  reason?: string;
  feedback?: string;
  left?: boolean;
}

/** A paragraph of the draft report, as shown in the review panel. */
export interface ReportBlock {
  id: string;
  heading?: string;
  text: string;
}

/** A Reviewer comment anchored to a quote in a report block (Google Docs style).
 * With `suggestion`, it proposes replacing the quote with that text. */
export interface ReviewComment {
  id: string;
  blockId: string;
  quote: string;
  body: string;
  stage: StepKey;
  status: ReviewStatus;
  suggestion?: string;
}

export type RunStatus = "queued" | "running" | "paused" | "done" | "failed";

export interface FactCheckRun {
  id: string;
  claim: { text: string; imageUrl?: string };
  mode: Mode;
  tools: ToolId[];
  model: string;
  status: RunStatus;
  steps: Step[];
  pause?: Pause;
  agentVerdict?: Verdict;
  reviewerVerdict?: Verdict;
  finalVerdict?: Verdict;
  needsHumanReview?: boolean;
  humanDecisions: HumanDecision[];
  report?: {
    blocks: ReportBlock[];
    comments: ReviewComment[];
    pdfUrl?: string;
    markdownUrl?: string;
  };
  error?: string;
  createdAt: string;
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
  readonly kind: "demo" | "supabase";
  subscribeSessions(callback: (sessions: SessionSummary[]) => void): () => void;
  subscribeRun(id: string, callback: (run: FactCheckRun | null) => void): () => void;
  start(input: StartInput): Promise<string>;
  answer(id: string, answer: Answer): Promise<void>;
  /** Change the mode for the rest of this claim (e.g. "/auto" at a pause). */
  setMode(id: string, mode: Mode): Promise<void>;
}

/** Models the user may pick; the picker only shows the choice once there are two or more. */
export const MODELS: readonly { id: string; name: string }[] = [
  { id: "gpt_5_mini", name: "GPT-5 mini" },
];
