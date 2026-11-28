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

/**
 * Role names. Databases set up from main use `admin` / `staff`; the fact-check archive
 * migration renames them to `manager` / `fact_checker`. Both spellings are accepted so the
 * app works against either database.
 */
const MANAGEMENT_ROLES = new Set(["admin", "manager"]);

export function isManagementRole(role: string | null | undefined): boolean {
  return !!role && MANAGEMENT_ROLES.has(role);
}

export function hasManagementRole(roles: { role: string }[] | null | undefined): boolean {
  return (roles ?? []).some((r) => isManagementRole(r.role));
}

/** The role names this database uses, judged from the rows already in it. */
export function roleNames(roles: { role: string }[]): { manager: string; staff: string } {
  const renamed = roles.some((r) => r.role === "manager" || r.role === "fact_checker");
  return renamed
    ? { manager: "manager", staff: "fact_checker" }
    : { manager: "admin", staff: "staff" };
}

export function employeeId(userId: string): string {
  return `FTB-${userId.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}
