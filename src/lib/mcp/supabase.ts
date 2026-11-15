import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";
import type { Database } from "@/integrations/supabase/types";

function runtimeEnv(name: string): string | undefined {
  const runtime = globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> }; Deno?: { env?: { get?: (name: string) => string | undefined } } };
  return runtime.Deno?.env?.get?.(name) ?? runtime.process?.env?.[name];
}

function publishableKey() {
  const direct = runtimeEnv("SUPABASE_PUBLISHABLE_KEY") ?? runtimeEnv("VITE_SUPABASE_PUBLISHABLE_KEY");
  if (direct) return direct;
  try {
    const parsed: unknown = JSON.parse(runtimeEnv("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const key = Object.values(parsed).find((value): value is string => typeof value === "string" && value.startsWith("sb_publishable_"));
      if (key) return key;
    }
  } catch { /* Allow legacy configuration below. */ }
  const legacy = runtimeEnv("SUPABASE_ANON_KEY") ?? runtimeEnv("VITE_SUPABASE_ANON_KEY");
  if (legacy) return legacy;
  throw new Error("Assistant connections are missing their public database configuration.");
}

export function supabaseForUser(ctx: ToolContext) {
  const token = ctx.getToken();
  if (!token) throw new Error("A verified OAuth connection is required.");
  const url = runtimeEnv("SUPABASE_URL") ?? runtimeEnv("VITE_SUPABASE_URL");
  if (!url) throw new Error("Assistant connections are missing their database configuration.");
  return createClient<Database>(url, publishableKey(), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}