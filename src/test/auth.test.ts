import { describe, expect, it } from "vitest";
import { employeeId, getPasswordRequirements, isStrongPassword } from "@/lib/auth";

describe("Account helpers", () => {
  it("reports each password rule separately", () => {
    expect(getPasswordRequirements("Factcheck1!")).toEqual({
      length: true,
      uppercase: true,
      lowercase: true,
      number: true,
      symbol: true,
    });
    expect(isStrongPassword("short1!")).toBe(false);
    expect(isStrongPassword("longpassword1!")).toBe(false);
  });

  it("creates a stable internal staff ID from the account ID", () => {
    expect(employeeId("1234abcd-0000-0000-0000-000000000000")).toBe("FTB-1234ABCD");
  });
});
