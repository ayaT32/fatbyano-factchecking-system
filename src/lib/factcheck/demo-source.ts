/**
 * A scripted stand-in for the backend, used until DEFAME writes its progress to
 * Supabase. It plays one realistic fact-check through the four steps, pauses where
 * the mode says (plan / disagree / NEI), and ends with a draft report and Reviewer
 * comments. Runs are kept in this browser's localStorage so a refresh keeps them.
 */
import type {
  Answer,
  FactCheckRun,
  FactCheckSource,
  Label,
  Mode,
  PausePoint,
  ReportBlock,
  ReviewComment,
  SessionSummary,
  StartInput,
  Step,
  StepKey,
  StepItem,
} from "./types";
import { MODE_PAUSES, STEPS } from "./types";

const STORAGE_KEY = "fatabyyano-demo-runs";
const STEP_DELAY = 1400;

/** Where a demo run is in its script; stored with the run so a refresh can continue. */
type Phase = "plan" | "evidence" | "analysis" | "verdict" | "finalize" | "paused" | "done";
type DemoRun = FactCheckRun & {
  phase: Phase;
  planAsked: boolean;
  neiFeedbackUsed: boolean;
  humanFeedback?: string;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const now = () => new Date().toISOString();

function emptySteps(): Step[] {
  return STEPS.map((key) => ({ key, status: "pending", items: [] }));
}

export class DemoSource implements FactCheckSource {
  readonly kind = "demo" as const;
  private runs = new Map<string, DemoRun>();
  private runListeners = new Map<string, Set<(run: FactCheckRun | null) => void>>();
  private sessionListeners = new Set<(sessions: SessionSummary[]) => void>();
  private playing = new Set<string>();

  constructor() {
    this.load();
    // Runs that were mid-step when the page closed continue from their phase
    for (const run of this.runs.values()) if (run.status === "running") void this.play(run.id);
  }

  subscribeSessions(callback: (sessions: SessionSummary[]) => void) {
    this.sessionListeners.add(callback);
    callback(this.sessions());
    return () => void this.sessionListeners.delete(callback);
  }

  subscribeRun(id: string, callback: (run: FactCheckRun | null) => void) {
    const set = this.runListeners.get(id) ?? new Set();
    set.add(callback);
    this.runListeners.set(id, set);
    callback(this.snapshot(id));
    return () => void set.delete(callback);
  }

  async start(input: StartInput) {
    const id = crypto.randomUUID();
    const imageUrl = input.image ? await readAsDataUrl(input.image) : undefined;
    const run: DemoRun = {
      id,
      claim: { text: input.text.trim(), ...(imageUrl ? { imageUrl } : {}) },
      mode: input.mode,
      tools: input.tools,
      model: input.model,
      status: "running",
      steps: emptySteps(),
      humanDecisions: [],
      createdAt: now(),
      phase: "plan",
      planAsked: false,
      neiFeedbackUsed: false,
    };
    this.runs.set(id, run);
    this.changed(id);
    void this.play(id);
    return id;
  }

  async setMode(id: string, mode: Mode) {
    this.update(id, (run) => void (run.mode = mode));
    // A pause the new mode doesn't have is settled the way that mode would settle it
    const run = this.runs.get(id);
    const pause = run?.status === "paused" ? run.pause : undefined;
    if (!pause || MODE_PAUSES[mode].includes(pause.kind)) return;
    if (pause.kind === "plan") return this.answer(id, { kind: "plan" });
    if (pause.kind === "nei") return this.answer(id, { kind: "nei", choice: "leave" });
    // A disagreement without a human pause becomes NEI (DEFAME decision #43)
    this.update(id, (r) => {
      delete r.pause;
      r.status = "running";
      r.finalVerdict = "nei";
      r.needsHumanReview = true;
      r.phase = "finalize";
    });
    void this.play(id);
  }

  async answer(id: string, answer: Answer) {
    const run = this.runs.get(id);
    if (!run || run.status !== "paused" || !run.pause || run.pause.kind !== answer.kind) return;
    const at = now();
    this.update(id, (r) => {
      delete r.pause;
      r.status = "running";
      if (answer.kind === "plan") {
        r.humanDecisions.push({
          pause: "plan",
          at,
          ...(answer.feedback ? { feedback: answer.feedback } : {}),
        });
        if (answer.feedback) {
          r.humanFeedback = answer.feedback;
          this.step(r, "plan").items.push({
            kind: "human",
            title: "ملاحظة المدقق على الخطة",
            detail: answer.feedback,
          });
          r.phase = "plan"; // the Planner plans once more with the feedback
        } else r.phase = "evidence";
      } else if (answer.kind === "disagree") {
        r.humanDecisions.push({
          pause: "disagree",
          at,
          label: answer.label,
          reason: answer.reason,
        });
        r.finalVerdict = answer.label;
        r.phase = "finalize";
      } else if (answer.choice === "label") {
        r.humanDecisions.push({ pause: "nei", at, label: answer.label, reason: answer.reason });
        r.finalVerdict = answer.label;
        r.needsHumanReview = false;
        r.phase = "finalize";
      } else if (answer.choice === "feedback") {
        r.humanDecisions.push({ pause: "nei", at, feedback: answer.feedback });
        r.neiFeedbackUsed = true;
        r.humanFeedback = answer.feedback;
        // One more agent round, reviewed again
        for (const key of ["evidence", "analysis", "verdict"] as const) {
          const s = this.step(r, key);
          s.status = "pending";
        }
        this.step(r, "evidence").items.push({
          kind: "human",
          title: "ملاحظة المدقق لجولة إضافية",
          detail: answer.feedback,
        });
        delete r.agentVerdict;
        delete r.reviewerVerdict;
        delete r.finalVerdict;
        r.phase = "evidence";
      } else {
        r.humanDecisions.push({ pause: "nei", at, left: true });
        r.finalVerdict = "nei";
        r.needsHumanReview = true;
        r.phase = "finalize";
      }
    });
    void this.play(id);
  }

  // --- The script ---

  private async play(id: string) {
    if (this.playing.has(id)) return;
    this.playing.add(id);
    try {
      for (;;) {
        const run = this.runs.get(id);
        if (!run || run.status !== "running") return;
        const pauses = MODE_PAUSES[run.mode];
        switch (run.phase) {
          case "plan":
            await this.runPlan(id, pauses);
            break;
          case "evidence":
            await this.runEvidence(id);
            break;
          case "analysis":
            await this.runAnalysis(id);
            break;
          case "verdict":
            await this.runVerdict(id, pauses);
            break;
          case "finalize":
            await this.finalize(id);
            break;
          default:
            return;
        }
      }
    } finally {
      this.playing.delete(id);
    }
  }

  private async runPlan(id: string, pauses: readonly PausePoint[]) {
    this.update(id, (r) => void (this.step(r, "plan").status = "running"));
    await wait(STEP_DELAY);
    this.update(id, (r) => {
      const step = this.step(r, "plan");
      const actions: StepItem[] = [
        { kind: "action", title: "بحث ويب: «انهيار جسر الملك فهد ٢٠٢٦»" },
        { kind: "action", title: "بحث ويب: «King Fahd Causeway collapse»" },
      ];
      if (r.claim.imageUrl && r.tools.includes("reverse_image"))
        actions.push({ kind: "action", title: "بحث عكسي عن الصورة" });
      if (r.claim.imageUrl && r.tools.includes("manipulation"))
        actions.push({ kind: "action", title: "كشف التلاعب في الصورة (TruFor)" });
      if (r.humanFeedback)
        actions.push({ kind: "action", title: "بحث ويب: «المؤسسة العامة لجسر الملك فهد بيان»" });
      step.items = [...step.items.filter((i) => i.kind === "human"), ...actions];
      step.summary = r.humanFeedback
        ? "خطة معدّلة بعد ملاحظة المدقق: أُضيف البحث عن بيان رسمي."
        : "الادعاء جزء واحد: هل انهار الجسر فعلاً؟ نبحث عن تغطية إخبارية ومصدر رسمي، ونفحص الصورة إن وُجدت.";
      step.status = "done";
      step.review = { status: "approved", comment: "الخطة تغطي الادعاء الأساسي." };
    });
    const run = this.runs.get(id);
    if (run && pauses.includes("plan") && !run.planAsked) {
      const plan = this.step(run, "plan");
      this.update(id, (r) => {
        r.planAsked = true;
        r.phase = "paused";
        r.status = "paused";
        r.pause = {
          kind: "plan",
          reasoning: plan.summary ?? "",
          actions: plan.items.filter((i) => i.kind === "action").map((i) => i.title),
        };
      });
    } else this.update(id, (r) => void (r.phase = "evidence"));
  }

  private async runEvidence(id: string) {
    this.update(id, (r) => {
      const step = this.step(r, "evidence");
      step.status = "running";
      step.items = step.items.filter((i) => i.kind === "human");
    });
    const items: StepItem[] = [
      {
        kind: "search",
        title: "«انهيار جسر الملك فهد ٢٠٢٦» — 3 مصادر من 18",
        sources: [
          {
            title: "المؤسسة العامة لجسر الملك فهد: الحركة طبيعية",
            url: "https://example.org/kfca-statement",
            date: "2026-11-20",
            credibility: "high",
            stance: "refutes",
          },
          {
            title: "صورة متداولة لجسر منهار",
            url: "https://example.org/viral-post",
            date: "2026-11-19",
            credibility: "low",
            stance: "supports",
          },
        ],
      },
      {
        kind: "search",
        title: "«King Fahd Causeway collapse» — 2 مصادر من 12",
        sources: [
          {
            title: "Image shows a 2018 bridge collapse in Genoa, Italy",
            url: "https://example.org/genoa-2018",
            date: "2018-08-14",
            credibility: "high",
            stance: "refutes",
          },
        ],
      },
    ];
    for (const item of items) {
      await wait(STEP_DELAY / 1.5);
      this.update(id, (r) => void this.step(r, "evidence").items.push(item));
    }
    const run = this.runs.get(id);
    if (run?.claim.imageUrl && run.tools.includes("manipulation")) {
      await wait(STEP_DELAY / 1.5);
      this.update(
        id,
        (r) =>
          void this.step(r, "evidence").items.push({
            kind: "tool",
            title: "كشف التلاعب (TruFor)",
            detail: "درجة التلاعب 0.12: لا مؤشرات قوية على تعديل رقمي.",
          }),
      );
    }
    this.update(id, (r) => {
      const step = this.step(r, "evidence");
      step.status = "done";
      step.summary =
        "مصدر رسمي ينفي الانهيار، والصورة المتداولة تعود لانهيار جسر في جنوة عام 2018.";
      step.review = {
        status: "approved",
        comment: "المصادر موثوقة، لكن المنشور المتداول مصدر ضعيف ولا يُعتمد عليه.",
      };
      r.phase = "analysis";
    });
  }

  private async runAnalysis(id: string) {
    this.update(id, (r) => void (this.step(r, "analysis").status = "running"));
    await wait(STEP_DELAY);
    this.update(id, (r) => {
      const step = this.step(r, "analysis");
      step.status = "done";
      step.summary =
        "الجزء الأول (انهيار الجسر): مدحوض بالبيان الرسمي. الجزء الثاني (الصورة): صورة حقيقية لكن من حدث آخر.";
      step.review = { status: "approved", comment: "التحليل مدعوم بالأدلة." };
      r.phase = "verdict";
    });
  }

  private async runVerdict(id: string, pauses: readonly PausePoint[]) {
    this.update(id, (r) => void (this.step(r, "verdict").status = "running"));
    await wait(STEP_DELAY);
    const run = this.runs.get(id);
    if (!run) return;
    // After a human feedback round the two agree; otherwise this demo shows a disagreement
    const agent: Label = "false";
    const reviewer: Label = run.neiFeedbackUsed ? "false" : "missing_context";
    const agree = agent === reviewer;
    this.update(id, (r) => {
      const step = this.step(r, "verdict");
      step.status = "done";
      r.agentVerdict = agent;
      r.reviewerVerdict = reviewer;
      step.summary = agree
        ? "الوكيل والمراجع متفقان: الادعاء زائف."
        : "الوكيل: زائف. المراجع: ينقصه سياق. الحكمان مختلفان.";
      step.review = agree
        ? { status: "approved", comment: "أوافق على الحكم." }
        : {
            status: "flagged",
            comment: "الصورة حقيقية لكنها من سياق آخر، لذا «ينقصه سياق» أدق من «زائف».",
          };
      if (agree) {
        r.finalVerdict = agent;
        r.phase = "finalize";
      } else if (pauses.includes("disagree")) {
        r.phase = "paused";
        r.status = "paused";
        r.pause = {
          kind: "disagree",
          agent: {
            label: agent,
            reasoning: "البيان الرسمي ينفي الانهيار، فالادعاء الأساسي غير صحيح.",
          },
          reviewer: {
            label: reviewer,
            reasoning: "الصورة حقيقية لكنها من جنوة 2018؛ المشكلة في السياق لا في الصورة نفسها.",
          },
        };
      } else if (pauses.includes("nei")) {
        r.finalVerdict = "nei";
        r.phase = "paused";
        r.status = "paused";
        r.pause = {
          kind: "nei",
          reasoning: "الوكيل والمراجع لم يتفقا (زائف / ينقصه سياق)، فلا توجد نتيجة تلقائية.",
          feedbackAllowed: !r.neiFeedbackUsed,
        };
      } else {
        r.finalVerdict = "nei";
        r.needsHumanReview = true;
        r.phase = "finalize";
      }
    });
  }

  private async finalize(id: string) {
    await wait(STEP_DELAY / 2);
    this.update(id, (r) => {
      const { blocks, comments } = demoReport(r);
      r.report = { blocks, comments };
      if (r.finalVerdict === "nei") r.needsHumanReview = true;
      r.status = "done";
      r.phase = "done";
    });
  }

  // --- Plumbing ---

  private step(run: FactCheckRun, key: StepKey) {
    const step = run.steps.find((s) => s.key === key);
    if (!step) throw new Error(`Missing step ${key}`);
    return step;
  }

  private update(id: string, change: (run: DemoRun) => void) {
    const run = this.runs.get(id);
    if (!run) return;
    change(run);
    this.changed(id);
  }

  private changed(id: string) {
    this.save();
    const snap = this.snapshot(id);
    this.runListeners.get(id)?.forEach((cb) => cb(snap));
    const sessions = this.sessions();
    this.sessionListeners.forEach((cb) => cb(sessions));
  }

  /** A fresh copy, so React sees a new object on every change. */
  private snapshot(id: string): FactCheckRun | null {
    const run = this.runs.get(id);
    return run ? (structuredClone(run) as FactCheckRun) : null;
  }

  private sessions(): SessionSummary[] {
    return [...this.runs.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((r) => ({
        id: r.id,
        title: r.claim.text.slice(0, 80) || "صورة",
        status: r.status,
        ...(r.finalVerdict ? { finalVerdict: r.finalVerdict } : {}),
        createdAt: r.createdAt,
      }));
  }

  private load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const list = raw ? (JSON.parse(raw) as DemoRun[]) : [];
      for (const run of list) this.runs.set(run.id, run);
    } catch {
      // Private window or blocked storage: start empty
    }
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.runs.values()].slice(-20)));
    } catch {
      // Storage full or blocked (e.g. a large image): keep the runs in memory only
    }
  }
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function demoReport(run: FactCheckRun): { blocks: ReportBlock[]; comments: ReviewComment[] } {
  const blocks: ReportBlock[] = [
    { id: "claim", heading: "الادعاء", text: run.claim.text || "صورة متداولة" },
    {
      id: "summary",
      heading: "الخلاصة",
      text: "انتشرت صورة تزعم انهيار جسر الملك فهد هذا الأسبوع. البيان الرسمي للمؤسسة العامة لجسر الملك فهد ينفي ذلك ويؤكد أن الحركة طبيعية، والصورة المتداولة تعود لانهيار جسر موراندي في جنوة بإيطاليا عام 2018.",
    },
    {
      id: "evidence",
      heading: "الأدلة",
      text: "1) بيان المؤسسة العامة لجسر الملك فهد بتاريخ 20 نوفمبر 2026. 2) البحث العكسي يطابق الصورة مع تغطية انهيار جسر جنوة في 14 أغسطس 2018. 3) منشور متداول على وسائل التواصل يكرر الادعاء دون مصدر.",
    },
    {
      id: "verdict",
      heading: "الحكم",
      text: "الادعاء زائف: الجسر لم ينهر، والصورة لا تصوّر الحدث المزعوم.",
    },
  ];
  const comments: ReviewComment[] = [
    {
      id: "c1",
      blockId: "summary",
      quote: "هذا الأسبوع",
      body: "حدّد التاريخ بدقة؛ أول ظهور للصورة كان في 19 نوفمبر 2026.",
      stage: "analysis",
      status: "incomplete",
      suggestion: "في 19 نوفمبر 2026",
    },
    {
      id: "c2",
      blockId: "evidence",
      quote: "منشور متداول على وسائل التواصل يكرر الادعاء دون مصدر",
      body: "هذا ليس دليلاً على صحة الادعاء ولا نفيه؛ يُذكر كسياق للانتشار فقط.",
      stage: "evidence",
      status: "approved",
    },
    {
      id: "c3",
      blockId: "verdict",
      quote: "الادعاء زائف",
      body: "الصورة حقيقية لكن من سياق آخر، فقد يكون «ينقصه سياق» أدق. القرار للمدقق.",
      stage: "verdict",
      status: "flagged",
      suggestion: "الادعاء ينقصه سياق",
    },
  ];
  return { blocks, comments };
}
