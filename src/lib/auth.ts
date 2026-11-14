export type PasswordRequirement = "length" | "uppercase" | "lowercase" | "number" | "symbol";

const passwordRules: Record<PasswordRequirement, (password: string) => boolean> = {
  length: (password) => password.length >= 8,
  uppercase: (password) => /[A-Z]/.test(password),
  lowercase: (password) => /[a-z]/.test(password),
  number: (password) => /\d/.test(password),
  symbol: (password) => /[^A-Za-z0-9\s]/.test(password),
};

export function getPasswordRequirements(password: string): Record<PasswordRequirement, boolean> {
  return {
    length: passwordRules.length(password),
    uppercase: passwordRules.uppercase(password),
    lowercase: passwordRules.lowercase(password),
    number: passwordRules.number(password),
    symbol: passwordRules.symbol(password),
  };
}

export function isStrongPassword(password: string): boolean {
  return Object.values(getPasswordRequirements(password)).every(Boolean);
}

export function employeeId(userId: string): string {
  return `FTB-${userId.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}
