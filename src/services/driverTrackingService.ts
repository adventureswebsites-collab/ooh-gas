/**
 * Driver Tracking & Real-Time Telemetry Service
 * Connects driver's device geolocation with Supabase Realtime and Ooh Gas backend.
 * Provides accurate GPS tracking, bearing calculation, accuracy filtering,
 * and reliable synchronization with customer tracking map.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface DriverLocationRecord {
  driverId: string;
  orderId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  recordedAt: string;
}

export interface DriverGpsState {
  isTracking: boolean;
  orderId: string | null;
  driverId: string | null;
  currentLocation: DriverLocationRecord | null;
  lastReliableLocation: DriverLocationRecord | null;
  permissionStatus: 'prompt' | 'granted' | 'denied';
  error: string | null;
  updatesCount: number;
  lastUpdatedTime: string | null;
}

// In-memory cache of latest driver locations keyed by orderId
const latestLocationStore = new Map<string, DriverLocationRecord>();

let activeWatchId: number | null = null;
let activeGpsState: DriverGpsState = {
  isTracking: false,
  orderId: null,
  driverId: null,
  currentLocation: null,
  lastReliableLocation: null,
  permissionStatus: 'prompt',
  error: null,
  updatesCount: 0,
  lastUpdatedTime: null,
};

const gpsListeners = new Set<(state: DriverGpsState) => void>();

function notifyGpsListeners() {
  gpsListeners.forEach((fn) => {
    try {
      fn({ ...activeGpsState });
    } catch (e) {
      console.warn('[DriverTracking] Listener error:', e);
    }
  });
}

/**
 * Calculates bearing (heading angle in degrees 0-360) between two GPS points
 */
export function calculateBearing(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

/**
 * Calculates Haversine distance in meters between two coordinates
 */
export function calculateDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Transmits driver location update to the backend server and Supabase Realtime
 */
export async function sendDriverLocationUpdate(
  record: DriverLocationRecord
): Promise<boolean> {
  // Update local memory store immediately for fast responsive local reads
  latestLocationStore.set(record.orderId, record);

  // 1. Send update to server API
  try {
    const res = await fetch('/api/driver/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    if (!res.ok) {
      console.warn('[DriverTracking] Server returned non-ok status for location update:', res.status);
    }
  } catch (err) {
    console.warn('[DriverTracking] Failed posting location update to server:', err);
  }

  // 2. Transmit via Supabase (if configured)
  if (isSupabaseConfigured && supabase) {
    try {
      // Direct table insert for permanent telemetry audit log
      await supabase.from('driver_locations').insert({
        driver_id: record.driverId,
        order_id: record.orderId,
        latitude: record.latitude,
        longitude: record.longitude,
        accuracy: record.accuracy,
        heading: record.heading,
        speed: record.speed,
        recorded_at: record.recordedAt,
      });

      // Broadcast event through Supabase Realtime Channel
      const channel = supabase.channel(`order-tracking:${record.orderId}`);
      await channel.send({
        type: 'broadcast',
        event: 'driver_location',
        payload: record,
      });
    } catch (sbErr) {
      console.warn('[DriverTracking] Supabase broadcast notice:', sbErr);
    }
  }

  return true;
}

/**
 * Starts device GPS tracking for the assigned delivery rider.
 * Uses real navigator.geolocation.watchPosition with high accuracy.
 */
export function startLiveGpsTracking(
  orderId: string,
  driverId: string,
  onLocationUpdate?: (record: DriverLocationRecord) => void,
  onError?: (err: Error) => void
): boolean {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    const err = new Error('Geolocation is not supported by your browser or device.');
    activeGpsState.error = err.message;
    notifyGpsListeners();
    if (onError) onError(err);
    return false;
  }

  // Stop any previously running watch
  stopLiveGpsTracking();

  activeGpsState = {
    isTracking: true,
    orderId,
    driverId,
    currentLocation: null,
    lastReliableLocation: null,
    permissionStatus: 'prompt',
    error: null,
    updatesCount: 0,
    lastUpdatedTime: null,
  };
  notifyGpsListeners();

  let previousRecord: DriverLocationRecord | null = null;

  activeWatchId = navigator.geolocation.watchPosition(
    (position) => {
      activeGpsState.permissionStatus = 'granted';
      const { latitude, longitude, accuracy, heading: rawHeading, speed: rawSpeed } = position.coords;

      // Filter out grossly inaccurate readings (e.g. accuracy > 120 meters)
      // while retaining last reliable position
      const isAccurate = accuracy < 120;

      let computedHeading = rawHeading;
      let computedSpeed = rawSpeed;

      // Compute heading if device did not provide it, based on delta from previous location
      if ((computedHeading === null || isNaN(computedHeading)) && previousRecord) {
        const dist = calculateDistanceMeters(
          previousRecord.latitude,
          previousRecord.longitude,
          latitude,
          longitude
        );
        if (dist > 3) {
          computedHeading = calculateBearing(
            previousRecord.latitude,
            previousRecord.longitude,
            latitude,
            longitude
          );
        } else {
          computedHeading = previousRecord.heading;
        }
      }

      const record: DriverLocationRecord = {
        driverId,
        orderId,
        latitude,
        longitude,
        accuracy: Math.round(accuracy * 10) / 10,
        heading: computedHeading !== null && !isNaN(computedHeading) ? Math.round(computedHeading) : null,
        speed: computedSpeed !== null && !isNaN(computedSpeed) ? Math.round(computedSpeed * 3.6 * 10) / 10 : null, // km/h
        recordedAt: new Date(position.timestamp || Date.now()).toISOString(),
      };

      activeGpsState.currentLocation = record;
      activeGpsState.updatesCount += 1;
      activeGpsState.lastUpdatedTime = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      activeGpsState.error = null;

      if (isAccurate) {
        activeGpsState.lastReliableLocation = record;
        previousRecord = record;
      }

      notifyGpsListeners();

      // Transmit to backend
      sendDriverLocationUpdate(record);

      if (onLocationUpdate) {
        onLocationUpdate(record);
      }
    },
    (geoError) => {
      let message = 'Unable to retrieve GPS coordinates.';
      if (geoError.code === geoError.PERMISSION_DENIED) {
        activeGpsState.permissionStatus = 'denied';
        message = 'Location permission was denied. Please allow location access in your browser settings to track deliveries.';
      } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
        message = 'GPS signal unavailable. Move outdoors with clear view of the sky.';
      } else if (geoError.code === geoError.TIMEOUT) {
        message = 'GPS location request timed out. Retrying...';
      }

      activeGpsState.error = message;
      notifyGpsListeners();
      if (onError) onError(new Error(message));
    },
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 12000,
    }
  );

  return true;
}

