/**
 * @fileoverview `custom-html` component — user-authored HTML/CSS/JS in a
 * sandboxed iframe. The platform principle "kullanıcı istediğini kurar" taken to
 * code: the user writes any markup/script and reads the bound data from
 * `window.EVENTIUM.data`. The iframe is sandboxed (allow-scripts only, opaque
 * origin, strict CSP) so untrusted code cannot touch the app, cookies, or network.
 */
import type { ComponentDescriptor } from '@/types';
import type { ComponentRenderer, ComponentRenderProps } from '../render-types';
import { slotValues } from './common';

const DEFAULT_HTML = `<div style="font-family:system-ui;padding:16px">
  <h2 style="margin:0 0 6px;font-size:16px">Custom panel</h2>
  <p style="margin:0 0 10px;opacity:.65;font-size:12px">
    Bağladığın veriye <code>window.EVENTIUM.data</code> ile eriş.
  </p>
  <pre id="out" style="font:12px/1.5 ui-monospace,monospace;background:#8881;padding:10px;border-radius:8px;overflow:auto;margin:0"></pre>
  <script>
    document.getElementById('out').textContent =
      JSON.stringify(window.EVENTIUM.data, null, 2) || '(veri bağlı değil)';
  </script>
</div>`;

const descriptor: ComponentDescriptor = {
  type: 'custom-html',
  label: 'Custom HTML',
  description: 'Kendi HTML/CSS/JS panelini yaz; window.EVENTIUM.data ile veriye eriş.',
  icon: '</>',
  slots: [{ key: 'data', label: 'Data', shape: 'list', required: false, multiple: true }],
  options: [{ key: 'html', label: 'HTML / CSS / JS', type: 'code', defaultValue: DEFAULT_HTML }],
  defaultWidth: 6,
  defaultHeight: 5,
};

function render({ block, data }: ComponentRenderProps) {
  const html =
    typeof block.options.html === 'string' && block.options.html.trim()
      ? block.options.html
      : DEFAULT_HTML;

  // Expose bound data in a stable, serializable shape.
  const items = slotValues(data, 'data').map((v) => ({
    label: v.boundValue.label ?? '',
    shape: v.resolved?.shape ?? null,
    scalar: v.resolved?.scalar ?? null,
    list: v.resolved?.list ?? null,
    series: v.resolved?.series ?? null,
  }));
  // Escape `<` so no data string can break out of the bootstrap <script>.
  const payload = JSON.stringify({ data: items, title: block.title }).replace(/</g, '\\u003c');

  const srcDoc = `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data: https:; font-src data:">
<style>html,body{margin:0;height:100%;box-sizing:border-box;font-family:system-ui,-apple-system,sans-serif;color:#111}*{box-sizing:border-box}@media (prefers-color-scheme:dark){html,body{color:#e8e8ea}}</style>
</head><body>
<script>window.EVENTIUM=${payload};</script>
${html}
</body></html>`;

  return (
    <iframe
      title={block.title || 'Custom panel'}
      srcDoc={srcDoc}
      sandbox="allow-scripts"
      className="h-full w-full border-0 bg-white dark:bg-[#0d0f14]"
    />
  );
}

/** The `custom-html` renderer registry entry. */
export const CustomHtmlRenderer: ComponentRenderer = { descriptor, render };
