import {
  Town,
  SupplierBusiness,
  MultiSupplierDeliveryZone,
  SupplierProduct,
  MasterProduct,
} from '../types/multisupplier';
import { PolygonCoordinate } from '../types';
import {
  KENYA_TOWNS,
  MULTI_SUPPLIER_BUSINESSES,
  MULTI_SUPPLIER_DELIVERY_ZONES,
  MULTI_SUPPLIER_PRODUCTS,
  MASTER_PRODUCTS,
} from '../data/multiSupplierData';
import { isPointInPolygon } from '../data/deliveryZonesData';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface LocationSupplierMatch {
  supplier: SupplierBusiness;
  zone: MultiSupplierDeliveryZone;
  products: Array<SupplierProduct & { product: MasterProduct }>;
}

export interface MultiSupplierCoverageResult {
  isCovered: boolean;
  town?: Town;
  coordinates: {
    lat: number;
    lng: number;
  };
  matchedCount: number;
  matches: LocationSupplierMatch[];
  message: string;
}

/**
 * Retrieves all supported towns in Kenya
 */
export async function getSupportedTowns(): Promise<Town[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('towns')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (!error && data && data.length > 0) {
        return data.map((t) => ({
          id: t.id,
          name: t.name,
          county: t.county,
          centerPoint: t.center_point?.coordinates
            ? { lat: t.center_point.coordinates[1], lng: t.center_point.coordinates[0] }
            : { lat: -1.2921, lng: 36.8219 },
          isActive: t.is_active,
        }));
      }
    } catch (e) {
      console.warn('[MultiSupplierService] Supabase towns fetch fallback to local data:', e);
    }
  }
  return KENYA_TOWNS;
}

/**
 * Finds all independent suppliers whose active delivery zone encloses the given coordinate.
 * Demonstrates support for overlapping zones where multiple suppliers serve the same customer.
 */
export async function findSuppliersForLocation(
  lat: number,
  lng: number,
  townId?: string
): Promise<MultiSupplierCoverageResult> {
  const point: PolygonCoordinate = { lat, lng };

  // 1. Try Supabase PostGIS RPC if configured
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.rpc('find_suppliers_by_location', {
        p_lat: lat,
        p_lng: lng,
        p_town_id: townId || null,
      });

      if (!error && data) {
        return {
          isCovered: data.is_covered,
          coordinates: { lat, lng },
          matchedCount: data.supplier_count,
          matches: (data.suppliers || []).map((s: any) => ({
            supplier: {
              id: s.supplier_id,
              businessName: s.business_name,
              tradeName: s.trade_name,
              phoneNumber: s.phone_number,
              primaryTownId: townId || 'nairobi',
              depotLocation: { lat, lng },
              status: 'active',
              commissionRate: 5.0,
              opensAt: s.opens_at || '07:30',
              closesAt: s.closes_at || '21:30',
              rating: s.rating || 4.8,
              reviewCount: s.review_count || 50,
              logoUrl: s.logo_url,
              createdAt: '',
              updatedAt: '',
            },
            zone: {
              id: s.zone?.id,
              supplierId: s.supplier_id,
              townId: townId || 'nairobi',
              name: s.zone?.name,
              color: s.zone?.color || '#10b981',
              boundary: [],
              baseDeliveryFee: s.zone?.delivery_fee || 0,
              minOrderValue: s.zone?.min_order_value || 1000,
              estimatedDeliveryMin: s.zone?.estimated_delivery_min || '20–30 min',
              isActive: true,
            },
            products: (s.available_products || []).map((p: any) => ({
              id: p.supplier_product_id,
              supplierId: s.supplier_id,
              productId: p.product_id,
              refillPrice: p.refill_price,
              completePrice: p.complete_price,
              stockRefill: p.stock_refill,
              stockComplete: p.stock_complete,
              isAvailable: true,
              minStockAlert: 5,
              product: {
                id: p.product_id,
                brand: p.brand,
                cylinderSize: p.cylinder_size,
                valveType: p.valve_type,
                isActive: true,
              },
            })),
          })),
          message: data.is_covered
            ? `Found ${data.supplier_count} LPG supplier(s) delivering to your location!`
            : 'No LPG suppliers currently cover this location.',
        };
      }
    } catch (err) {
      console.warn('[MultiSupplierService] Supabase RPC failed, running local PostGIS PIP check:', err);
    }
  }

  // 2. Deterministic Spatial Calculation (Local PostGIS Simulation)
  const activeZones = MULTI_SUPPLIER_DELIVERY_ZONES.filter((zone) => {
    if (!zone.isActive) return false;
    if (townId && zone.townId !== townId) return false;
    return isPointInPolygon(point, zone.boundary);
  });

  if (activeZones.length === 0) {
    return {
      isCovered: false,
      coordinates: { lat, lng },
      matchedCount: 0,
      matches: [],
      message: 'Location is outside active delivery zones for all registered suppliers in this town.',
    };
  }

  const matches: LocationSupplierMatch[] = [];

  for (const zone of activeZones) {
    const supplier = MULTI_SUPPLIER_BUSINESSES.find(
      (s) => s.id === zone.supplierId && s.status === 'active'
    );
    if (!supplier) continue;

    const supplierProducts = MULTI_SUPPLIER_PRODUCTS.filter(
      (sp) => sp.supplierId === supplier.id && sp.isAvailable
    ).map((sp) => {
      const product = MASTER_PRODUCTS.find((p) => p.id === sp.productId) || {
        id: sp.productId,
        brand: 'LPG Gas',
        cylinderSize: '13kg' as const,
        valveType: '20mm Compact',
        isActive: true,
      };
      return {
        ...sp,
        product,
      };
    });

    matches.push({
      supplier,
      zone,
      products: supplierProducts,
    });
  }

  const detectedTown = KENYA_TOWNS.find((t) => t.id === activeZones[0].townId);

  return {
    isCovered: matches.length > 0,
    town: detectedTown,
    coordinates: { lat, lng },
    matchedCount: matches.length,
    matches,
    message:
      matches.length > 0
        ? `Great news! ${matches.length} independent LPG supplier(s) deliver to your doorstep.`
        : 'No active suppliers currently deliver to this area.',
  };
}

