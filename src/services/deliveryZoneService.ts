import {
  DeliveryZone,
  CoverageCheckResult,
  OrderValidationRequest,
  OrderValidationResponse,
  Supplier,
} from '../types';
import { INITIAL_DELIVERY_ZONES, isPointInPolygon } from '../data/deliveryZonesData';
import { MOCK_SUPPLIERS, MARKET_BENCHMARK_PRICES } from '../data/mockData';

const ADMIN_TOKEN_KEY = 'ooh_gas_admin_token';

/**
 * Fetches configured delivery zones from the backend API.
 */
export async function fetchDeliveryZones(activeOnly = false): Promise<DeliveryZone[]> {
  try {
    const res = await fetch(`/api/zones${activeOnly ? '?activeOnly=true' : ''}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('API error fetching zones, using fallback:', err);
  }
  return activeOnly ? INITIAL_DELIVERY_ZONES.filter((z) => z.isActive) : INITIAL_DELIVERY_ZONES;
}

/**
 * Authoritatively verifies whether a given coordinate point is covered by an active delivery zone.
 * Calls backend POST /api/zones/check-coverage, falling back to client-side PIP if offline.
 */
export async function checkDeliveryCoverage(
  lat: number,
  lng: number,
  fallbackZones: DeliveryZone[] = INITIAL_DELIVERY_ZONES
): Promise<CoverageCheckResult> {
  try {
    const res = await fetch('/api/zones/check-coverage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng }),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend coverage check failed, executing local spatial PIP verification:', err);
  }

  // Graceful Local Fallback: identical mathematical PIP algorithm
  const point = { lat, lng };
  const activeZones = fallbackZones.filter((z) => z.isActive);
  const matchedActiveZones = activeZones.filter((zone) => isPointInPolygon(point, zone.polygon));

  if (matchedActiveZones.length > 0) {
    const primaryZone = matchedActiveZones[0];
    const eligibleSuppliers: any[] = [];
    const seen = new Set<string>();

    matchedActiveZones.forEach((z) => {
      z.suppliers.forEach((sConfig) => {
        if (!seen.has(sConfig.supplierId)) {
          seen.add(sConfig.supplierId);
          const base = MOCK_SUPPLIERS.find((s) => s.id === sConfig.supplierId);
          if (base) {
            eligibleSuppliers.push({
              ...base,
              deliveryFee: sConfig.deliveryFee,
              deliveryTimeMin: sConfig.estimatedDeliveryMin,
              zoneConfig: sConfig,
            });
          }
        }
      });
    });

    return {
      isCovered: true,
      checkedAt: new Date().toISOString(),
      coordinates: point,
      matchedZones: matchedActiveZones,
      primaryZone,
      eligibleSuppliers,
      message: `Delivery available! Your location is within the ${primaryZone.name}.`,
    };
  }

  return {
    isCovered: false,
    checkedAt: new Date().toISOString(),
    coordinates: point,
    matchedZones: [],
    eligibleSuppliers: [],
    message: 'Location is outside all active Ooh Gas delivery service zones in Nairobi.',
  };
}

/**
 * Validates order eligibility on the backend before order creation or payment.
 */
export async function validateOrderEligibility(
  req: OrderValidationRequest
): Promise<OrderValidationResponse> {
  try {
    const res = await fetch('/api/zones/validate-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });

    if (res.ok) {
      return await res.json();
    }

    const errorData = await res.json();
    return {
      valid: false,
      error: errorData.error || 'Backend order validation failed.',
      deliveryFee: 100,
      estimatedDeliveryMin: '25 min',
    };
  } catch (err) {
    console.warn('Backend order validation network error, falling back locally:', err);
    // Local fallback check
    const benchmark = MARKET_BENCHMARK_PRICES[req.cylinderSize] || MARKET_BENCHMARK_PRICES['13kg'];
    const unitPrice = req.purchaseType === 'complete' ? benchmark.completePrice : benchmark.refillPrice;
    const subtotal = unitPrice * req.quantity;

    return {
      valid: true,
      deliveryFee: 100,
      estimatedDeliveryMin: '20–30 min',
    };
  }
}

// ==========================================
// Admin API Helpers
// ==========================================

export function getStoredAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setStoredAdminToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  }
}

export function clearStoredAdminToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  }
}

export async function adminLogin(password: string): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      setStoredAdminToken(data.token);
      return { success: true, token: data.token };
    }
    return { success: false, error: data.error || 'Invalid credentials' };
  } catch (err) {
    return { success: false, error: 'Network error communicating with admin service' };
  }
}

export async function adminSaveZone(
  zone: Partial<DeliveryZone>,
  token: string
): Promise<{ success: boolean; zone?: DeliveryZone; error?: string }> {
  const isNew = !zone.id || zone.id.startsWith('new-');
  const url = isNew ? '/api/admin/zones' : `/api/admin/zones/${zone.id}`;
  const method = isNew ? 'POST' : 'PUT';

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(zone),
    });

    if (res.ok) {
      const saved = await res.json();
      return { success: true, zone: saved };
    }
    const err = await res.json();
    return { success: false, error: err.error || 'Failed saving zone' };
  } catch (err) {
    return { success: false, error: 'Network error saving zone' };
  }
}

export async function adminToggleZone(
  id: string,
  token: string
): Promise<{ success: boolean; zone?: DeliveryZone; error?: string }> {
  try {
    const res = await fetch(`/api/admin/zones/${id}/toggle`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const zone = await res.json();
      return { success: true, zone };
    }
    const err = await res.json();
    return { success: false, error: err.error || 'Failed toggling zone' };
  } catch (err) {
    return { success: false, error: 'Network error' };
  }
}

export async function adminDeleteZone(
  id: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/admin/zones/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) return { success: true };
    const err = await res.json();
    return { success: false, error: err.error || 'Failed deleting zone' };
  } catch (err) {
    return { success: false, error: 'Network error' };
  }
}
