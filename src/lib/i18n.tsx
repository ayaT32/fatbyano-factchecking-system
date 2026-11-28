import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "ar" | "en";

const dict = {
  appName: { ar: "فتبينوا", en: "Fattabyno" },
  tagline: { ar: "الحقيقة تستحق التحقق", en: "Facts deserve verification" },
  dashboard: { ar: "لوحة التحكم", en: "Dashboard" },
  analytics: { ar: "التحليلات", en: "Analytics" },
  trends: { ar: "الرائج الآن", en: "Trending" },
  check: { ar: "فحص بالذكاء الاصطناعي", en: "AI fact-check" },
  investigate: { ar: "تحقيق بالذكاء الاصطناعي", en: "AI investigation" },
  geospatial: { ar: "التحقق الجغرافي", en: "Geospatial tools" },
  history: { ar: "سجل الادعاءات", en: "Claims history" },
  reports: { ar: "التقارير", en: "Reports" },
  team: { ar: "الفريق", en: "Team" },
  teamActivity: { ar: "نشاط الفريق", en: "Team activity" },
  masterDatabase: { ar: "قاعدة البيانات الرئيسية", en: "Master database" },
  internalId: { ar: "معرّف داخلي", en: "Internal ID" },
  signOut: { ar: "تسجيل الخروج", en: "Sign out" },
  management: { ar: "الإدارة", en: "Management" },
  staff: { ar: "مدقق", en: "Fact-checker" },
  signIn: { ar: "تسجيل الدخول", en: "Sign in" },
  signUp: { ar: "إنشاء حساب", en: "Create account" },
  email: { ar: "البريد الإلكتروني", en: "Email" },
  password: { ar: "كلمة المرور", en: "Password" },
  fullName: { ar: "الاسم الكامل", en: "Full name" },
  google: { ar: "المتابعة عبر Google", en: "Continue with Google" },
  staffOnly: { ar: "للإدارة والفريق فقط", en: "For management and staff only" },
  noAccount: { ar: "ليس لديك حساب؟", en: "No account yet?" },
  haveAccount: { ar: "لديك حساب؟", en: "Already have an account?" },
  signupSessionRequired: {
    ar: "تعذر تسجيل الدخول تلقائياً. عطّل تأكيد البريد الإلكتروني في إعدادات Supabase ثم حاول مجدداً.",
    en: "Automatic sign-in was unavailable. Disable email confirmation in Supabase settings and try again.",
  },
  welcome: { ar: "مرحباً", en: "Welcome" },
  totalClaims: { ar: "إجمالي الادعاءات", en: "Total claims" },
  thisWeek: { ar: "هذا الأسبوع", en: "This week" },
  falseClaims: { ar: "ادعاءات كاذبة", en: "False claims" },
  reportsCount: { ar: "التقارير المُنشأة", en: "Reports generated" },
  recentClaims: { ar: "أحدث الادعاءات", en: "Recent claims" },
  viewAll: { ar: "عرض الكل", en: "View all" },
  newCheck: { ar: "فحص جديد", en: "New check" },
  empty: { ar: "لا توجد بيانات بعد.", en: "Nothing here yet." },
  claimText: { ar: "نص الادعاء", en: "Claim text" },
  claimPlaceholder: { ar: "الصق الادعاء كما ورد…", en: "Paste the claim as it appeared…" },
  sourceLink: { ar: "رابط المصدر (اختياري)", en: "Source link (optional)" },
  image: { ar: "صورة / لقطة شاشة (اختياري)", en: "Image / screenshot (optional)" },
  chooseImage: { ar: "اختر صورة", en: "Choose image" },
  runCheck: { ar: "ابدأ الفحص", en: "Run check" },
  checking: { ar: "جارٍ التحليل…", en: "Analysing…" },
  verdict: { ar: "الحكم", en: "Verdict" },
  confidence: { ar: "درجة الثقة", en: "Confidence" },
  subClaims: { ar: "الادعاءات الفرعية", en: "Sub-claims" },
  redFlags: { ar: "مؤشرات تحذيرية", en: "Red flags" },
  sources: { ar: "مصادر مقترحة للتحقق", en: "Suggested sources" },
  generateReport: { ar: "إنشاء تقرير", en: "Generate report" },
  viewClaim: { ar: "عرض الادعاء", en: "View claim" },
  search: { ar: "بحث…", en: "Search…" },
  all: { ar: "الكل", en: "All" },
  date: { ar: "التاريخ", en: "Date" },
  author: { ar: "المدقق", en: "Checker" },
  print: { ar: "طباعة", en: "Print" },
  delete: { ar: "حذف", en: "Delete" },
  back: { ar: "رجوع", en: "Back" },
  overTime: { ar: "الادعاءات عبر الزمن", en: "Claims over time" },
  byVerdict: { ar: "التوزيع حسب الحكم", en: "By verdict" },
  byChecker: { ar: "حسب المدقق", en: "By checker" },
  byCategory: { ar: "حسب الفئة", en: "By category" },
  avgConfidence: { ar: "متوسط الثقة", en: "Avg. confidence" },
  role: { ar: "الدور", en: "Role" },
  makeAdmin: { ar: "ترقية للإدارة", en: "Make management" },
  makeStaff: { ar: "تحويل لمدقق", en: "Make fact-checker" },
  aiNote: {
    ar: "نتيجة الذكاء الاصطناعي إرشادية — راجعها قبل النشر.",
    en: "AI output is guidance — review before publishing.",
  },
  analysis: { ar: "التحليل", en: "Analysis" },
  category: { ar: "الفئة", en: "Category" },
  reportCreated: { ar: "تم إنشاء التقرير", en: "Report created" },
  adminOnly: { ar: "هذه الصفحة للإدارة فقط.", en: "This page is for management only." },
  "v.false": { ar: "زائف", en: "False" },
  "v.altered": { ar: "معدّل", en: "Altered" },
  "v.misleading": { ar: "مضلل", en: "Misleading" },
  "v.missing_context": { ar: "ينقصه سياق", en: "Missing context" },
  "v.true": { ar: "صحيح", en: "True" },
  "v.satire": { ar: "ساخر", en: "Satire" },
  "v.nei": { ar: "معلومات غير كافية", en: "Not enough information" },
} as const;

export type TKey = keyof typeof dict;

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: TKey) => string; dir: "rtl" | "ltr" };
const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");
  useEffect(() => {
    const saved = localStorage.getItem("meeno-lang");
    if (saved === "en" || saved === "ar") setLangState(saved);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);
  const setLang = (l: Lang) => {
    localStorage.setItem("meeno-lang", l);
    setLangState(l);
  };
  const t = (k: TKey) => {
    if (k === "appName") return lang === "ar" ? "فتبينوا" : "Fattabyno";
    return dict[k]?.[lang] ?? k;
  };
  return (
    <I18nContext.Provider value={{ lang, setLang, t, dir: lang === "ar" ? "rtl" : "ltr" }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const c = useContext(I18nContext);
  if (!c) throw new Error("useI18n outside provider");
  return c;
}

// Fatabyyano's six labels, plus NEI when no conclusion was reached (a human decides)
export const VERDICTS = ["false", "altered", "misleading", "missing_context", "true", "satire", "nei"] as const;
export type Verdict = (typeof VERDICTS)[number];
