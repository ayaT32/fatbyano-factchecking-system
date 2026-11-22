import { validateUIMessages } from "ai";
export async function validateSavedMessages(value: unknown) {
  if (Array.isArray(value) && value.length === 0) return [];
  return validateUIMessages({ messages: value });
}