/**
 * Validates a multi-supplier order before checkout
 */
export async function validateSupplierOrder(params: {
  lat: number;
  lng: number;
  supplierId: string;
  subtotal: number;
}): Promise<{
  valid: boolean;
  error?: string;
  zone?: MultiSupplierDeliveryZone;
  supplier?: SupplierBusiness;
  deliveryFee: number;
  estimatedDeliveryMin: string;
}> {
  const { lat, lng, supplierId, subtotal } = params;

  // Supabase RPC check if connected
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.rpc('validate_order_submission', {
        p_lat: lat,
        p_lng: lng,
        p_supplier_id: supplierId,
        p_subtotal: subtotal,
      });
      if (!error && data) {
        if (!data.valid) {
          return {
            valid: false,
            error: data.error,
            deliveryFee: 0,
            estimatedDeliveryMin: '',
          };
        }
        return {
          valid: true,
          deliveryFee: data.delivery_fee,
          estimatedDeliveryMin: data.estimated_delivery_min,
        };
      }
    } catch (e) {
      console.warn('[MultiSupplierService] Supabase validate order fallback:', e);
    }
  }

  // Local fallback validation
  const supplier = MULTI_SUPPLIER_BUSINESSES.find((s) => s.id === supplierId);
  if (!supplier) {
    return { valid: false, error: 'Supplier not found.', deliveryFee: 0, estimatedDeliveryMin: '' };
  }

  if (supplier.status !== 'active') {
    return {
      valid: false,
      error: 'This supplier is not currently accepting orders.',
      deliveryFee: 0,
      estimatedDeliveryMin: '',
    };
  }

  const point = { lat, lng };
  const supplierZones = MULTI_SUPPLIER_DELIVERY_ZONES.filter(
    (z) => z.supplierId === supplierId && z.isActive
  );

  const matchedZone = supplierZones.find((z) => isPointInPolygon(point, z.boundary));

  if (!matchedZone) {
    return {
      valid: false,
      error: `Your location is outside of ${supplier.tradeName}'s delivery zone.`,
      deliveryFee: 0,
      estimatedDeliveryMin: '',
    };
  }

  if (subtotal < matchedZone.minOrderValue) {
    return {
      valid: false,
      error: `Order subtotal (KSh ${subtotal.toLocaleString()}) is below ${supplier.tradeName}'s minimum order value of KSh ${matchedZone.minOrderValue.toLocaleString()} in ${matchedZone.name}.`,
      deliveryFee: matchedZone.baseDeliveryFee,
      estimatedDeliveryMin: matchedZone.estimatedDeliveryMin,
    };
  }

  return {
    valid: true,
    zone: matchedZone,
    supplier,
    deliveryFee: matchedZone.baseDeliveryFee,
    estimatedDeliveryMin: matchedZone.estimatedDeliveryMin,
  };
}

