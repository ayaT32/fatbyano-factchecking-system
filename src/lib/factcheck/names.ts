import type { Mode, Phase, PausePoint, ReviewStatus, ToolId } from "./types";

type Pair = { ar: string; en: string };

export const MODE_NAMES: Record<Mode, Pair & { hintAr: string; hintEn: string }> = {
  auto: {
    ar: "تلقائي",
    en: "Auto",
    hintAr: "بلا توقف؛ أي خلاف يصبح «معلومات غير كافية»",
    hintEn: "No pauses; any disagreement becomes NEI",
  },
  disagreement: {
    ar: "عند الخلاف",
    en: "Disagreement",
    hintAr: "يتوقف إذا اختلف الوكيل والمراجع، وعند «معلومات غير كافية»",
    hintEn: "Pauses when the agent and the Reviewer disagree, and at NEI",
  },
  supervised: {
    ar: "إشراف كامل",
    en: "Supervised",
    hintAr: "يتوقف أيضاً بعد الخطة الأولى",
    hintEn: "Also pauses after the first plan",
  },
  verdict: {
    ar: "مراجعة الحكم",
    en: "Verdict",
    hintAr: "عند الخلاف و«معلومات غير كافية»، وأيضاً عند كل حكم متفق عليه",
    hintEn: "Disagreement and NEI, plus every verdict they agree on",
  },
};

export const PHASE_NAMES: Record<Phase, Pair> = {
  planning: { ar: "يخطط الوكيل…", en: "Planning…" },
  gathering_evidence: { ar: "يجمع الأدلة…", en: "Gathering evidence…" },
  analysing: { ar: "يحلل الأدلة…", en: "Analysing…" },
  reviewing: { ar: "يراجع المراجع…", en: "The Reviewer is checking…" },
  finalizing: { ar: "يكتب التقرير…", en: "Writing the report…" },
};

/** The phases as checklist items (the status line's list). */
export const PHASE_STEP_NAMES: Record<Phase, Pair> = {
  planning: { ar: "التخطيط", en: "Plan the checks" },
  gathering_evidence: { ar: "جمع الأدلة", en: "Gather evidence" },
  analysing: { ar: "تحليل الأدلة والحكم", en: "Analyse and judge" },
  reviewing: { ar: "مراجعة المراجع", en: "Reviewer's double check" },
  finalizing: { ar: "كتابة التقرير", en: "Write the report" },
};

export const PAUSE_TITLES: Record<PausePoint, Pair> = {
  plan: { ar: "راجع الخطة قبل التنفيذ", en: "Check the plan before it runs" },
  disagree: { ar: "الوكيل والمراجع مختلفان", en: "The agent and the Reviewer disagree" },
  nei: { ar: "لا توجد نتيجة تلقائية", en: "No automatic conclusion" },
  verdict: { ar: "راجع الحكم المتفق عليه", en: "Check the agreed verdict" },
};

export const TOOL_NAMES: Record<ToolId, Pair & { hintAr: string; hintEn: string }> = {
  web_search: {
    ar: "بحث الويب",
    en: "Web search",
    hintAr: "Google عبر SerpApi",
    hintEn: "Google via SerpApi",
  },
  reverse_image: {
    ar: "البحث العكسي عن الصور",
    en: "Reverse image search",
    hintAr: "Google Vision",
    hintEn: "Google Vision",
  },
  geolocation: {
    ar: "تحديد الموقع",
    en: "Geolocation",
    hintAr: "مواقع محتملة، لا إحداثيات مؤكدة",
    hintEn: "Likely places, not confirmed coordinates",
  },
  manipulation: {
    ar: "كشف التلاعب",
    en: "Manipulation detector",
    hintAr: "TruFor: تعديل رقمي أو توليد بالذكاء الاصطناعي",
    hintEn: "TruFor: digital edits or AI generation",
  },
  metadata: {
    ar: "بيانات الصورة الوصفية",
    en: "Image metadata",
    hintAr: "ExifTool: التاريخ والجهاز والموقع",
    hintEn: "ExifTool: date, device, location",
  },
};

export const STEP_NAMES: Record<"plan" | "evidence" | "analysis" | "verdict", Pair> = {
  plan: { ar: "الخطة", en: "Plan" },
  evidence: { ar: "الأدلة", en: "Evidence" },
  analysis: { ar: "التحليل", en: "Analysis" },
  verdict: { ar: "الحكم", en: "Verdict" },
};

export const REVIEW_NAMES: Record<ReviewStatus, Pair & { tone: string }> = {
  approved: {
    ar: "معتمد",
    en: "Approved",
    tone: "bg-verdict-true/10 text-verdict-true ring-verdict-true/30",
  },
  incomplete: {
    ar: "ناقص",
    en: "Incomplete",
    tone: "bg-verdict-missing-context/10 text-verdict-missing-context ring-verdict-missing-context/30",
  },
  misleading: {
    ar: "مضلل",
    en: "Misleading",
    tone: "bg-verdict-misleading/10 text-verdict-misleading ring-verdict-misleading/30",
  },
  flagged: {
    ar: "ملاحظة",
    en: "Flagged",
    tone: "bg-verdict-false/10 text-verdict-false ring-verdict-false/30",
  },
  not_reviewed: {
    ar: "لم يُراجع",
    en: "Not reviewed",
    tone: "bg-muted text-muted-foreground ring-border",
  },
};
