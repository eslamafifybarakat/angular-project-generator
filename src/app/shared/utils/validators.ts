/**
 * Validation primitives shared by the wizard.
 *
 * These mirror the reject rules in the template contract's validation section.
 * They live here rather than in the domain service so the same predicate backs
 * both live field validation and the pre-generation gate.
 */

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const SLUG = /^[a-z][a-z0-9-]*$/;
const DISPLAY_NAME = /^[\p{L}\p{N} \-']+$/u;
const DIR_SEGMENT = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

/**
 * One directory segment of a generated path — not a full path. Kebab-case
 * only, so it matches every other generated folder name, and never a Windows
 * reserved device name (the generator has to be safe to unzip on Windows too).
 */
export function isSafeDirectorySegment(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && DIR_SEGMENT.test(trimmed) && !WINDOWS_RESERVED.test(trimmed);
}

/**
 * A relative directory path made of one or more safe segments — never
 * absolute, never containing `..`, never with an empty segment from a
 * doubled or trailing slash.
 */
export function isSafeRelativeDirPath(value: string): boolean {
  const trimmed = value.trim().replace(/\\/g, '/');
  if (trimmed.length === 0 || trimmed.startsWith('/')) {
    return false;
  }
  if (/^[a-z]:\//i.test(trimmed)) {
    return false;
  }
  const segments = trimmed.split('/');
  return segments.every((segment) => segment !== '..' && isSafeDirectorySegment(segment));
}

export function isHexColor(value: string): boolean {
  return HEX.test(value.trim());
}

export function isKebabSlug(value: string): boolean {
  return SLUG.test(value);
}

export function isDisplayName(value: string): boolean {
  return DISPLAY_NAME.test(value.trim());
}

export function isAbsoluteUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return false;
  }
  try {
    const url = new URL(trimmed);
    return url.hostname.length > 0 && url.hostname.includes('.');
  } catch {
    return false;
  }
}
