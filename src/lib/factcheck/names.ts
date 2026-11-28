import type { Mode, ReviewStatus, StepKey, ToolId } from "./types";

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

export const STEP_NAMES: Record<StepKey, Pair> = {
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
