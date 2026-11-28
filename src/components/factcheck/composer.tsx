import { useRef, useState } from "react";
import { ArrowUp, Check, ChevronDown, ImagePlus, Loader2, Plus, Wrench, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { MODE_NAMES, TOOL_NAMES } from "@/lib/factcheck/names";
import {
  MODELS,
  MODES,
  TOOLS,
  DEFAULT_TOOLS,
  SWITCHABLE_TOOLS,
  type Mode,
  type StartInput,
  type ToolId,
} from "@/lib/factcheck/types";

const MAX_IMAGE_MB = 5;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export function Composer({
  onSubmit,
  initialText = "",
}: {
  onSubmit: (input: StartInput) => Promise<void>;
  initialText?: string;
}) {
  const { lang } = useI18n();
  const c = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const [text, setText] = useState(initialText);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  // On by default, except geolocation, which loads a large model (DEFAME DECISIONS.md #46)
  const [tools, setTools] = useState<ToolId[]>([...DEFAULT_TOOLS]);
  const [mode, setMode] = useState<Mode>("auto"); // the default: no pauses, as in the backend
  const [model, setModel] = useState(MODELS[0]?.id ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  function choose(file: File | undefined) {
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setError(
        c(
          `اختر صورة PNG أو JPG أو WebP لا تتجاوز ${MAX_IMAGE_MB} ميغابايت.`,
          `Choose a PNG, JPG or WebP image under ${MAX_IMAGE_MB} MB.`,
        ),
      );
      return;
    }
    setError("");
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  function removeImage() {
    if (preview) URL.revokeObjectURL(preview);
    setImage(null);
    setPreview(null);
  }

  async function submit() {
    if (busy || (!text.trim() && !image)) return;
    setBusy(true);
    setError("");
    try {
      await onSubmit({ text: text.trim(), mode, tools, model, ...(image ? { image } : {}) });
    } catch (e) {
      setError(e instanceof Error ? e.message : c("تعذر بدء الفحص.", "Could not start the check."));
      setBusy(false);
    }
  }

  const modeName = MODE_NAMES[mode];
  const modelName = MODELS.find((m) => m.id === model)?.name;
  const toggleTool = (tool: ToolId, on: boolean) =>
    setTools((prev) =>
      on ? [...prev.filter((t) => t !== tool), tool] : prev.filter((t) => t !== tool),
    );

  return (
    <div className="w-full">
      <div className="rounded-3xl border bg-card shadow-sm transition focus-within:border-primary/50 focus-within:shadow-md">
        {preview && (
          <div className="flex items-center gap-3 px-4 pt-3">
            <div className="relative">
              <img
                src={preview}
                alt={image?.name ?? ""}
                className="size-16 rounded-xl object-cover ring-1 ring-border"
              />
              <button
                type="button"
                onClick={removeImage}
                aria-label={c("إزالة الصورة", "Remove image")}
                className="absolute -end-2 -top-2 grid size-5 place-items-center rounded-full bg-ink text-ink-foreground"
              >
                <X className="size-3" />
              </button>
            </div>
            <span className="truncate text-xs text-muted-foreground">{image?.name}</span>
          </div>
        )}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void submit();
            }
          }}
          onPaste={(e) => {
            const file = [...e.clipboardData.files].find((f) => f.type.startsWith("image/"));
            if (file) choose(file);
          }}
          disabled={busy}
          rows={3}
          maxLength={10000}
          dir="auto"
          aria-label={c("الادعاء", "Claim")}
          placeholder={c(
            "الصق الادعاء كما ورد، أو أرفق صورة…",
            "Paste the claim as it appeared, or attach an image…",
          )}
          className="block max-h-60 min-h-24 w-full resize-none bg-transparent px-5 pt-4 text-base leading-7 outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center gap-1.5 px-3 pb-3">
          <input
            ref={fileInput}
            type="file"
            accept={IMAGE_TYPES.join(",")}
            className="hidden"
            onChange={(e) => {
              choose(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 rounded-full"
                disabled={busy}
                aria-label={c("إضافة", "Add")}
              >
                <Plus className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuItem onSelect={() => fileInput.current?.click()}>
                <ImagePlus />
                {c("إرفاق صورة", "Attach image")}
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Wrench />
                  {c("الأدوات", "Tools")}
                  <span className="ms-auto text-xs text-muted-foreground">
                    {tools.length}/{TOOLS.length}
                  </span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-72">
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                    {c(
                      "المخطط يختار منها ما يناسب الادعاء",
                      "The planner picks what fits the claim",
                    )}
                  </DropdownMenuLabel>
                  {TOOLS.map((tool) => (
                    <DropdownMenuCheckboxItem
                      key={tool}
                      checked={tools.includes(tool)}
                      onCheckedChange={(on) => toggleTool(tool, on === true)}
                      onSelect={(e) => e.preventDefault()}
                      disabled={!SWITCHABLE_TOOLS.includes(tool)} // web search (with reverse image search) is always on
                    >
                      <span className="flex flex-col">
                        <span>{lang === "ar" ? TOOL_NAMES[tool].ar : TOOL_NAMES[tool].en}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {lang === "ar" ? TOOL_NAMES[tool].hintAr : TOOL_NAMES[tool].hintEn}
                        </span>
                      </span>
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
          {tools.length < TOOLS.length && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
              {c(
                `${TOOLS.length - tools.length} أداة متوقفة`,
                `${TOOLS.length - tools.length} tool(s) off`,
              )}
            </span>
          )}

          <div className="ms-auto flex items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 rounded-full px-3 text-sm"
                  disabled={busy}
                >
                  {lang === "ar" ? modeName.ar : modeName.en}
                  {MODELS.length > 1 && modelName && (
                    <span className="text-muted-foreground">· {modelName}</span>
                  )}
                  <ChevronDown className="size-4 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  {c("وضع المراجعة البشرية", "Human review mode")}
                </DropdownMenuLabel>
                {MODES.map((m) => (
                  <DropdownMenuItem key={m} onSelect={() => setMode(m)} className="items-start">
                    <Check className={cn("mt-0.5", m !== mode && "invisible")} />
                    <span className="flex flex-col">
                      <span className="font-medium">
                        {lang === "ar" ? MODE_NAMES[m].ar : MODE_NAMES[m].en}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {lang === "ar" ? MODE_NAMES[m].hintAr : MODE_NAMES[m].hintEn}
                      </span>
                    </span>
                  </DropdownMenuItem>
                ))}
                {MODELS.length > 1 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                      {c("النموذج", "Model")}
                    </DropdownMenuLabel>
                    {MODELS.map((m) => (
                      <DropdownMenuItem key={m.id} onSelect={() => setModel(m.id)}>
                        <Check className={cn(m.id !== model && "invisible")} />
                        {m.name}
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              size="icon"
              className="size-9 rounded-full"
              disabled={busy || (!text.trim() && !image)}
              onClick={() => void submit()}
              aria-label={c("ابدأ الفحص", "Start fact-check")}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
              ) : (
                <ArrowUp className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
