/**
 * @fileoverview `app` project type — internal tool / app.
 * Free canvas with the blueprint (event→action) pane open by default; data,
 * content and custom-code palette. Interactive, runs as an app.
 */
import type { ProjectTypeDescriptor } from '../types';

export const appType: ProjectTypeDescriptor = {
  id: 'app',
  label: 'Uygulama',
  description: 'İç araç/uygulama: veri, aksiyonlar ve blueprint mantığıyla etkileşimli.',
  icon: '🧩',
  accent: '#8b5cf6',
  featured: true,
  layoutMode: 'free',
  defaultPanes: ['design', 'blueprint', 'data'],
  palette: [
    { id: 'data', label: 'Veri', components: ['table', 'stat', 'badge'] },
    { id: 'charts', label: 'Grafikler', components: ['line-chart', 'bar-chart', 'gauge'] },
    { id: 'content', label: 'İçerik', components: ['text', 'separator'] },
    { id: 'custom', label: 'Özel kod', components: ['custom-html', 'custom-react'] },
  ],
  publishTargets: ['app', 'embed', 'export'],
  starter: () => ({ pageTitle: 'Uygulama' }),
};
