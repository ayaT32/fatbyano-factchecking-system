import { z } from "zod";

const multimediaBlockSchema = z.tuple([z.string(), z.string()]);
const claimInfoSchema = z
  .object({
    data: z.array(multimediaBlockSchema),
    verdict: z.string().nullish(),
    justification: z.array(multimediaBlockSchema).nullish(),
  })
  .passthrough();
const statusResponseSchema = z
  .object({
    job_info: z
      .object({
        job_id: z.string(),
        status: z.string(),
        status_message: z.string(),
        tasks: z
          .record(
            z.string(),
            z
              .object({
                state: z.string().nullish(),
                message: z.string().nullish(),
              })
              .passthrough(),
          )
          .optional(),
      })
      .passthrough(),
    content: z
      .object({
        topic: z.string().nullish(),
        verdict: z.string().nullish(),
      })
      .passthrough(),
    claims: z.record(z.string(), claimInfoSchema).nullish(),
  })
  .passthrough();

const jobResponseSchema = z.object({ job_id: z.string() });

export type FactCheckResult = {
  verdict: string;
  confidence: number | null;
  category: string;
  summary_ar: string;
  summary_en: string;
  sub_claims: { statement: string; verdict: string; explanation: string }[];
  red_flags: string[];
  suggested_sources: string[];
};

type DefameStatus = z.infer<typeof statusResponseSchema>;
type MultimediaBlock = z.infer<typeof multimediaBlockSchema>;

