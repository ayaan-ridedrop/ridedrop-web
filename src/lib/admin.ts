// Tiny helper: is this user an admin?
// V1 uses an env-var allowlist (ADMIN_EMAILS, comma-separated). Phase 2
// migrates this to a column on profiles + a proper admin role.

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allow = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(email.toLowerCase());
}
