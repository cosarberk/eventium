/**
 * @fileoverview Validation for plugin-supplied SVG icons.
 *
 * A manifest's `icon` is raw markup that the UI injects into the document, so it
 * is an XSS sink: a plugin folder dropped in by a third party could ship
 * `<svg><script>…</script></svg>` or an `onload=` handler and run script in the
 * session of every operator who opens the marketplace.
 *
 * Rather than sanitising at render time on the client, icons are validated once
 * where they enter the platform (manifest discovery). Anything that is not a
 * plain, inert `<svg>` element is rejected outright — the UI then falls back to
 * a letter avatar. Rejecting is safer than stripping: a partial strip of hostile
 * markup is a well-known source of bypasses.
 */

/** Longest icon markup accepted; real icons are far smaller. */
const MAX_ICON_LENGTH = 16_384;

/**
 * Namespace declarations, which legitimately carry a `http://www.w3.org/...`
 * URL on essentially every SVG. They are stripped before the URL checks below
 * so a normal icon is not mistaken for one that loads remote content.
 */
const NAMESPACE_ATTR = /\sxmlns(:[a-z0-9-]+)?\s*=\s*("[^"]*"|'[^']*')/gi;

/** Constructs that must never appear inside an inline icon. */
const FORBIDDEN_PATTERNS: readonly RegExp[] = [
  /<\s*script/i,
  /<\s*foreignobject/i,
  /<\s*iframe/i,
  /<\s*object/i,
  /<\s*embed/i,
  /<\s*link/i,
  /<\s*style/i,
  /<\s*animate/i,
  /<\s*set\b/i,
  /<\s*handler/i,
  /<\s*image/i,
  /<\s*use\b/i,
  // Event handlers: on…="…" in any element.
  /\son[a-z]+\s*=/i,
  // Script-bearing or remote URLs.
  /javascript\s*:/i,
  /data\s*:(?!image\/(png|jpe?g|gif|webp);base64,)/i,
  /https?\s*:/i,
  /\/\/[a-z0-9-]+\./i,
  // CSS expression / import tricks.
  /expression\s*\(/i,
  /@import/i,
  // Entity-encoded angle brackets used to smuggle tags past naive checks.
  /&#x?0*(3c|60);/i,
];

/**
 * Validate a plugin-supplied SVG icon.
 *
 * @param icon - Raw markup from a plugin manifest.
 * @returns The icon when it is a plain inert `<svg>` element, otherwise
 *          `undefined`.
 */
export function sanitizeSvgIcon(icon: unknown): string | undefined {
  if (typeof icon !== 'string') return undefined;

  const trimmed = icon.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_ICON_LENGTH) return undefined;

  // Must be exactly one <svg> element, start to finish.
  if (!/^<svg[\s>]/i.test(trimmed) || !/<\/svg\s*>$/i.test(trimmed)) return undefined;

  // A second <svg> root would mean extra content outside the first element.
  if ((trimmed.match(/<svg[\s>]/gi) ?? []).length !== 1) return undefined;

  const withoutNamespaces = trimmed.replace(NAMESPACE_ATTR, '');

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(withoutNamespaces)) return undefined;
  }

  return trimmed;
}

/**
 * Whether an icon would be accepted by {@link sanitizeSvgIcon}.
 *
 * @param icon - Raw markup from a plugin manifest.
 */
export function isSafeSvgIcon(icon: unknown): boolean {
  return sanitizeSvgIcon(icon) !== undefined;
}
