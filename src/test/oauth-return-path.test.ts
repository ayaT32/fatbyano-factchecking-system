import { describe, expect, it } from "vitest";
import { oauthReturnPath } from "../lib/oauth-return-path";

describe("OAuth sign-in return", () => {
  it("preserves consent authorization and fragment", () => {
    expect(oauthReturnPath("/.lovable/oauth/consent?authorization_id=abc#approve")).toBe("/.lovable/oauth/consent?authorization_id=abc#approve");
  });
  it("rejects external redirects, backslashes and control characters", () => {
    for (const value of ["//outside.invalid", "/\\outside.invalid/", "https://outside.invalid", "/auth\n", null]) expect(oauthReturnPath(value)).toBe("/");
  });
});