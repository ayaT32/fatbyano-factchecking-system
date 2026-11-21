import { describe, expect, it } from "vitest";
import { chatRequestSchema, selectedToolsSchema, validateImage } from "../lib/chat/schema";
describe("Investigation tool boundaries", () => {
  it("accepts only the optional manipulation and geolocation tools", () => {
    expect(selectedToolsSchema.parse(["manipulation", "geolocation"])).toEqual(["manipulation", "geolocation"]);
    expect(selectedToolsSchema.safeParse(["publish"]).success).toBe(false);
    expect(selectedToolsSchema.parse([])).toEqual([]);
  });
  it("requires a real conversation ID", () => {
    expect(chatRequestSchema.safeParse({ conversationId: "other", enabledTools: [], messages: [{}] }).success).toBe(false);
  });
  it("rejects arbitrary external images and allows uploaded images", () => {
    expect(() => validateImage("https://outside.invalid/photo.png")).toThrow();
    expect(validateImage("data:image/png;base64,YWJj")).toBe("data:image/png;base64,YWJj");
  });
});