function getConfig() {
  const configuredUrl = process.env["DEFAME_API_URL"]?.trim();
  const apiKey = process.env["DEFAME_API_KEY"]?.trim();
  if (!configuredUrl || !apiKey) {
    throw new Error(
      "Configure DEFAME_API_URL and DEFAME_API_KEY on the server to use the fact-check backend.",
    );
  }

  let url: URL;
  try {
    url = new URL(configuredUrl);
  } catch {
    throw new Error("DEFAME_API_URL must be a valid HTTP(S) URL.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("DEFAME_API_URL must use HTTP or HTTPS.");
  }
  if (
    process.env["NODE_ENV"] === "production" &&
    url.protocol !== "https:" &&
    !["localhost", "127.0.0.1"].includes(url.hostname)
  ) {
    throw new Error("DEFAME_API_URL must use HTTPS in production.");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("DEFAME_API_URL must not contain credentials, a query, or a fragment.");
  }

  return { baseUrl: url.toString().replace(/\/+$/, ""), apiKey };
}

async function readApiJson<T>(response: Response, schema: z.ZodType<T>, operation: string) {
  const raw = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    if (!response.ok) {
      throw new Error(`DEFAME ${operation} request failed with HTTP ${response.status}.`);
    }
    throw new Error(`DEFAME returned an invalid response for ${operation}.`);
  }
  if (!response.ok) {
    throw new Error(`DEFAME ${operation} request failed with HTTP ${response.status}.`);
  }
  return schema.parse(body);
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function extractText(blocks: MultimediaBlock[] | null | undefined) {
  return (blocks ?? [])
    .filter(([kind]) => kind.toLowerCase() === "text")
    .map(([, text]) => text)
    .join("\n")
    .trim();
}

export function mapDefameVerdict(label: string | null | undefined) {
  const normalized = label
    ?.trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  switch (normalized) {
    case "TRUE":
    case "SUPPORTED":
      return "true";
    case "FALSE":
    case "REFUTED":
      return "false";
    case "ALTERED":
      return "altered";
    case "MISLEADING":
    case "CHERRY_PICKING":
      return "misleading";
    case "MISSING_CONTEXT":
    case "OUT_OF_CONTEXT":
    case "MISCAPTIONED":
      return "missing_context";
    case "SATIRE":
      return "satire";
    default:
      // NOT_ENOUGH_INFORMATION, CONFLICTING, refusals and unknown values
      return "nei";
  }
}

export function normalizeDefameResult(
  status: DefameStatus,
  sourceUrl?: string | null,
): FactCheckResult {
  const sourceClaims = Object.values(status.claims ?? {});
  const sub_claims = sourceClaims.map((claim) => ({
    statement: extractText(claim.data) || "Image-based claim",
    verdict: mapDefameVerdict(claim.verdict),
    explanation: extractText(claim.justification),
  }));
  const verdicts = sub_claims.map((claim) => claim.verdict);
  const uniqueVerdicts = new Set(verdicts);
  const verdict =
    status.content.verdict != null
      ? mapDefameVerdict(status.content.verdict)
      : uniqueVerdicts.size === 1
        ? (verdicts[0] ?? "nei")
        : uniqueVerdicts.has("true") && uniqueVerdicts.has("false")
          ? "misleading" // a mix of accurate and inaccurate claims (Fatabyyano's definition)
          : "nei";
  const summary = sub_claims
    .map((claim) => [claim.statement, claim.explanation].filter(Boolean).join("\n"))
    .join("\n\n");
  const sources = new Set<string>();
  if (sourceUrl) sources.add(sourceUrl);
  for (const claim of sub_claims) {
    for (const match of claim.explanation.matchAll(/https?:\/\/[^\s<>"')]+/g)) {
      sources.add(match[0].replace(/[.,;!?]+$/, ""));
    }
  }

  return {
    verdict,
    confidence: null,
    category: status.content.topic?.trim() || "Other",
    summary_ar:
      summary || "DEFAME completed without extracting a claim from the submitted content.",
    summary_en:
      summary || "DEFAME completed without extracting a claim from the submitted content.",
    sub_claims,
    red_flags: [],
    suggested_sources: [...sources],
  };
}

export async function runDefameFactCheck(input: {
  claimText: string;
  sourceUrl?: string | null | undefined;
  imageBase64?: string | null | undefined;
}): Promise<FactCheckResult> {
  const { baseUrl, apiKey } = getConfig();
  const content: [string, string][] = [["text", input.claimText]];
  if (input.sourceUrl) content.push(["text", `Source URL: ${input.sourceUrl}`]);
  if (input.imageBase64) content.push(["image", input.imageBase64]);

  const startResponse = await fetch(`${baseUrl}/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({ content, date: new Date().toISOString().slice(0, 10) }),
    signal: AbortSignal.timeout(30_000),
  });
  const { job_id } = await readApiJson(startResponse, jobResponseSchema, "submission");

  const deadline = Date.now() + 10 * 60 * 1000;
  let pollInterval = 1_000;
  while (Date.now() < deadline) {
    const response = await fetch(`${baseUrl}/results/${encodeURIComponent(job_id)}`, {
      signal: AbortSignal.timeout(30_000),
    });
    const status = await readApiJson(response, statusResponseSchema, "status");
    const jobState = status.job_info.status.toUpperCase();
    if (jobState === "DONE") return normalizeDefameResult(status, input.sourceUrl);
    if (jobState === "FAILED") {
      const taskErrors = Object.values(status.job_info.tasks ?? {})
        .filter((task) => task.state?.toUpperCase() === "FAILED" && task.message)
        .map((task) => task.message);
      throw new Error(
        taskErrors.join("\n") || status.job_info.status_message || "DEFAME fact-check failed.",
      );
    }

    await wait(pollInterval);
    pollInterval = Math.min(pollInterval * 2, 5_000);
  }

  throw new Error(
    "DEFAME did not finish within 10 minutes. Check the backend service and try again.",
  );
}

export async function verifyGeospatialImage(imageBase64: string) {
  const { baseUrl, apiKey } = getConfig();
  const response = await fetch(`${baseUrl}/geospatial/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({ image_base64: imageBase64 }),
    signal: AbortSignal.timeout(30_000),
  });
  return readApiJson(response, z.json(), "geospatial verification");
}

export async function geocodeAddress(address: string) {
  const { baseUrl, apiKey } = getConfig();
  const response = await fetch(`${baseUrl}/geospatial/geocode`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({ address }),
    signal: AbortSignal.timeout(30_000),
  });
  return readApiJson(response, z.json(), "geocoding");
}
