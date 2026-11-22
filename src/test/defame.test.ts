import { afterEach, describe, expect, it, vi } from "vitest";
import {
  mapDefameVerdict,
  normalizeDefameResult,
  geocodeAddress,
  runDefameFactCheck,
  verifyGeospatialImage,
} from "@/lib/ai/defame.server";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("DEFAME response mapping", () => {
  it.each([
    ["SUPPORTED", "true"],
    ["REFUTED", "false"],
    ["MISSING CONTEXT", "misleading"],
    ["CONFLICTING", "partly_true"],
    ["NEI", "unverifiable"],
  ])("maps %s to %s", (source, expected) => {
    expect(mapDefameVerdict(source)).toBe(expected);
  });

  it("maps extracted claims and text evidence without persisting image payloads", () => {
    const result = normalizeDefameResult(
      {
        job_info: {
          job_id: "job-1",
          status: "DONE",
          status_message: "Job completed successfully.",
          tasks: {},
        },
        content: { topic: "Politics", verdict: "MISLEADING" },
        claims: {
          "0": {
            data: [["text", "A claim extracted from the post."]],
            verdict: "REFUTED",
            justification: [
              ["text", "The primary source contradicts the claim: https://example.com/report"],
              ["image", "base64-image-payload"],
            ],
          },
        },
      },
      "https://example.com/post",
    );

    expect(result.verdict).toBe("misleading");
    expect(result.confidence).toBeNull();
    expect(result.category).toBe("Politics");
    expect(result.sub_claims).toEqual([
      {
        statement: "A claim extracted from the post.",
        verdict: "false",
        explanation: "The primary source contradicts the claim: https://example.com/report",
      },
    ]);
    expect(result.suggested_sources).toEqual([
      "https://example.com/post",
      "https://example.com/report",
    ]);
    expect(JSON.stringify(result)).not.toContain("base64-image-payload");
  });

  it("submits and polls the backend from the server with its API key", async () => {
    vi.stubEnv("DEFAME_API_URL", "https://factcheck.example");
    vi.stubEnv("DEFAME_API_KEY", "test-api-key");
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ job_id: "job-1" })))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            job_info: {
              job_id: "job-1",
              status: "DONE",
              status_message: "Job completed successfully.",
              tasks: {},
            },
            content: { topic: "Science", verdict: "SUPPORTED" },
            claims: {},
          }),
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    await runDefameFactCheck({
      claimText: "A test claim",
      sourceUrl: "https://example.com/post",
      imageBase64: "test-image",
    });

    const [submissionUrl, submissionInit] = fetchMock.mock.calls[0] ?? [];
    expect(submissionUrl).toBe("https://factcheck.example/verify");
    expect(new Headers(submissionInit?.headers).get("api-key")).toBe("test-api-key");
    expect(JSON.parse(String(submissionInit?.body))).toMatchObject({
      content: [
        ["text", "A test claim"],
        ["text", "Source URL: https://example.com/post"],
        ["image", "test-image"],
      ],
    });
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://factcheck.example/results/job-1");
  });

  it("uses the geospatial endpoints with the server-side API key", async () => {
    vi.stubEnv("DEFAME_API_URL", "http://localhost:3003");
    vi.stubEnv("DEFAME_API_KEY", "test-api-key");
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ location: "test" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ coordinates: [1, 2] })));
    vi.stubGlobal("fetch", fetchMock);

    await verifyGeospatialImage("base64-image");
    await geocodeAddress("Test address");

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "http://localhost:3003/geospatial/verify",
      "http://localhost:3003/geospatial/geocode",
    ]);
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get("api-key")).toBe("test-api-key");
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      image_base64: "base64-image",
    });
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      address: "Test address",
    });
  });
});