// ==============================================================================
// Real-Time Matching & Offer Workflow Client Functions
// ==============================================================================

/**
 * Submits customer order to authoritative server matching engine
 */
export async function createRealtimeOrder(payload: {
  customerId?: string;
  customerName: string;
  phoneNumber: string;
  deliveryAddress: {
    street: string;
    building?: string;
    unitNumber?: string;
    estate: string;
    notes?: string;
  };
  deliveryPoint: {
    lat: number;
    lng: number;
  };
  items: Array<{
    productId: string;
    purchaseType: 'refill' | 'complete_unit' | 'exchange';
    quantity: number;
  }>;
  paymentMethod?: string;
  timeoutSeconds?: number;
}): Promise<any> {
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Order creation failed (${response.status})`);
  }

  return response.json();
}

/**
 * Retrieves order details with current matching status
 */
export async function fetchOrderDetails(orderId: string): Promise<any> {
  const response = await fetch(`/api/orders/${orderId}`);
  if (!response.ok) {
    throw new Error('Order not found');
  }
  return response.json();
}

/**
 * Retrieves supplier candidates, rankings, and current offer status
 */
export async function fetchMatchingStatus(orderId: string): Promise<any> {
  const response = await fetch(`/api/orders/${orderId}/matching-status`);
  if (!response.ok) {
    throw new Error('Matching session not found');
  }
  return response.json();
}

/**
 * Customer cancels order
 */
export async function cancelOrder(orderId: string, reason?: string): Promise<any> {
  const response = await fetch(`/api/orders/${orderId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  return response.json();
}

/**
 * Supplier fetches pending offers
 */
export async function fetchSupplierOffers(supplierId: string): Promise<any[]> {
  const response = await fetch(`/api/supplier/offers?supplierId=${encodeURIComponent(supplierId)}`);
  if (!response.ok) return [];
  return response.json();
}

/**
 * Supplier responds to an offer (ACCEPT or REJECT)
 */
export async function respondToSupplierOffer(
  offerId: string,
  supplierId: string,
  action: 'ACCEPT' | 'REJECT',
  reason?: string
): Promise<any> {
  const response = await fetch(`/api/supplier/offers/${offerId}/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ supplierId, action, reason }),
  });
  return response.json();
}

/**
 * Supplier updates delivery status (PREPARING, OUT_FOR_DELIVERY, DELIVERED)
 */
export async function updateSupplierOrderStage(orderId: string, status: string): Promise<any> {
  const response = await fetch(`/api/supplier/orders/${orderId}/stage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return response.json();
}

/**
 * Initiates PayHero Lipa Na M-Pesa STK push
 */
export async function initiatePayHeroMpesa(orderId: string, phoneNumber: string): Promise<any> {
  const response = await fetch('/api/payments/payhero/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, phoneNumber }),
  });
  return response.json();
}

/**
 * Fetches authoritative payment status
 */
export async function fetchPaymentStatus(orderId: string): Promise<any> {
  const response = await fetch(`/api/payments/order/${orderId}`);
  if (!response.ok) return null;
  return response.json();
}

/**
 * Fetches all orders for Admin View
 */
export async function fetchAdminOrders(adminToken: string): Promise<any> {
  const response = await fetch('/api/admin/orders', {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });
  if (!response.ok) return { totalCount: 0, orders: [] };
  return response.json();
}

/**
 * Connects to live SSE stream for real-time order updates without page reload
 */
export function connectToRealtimeStream(
  onEvent: (event: string, payload: any) => void
): () => void {
  try {
    const eventSource = new EventSource('/api/realtime/stream');

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.event) {
          onEvent(parsed.event, parsed.payload);
        }
      } catch (err) {
        console.warn('[SSE] Parse error:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn('[SSE] EventSource connection error (will auto-reconnect):', err);
    };

    return () => {
      eventSource.close();
    };
  } catch (e) {
    console.warn('[SSE] EventSource unsupported:', e);
    return () => {};
  }
}

