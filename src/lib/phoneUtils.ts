/**
 * Ensures a phone number has the +91 country code prefix.
 * Strips spaces/dashes, then prepends +91 if not already present.
 */
export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-()]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("+91")) return cleaned;
  if (cleaned.startsWith("91") && cleaned.length > 10) return `+${cleaned}`;
  return `+91${cleaned}`;
}
