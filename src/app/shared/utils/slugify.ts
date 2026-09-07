/**
 * Turns a display name into an npm-safe, kebab-case package/folder name.
 * Diacritics are folded rather than dropped, so "Créateur" becomes
 * "createur" instead of "crateur".
 */
export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 214);
}
