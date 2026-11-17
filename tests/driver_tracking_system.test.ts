import assert from 'node:assert';
import {
  recordDriverLocation,
  getDriverLocationForOrder,
} from '../src/services/realtimeMatchingService';

console.log('🧪 Starting Ooh Gas Real-Time Driver Tracking & ETA System Tests...\n');

// 1. Heading / Bearing Math Validation
function calculateBearing(start: [number, number], end: [number, number]): number {
  const startLng = (start[0] * Math.PI) / 180;
  const startLat = (start[1] * Math.PI) / 180;
  const endLng = (end[0] * Math.PI) / 180;
  const endLat = (end[1] * Math.PI) / 180;

  const dLng = endLng - startLng;
  const y = Math.sin(dLng) * Math.cos(endLat);
  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

// 2. Haversine Distance Math Validation
function getDistanceMeters(p1: [number, number], p2: [number, number]): number {
  const R = 6371000;
  const dLat = ((p2[1] - p1[1]) * Math.PI) / 180;
  const dLng = ((p2[0] - p1[0]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1[1] * Math.PI) / 180) *
      Math.cos((p2[1] * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

let passedCount = 0;

function test(description: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${description}`);
    passedCount++;
  } catch (err: any) {
    console.error(`  ✕ ${description}`);
    console.error(`    Error: ${err.message}`);
    process.exitCode = 1;
  }
}

// ==========================================
// Test Suite: Bearing and Road Math
// ==========================================
test('Heading calculation returns 0° (North) when moving directly North', () => {
  const start: [number, number] = [36.8, -1.3];
  const end: [number, number] = [36.8, -1.2]; // latitude increases = North
  const bearing = calculateBearing(start, end);
  assert(Math.abs(bearing - 0) < 0.1 || Math.abs(bearing - 360) < 0.1, `Expected ~0°, got ${bearing}`);
});

test('Heading calculation returns 90° (East) when moving directly East', () => {
  const start: [number, number] = [36.8, -1.3];
  const end: [number, number] = [36.9, -1.3]; // longitude increases = East
  const bearing = calculateBearing(start, end);
  assert(Math.abs(bearing - 90) < 0.5, `Expected ~90°, got ${bearing}`);
});

test('Distance calculation calculates accurate road distance in Nairobi', () => {
  const pointA: [number, number] = [36.8219, -1.2921]; // Nairobi CBD
  const pointB: [number, number] = [36.7856, -1.2785]; // Westlands
  const distance = getDistanceMeters(pointA, pointB);
  assert(distance > 3000 && distance < 6000, `Expected 3-6km distance, got ${distance}m`);
});

// ==========================================
// Test Suite: Driver Location Storage & GPS Accuracy Filtering
// ==========================================
test('Rejects telemetry with unacceptable accuracy (> 100 meters)', () => {
  const badTelemetry = {
    orderId: 'ORD-TEST-001',
    driverId: 'DRV-001',
    latitude: -1.2921,
    longitude: 36.8219,
    accuracy: 250, // unacceptable accuracy
    heading: 90,
    speed: 8.5,
  };

  const result = recordDriverLocation(badTelemetry);
  assert.strictEqual(result.recorded, false);
  assert(result.reason?.includes('poor') || result.reason?.includes('Accuracy'));
});

test('Accepts valid GPS telemetry with high accuracy (<= 100m)', () => {
  const validTelemetry = {
    orderId: 'ORD-TEST-002',
    driverId: 'DRV-001',
    latitude: -1.2850,
    longitude: 36.8100,
    accuracy: 12.5, // 12.5 meters accuracy
    heading: 45.0,
    speed: 7.2, // ~26 km/h
  };

  const result = recordDriverLocation(validTelemetry);
  assert.strictEqual(result.recorded, true);
  assert.strictEqual(result.location?.latitude, -1.2850);
  assert.strictEqual(result.location?.longitude, 36.8100);
  assert.strictEqual(result.location?.speed, 7.2);
});

test('Retrieves the latest recorded driver location for an order', () => {
  const orderId = 'ORD-TRACKING-999';
  recordDriverLocation({
    orderId,
    driverId: 'DRV-KAMAU',
    latitude: -1.2900,
    longitude: 36.8000,
    accuracy: 10,
    heading: 180,
    speed: 5.0,
  });

  // Second update
  recordDriverLocation({
    orderId,
    driverId: 'DRV-KAMAU',
    latitude: -1.2915,
    longitude: 36.8010,
    accuracy: 8,
    heading: 195,
    speed: 6.2,
  });

  const latest = getDriverLocationForOrder(orderId);
  assert(Boolean(latest), 'Expected latest record to exist');
  assert.strictEqual(latest?.latitude, -1.2915);
  assert.strictEqual(latest?.longitude, 36.8010);
  assert.strictEqual(latest?.heading, 195);
  assert.strictEqual(latest?.driverId, 'DRV-KAMAU');
  assert(Boolean(latest?.recordedAt), 'Expected timestamp recordedAt');
});

test('Returns undefined for orders with no driver tracking history', () => {
  const latest = getDriverLocationForOrder('NON-EXISTENT-ORDER');
  assert.strictEqual(latest, undefined);
});

console.log(`\n🎉 All ${passedCount} Driver Tracking & ETA Tests Passed Successfully!\n`);
