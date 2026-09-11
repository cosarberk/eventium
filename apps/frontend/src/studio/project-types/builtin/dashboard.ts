/**
 * @fileoverview `dashboard` project type — monitoring / BI.
 * Snap-grid canvas, data + charts palette, broadcastable to a TV wall.
 */
import type { ProjectTypeDescriptor } from '../types';

export const dashboardType: ProjectTypeDescriptor = {
  id: 'dashboard',
  label: 'Dashboard',
  description: 'İzleme panosu: KPI, grafik ve tablolarla canlı veri duvarı.',
  icon: '📊',
  accent: 'var(--color-brand-500, #6366f1)',
  featured: true,
  layoutMode: 'grid',
  defaultPanes: ['design', 'data'],
  palette: [
    { id: 'kpi', label: 'KPI', components: ['stat', 'gauge', 'badge'] },
    { id: 'charts', label: 'Grafikler', components: ['line-chart', 'bar-chart'] },
    { id: 'data', label: 'Veri', components: ['table', 'timeline'] },
    { id: 'content', label: 'İçerik', components: ['text', 'separator'] },
    { id: 'custom', label: 'Özel', components: ['custom-html', 'custom-react'] },
  ],
  publishTargets: ['broadcast', 'embed', 'export'],
  starter: () => ({ pageTitle: 'Genel Bakış' }),
};
