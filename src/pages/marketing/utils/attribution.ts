import { Attribution } from '../types';

/**
 * Create attribution for a new item
 */
export function createAttribution(email: string): Attribution {
  const now = new Date().toISOString();
  return {
    created_by: email,
    created_at: now,
    last_edited_by: email,
    last_edited_at: now,
  };
}

/**
 * Update attribution when an item is edited
 */
export function updateAttribution(
  existing: Attribution | undefined,
  editorEmail: string
): Attribution {
  const now = new Date().toISOString();

  if (!existing) {
    return createAttribution(editorEmail);
  }

  return {
    ...existing,
    last_edited_by: editorEmail,
    last_edited_at: now,
  };
}

/**
 * Get relative time string (e.g., "2h ago", "3d ago")
 */
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * Get display name from email (part before @)
 */
export function getDisplayName(email: string): string {
  const name = email.split('@')[0];
  // Capitalize first letter
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Format attribution for display: "Edited by {name} {relative time}"
 */
export function formatAttributionDisplay(attribution?: Attribution): string {
  if (!attribution) return '';

  const name = getDisplayName(attribution.last_edited_by);
  const date = new Date(attribution.last_edited_at);
  const relative = getRelativeTime(date);

  return `Edited by ${name} ${relative}`;
}

/**
 * Format creation attribution: "Created by {name} {relative time}"
 */
export function formatCreationDisplay(attribution?: Attribution): string {
  if (!attribution) return '';

  const name = getDisplayName(attribution.created_by);
  const date = new Date(attribution.created_at);
  const relative = getRelativeTime(date);

  return `Created by ${name} ${relative}`;
}
