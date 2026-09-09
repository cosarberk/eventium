/**
 * @fileoverview Date formatting utilities using dayjs.
 * Provides consistent date display across the application.
 */
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';
import relativeTime from 'dayjs/plugin/relativeTime';
import updateLocale from 'dayjs/plugin/updateLocale';

dayjs.extend(relativeTime);
dayjs.extend(updateLocale);
dayjs.extend(isToday);
dayjs.extend(isYesterday);

/**
 * Returns a human-readable relative time string (e.g., "3 minutes ago").
 * @param date - ISO date string or Date object
 * @returns Relative time string
 */
export function timeAgo(date: string | Date): string {
  return dayjs(date).fromNow();
}

/**
 * Formats a date in a standard display format.
 * @param date - ISO date string or Date object
 * @param format - dayjs format string (defaults to "MMM D, YYYY HH:mm")
 * @returns Formatted date string
 */
export function formatDate(date: string | Date, format = 'MMM D, YYYY HH:mm'): string {
  return dayjs(date).format(format);
}

/**
 * Formats a date with contextual labels for today and yesterday.
 * @param date - ISO date string or Date object
 * @returns "Today HH:mm", "Yesterday HH:mm", or "MMM D, YYYY HH:mm"
 */
export function formatDateContextual(date: string | Date): string {
  const d = dayjs(date);
  if (d.isToday()) {
    return `Today ${d.format('HH:mm')}`;
  }
  if (d.isYesterday()) {
    return `Yesterday ${d.format('HH:mm')}`;
  }
  return d.format('MMM D, YYYY HH:mm');
}

/**
 * Returns only the time portion of a date.
 * @param date - ISO date string or Date object
 * @returns Time string in "HH:mm:ss" format
 */
export function formatTime(date: string | Date): string {
  return dayjs(date).format('HH:mm:ss');
}

/**
 * Returns the duration between two dates in a human-readable format.
 * @param start - Start date
 * @param end - End date (defaults to now)
 * @returns Duration string
 */
export function duration(start: string | Date, end?: string | Date): string {
  const from = dayjs(start);
  const to = end ? dayjs(end) : dayjs();
  const diffMs = to.diff(from);

  if (diffMs < 1000) return '< 1s';
  if (diffMs < 60000) return `${Math.floor(diffMs / 1000)}s`;
  if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m`;
  if (diffMs < 86400000)
    return `${Math.floor(diffMs / 3600000)}h ${Math.floor((diffMs % 3600000) / 60000)}m`;
  return `${Math.floor(diffMs / 86400000)}d ${Math.floor((diffMs % 86400000) / 3600000)}h`;
}
