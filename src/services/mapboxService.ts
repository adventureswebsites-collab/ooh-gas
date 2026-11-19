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
  source?: 'mapbox' | 'osrm' | 'fallback';
}

/**
 * Retrieves the configured Mapbox public token.
 * Checks environment variable VITE_MAPBOX_ACCESS_TOKEN first,
 * then falls back to user-configured localStorage token.
 */
export function getMapboxToken(): string {
  const envToken = (import.meta as any)?.env?.VITE_MAPBOX_ACCESS_TOKEN;
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

const NAIROBI_FALLBACK_PLACES: GeocodedPlace[] = [
  {
    id: 'kb-yaya',
    name: 'Yaya Centre, Kilimani',
    area: 'Argwings Kodhek Rd, Kilimani, Nairobi',
    fullAddress: 'Yaya Centre, Argwings Kodhek Rd, Kilimani, Nairobi',
    coordinates: { lng: 36.7875, lat: -1.2929 },
  },
  {
    id: 'kb-sarit',
    name: 'Sarit Centre, Westlands',
    area: 'Karuna Rd, Westlands, Nairobi',
    fullAddress: 'Sarit Centre, Karuna Rd, Westlands, Nairobi',
    coordinates: { lng: 36.8017, lat: -1.2614 },
  },
  {
    id: 'kb-hurlingham',
    name: 'Hurlingham Shopping Centre',
    area: 'Argwings Kodhek Rd, Hurlingham, Nairobi',
    fullAddress: 'Hurlingham, Argwings Kodhek Rd, Nairobi',
    coordinates: { lng: 36.7988, lat: -1.2916 },
  },
  {
    id: 'kb-kileleshwa',
    name: 'Kileleshwa Estate',
    area: 'Gatundu Rd / Mandera Rd, Kileleshwa, Nairobi',
    fullAddress: 'Kileleshwa Estate, Nairobi',
    coordinates: { lng: 36.7834, lat: -1.2785 },
  },
  {
    id: 'kb-lavington-mall',
    name: 'Lavington Mall',
    area: 'James Gichuru Rd, Lavington, Nairobi',
    fullAddress: 'Lavington Mall, James Gichuru Rd, Nairobi',
    coordinates: { lng: 36.7664, lat: -1.2798 },
  },
  {
    id: 'kb-riverside',
    name: 'Riverside Drive',
    area: 'Riverside Dr, Westlands / Kileleshwa, Nairobi',
    fullAddress: 'Riverside Drive, Nairobi',
    coordinates: { lng: 36.7892, lat: -1.2738 },
  },
  {
    id: 'kb-karen-hub',
    name: 'The Hub Karen',
    area: 'Dagoretti Rd, Karen, Nairobi',
    fullAddress: 'The Hub Karen, Nairobi',
    coordinates: { lng: 36.7042, lat: -1.3196 },
  },
  {
    id: 'kb-parklands',
    name: '3rd Parklands Avenue',
    area: 'Highridge, Parklands, Nairobi',
    fullAddress: '3rd Parklands Avenue, Nairobi',
    coordinates: { lng: 36.8188, lat: -1.2589 },
  },
  {
    id: 'kb-junction',
    name: 'The Junction Mall',
    area: 'Ngong Rd, Dagoretti Corner, Nairobi',
    fullAddress: 'The Junction Mall, Ngong Rd, Nairobi',
    coordinates: { lng: 36.7621, lat: -1.2986 },
  },
  {
    id: 'kb-upperhill',
    name: 'Upper Hill Medical District',
    area: 'Ralph Bunche Rd, Upper Hill, Nairobi',
    fullAddress: 'Upper Hill, Nairobi',
    coordinates: { lng: 36.8142, lat: -1.2981 },
  },
  {
    id: 'kb-southb',
    name: 'South B Hazina Estate',
    area: 'Mombasa Rd / Kapiti Rd, South B, Nairobi',
    fullAddress: 'Hazina Estate, South B, Nairobi',
    coordinates: { lng: 36.8322, lat: -1.3122 },
  },
];

function computeSimpleDistKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Searches places and addresses in Kenya with Nairobi proximity.
 * Uses Mapbox Geocoding API when configured, or OpenStreetMap Nominatim + curated Nairobi index.
 */
export async function searchPlaces(
  query: string,
  proximity: { lng: number; lat: number } = { lng: 36.7856, lat: -1.2921 },
  token?: string
): Promise<GeocodedPlace[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const activeToken = token || getMapboxToken();
  const qLower = trimmed.toLowerCase();

  const localMatches = NAIROBI_FALLBACK_PLACES.filter(
    (p) =>
      p.name.toLowerCase().includes(qLower) ||
      p.area.toLowerCase().includes(qLower) ||
      p.fullAddress.toLowerCase().includes(qLower)
  );

  if (activeToken) {
    try {
      const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        trimmed
      )}.json?access_token=${encodeURIComponent(
        activeToken
      )}&country=ke&proximity=${proximity.lng},${proximity.lat}&types=address,poi,neighborhood,locality,place&limit=6`;

      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        if (data.features && Array.isArray(data.features) && data.features.length > 0) {
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
        }
      }
    } catch (err) {
      console.error('Mapbox search error:', err);
    }
  }

  // Fallback to OpenStreetMap Nominatim in Kenya if online
  if (typeof fetch === 'function') {
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=ke&limit=5&q=${encodeURIComponent(
        `${trimmed}, Nairobi`
      )}`;
      const res = await fetch(nominatimUrl, {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const items = await res.json();
        if (Array.isArray(items) && items.length > 0) {
          const remoteResults: GeocodedPlace[] = items.map((item: any, idx: number) => {
            const parts = String(item.display_name || trimmed).split(',');
            const primary = parts[0]?.trim() || trimmed;
            const area = parts.slice(1, 3).join(',').trim() || 'Nairobi, Kenya';
            return {
              id: `osm-${item.place_id || idx}`,
              name: primary,
              area,
              fullAddress: item.display_name || `${primary}, Nairobi`,
              coordinates: {
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon),
              },
            };
          });
          // Merge local curated hits first, deduped
          const seenNames = new Set(localMatches.map((m) => m.name.toLowerCase()));
          return [
            ...localMatches,
            ...remoteResults.filter((r) => !seenNames.has(r.name.toLowerCase())),
          ].slice(0, 6);
        }
      }
    } catch {
      // Offline or rate-limited: fall back cleanly to curated Nairobi landmarks
    }
  }

  return localMatches.slice(0, 6);
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

  if (activeToken) {
    try {
      const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${encodeURIComponent(
        activeToken
      )}&country=ke&types=address,poi,neighborhood,locality,place&limit=1`;

      const res = await fetch(endpoint);
      if (res.ok) {
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
      }
    } catch (err) {
      console.error('Mapbox reverse geocoding error:', err);
    }
  }

  // Fallback: nearest known Nairobi landmark if within 3km so display name stays human-readable
  let nearest: GeocodedPlace | null = null;
  let nearestDist = Infinity;
  for (const place of NAIROBI_FALLBACK_PLACES) {
    const d = computeSimpleDistKm(lat, lng, place.coordinates.lat, place.coordinates.lng);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = place;
    }
  }

  if (nearest && nearestDist <= 3.5) {
    return {
      name: nearestDist < 0.35 ? nearest.name : `Near ${nearest.name}`,
      area: nearest.area,
      details: `Pinned (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      fullAddress: `${nearest.name} · ${nearest.area}`,
    };
  }

  return {
    name: `Pinned Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    area: 'Nairobi County, Kenya',
    details: 'Custom Pinned Delivery Point',
    fullAddress: `Selected delivery pin: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
  };
}

