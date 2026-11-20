/**
 * Utility functions for professional date and timestamp formatting across the application.
 */

export function formatJobPostedDate(dateStr?: string | Date | null): string {
  if (!dateStr) return 'Recently';
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(date.getTime())) return String(dateStr);

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay <= 0) {
    if (diffHour < 1) {
      if (diffMin < 2) return 'Just now';
      return `${diffMin}m ago`;
    }
    return `${diffHour}h ago`;
  }
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatFullDate(dateStr?: string | Date | null): string {
  if (!dateStr) return 'N/A';
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(date.getTime())) return String(dateStr);

  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

