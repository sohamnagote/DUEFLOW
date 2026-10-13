/**
 * Date formatting utilities for DueFlow
 */

export function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const trimmed = String(dateStr).trim();
    // Handles 'YYYY-MM-DD'
    const parts = trimmed.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      }
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  } catch (_) {}
  return dateStr;
}
