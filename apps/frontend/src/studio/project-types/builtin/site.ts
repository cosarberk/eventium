/**
 * @fileoverview `site` project type — pages / landing.
 * Free absolute canvas, content + media palette, publishes as a page or embed.
 */
import type { ProjectTypeDescriptor } from '../types';

export const siteType: ProjectTypeDescriptor = {
  id: 'site',
  label: 'Site',
  description: 'Serbest tuvalde sayfa/landing: metin, medya ve responsive bölümler.',
  icon: '🌐',
  accent: '#0ea5e9',
  featured: true,
  layoutMode: 'free',
  defaultPanes: ['design', 'preview'],
  palette: [
    { id: 'content', label: 'İçerik', components: ['text', 'separator'] },
    { id: 'media', label: 'Medya & Özel', components: ['custom-html', 'custom-react'] },
    { id: 'data', label: 'Veri', components: ['stat', 'table'] },
  ],
  publishTargets: ['page', 'embed', 'export'],
  starter: () => ({ pageTitle: 'Ana Sayfa' }),
};
