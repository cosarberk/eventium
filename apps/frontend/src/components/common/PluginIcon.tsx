/**
 * @fileoverview Renders a data source's manifest icon, or a letter fallback.
 *
 * Plugin icons are raw SVG markup from a manifest, so they have to be injected
 * rather than rendered as a component. The backend already rejects anything that
 * is not an inert `<svg>` when it discovers the manifest; this component repeats
 * the check on the client so the injection point itself is never reached with
 * markup that was not validated (defence in depth — a future API change, or a
 * cached response, should not be able to turn this into an XSS sink).
 */

import { sanitizeSvgIcon } from '@eventium/shared';

interface PluginIconProps {
  /** Raw SVG markup from the plugin manifest, if any. */
  icon?: string | null;
  /** Source name, used for the letter fallback. */
  name: string;
  /** Classes applied to the fallback letter. */
  fallbackClassName?: string;
}

/**
 * Renders a validated inline SVG icon, falling back to the source's initial.
 *
 * @param props - Component props.
 * @returns The icon element.
 */
export function PluginIcon({ icon, name, fallbackClassName }: PluginIconProps) {
  const safeIcon = sanitizeSvgIcon(icon ?? undefined);

  if (!safeIcon) {
    return (
      <span className={fallbackClassName ?? 'text-lg font-bold text-[var(--color-text-tertiary)]'}>
        {name.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    // biome-ignore lint/security/noDangerouslySetInnerHtml: inline SVG icons have
    // no component form; the markup is validated by sanitizeSvgIcon on both the
    // server (at manifest discovery) and here before it is injected.
    <span dangerouslySetInnerHTML={{ __html: safeIcon }} />
  );
}
