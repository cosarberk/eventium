/**
 * @fileoverview `blank` project type — no focus, full freedom.
 * Free canvas, every registered component in the palette, all publish targets.
 */
import type { ProjectTypeDescriptor } from '../types';

export const blankType: ProjectTypeDescriptor = {
  id: 'blank',
  label: 'Boş',
  description: 'Çıplak stüdyo: hiç odak yok, tüm bileşenler açık, tam serbest.',
  icon: '⬚',
  accent: '#64748b',
  layoutMode: 'free',
  defaultPanes: ['design'],
  // Empty `components` = surface every registered component (fully open).
  palette: [{ id: 'all', label: 'Tüm bileşenler', components: [] }],
  publishTargets: ['broadcast', 'embed', 'page', 'app', 'export'],
};
