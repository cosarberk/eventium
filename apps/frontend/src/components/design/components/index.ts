/**
 * @fileoverview Component barrel + registration.
 *
 * Importing this module registers every built-in design-layer component with the
 * {@link registerComponent registry} as a side effect. Import it once at app
 * startup so the component picker and renderer dispatch see all components. Each
 * renderer is also re-exported for direct use/testing.
 */
import { registerComponent } from '../registry';
import { BadgeRenderer } from './BadgeRenderer';
import { BarChartRenderer } from './BarChartRenderer';
import { GaugeRenderer } from './GaugeRenderer';
import { LineChartRenderer } from './LineChartRenderer';
import { SeparatorRenderer } from './SeparatorRenderer';
import { StatRenderer } from './StatRenderer';
import { TableRenderer } from './TableRenderer';
import { TextRenderer } from './TextRenderer';
import { TimelineRenderer } from './TimelineRenderer';

/** Every built-in renderer, in picker display order. */
export const BUILTIN_COMPONENTS = [
  StatRenderer,
  TableRenderer,
  BadgeRenderer,
  TimelineRenderer,
  LineChartRenderer,
  BarChartRenderer,
  GaugeRenderer,
  TextRenderer,
  SeparatorRenderer,
] as const;

for (const renderer of BUILTIN_COMPONENTS) {
  registerComponent(renderer);
}

export {
  BadgeRenderer,
  BarChartRenderer,
  GaugeRenderer,
  LineChartRenderer,
  SeparatorRenderer,
  StatRenderer,
  TableRenderer,
  TextRenderer,
  TimelineRenderer,
};
