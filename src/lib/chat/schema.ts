import { z } from "zod";
export const toolIds = ["manipulation", "geolocation"] as const;
export type InvestigationTool = typeof toolIds[number];
export const selectedToolsSchema = z.array(z.enum(toolIds)).max(2);
export const chatRequestSchema = z.object({
  conversationId: z.string().uuid(),
  enabledTools: selectedToolsSchema,
  messages: z.array(z.unknown()).min(1).max(100),
});
export function validateImage(url: string) {
  if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(url)) throw new Error("Only uploaded PNG, JPG and WebP images are supported.");
  if (url.length > 7_000_000) throw new Error("Image must be under 5 MB.");
  return url;
}