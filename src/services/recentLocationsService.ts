import { NairobiLocation } from '../types';

const RECENT_LOCATIONS_KEY_PREFIX = 'oohgas_recent_locations_v1';
const MAX_RECENT_LOCATIONS = 4;

export interface RecentDeliveryLocation {
  location: NairobiLocation;
  usedAt: string;
}

function getStorageKey(customerId?: string | null): string {
  return `${RECENT_LOCATIONS_KEY_PREFIX}_${customerId || 'guest'}`;
}

export function getRecentDeliveryLocations(
  customerId?: string | null
): RecentDeliveryLocation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getStorageKey(customerId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) =>
        item &&
        item.location &&
        typeof item.location.name === 'string' &&
        typeof item.location.coordinates?.lat === 'number' &&
        typeof item.location.coordinates?.lng === 'number'
    );
  } catch {
    return [];
  }
}

export function recordRecentDeliveryLocation(
  location: NairobiLocation,
  customerId?: string | null
): RecentDeliveryLocation[] {
  const existing = getRecentDeliveryLocations(customerId);
  const normalizedName = location.name.trim().toLowerCase();

  const filtered = existing.filter((entry) => {
    const sameName = entry.location.name.trim().toLowerCase() === normalizedName;
    const closeLat =
      Math.abs(entry.location.coordinates.lat - location.coordinates.lat) < 0.0008;
    const closeLng =
      Math.abs(entry.location.coordinates.lng - location.coordinates.lng) < 0.0008;
    return !(sameName || (closeLat && closeLng));
  });

  const updated: RecentDeliveryLocation[] = [
    {
      location,
      usedAt: new Date().toISOString(),
    },
    ...filtered,
  ].slice(0, MAX_RECENT_LOCATIONS);

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(getStorageKey(customerId), JSON.stringify(updated));
    } catch {
      // Ignore storage quota issues
    }
  }

  return updated;
}

export function formatRelativeUsedAt(isoDate: string): string {
  const timestamp = new Date(isoDate).getTime();
  if (Number.isNaN(timestamp)) return 'Recently';
  const diffMin = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}