/**
 * Stops live GPS tracking and clears hardware watch
 */
export function stopLiveGpsTracking(): void {
  if (activeWatchId !== null && typeof window !== 'undefined' && navigator.geolocation) {
    navigator.geolocation.clearWatch(activeWatchId);
    activeWatchId = null;
  }

  activeGpsState.isTracking = false;
  notifyGpsListeners();
}

/**
 * Returns current GPS tracking status and state
 */
export function getDriverGpsState(): DriverGpsState {
  return { ...activeGpsState };
}

/**
 * Subscribes to local GPS state updates (used by rider UI)
 */
export function subscribeToDriverGpsState(
  listener: (state: DriverGpsState) => void
): () => void {
  gpsListeners.add(listener);
  listener({ ...activeGpsState });
  return () => {
    gpsListeners.delete(listener);
  };
}

/**
 * Customer side: Subscribes to real-time driver updates for an order.
 * First checks local cache / server, then listens to Supabase Realtime channel and SSE events.
 */
export function subscribeToDriverLocation(
  orderId: string,
  onLocation: (loc: DriverLocationRecord) => void
): () => void {
  // If we have an existing location in memory, emit immediately
  const existing = latestLocationStore.get(orderId);
  if (existing) {
    onLocation(existing);
  } else {
    // Fetch initial from backend
    fetchLatestDriverLocation(orderId).then((loc) => {
      if (loc) onLocation(loc);
    });
  }

  // 1. Supabase Realtime Channel
  let channel: any = null;
  if (isSupabaseConfigured && supabase) {
    try {
      channel = supabase
        .channel(`order-tracking:${orderId}`)
        .on('broadcast', { event: 'driver_location' }, (payload: any) => {
          if (payload?.payload) {
            latestLocationStore.set(orderId, payload.payload);
            onLocation(payload.payload);
          }
        })
        .subscribe();
    } catch (e) {
      console.warn('[DriverTracking] Supabase realtime subscribe error:', e);
    }
  }

  // 2. Poll server every 4 seconds as a fallback if WebSocket is interrupted
  const interval = setInterval(async () => {
    const loc = await fetchLatestDriverLocation(orderId);
    if (loc) {
      latestLocationStore.set(orderId, loc);
      onLocation(loc);
    }
  }, 4000);

  return () => {
    if (channel && supabase) {
      supabase.removeChannel(channel);
    }
    clearInterval(interval);
  };
}

/**
 * Fetches the latest known location for an order from server API
 */
export async function fetchLatestDriverLocation(
  orderId: string
): Promise<DriverLocationRecord | null> {
  try {
    const res = await fetch(`/api/driver/orders/${encodeURIComponent(orderId)}/location`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.latitude && data.longitude) {
        return data as DriverLocationRecord;
      }
    }
  } catch (e) {
    // Silent network fallback
  }

  return latestLocationStore.get(orderId) || null;
}
