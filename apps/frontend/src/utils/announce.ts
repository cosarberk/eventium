/**
 * @fileoverview Announcement detection for the live/TV alarm overlay.
 * Decides whether an incoming event deserves a full-screen, hospital-style
 * announcement (flash + sound), and derives the headline/message/version shown.
 *
 * Detection is intentionally pattern-based on event type + severity so it works
 * for any plugin without per-plugin configuration: failures/criticals raise an
 * "alert" (red), while releases/publishes/deploys raise a "success" (green).
 */
import type { EventItem } from '@/types';

/** Visual + audible tone of an announcement. */
export type AnnouncementTone = 'alert' | 'success';

/** A derived, display-ready announcement. */
export interface Announcement {
  /** Tone driving color and sound. */
  tone: AnnouncementTone;
  /** Large primary line. */
  headline: string;
  /** Secondary line (context). */
  message: string;
  /** Source label (plugin instance or event type). */
  source: string;
  /** Extracted version/tag, when present. */
  version?: string;
  /** Original event id, used as a dedup/animation key. */
  eventId: string;
  /** ISO timestamp of the event. */
  timestamp: string;
}

/** Event-type fragments that indicate a positive announcement. */
const SUCCESS_PATTERNS = [
  'release',
  'publish',
  'deploy',
  'tag',
  'pipeline.success',
  'merge_request.merged',
];

/** Event-type fragments that indicate a failure/alert announcement. */
const ALERT_PATTERNS = ['fail', 'error', 'down', 'critical', 'broke', 'crash'];

/** Reads a string field from a JSON payload, if present. */
function payloadString(payload: Record<string, unknown>, key: string): string | undefined {
  const v = payload[key];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

/**
 * Attempts to extract a human-readable version/tag from an event payload.
 * Looks at common fields used by GitLab, Nexus, and generic webhooks.
 */
function extractVersion(event: EventItem): string | undefined {
  const p = event.payload ?? {};
  const direct =
    payloadString(p, 'version') ??
    payloadString(p, 'tag') ??
    payloadString(p, 'tag_name') ??
    payloadString(p, 'name');
  if (direct) return direct.replace(/^refs\/tags\//, '');

  const ref = payloadString(p, 'ref');
  if (ref) return ref.replace(/^refs\/(tags|heads)\//, '');

  // Fall back to a semver-looking token in the title.
  const match = event.title.match(/v?\d+\.\d+\.\d+(?:[-+][\w.]+)?/);
  return match?.[0];
}

/**
 * Determines whether an event should raise a full-screen announcement.
 * @param event - The incoming live event
 * @returns A display-ready announcement, or null when the event is routine
 */
export function getAnnouncement(event: EventItem): Announcement | null {
  const type = event.eventType.toLowerCase();
  const isAlert =
    event.severity === 'CRITICAL' ||
    event.severity === 'ERROR' ||
    ALERT_PATTERNS.some((p) => type.includes(p));
  const isSuccess = SUCCESS_PATTERNS.some((p) => type.includes(p));

  if (!isAlert && !isSuccess) return null;

  const tone: AnnouncementTone = isAlert ? 'alert' : 'success';
  const source = event.pluginInstance?.name ?? event.eventType;
  const version = extractVersion(event);

  return {
    tone,
    headline: event.title,
    message: event.description || source,
    source,
    version,
    eventId: event.id,
    timestamp: event.createdAt,
  };
}
