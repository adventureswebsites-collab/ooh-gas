/**
 * Mapbox Service for Ooh Gas
 * Handles public token access, validation, forward place search,
 * reverse geocoding, and driving directions for Kenya / Nairobi.
 */

const STORAGE_KEY = 'ooh_gas_mapbox_token';

export interface GeocodedPlace {
  id: string;
  name: string;
  area: string;
  fullAddress: string;
  coordinates: {
    lng: number;
    lat: number;
  };
}

export interface DirectionsRouteResult {
  coordinates: [number, number][]; // [lng, lat]
  distanceKm: number;
  durationMin: number;
}

/**
 * Retrieves the configured Mapbox public token.
 * Checks environment variable VITE_MAPBOX_ACCESS_TOKEN first,
 * then falls back to user-configured localStorage token.
 */
export function getMapboxToken(): string {
  const envToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  if (typeof envToken === 'string' && envToken.trim().length > 0 && envToken.trim() !== '""') {
    return envToken.trim();
  }

  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored.trim().length > 0) {
      return stored.trim();
    }
  }

  return '';
}

/**
 * Saves user-provided Mapbox public token into browser localStorage.
 */
export function saveMapboxToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, token.trim());
  }
}

/**
 * Clears saved Mapbox token from localStorage.
 */
export function removeMapboxToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Validates a Mapbox token by testing a lightweight request to Mapbox Geocoding API.
 */
export async function validateMapboxToken(token: string): Promise<{ valid: boolean; error?: string }> {
  const cleanToken = token.trim();
  if (!cleanToken) {
    return { valid: false, error: 'Token cannot be empty' };
  }
  if (!cleanToken.startsWith('pk.')) {
    return {
      valid: false,
      error: 'Invalid format: Mapbox public access tokens start with "pk."',
    };
  }

  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/Nairobi.json?access_token=${encodeURIComponent(
      cleanToken
    )}&country=ke&limit=1`;
    const res = await fetch(url);
    if (res.ok) {
      return { valid: true };
    }
    if (res.status === 401) {
      return {
        valid: false,
        error: 'Unauthorized: The token is invalid, expired, or restricted from this domain.',
      };
    }
    return { valid: false, error: `Mapbox returned status ${res.status}: ${res.statusText}` };
  } catch (err) {
    return {
      valid: false,
      error: 'Network error checking token. Please verify your internet connection.',
    };
  }
}

/**
 * Searches places and addresses in Kenya with Nairobi proximity.
 */
export async function searchPlaces(
  query: string,
  proximity: { lng: number; lat: number } = { lng: 36.7856, lat: -1.2921 },
  token?: string
): Promise<GeocodedPlace[]> {
  const activeToken = token || getMapboxToken();
  if (!activeToken || !query.trim()) return [];

  try {
    const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      query.trim()
    )}.json?access_token=${encodeURIComponent(
      activeToken
    )}&country=ke&proximity=${proximity.lng},${proximity.lat}&types=address,poi,neighborhood,locality,place&limit=6`;

    const res = await fetch(endpoint);
    if (!res.ok) return [];

    const data = await res.json();
    if (!data.features || !Array.isArray(data.features)) return [];

    return data.features.map((feature: any) => {
      const [lng, lat] = feature.center || [proximity.lng, proximity.lat];
      const placeName = feature.text || feature.place_name?.split(',')[0] || query;
      const fullAddress = feature.place_name || placeName;
      const contextAreas = feature.context
        ? feature.context.map((c: any) => c.text).join(', ')
        : 'Nairobi, Kenya';

      return {
        id: feature.id || `${lng}-${lat}`,
        name: placeName,
        area: contextAreas,
        fullAddress,
        coordinates: { lng, lat },
      };
    });
  } catch (err) {
    console.error('Mapbox search error:', err);
    return [];
  }
}

/**
 * Reverse geocodes [lng, lat] into a readable address in Nairobi / Kenya.
 */
export async function reverseGeocode(
  lng: number,
  lat: number,
  token?: string
): Promise<{ name: string; area: string; details: string; fullAddress: string }> {
  const activeToken = token || getMapboxToken();
  if (!activeToken) {
    return {
      name: `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`,
      area: 'Nairobi County, Kenya',
      details: 'Custom Pinned Delivery Point',
      fullAddress: `Selected location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    };
  }

  try {
    const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${encodeURIComponent(
      activeToken
    )}&country=ke&types=address,poi,neighborhood,locality,place&limit=1`;

    const res = await fetch(endpoint);
    if (!res.ok) {
      throw new Error(`Reverse geocode failed with status ${res.status}`);
    }

    const data = await res.json();
    const primaryFeature = data.features?.[0];

    if (primaryFeature) {
      const name = primaryFeature.text || primaryFeature.place_name.split(',')[0];
      const fullAddress = primaryFeature.place_name;
      const contextTexts = primaryFeature.context
        ? primaryFeature.context.map((c: any) => c.text).join(', ')
        : 'Nairobi, Kenya';

      return {
        name: `${name}, Nairobi`,
        area: contextTexts || 'Nairobi County, Kenya',
        details: `Pin: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        fullAddress,
      };
    }
  } catch (err) {
    console.error('Mapbox reverse geocoding error:', err);
  }

  return {
    name: `Custom Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    area: 'Nairobi County, Kenya',
    details: 'Pinned GPS Location',
    fullAddress: `Nairobi delivery point: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
  };
}

/**
 * Requests real driving route between supplier depot and customer pin using Mapbox Directions API.
 */
export async function getDirectionsRoute(
  start: [number, number], // [lng, lat]
  end: [number, number], // [lng, lat]
  token?: string
): Promise<DirectionsRouteResult | null> {
  const activeToken = token || getMapboxToken();
  if (!activeToken) return null;

  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&overview=full&access_token=${encodeURIComponent(
      activeToken
    )}`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const primaryRoute = data.routes?.[0];

    if (primaryRoute && primaryRoute.geometry?.coordinates) {
      return {
        coordinates: primaryRoute.geometry.coordinates as [number, number][],
        distanceKm: Math.round((primaryRoute.distance / 1000) * 10) / 10,
        durationMin: Math.max(1, Math.round(primaryRoute.duration / 60)),
      };
    }
  } catch (err) {
    console.error('Directions error:', err);
  }

  return null;
}

/**
 * Checks whether WebGL is supported and can be initialized in the current browser runtime.
 * Mapbox GL JS requires WebGL; if unavailable, we can safely fall back to Leaflet.
 */
export function isWebGLAvailable(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl', { failIfMajorPerformanceCaveat: false }) ||
      canvas.getContext('experimental-webgl', { failIfMajorPerformanceCaveat: false });
    return Boolean(gl && gl instanceof WebGLRenderingContext);
  } catch {
    return false;
  }
}