const roadRouteCache = new Map<string, DirectionsRouteResult>();

function buildRoadGridFallbackRoute(
  start: [number, number],
  end: [number, number]
): DirectionsRouteResult {
  const straightKm = computeSimpleDistKm(start[1], start[0], end[1], end[0]);
  if (straightKm < 0.04) {
    return {
      coordinates: [start, end],
      distanceKm: 0.1,
      durationMin: 2,
      source: 'fallback',
    };
  }

  // Simulate urban arterial street turns rather than a raw straight line
  const dLng = end[0] - start[0];
  const dLat = end[1] - start[1];
  const p1: [number, number] = [start[0] + dLng * 0.45, start[1] + dLat * 0.08];
  const p2: [number, number] = [start[0] + dLng * 0.55, start[1] + dLat * 0.62];
  const p3: [number, number] = [start[0] + dLng * 0.92, start[1] + dLat * 0.72];

  const roadDistanceKm = Math.max(0.2, Math.round(straightKm * 1.32 * 10) / 10);
  // Nairobi motorcycle delivery speed ~22 km/h average in city traffic
  const durationMin = Math.max(3, Math.round((roadDistanceKm / 22) * 60));

  return {
    coordinates: [start, p1, p2, p3, end],
    distanceKm: roadDistanceKm,
    durationMin,
    source: 'fallback',
  };
}

