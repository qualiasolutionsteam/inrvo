// Marketing Hub authorized users
// Only these emails can access the Marketing Hub

export const ALLOWED_MARKETING_EMAILS = [
  'fawzi.ygoussous@gmail.com',
  'moayad@qualiasolutions.net',
  'olivierdc44@gmail.com',
] as const;

export type AllowedMarketingEmail = (typeof ALLOWED_MARKETING_EMAILS)[number];

/**
 * Check if an email is authorized to access the Marketing Hub
 */
export function isMarketingAuthorized(email: string | undefined | null): boolean {
  if (!email) return false;
  const normalizedEmail = email.toLowerCase().trim();
  return ALLOWED_MARKETING_EMAILS.some(
    (allowed) => allowed.toLowerCase() === normalizedEmail
  );
}
