/**
 * @fileoverview `custom-react` component — user-authored React/JSX in a sandboxed
 * iframe. JSX is compiled in-browser by Babel standalone (loaded from a CDN
 * inside the isolated iframe), React renders it, and the bound data is available
 * as `window.EVENTIUM.data`. The iframe is sandboxed (allow-scripts, opaque
 * origin, strict CSP) so user code can never touch the app, cookies or network.
 */
import type { ComponentDescriptor } from '@/types';
import type { ComponentRenderer, ComponentRenderProps } from '../render-types';
import { slotValues } from './common';

const DEFAULT_CODE = `function App() {
  const data = window.EVENTIUM.data || [];
  return (
    <div style={{ fontFamily: 'system-ui', padding: 16 }}>
      <h2 style={{ margin: '0 0 6px', fontSize: 16 }}>React panel</h2>
      <p style={{ margin: 0, opacity: 0.65, fontSize: 12 }}>
        window.EVENTIUM.data ile {data.length} bağlı alan.
      </p>
      <ul style={{ fontSize: 13, paddingLeft: 18 }}>
        {data.map((d, i) => (
          <li key={i}>{d.label || '(etiketsiz)'} — {d.shape}</li>
        ))}
      </ul>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);`;

const descriptor: ComponentDescriptor = {
  type: 'custom-react',
  label: 'React Panel',
  description: 'Kendi React/JSX panelini yaz; tarayıcıda derlenir, window.EVENTIUM.data ile besle.',
  icon: '⚛',
  slots: [{ key: 'data', label: 'Data', shape: 'list', required: false, multiple: true }],
  options: [{ key: 'code', label: 'React / JSX', type: 'code', defaultValue: DEFAULT_CODE }],
  defaultWidth: 6,
  defaultHeight: 5,
};

// Pinned CDN builds (loaded only inside the sandboxed iframe).
const CDN = 'https://cdnjs.cloudflare.com/ajax/libs';
const SCRIPTS = [
  `${CDN}/react/18.3.1/umd/react.production.min.js`,
  `${CDN}/react-dom/18.3.1/umd/react-dom.production.min.js`,
  `${CDN}/babel-standalone/7.26.4/babel.min.js`,
];

function render({ block, data }: ComponentRenderProps) {
  const code =
    typeof block.options.code === 'string' && block.options.code.trim()
      ? block.options.code
      : DEFAULT_CODE;

  const items = slotValues(data, 'data').map((v) => ({
    label: v.boundValue.label ?? '',
    shape: v.resolved?.shape ?? null,
    scalar: v.resolved?.scalar ?? null,
    list: v.resolved?.list ?? null,
    series: v.resolved?.series ?? null,
  }));
  const payload = JSON.stringify({ data: items, title: block.title }).replace(/</g, '\\u003c');
  const escapedCode = code.replace(/<\/script>/gi, '<\\/script>');

  const srcDoc = `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com; style-src 'unsafe-inline'; img-src data: https:; font-src data:">
<style>html,body{margin:0;height:100%;box-sizing:border-box;font-family:system-ui,-apple-system,sans-serif;color:#111}*{box-sizing:border-box}@media (prefers-color-scheme:dark){html,body{color:#e8e8ea}}</style>
${SCRIPTS.map((s) => `<script src="${s}"></script>`).join('\n')}
</head><body>
<div id="root"></div>
<script>window.EVENTIUM=${payload};</script>
<script type="text/babel" data-presets="react">
${escapedCode}
</script>
</body></html>`;

  return (
    <iframe
      title={block.title || 'React panel'}
      srcDoc={srcDoc}
      sandbox="allow-scripts"
      className="h-full w-full border-0 bg-white dark:bg-[#0d0f14]"
    />
  );
}

/** The `custom-react` renderer registry entry. */
export const CustomReactRenderer: ComponentRenderer = { descriptor, render };
