/**
 * @fileoverview `report` project type — document / report.
 * Top-to-bottom document flow, content-forward palette, exports as a page.
 */
import type { ProjectTypeDescriptor } from '../types';

export const reportType: ProjectTypeDescriptor = {
  id: 'report',
  label: 'Rapor',
  description: 'Döküman akışında rapor: zengin metin, tablolar ve grafikler alt alta.',
  icon: '📄',
  accent: '#10b981',
  layoutMode: 'flow',
  defaultPanes: ['design', 'data'],
  palette: [
    { id: 'content', label: 'İçerik', components: ['text', 'separator'] },
    { id: 'data', label: 'Veri', components: ['table', 'stat'] },
    { id: 'charts', label: 'Grafikler', components: ['line-chart', 'bar-chart'] },
  ],
  publishTargets: ['export', 'page'],
  starter: () => ({ pageTitle: 'Rapor' }),
};
