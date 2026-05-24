// PH mobile phone helpers. Mobile numbers are 10 digits after the country
// code, starting with 9. Canonical storage form is the local 11-digit
// `09XXXXXXXXX` string (no separators).

export function stripPhoneDigits(input: string): string {
  return input.replaceAll(/\D/g, "");
}

/**
 * Return the canonical 11-digit local form (e.g. "09171234567") if the input
 * parses as a PH mobile number, otherwise null. Accepts `09…`, `9…`, `+63 9…`,
 * `639…`, or `0063 9…`.
 */
export function normalizePhMobile(input: string): string | null {
  const d = stripPhoneDigits(input);
  if (d.length === 11 && d.startsWith("09")) {
    return d;
  }
  if (d.length === 10 && d.startsWith("9")) {
    return `0${d}`;
  }
  if (d.length === 12 && d.startsWith("639")) {
    return `0${d.slice(2)}`;
  }
  if (d.length === 13 && d.startsWith("0063")) {
    return `0${d.slice(3)}`;
  }
  return null;
}

export function isValidPhMobile(input: string): boolean {
  return normalizePhMobile(input) !== null;
}

/**
 * Reduce any input to local digits, dropping the `63` country prefix and
 * capping at 11 digits. Used to keep form state in canonical-ish shape while
 * the user is mid-typing.
 */
export function toLocalPhDigits(input: string): string {
  let local = stripPhoneDigits(input);
  if (local.startsWith("63") && local.length > 11) {
    local = `0${local.slice(2)}`;
  } else if (local.startsWith("0063")) {
    local = `0${local.slice(3)}`;
  }
  return local.slice(0, 11);
}

/**
 * Format for display. Accepts local digits or partial input. Produces
 * `0917 123 4567`-style grouping.
 */
export function formatPhMobile(input: string): string {
  const local = toLocalPhDigits(input);
  if (local.length <= 4) {
    return local;
  }
  if (local.length <= 7) {
    return `${local.slice(0, 4)} ${local.slice(4)}`;
  }
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
}

/**
 * Drop the leading `0` (or `63`) so the remaining 10 digits can sit next to a
 * `+63` addon. Caps at 10.
 */
export function toNationalPhDigits(input: string): string {
  const local = toLocalPhDigits(input);
  const national = local.startsWith("0") ? local.slice(1) : local;
  return national.slice(0, 10);
}

/**
 * Group the 10 national digits as `XXX XXX XXXX`. Handles partial input.
 */
export function formatPhMobileNational(input: string): string {
  const n = toNationalPhDigits(input);
  if (n.length <= 3) {
    return n;
  }
  if (n.length <= 6) {
    return `${n.slice(0, 3)} ${n.slice(3)}`;
  }
  return `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`;
}
