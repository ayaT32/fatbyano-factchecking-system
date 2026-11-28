import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, type UIMessage, type FileUIPart } from "ai";
import {
  Plus,
  MessageSquare,
  Paperclip,
  SlidersHorizontal,
  MapPin,
  ScanEye,
  ArrowUp,
  Copy,
  LockKeyhole,
  PanelLeftClose,
  PanelLeft,
  Square,
} from "lucide-react";
import { toast } from "sonner";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageAction,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Tool, ToolHeader, ToolContent } from "@/components/ai-elements/tool";
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/ai-elements/reasoning";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCopy } from "@/components/desk-ui";
import { supabase } from "@/integrations/supabase/client";
import { createInvestigation } from "@/lib/chat.functions";
import { investigationsOptions } from "@/lib/chat-queries";
import { selectedToolsSchema, type InvestigationTool } from "@/lib/chat/schema";
import { InvestigationReview } from "./investigation-review";

type Props = {
  id?: string;
  title?: string;
  initialMessages?: UIMessage[];
  enabledTools?: string[];
  start?: boolean;
  initialText?: string;
};
export function InvestigationWorkspace(props: Props) {
  const c = useCopy();
  const navigate = useNavigate();
  const create = useServerFn(createInvestigation);
  const qc = useQueryClient();
  const history = useQuery(investigationsOptions());
  const [text, setText] = useState(props.initialText ?? "");
  const [tools, setTools] = useState<InvestigationTool[]>(
    selectedToolsSchema.parse(props.enabledTools ?? ["manipulation", "geolocation"]),
  );
  const [creating, setCreating] = useState(false);
  const [sidebar, setSidebar] = useState(true);
  const [attachment, setAttachment] = useState<FileUIPart | null>(null);
  const [localError, setLocalError] = useState("");
  const [toolMenu, setToolMenu] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const started = useRef(false);
  const toolsRef = useRef(tools);
  toolsRef.current = tools;
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/investigation-chat",
        body: () => ({ conversationId: props.id, enabledTools: toolsRef.current }),
        headers: async () => {
          const { data } = await supabase.auth.getSession();
          if (!data.session) throw new Error("Sign in to continue.");
          return { Authorization: `Bearer ${data.session.access_token}` };
        },
      }),
    [props.id],
  );
  const { messages, sendMessage, regenerate, status, stop, error } = useChat({
    id: props.id ?? "new-investigation",
    messages: props.initialMessages ?? [],
    transport,
    onError: (e) => toast.error(e.message),
    onFinish: async () => {
      await qc.invalidateQueries({ queryKey: ["investigations"] });
      await qc.invalidateQueries({ queryKey: ["investigation", props.id] });
    },
  });
  const busy = status === "submitted" || status === "streaming" || creating;
  useEffect(() => {
    if (!toolMenu && !busy) textarea.current?.focus();
  }, [busy, toolMenu]);
  useEffect(() => {
    if (props.start && props.id && !started.current) {
      started.current = true;
      void navigate({
        to: "/investigate/$id",
        params: { id: props.id },
        search: {},
        replace: true,
      });
      void regenerate();
    }
  }, [props.start, props.id, navigate, regenerate]);
  async function newChat() {
    if (busy) return;
    setCreating(true);
    setLocalError("");
    try {
      const chat = await create({
        data: { title: c("تحقيق جديد", "New investigation"), enabledTools: tools },
      });
      await qc.invalidateQueries({ queryKey: ["investigations"] });
      await navigate({ to: "/investigate/$id", params: { id: chat.id }, search: {} });
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Could not create investigation.");
    } finally {
      setCreating(false);
    }
  }
  async function choose(file?: File) {
    if (!file || busy) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setLocalError(
        c(
          "اختر صورة PNG أو JPG أو WebP لا تتجاوز 5 ميغابايت.",
          "Choose a PNG, JPG or WebP image under 5 MB.",
        ),
      );
      return;
    }
    try {
      const url = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      setAttachment({ type: "file", mediaType: file.type, filename: file.name, url });
      setLocalError("");
    } catch {
      setLocalError("The image could not be opened.");
    }
  }
  async function submit() {
    if (busy || (!text.trim() && !attachment)) return;
    const prompt =
      text.trim() ||
      c(
        "حلل هذه الصورة وحدد ما يمكن التحقق منه.",
        "Analyze this image and identify what can be verified.",
      );
    setLocalError("");
    try {
      if (!props.id) {
        setCreating(true);
        const firstMessage: UIMessage = {
          id: crypto.randomUUID(),
          role: "user",
          parts: [{ type: "text", text: prompt }, ...(attachment ? [attachment] : [])],
        };
        const chat = await create({
          data: { title: prompt.slice(0, 100), enabledTools: tools, firstMessage },
        });
        await qc.invalidateQueries({ queryKey: ["investigations"] });
        await navigate({
          to: "/investigate/$id",
          params: { id: chat.id },
          search: { start: true },
        });
      } else {
        void sendMessage({ text: prompt, ...(attachment ? { files: [attachment] } : {}) });
        setText("");
        setAttachment(null);
      }
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Could not send message.");
    } finally {
      setCreating(false);
    }
  }
  const toolNames = {
    manipulation: c("تحليل التلاعب", "Manipulation analysis"),
    geolocation: c("تحديد الموقع", "Geolocation"),
  };
  return (
    <TooltipProvider>
      <div className="investigation-workspace -mx-2 flex min-h-[650px] overflow-hidden md:-mx-4">
        {sidebar && (
          <aside className="hidden w-52 shrink-0 flex-col border-e bg-card/60 px-3 py-4 lg:flex">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => void newChat()}
              disabled={busy}
            >
              <Plus />
              {c("تحقيق جديد", "New investigation")}
            </Button>
            <p className="mb-3 mt-8 px-2 text-xs font-medium text-muted-foreground">
              {c("تحقيقاتك", "Your investigations")}
            </p>
            <nav
              className="flex-1 space-y-1 overflow-y-auto"
              aria-label={c("المحادثات", "Investigations")}
            >
              {history.isLoading && (
                <p className="px-2 text-xs text-muted-foreground">
                  {c("جارٍ التحميل…", "Loading…")}
                </p>
              )}
              {history.error && (
                <p className="px-2 text-xs text-destructive">{history.error.message}</p>
              )}
              {history.data?.map((chat) => (
                <Link
                  key={chat.id}
                  to="/investigate/$id"
                  params={{ id: chat.id }}
                  search={{}}
                  aria-disabled={busy}
                  onClick={(e) => {
                    if (busy) e.preventDefault();
                  }}
                  className={`flex items-center gap-2 rounded-lg px-3 py-3 text-sm ${chat.id === props.id ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"}`}
                >
                  <MessageSquare className="size-4 shrink-0" />
                  <span className="truncate">{chat.title}</span>
                </Link>
              ))}
            </nav>
            <p className="mt-6 flex items-center gap-2 px-2 text-xs text-muted-foreground">
              <LockKeyhole className="size-3" />
              {c("خاص بحسابك", "Private to your account")}
            </p>
          </aside>
        )}
        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center gap-3 border-b px-3 md:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:inline-flex"
              title={c("إظهار المحادثات", "Toggle conversations")}
              aria-label="Toggle conversations"
              onClick={() => setSidebar(!sidebar)}
            >
              {sidebar ? <PanelLeftClose /> : <PanelLeft />}
            </Button>
            <h1 className="min-w-0 flex-1 truncate text-sm font-semibold">
              {props.title ?? c("مساعد فتبينوا", "Fattabyno Assistant")}
            </h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void newChat()}
              disabled={busy}
              title={c("تحقيق جديد", "New investigation")}
              aria-label="New investigation"
            >
              <Plus />
            </Button>
          </header>
          <nav
            className="flex gap-2 overflow-x-auto border-b px-3 py-2 lg:hidden"
            aria-label="Recent investigations"
          >
            {history.data?.slice(0, 12).map((chat) => (
              <Link
                className="max-w-40 shrink-0 truncate rounded-md bg-card px-3 py-2 text-xs"
                to="/investigate/$id"
                params={{ id: chat.id }}
                search={{}}
                key={chat.id}
                onClick={(e) => {
                  if (busy) e.preventDefault();
                }}
              >
                {chat.title}
              </Link>
            ))}
          </nav>
          <Conversation className="min-h-0">
            <ConversationContent className="mx-auto w-full max-w-3xl gap-7 px-4 py-8 md:px-8">
              {!messages.length && (
                <div className="flex min-h-56 flex-col items-center justify-center py-8 text-center">
                  <h2 className="text-2xl font-semibold">
                    {c("ما الذي نتحقق منه اليوم؟", "What are we verifying today?")}
                  </h2>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {c("ابدأ بادعاء، صورة أو مصدر.", "Start with a claim, an image or a source.")}
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => {
                        setText(
                          c(
                            "راجع هذا الادعاء وحدد الأدلة المطلوبة: ",
                            "Review this claim and identify the evidence needed: ",
                          ),
                        );
                        textarea.current?.focus();
                      }}
                    >
                      <MessageSquare />
                      {c("راجع ادعاءً", "Review a claim")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => upload.current?.click()}
                    >
                      <ScanEye />
                      {c("افحص صورة", "Inspect an image")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => {
                        setText(
                          c(
                            "ساعدني في تحديد موقع هذه الصورة بناءً على المعالم الظاهرة.",
                            "Help identify the public location in this image from visible landmarks.",
                          ),
                        );
                        upload.current?.click();
                      }}
                    >
                      <MapPin />
                      {c("حدد الموقع", "Locate a place")}
                    </Button>
                  </div>
                </div>
              )}
              {messages.map((message) => (
                <Message
                  key={message.id}
                  from={message.role}
                  className={message.role === "assistant" ? "max-w-full" : "ms-auto"}
                >
                  <MessageContent
                    className={
                      message.role === "user"
                        ? "group-[.is-user]:bg-ink group-[.is-user]:text-ink-foreground text-base leading-7"
                        : "w-full text-base leading-8"
                    }
                  >
                    {message.role === "assistant" && (
                      <span className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                        {c("فتبينوا", "Fattabyno")}
                      </span>
                    )}
                    {message.parts.map((part, i) => {
                      if (part.type === "text")
                        return <MessageResponse key={i}>{part.text}</MessageResponse>;
                      if (part.type === "file")
                        return (
                          <img
                            key={i}
                            src={part.url}
                            alt={part.filename ?? c("صورة مرفقة", "Attached image")}
                            className="max-h-64 max-w-full rounded-lg object-contain"
                          />
                        );
                      if (part.type === "reasoning")
                        return (
                          <Reasoning
                            key={i}
                            defaultOpen={false}
                            isStreaming={part.state === "streaming"}
                          >
                            <ReasoningTrigger>
                              {c("ملاحظات البحث", "Research notes")}
                            </ReasoningTrigger>
                            <ReasoningContent>{part.text}</ReasoningContent>
                          </Reasoning>
                        );
                      if (isToolUIPart(part)) {
                        const name = part.type.replace("tool-", "");
                        const output =
                          part.state === "output-available" &&
                          part.output &&
                          typeof part.output === "object" &&
                          "assessment" in part.output
                            ? String(part.output.assessment)
                            : "";
                        return (
                          <Tool key={i} defaultOpen={false}>
                            {part.type === "dynamic-tool" ? (
                              <ToolHeader
                                type="dynamic-tool"
                                toolName={part.toolName}
                                state={part.state}
                                title={name}
                              />
                            ) : (
                              <ToolHeader
                                type={part.type}
                                state={part.state}
                                title={
                                  name === "manipulation"
                                    ? toolNames.manipulation
                                    : name === "geolocation"
                                      ? toolNames.geolocation
                                      : name
                                }
                              />
                            )}
                            <ToolContent>
                              {Boolean(part.input) && (
                                <p className="text-xs text-muted-foreground">
                                  {part.input &&
                                  typeof part.input === "object" &&
                                  "focus" in part.input
                                    ? String(part.input.focus)
                                    : ""}
                                </p>
                              )}
                              {output && <MessageResponse>{output}</MessageResponse>}
                              {part.state === "output-error" && (
                                <p className="text-sm text-destructive">{part.errorText}</p>
                              )}
                            </ToolContent>
                          </Tool>
                        );
                      }
                      return null;
                    })}
                  </MessageContent>
                  {message.role === "assistant" && (
                    <MessageAction
                      tooltip={c("نسخ", "Copy")}
                      onClick={() =>
                        void navigator.clipboard.writeText(
                          message.parts
                            .filter((p) => p.type === "text")
                            .map((p) => p.text)
                            .join("\n"),
                        )
                      }
                    >
                      <Copy />
                    </MessageAction>
                  )}
                </Message>
              ))}
              {status === "submitted" && (
                <Shimmer>{c("جارٍ مراجعة الأدلة…", "Reviewing the evidence…")}</Shimmer>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
          <div className="mx-auto w-full max-w-3xl shrink-0 px-4 pb-4 pt-2 md:px-8">
            {(localError || error) && (
              <p role="alert" className="mb-3 text-sm text-destructive">
                {localError || error?.message}
              </p>
            )}
            <input
              ref={upload}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => void choose(e.target.files?.[0])}
            />
            {attachment && (
              <div className="mb-2 flex items-center gap-3 rounded-lg border bg-card p-2">
                <img className="size-12 rounded object-contain" src={attachment.url} alt="" />
                <span className="min-w-0 flex-1 truncate text-xs">{attachment.filename}</span>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  disabled={busy}
                  aria-label="Remove image"
                  onClick={() => setAttachment(null)}
                >
                  ×
                </Button>
              </div>
            )}
            <PromptInput
              onSubmit={() => submit()}
              className="rounded-2xl bg-card [&_[data-slot=input-group]]:rounded-2xl"
              onError={(e) => setLocalError(e.message)}
            >
              <PromptInputTextarea
                ref={textarea}
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={10000}
                disabled={busy}
                dir="auto"
                aria-label="Investigation message"
                placeholder={c(
                  "اسأل عن ادعاء أو أرفق صورة…",
                  "Ask about a claim or attach an image…",
                )}
                className="min-h-24 px-4 pt-4 text-base"
              />
              <PromptInputFooter className="justify-between gap-2 px-3 pb-3">
                <div className="flex min-w-0 items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={busy}
                        aria-label="Attach image"
                        onClick={() => upload.current?.click()}
                      >
                        <Paperclip />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{c("إرفاق صورة", "Attach image")}</TooltipContent>
                  </Tooltip>
                  <Popover open={toolMenu} onOpenChange={setToolMenu}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" disabled={busy}>
                        <SlidersHorizontal />
                        {c("الأدوات", "Tools")}
                        <span className="text-muted-foreground">{tools.length}</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-72">
                      <p className="mb-4 text-sm font-semibold">
                        {c("أدوات التحقيق", "Investigation tools")}
                      </p>
                      {(["manipulation", "geolocation"] as const).map((tool) => (
                        <label key={tool} className="flex cursor-pointer items-start gap-3 py-3">
                          <Checkbox
                            checked={tools.includes(tool)}
                            onCheckedChange={(checked) =>
                              setTools((previous) =>
                                checked
                                  ? [...previous.filter((t) => t !== tool), tool]
                                  : previous.filter((t) => t !== tool),
                              )
                            }
                          />
                          <span>
                            <span className="flex items-center gap-2 text-sm font-medium">
                              {tool === "manipulation" ? (
                                <ScanEye className="size-4 text-ink" />
                              ) : (
                                <MapPin className="size-4 text-ink" />
                              )}
                              {toolNames[tool]}
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                              {tool === "manipulation"
                                ? c(
                                    "مراجعة بصرية، وليست إثباتاً جنائياً.",
                                    "Visual clues, not forensic certification.",
                                  )
                                : c(
                                    "مواقع محتملة، وليست إحداثيات مؤكدة.",
                                    "Location hypotheses, not verified coordinates.",
                                  )}
                            </span>
                          </span>
                        </label>
                      ))}
                    </PopoverContent>
                  </Popover>
                </div>
                <PromptInputSubmit
                  status={status}
                  onStop={() => void stop()}
                  disabled={!busy && !text.trim() && !attachment}
                  className="size-9 shrink-0"
                  aria-label={busy ? "Stop response" : "Send message"}
                >
                  {busy ? <Square className="size-4" /> : <ArrowUp className="size-4" />}
                </PromptInputSubmit>
              </PromptInputFooter>
            </PromptInput>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-muted-foreground">
                {c(
                  "نتائج أولية — تتطلب مراجعة تحريرية.",
                  "Preliminary findings — editorial review required.",
                )}
              </p>
              <InvestigationReview messages={messages} disabled={busy} />
            </div>
          </div>
        </section>
      </div>
    </TooltipProvider>
  );
}