/**
 * Requests real driving route following roads between supplier depot and customer pin.
 * Uses Mapbox Directions API when configured, or OpenStreetMap OSRM public router,
 * with a Nairobi road-network fallback when offline.
 */
export async function getDirectionsRoute(
  start: [number, number], // [lng, lat]
  end: [number, number], // [lng, lat]
  token?: string
): Promise<DirectionsRouteResult | null> {
  const cacheKey = `${start[0].toFixed(5)},${start[1].toFixed(5)}->${end[0].toFixed(5)},${end[1].toFixed(5)}`;
  const cached = roadRouteCache.get(cacheKey);
  if (cached) return cached;

  const straightKm = computeSimpleDistKm(start[1], start[0], end[1], end[0]);
  if (straightKm < 0.03) {
    return {
      coordinates: [start, end],
      distanceKm: 0.1,
      durationMin: 2,
      source: 'fallback',
    };
  }

  const activeToken = token || getMapboxToken();

  // 1. Try Mapbox Directions API if token is configured
  if (activeToken && typeof fetch === 'function') {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5500);
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&overview=full&access_token=${encodeURIComponent(
        activeToken
      )}`;

      const res = await fetch(url, { signal: controller.signal });
      if (res.ok) {
        const data = await res.json();
        const primaryRoute = data.routes?.[0];
        if (primaryRoute?.geometry?.coordinates?.length >= 2) {
          const result: DirectionsRouteResult = {
            coordinates: primaryRoute.geometry.coordinates as [number, number][],
            distanceKm: Math.max(0.1, Math.round((primaryRoute.distance / 1000) * 10) / 10),
            durationMin: Math.max(2, Math.round(primaryRoute.duration / 60)),
            source: 'mapbox',
          };
          roadRouteCache.set(cacheKey, result);
          return result;
        }
      }
    } catch {
      // Fall through cleanly to OSRM
    } finally {
      clearTimeout(timer);
    }
  }

  // 2. Free OpenStreetMap OSRM road-following routing
  if (typeof fetch === 'function') {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5500);
    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson`;
      const res = await fetch(osrmUrl, { signal: controller.signal });
      if (res.ok) {
        const data = await res.json();
        const primaryRoute = data.routes?.[0];
        if (primaryRoute?.geometry?.coordinates?.length >= 2) {
          const result: DirectionsRouteResult = {
            coordinates: primaryRoute.geometry.coordinates as [number, number][],
            distanceKm: Math.max(0.1, Math.round((primaryRoute.distance / 1000) * 10) / 10),
            durationMin: Math.max(2, Math.round(primaryRoute.duration / 60)),
            source: 'osrm',
          };
          roadRouteCache.set(cacheKey, result);
          return result;
        }
      }
    } catch {
      // Offline / network blocked: use urban road-network estimate below
    } finally {
      clearTimeout(timer);
    }
  }

  return buildRoadGridFallbackRoute(start, end);
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
