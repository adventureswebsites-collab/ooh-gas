import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { INITIAL_DELIVERY_ZONES, isPointInPolygon } from './src/data/deliveryZonesData.js';
import { MOCK_SUPPLIERS, MARKET_BENCHMARK_PRICES } from './src/data/mockData.js';
import { DeliveryZone, CoverageCheckResult, OrderValidationResponse, Supplier } from './src/types/index.js';
import {
  KENYA_TOWNS,
  MULTI_SUPPLIER_BUSINESSES,
  MULTI_SUPPLIER_DELIVERY_ZONES,
  MULTI_SUPPLIER_PRODUCTS,
  MASTER_PRODUCTS,
} from './src/data/multiSupplierData.js';
import {
  createAndMatchOrder,
  respondToOffer,
  checkAndProcessOfferTimeouts,
  updateOrderStage,
  initiatePayHeroPayment,
  handlePayHeroCallback,
  getOrderById,
  getAllOrders,
  getOffersForSupplier,
  getMatchingSessionByOrderId,
  subscribeToRealtimeEvents,
  recordDriverLocation,
  getDriverLocationForOrder,
} from './src/services/realtimeMatchingService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const PERSIST_FILE = path.join(__dirname, 'src', 'data', 'persistedZones.json');
const CUSTOMERS_PERSIST_FILE = path.join(__dirname, 'src', 'data', 'persistedCustomers.json');
const ADMIN_SECRET_TOKEN = 'admin_session_oohgas_2026_verified';
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin2026';

// In-memory zone state loaded from file or default
let deliveryZones: DeliveryZone[] = [];

// Server-side Phone OTP & Customer Account Store
interface ServerCustomerRecord {
  id: string;
  fullName: string;
  phoneNumber: string;
  e164Phone: string;
  email: string;
  passwordHash?: string;
  role: 'customer';
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

function hashServerPassword(password: string): string {
  return crypto.createHmac('sha256', 'oohgas-auth-v1').update(String(password)).digest('hex');
}

function sanitizeCustomer(record: ServerCustomerRecord): Omit<ServerCustomerRecord, 'passwordHash'> {
  const { passwordHash: _ignored, ...safeRecord } = record;
  return safeRecord;
}

interface PendingOtpChallenge {
  e164Phone: string;
  normalizedPhone: string;
  code: string;
  expiresAt: number;
  lastSentAt: number;
  attempts: number;
}

interface VerifiedPhoneToken {
  e164Phone: string;
  normalizedPhone: string;
  expiresAt: number;
}

const DEFAULT_SERVER_CUSTOMERS: ServerCustomerRecord[] = [
  {
    id: 'cust-wangari-mwangi-2026',
    fullName: 'Wangari Mwangi',
    phoneNumber: '+254 712 345 678',
    e164Phone: '+254712345678',
    email: 'wangari.mwangi@gmail.com',
    role: 'customer',
    isVerified: true,
    createdAt: '2026-01-15T08:00:00Z',
    updatedAt: '2026-10-15T08:00:00Z',
  },
];

let serverCustomers: ServerCustomerRecord[] = [];
const pendingOtpChallenges = new Map<string, PendingOtpChallenge>();
const verifiedPhoneTokens = new Map<string, VerifiedPhoneToken>();

function normalizeServerKenyanPhone(phone: string): { valid: boolean; e164Phone: string; normalizedPhone: string } {
  const digits = String(phone || '').replace(/\D/g, '');
  let localNine = '';

  if (digits.startsWith('254') && digits.length === 12) {
    localNine = digits.slice(3);
  } else if (digits.startsWith('0') && digits.length === 10) {
    localNine = digits.slice(1);
  } else if (digits.length === 9) {
    localNine = digits;
  }

  if (!/^(7|1)\d{8}$/.test(localNine)) {
    return { valid: false, e164Phone: '', normalizedPhone: '' };
  }

  return {
    valid: true,
    e164Phone: `+254${localNine}`,
    normalizedPhone: `+254 ${localNine.slice(0, 3)} ${localNine.slice(3, 6)} ${localNine.slice(6)}`,
  };
}

function loadServerCustomers(): void {
  try {
    if (fs.existsSync(CUSTOMERS_PERSIST_FILE)) {
      const raw = fs.readFileSync(CUSTOMERS_PERSIST_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        serverCustomers = parsed;
        return;
      }
    }
  } catch (err) {
    console.warn('[Auth DB] Failed reading persisted customers, using default:', err);
  }
  serverCustomers = [...DEFAULT_SERVER_CUSTOMERS];
  saveServerCustomers();
}

function saveServerCustomers(): void {
  try {
    fs.writeFileSync(CUSTOMERS_PERSIST_FILE, JSON.stringify(serverCustomers, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Auth DB] Failed persisting customer accounts:', err);
  }
}

function loadZones(): void {
  try {
    if (fs.existsSync(PERSIST_FILE)) {
      const raw = fs.readFileSync(PERSIST_FILE, 'utf-8');
      deliveryZones = JSON.parse(raw);
      console.log(`[Zones DB] Loaded ${deliveryZones.length} delivery zones from persistent storage.`);
      return;
    }
  } catch (err) {
    console.warn('[Zones DB] Failed reading persisted zones, using defaults:', err);
  }
  deliveryZones = JSON.parse(JSON.stringify(INITIAL_DELIVERY_ZONES));
  saveZones();
}

function saveZones(): void {
  try {
    fs.writeFileSync(PERSIST_FILE, JSON.stringify(deliveryZones, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Zones DB] Failed persisting delivery zones:', err);
  }
}

// Simple Admin Authorization Middleware
function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Admin authorization header required' });
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (token !== ADMIN_SECRET_TOKEN && token !== DEFAULT_ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Invalid admin credentials or expired session' });
  }
  next();
}

async function startServer() {
  loadZones();
  loadServerCustomers();

  const app = express();
  app.use(express.json());

  // ==========================================
  // Public Delivery Zone Endpoints
  // ==========================================

  // 1. Get all delivery zones
  app.get('/api/zones', (req: Request, res: Response) => {
    const activeOnly = req.query.activeOnly === 'true';
    const result = activeOnly ? deliveryZones.filter((z) => z.isActive) : deliveryZones;
    res.json(result);
  });

  // 2. Authoritative Server-Side Coverage Check
  app.post('/api/zones/check-coverage', (req: Request, res: Response) => {
    const { lat, lng } = req.body;

    if (
      typeof lat !== 'number' ||
      typeof lng !== 'number' ||
      !isFinite(lat) ||
      !isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return res.status(400).json({
        isCovered: false,
        error: 'Invalid coordinates provided. Latitude must be between -90 and 90, Longitude between -180 and 180.',
      });
    }

    const point = { lat, lng };

    // Check active zones
    const activeZones = deliveryZones.filter((z) => z.isActive);
    const matchedActiveZones = activeZones.filter((zone) => isPointInPolygon(point, zone.polygon));

    // Also check inactive zones for helpful diagnostic messaging
    const inactiveZones = deliveryZones.filter((z) => !z.isActive);
    const matchedInactiveZones = inactiveZones.filter((zone) => isPointInPolygon(point, zone.polygon));

    if (matchedActiveZones.length > 0) {
      const primaryZone = matchedActiveZones[0];

      // Resolve eligible suppliers from the matched active zone(s)
      const eligibleSuppliers: any[] = [];
      const supplierIdSet = new Set<string>();

      matchedActiveZones.forEach((zone) => {
        zone.suppliers.forEach((supConfig) => {
          if (!supplierIdSet.has(supConfig.supplierId)) {
            supplierIdSet.add(supConfig.supplierId);
            const baseSupplier = MOCK_SUPPLIERS.find((s) => s.id === supConfig.supplierId);
            if (baseSupplier) {
              eligibleSuppliers.push({
                ...baseSupplier,
                deliveryFee: supConfig.deliveryFee,
                deliveryTimeMin: supConfig.estimatedDeliveryMin,
                zoneConfig: supConfig,
              });
            }
          }
        });
      });

      const response: CoverageCheckResult = {
        isCovered: true,
        checkedAt: new Date().toISOString(),
        coordinates: point,
        matchedZones: matchedActiveZones,
        primaryZone,
        eligibleSuppliers,
        message: `Doorstep delivery is available! Your location is within the ${primaryZone.name}.`,
      };

      return res.json(response);
    }

    // Not in any active zone
    let message = 'Location is outside all active Ooh Gas delivery zones in Nairobi.';
    if (matchedInactiveZones.length > 0) {
      message = `This location falls within the ${matchedInactiveZones[0].name}, but this zone is currently marked inactive for maintenance.`;
    }

    const response: CoverageCheckResult = {
      isCovered: false,
      checkedAt: new Date().toISOString(),
      coordinates: point,
      matchedZones: [],
      eligibleSuppliers: [],
      message,
    };

    return res.json(response);
  });

  // 3. Authoritative Pre-Order Coverage & Availability Recheck
  app.post('/api/zones/validate-order', (req: Request, res: Response) => {
    const { lat, lng, cylinderSize, purchaseType, quantity, supplierId } = req.body;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ valid: false, error: 'Valid delivery coordinates are required.' });
    }

    const point = { lat, lng };
    const activeZones = deliveryZones.filter((z) => z.isActive);
    const matchedZones = activeZones.filter((z) => isPointInPolygon(point, z.polygon));

    if (matchedZones.length === 0) {
      return res.status(400).json({
        valid: false,
        error: 'Order rejected: Destination is outside of active delivery service coverage.',
      });
    }

    const primaryZone = matchedZones[0];

    // Find supplier
    const targetSupplierId = supplierId || primaryZone.suppliers[0]?.supplierId;
    const zoneSupplierConfig = primaryZone.suppliers.find((s) => s.supplierId === targetSupplierId);

    if (!zoneSupplierConfig) {
      return res.status(400).json({
        valid: false,
        error: `Order rejected: Selected supplier is not authorized to deliver in ${primaryZone.name}.`,
      });
    }

    const baseSupplier = MOCK_SUPPLIERS.find((s) => s.id === targetSupplierId);
    if (!baseSupplier) {
      return res.status(400).json({ valid: false, error: 'Supplier not found.' });
    }

    // Verify minimum order value
    const size = (cylinderSize || '13kg') as '6kg' | '13kg' | '29kg';
    const benchmark = MARKET_BENCHMARK_PRICES[size] || MARKET_BENCHMARK_PRICES['13kg'];
    const unitPrice = purchaseType === 'complete' ? benchmark.completePrice : benchmark.refillPrice;
    const orderTotal = unitPrice * (quantity || 1);

    if (orderTotal < zoneSupplierConfig.minOrderValue) {
      return res.status(400).json({
        valid: false,
        error: `Order value (KSh ${orderTotal}) is below the minimum order value of KSh ${zoneSupplierConfig.minOrderValue} for this zone.`,
      });
    }

    const response: OrderValidationResponse = {
      valid: true,
      zone: primaryZone,
      supplier: baseSupplier,
      deliveryFee: zoneSupplierConfig.deliveryFee,
      estimatedDeliveryMin: zoneSupplierConfig.estimatedDeliveryMin,
    };

    return res.json(response);
  });

  // ==========================================
  // Phase 1 Multi-Supplier Delivery Endpoints
  // ==========================================

  // 1. Get supported Kenyan towns
  app.get('/api/multisupplier/towns', (_req: Request, res: Response) => {
    res.json(KENYA_TOWNS);
  });

  // 2. Get registered supplier businesses
  app.get('/api/multisupplier/suppliers', (req: Request, res: Response) => {
    const townId = req.query.townId as string | undefined;
    const filtered = townId
      ? MULTI_SUPPLIER_BUSINESSES.filter((s) => s.primaryTownId === townId && s.status === 'active')
      : MULTI_SUPPLIER_BUSINESSES.filter((s) => s.status === 'active');
    res.json(filtered);
  });

  // 3. Multi-Supplier Authoritative Location & Overlapping Zones Search
  app.post('/api/multisupplier/check-coverage', (req: Request, res: Response) => {
    const { lat, lng, townId } = req.body;

    if (
      typeof lat !== 'number' ||
      typeof lng !== 'number' ||
      !isFinite(lat) ||
      !isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return res.status(400).json({
        isCovered: false,
        error: 'Invalid coordinates provided for spatial coverage check.',
      });
    }

    const point = { lat, lng };

    // Find all supplier-owned zones that contain this coordinate
    const matchingZones = MULTI_SUPPLIER_DELIVERY_ZONES.filter((zone) => {
      if (!zone.isActive) return false;
      if (townId && zone.townId !== townId) return false;
      return isPointInPolygon(point, zone.boundary);
    });

    if (matchingZones.length === 0) {
      return res.json({
        isCovered: false,
        coordinates: point,
        matchedCount: 0,
        suppliers: [],
        message: 'No independent suppliers currently have active delivery zones covering this coordinate.',
      });
    }

    const supplierMatches = matchingZones.map((zone) => {
      const supplier = MULTI_SUPPLIER_BUSINESSES.find(
        (s) => s.id === zone.supplierId && s.status === 'active'
      );
      const products = MULTI_SUPPLIER_PRODUCTS.filter(
        (sp) => sp.supplierId === zone.supplierId && sp.isAvailable
      ).map((sp) => {
        const product = MASTER_PRODUCTS.find((p) => p.id === sp.productId);
        return {
          ...sp,
          product,
        };
      });

      return {
        supplier,
        zone,
        products,
      };
    }).filter((m) => m.supplier !== undefined);

    return res.json({
      isCovered: supplierMatches.length > 0,
      coordinates: point,
      matchedCount: supplierMatches.length,
      suppliers: supplierMatches,
      message: `Found ${supplierMatches.length} LPG supplier(s) with active delivery coverage.`,
    });
  });

  // 4. Multi-Supplier Order Pre-Validation
  app.post('/api/multisupplier/validate-order', (req: Request, res: Response) => {
    const { lat, lng, supplierId, subtotal } = req.body;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ valid: false, error: 'Valid delivery coordinates are required.' });
    }
    if (!supplierId) {
      return res.status(400).json({ valid: false, error: 'Supplier ID is required.' });
    }

    const supplier = MULTI_SUPPLIER_BUSINESSES.find((s) => s.id === supplierId);
    if (!supplier) {
      return res.status(404).json({ valid: false, error: 'Supplier not found.' });
    }
    if (supplier.status !== 'active') {
      return res.status(400).json({ valid: false, error: 'Selected supplier is not currently accepting orders.' });
    }

    const point = { lat, lng };
    const supplierZones = MULTI_SUPPLIER_DELIVERY_ZONES.filter(
      (z) => z.supplierId === supplierId && z.isActive
    );
    const matchedZone = supplierZones.find((z) => isPointInPolygon(point, z.boundary));

    if (!matchedZone) {
      return res.status(400).json({
        valid: false,
        error: `Delivery location is outside ${supplier.tradeName}'s active service zone.`,
      });
    }

    const orderSubtotal = typeof subtotal === 'number' ? subtotal : 0;
    if (orderSubtotal < matchedZone.minOrderValue) {
      return res.status(400).json({
        valid: false,
        error: `Order subtotal (KSh ${orderSubtotal.toLocaleString()}) is below minimum order value of KSh ${matchedZone.minOrderValue.toLocaleString()} for this zone.`,
      });
    }

    return res.json({
      valid: true,
      supplier,
      zone: matchedZone,
      deliveryFee: matchedZone.baseDeliveryFee,
      estimatedDeliveryMin: matchedZone.estimatedDeliveryMin,
    });
  });

  // ==========================================
  // Real-Time Supplier Matching & Offer Workflow Endpoints
  // ==========================================

  // Periodically check and expire offers whose acceptance window has elapsed
  setInterval(() => {
    checkAndProcessOfferTimeouts().catch((err) =>
      console.warn('[Matching Service] Timeout worker warning:', err)
    );
  }, 2000);

  // 1. Server-Sent Events (SSE) Live Stream for Real-time Customer & Supplier Updates
  app.get('/api/realtime/stream', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Send initial handshake
    res.write(`data: ${JSON.stringify({ event: 'connected', timestamp: new Date().toISOString() })}\n\n`);

    const unsubscribe = subscribeToRealtimeEvents((eventData) => {
      res.write(`data: ${JSON.stringify(eventData)}\n\n`);
    });

    req.on('close', () => {
      unsubscribe();
      res.end();
    });
  });

  // 2. Authoritative Customer Order Creation & Server-side Matching Initiation
  app.post('/api/orders', async (req: Request, res: Response) => {
    try {
      const {
        customerId,
        customerName,
        phoneNumber,
        deliveryAddress,
        deliveryPoint,
        items,
        paymentMethod,
        timeoutSeconds,
      } = req.body;

      if (!customerName || !phoneNumber) {
        return res.status(400).json({ error: 'Customer name and contact phone number are required.' });
      }

      if (!deliveryPoint || typeof deliveryPoint.lat !== 'number' || typeof deliveryPoint.lng !== 'number') {
        return res.status(400).json({ error: 'Exact latitude and longitude are required for spatial matching.' });
      }

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'At least one LPG cylinder product item must be ordered.' });
      }

      const order = await createAndMatchOrder(
        {
          customerId: typeof customerId === 'string' && customerId.trim() ? customerId.trim() : undefined,
          customerName,
          phoneNumber,
          deliveryAddress: deliveryAddress || { street: 'Main Rd', estate: 'Kilimani' },
          deliveryPoint,
          items,
          paymentMethod: paymentMethod || 'payhero_mpesa',
        },
        typeof timeoutSeconds === 'number' ? timeoutSeconds : 45
      );

      res.status(201).json(order);
    } catch (err: any) {
      console.error('[Orders API] Order creation error:', err);
      res.status(400).json({ error: err.message || 'Failed creating and matching order.' });
    }
  });

  // 2.1 Customer-Specific Isolated Orders Endpoint (RLS-backed & server-filtered)
  app.get('/api/customer/orders', (req: Request, res: Response) => {
    const customerId = req.query.customerId as string;
    if (!customerId) {
      return res.status(400).json({ error: 'customerId query parameter is required.' });
    }
    const all = getAllOrders();
    const filtered = all.filter((o) => o.customerId === customerId);
    return res.json(filtered);
  });

  // 3. Get Order Details & Live Matching Status
  app.get('/api/orders/:id', (req: Request, res: Response) => {
    const order = getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    // Attach supplier info if assigned
    let supplierDetails = null;
    if (order.assignedSupplierId) {
      supplierDetails = MULTI_SUPPLIER_BUSINESSES.find((s) => s.id === order.assignedSupplierId);
    }

    res.json({
      ...order,
      supplier: supplierDetails,
    });
  });

  // 4. Get Matching Session Audit Details for Order
  app.get('/api/orders/:id/matching-status', (req: Request, res: Response) => {
    const session = getMatchingSessionByOrderId(req.params.id);
    const order = getOrderById(req.params.id);

    if (!session && !order) {
      return res.status(404).json({ error: 'Order matching session not found.' });
    }

    res.json({
      orderId: req.params.id,
      orderStatus: order?.status,
      session: session || null,
      currentOffer: session?.currentOffer || null,
      candidatesCount: session?.candidateCount || 0,
      candidates: session?.candidatesEvaluated || [],
    });
  });

  // 5. Customer Cancels Order
  app.post('/api/orders/:id/cancel', (req: Request, res: Response) => {
    const order = getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    if (order.status === 'DELIVERED') {
      return res.status(400).json({ error: 'Cannot cancel an order that has already been delivered.' });
    }

    const { reason } = req.body || {};
    order.status = 'CANCELLED';
    order.updatedAt = new Date().toISOString();

    res.json({ success: true, message: 'Order cancelled successfully.', order });
  });

  // 6. Supplier Dashboard: Fetch Pending Offers for Supplier
  app.get('/api/supplier/offers', (req: Request, res: Response) => {
    const supplierId = req.query.supplierId as string;
    if (!supplierId) {
      return res.status(400).json({ error: 'supplierId query parameter is required.' });
    }

    const offers = getOffersForSupplier(supplierId);
    // Enrich with order info
    const enriched = offers.map((offer) => {
      const order = getOrderById(offer.orderId);
      return {
        ...offer,
        order: order
          ? {
              orderNumber: order.orderNumber,
              customerName: order.customerName,
              deliveryAddress: order.deliveryAddress,
              items: order.items,
              subtotal: order.subtotal,
              status: order.status,
            }
          : null,
      };
    });

    res.json(enriched);
  });

  // 7. Supplier Responds to Offer (ACCEPT or REJECT)
  app.post('/api/supplier/offers/:offerId/respond', async (req: Request, res: Response) => {
    const { supplierId, action, reason } = req.body;

    if (!supplierId || !action) {
      return res.status(400).json({ error: 'supplierId and action (ACCEPT or REJECT) are required.' });
    }

    if (action !== 'ACCEPT' && action !== 'REJECT') {
      return res.status(400).json({ error: 'Action must be either ACCEPT or REJECT.' });
    }

    const result = await respondToOffer(req.params.offerId, supplierId, action, reason);
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  });

  // 8. Supplier Updates Order Delivery Lifecycle (PREPARING, OUT_FOR_DELIVERY, DELIVERED)
  app.post('/api/supplier/orders/:orderId/stage', (req: Request, res: Response) => {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'New order status is required.' });
    }

    const result = updateOrderStage(req.params.orderId, status);
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  });

  // 9. Admin View: Comprehensive Order Matching & Fulfillment Monitor
  app.get('/api/admin/orders', requireAdminAuth, (_req: Request, res: Response) => {
    const orders = getAllOrders().map((order) => {
      const session = getMatchingSessionByOrderId(order.orderId);
      const supplier = order.assignedSupplierId
        ? MULTI_SUPPLIER_BUSINESSES.find((s) => s.id === order.assignedSupplierId)
        : null;

      return {
        ...order,
        assignedSupplier: supplier,
        matchingSession: session,
      };
    });

    res.json({
      totalCount: orders.length,
      orders,
    });
  });

  // ==========================================
  // PayHero Payment Integration Endpoints
  // ==========================================

  // 10. Server-Side PayHero Lipa Na M-Pesa STK Push Initiation
  app.post('/api/payments/payhero/initiate', async (req: Request, res: Response) => {
    try {
      const { orderId, phoneNumber } = req.body;
      if (!orderId || !phoneNumber) {
        return res.status(400).json({ error: 'orderId and customer phoneNumber are required.' });
      }

      const result = await initiatePayHeroPayment(orderId, phoneNumber);
      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Payment initiation failed.' });
    }
  });

  // 11. PayHero Webhook Callback Endpoint
  app.post('/api/payments/payhero/callback', (req: Request, res: Response) => {
    const result = handlePayHeroCallback(req.body);
    res.json(result);
  });

  // 12. Authoritative Payment Status Check
  app.get('/api/payments/order/:orderId', (req: Request, res: Response) => {
    const order = getOrderById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    res.json({
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      paymentStatus: order.paymentStatus,
      receiptNumber: order.payheroReceipt || null,
      paymentMethod: order.paymentMethod,
    });
  });

  // ==========================================
  // Driver Live Tracking & Delivery Lifecycle Endpoints
  // ==========================================

  // Ingest driver real-time GPS location
  app.post('/api/driver/location', (req: Request, res: Response) => {
    const { driverId, orderId, latitude, longitude, accuracy, heading, speed } = req.body || {};

    if (!orderId || !driverId || typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({
        recorded: false,
        error: 'driverId, orderId, numeric latitude, and numeric longitude are required.',
      });
    }

    const result = recordDriverLocation({
      driverId,
      orderId,
      latitude,
      longitude,
      accuracy: typeof accuracy === 'number' ? accuracy : 10,
      heading: typeof heading === 'number' ? heading : undefined,
      speed: typeof speed === 'number' ? speed : undefined,
    });

    if (!result.recorded) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      ...result,
    });
  });

  // Query latest known driver location for order
  app.get('/api/driver/orders/:orderId/location', (req: Request, res: Response) => {
    const loc = getDriverLocationForOrder(req.params.orderId);
    if (!loc) {
      return res.status(404).json({ error: 'No live telemetry recorded yet for this order.' });
    }
    res.json(loc);
  });

  // Driver transitions delivery status
  app.post('/api/driver/orders/:orderId/status', (req: Request, res: Response) => {
    const { status, driverNotes } = req.body || {};
    if (!status) {
      return res.status(400).json({ error: 'Status is required.' });
    }

    const validStatuses = [
      'DRIVER_ASSIGNED',
      'DRIVER_HEADING_TO_SUPPLIER',
      'ORDER_PICKED_UP',
      'OUT_FOR_DELIVERY',
      'DRIVER_NEARBY',
      'DRIVER_ARRIVED',
      'DELIVERED',
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const result = updateOrderStage(req.params.orderId, status);
    res.json({ ...result, driverNotes });
  });

  // ==========================================
  // Phone & OTP Customer Authentication Endpoints
  // ==========================================

  app.get('/api/auth/phone-status', (req: Request, res: Response) => {
    const phone = String(req.query.phone || '');
    const parsed = normalizeServerKenyanPhone(phone);
    if (!parsed.valid) {
      return res.status(400).json({ valid: false, error: 'Enter a valid Kenyan mobile number (e.g. 0712 345 678).' });
    }
    const existing = serverCustomers.find((c) => c.e164Phone === parsed.e164Phone);
    res.json({
      valid: true,
      normalizedPhone: parsed.normalizedPhone,
      e164Phone: parsed.e164Phone,
      isReturningCustomer: Boolean(existing),
      customerFirstName: existing ? existing.fullName.split(' ')[0] : undefined,
    });
  });

  app.post('/api/auth/otp/request', (req: Request, res: Response) => {
    const { phoneNumber } = req.body || {};
    const parsed = normalizeServerKenyanPhone(phoneNumber);
    if (!parsed.valid) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid Kenyan mobile number (+254 7XX or 01XX).',
      });
    }

    const now = Date.now();
    const existingChallenge = pendingOtpChallenges.get(parsed.e164Phone);
    if (existingChallenge && now - existingChallenge.lastSentAt < 25000) {
      const waitSeconds = Math.ceil((25000 - (now - existingChallenge.lastSentAt)) / 1000);
      return res.status(429).json({
        success: false,
        error: `Please wait ${waitSeconds}s before requesting another verification code.`,
        retryAfterSeconds: waitSeconds,
      });
    }

    const code = String(crypto.randomInt(100000, 999999));
    pendingOtpChallenges.set(parsed.e164Phone, {
      e164Phone: parsed.e164Phone,
      normalizedPhone: parsed.normalizedPhone,
      code,
      expiresAt: now + 5 * 60 * 1000,
      lastSentAt: now,
      attempts: 0,
    });

    const existingCustomer = serverCustomers.find((c) => c.e164Phone === parsed.e164Phone);
    const hasExternalSmsProvider = Boolean(
      process.env.TWILIO_ACCOUNT_SID || process.env.AFRICASTALKING_API_KEY
    );

    if (!hasExternalSmsProvider) {
      console.log(`[Auth OTP] Dispatched OTP ${code} to ${parsed.normalizedPhone}`);
    }

    return res.json({
      success: true,
      normalizedPhone: parsed.normalizedPhone,
      e164Phone: parsed.e164Phone,
      isReturningCustomer: Boolean(existingCustomer),
      customerFirstName: existingCustomer ? existingCustomer.fullName.split(' ')[0] : undefined,
      resendCooldownSeconds: 30,
      channel: 'server_otp',
      ...(hasExternalSmsProvider ? {} : { verificationPreviewCode: code }),
    });
  });

  app.post('/api/auth/otp/verify', (req: Request, res: Response) => {
    const { phoneNumber, otpCode } = req.body || {};
    const parsed = normalizeServerKenyanPhone(phoneNumber);
    if (!parsed.valid) {
      return res.status(400).json({ verified: false, error: 'Invalid Kenyan phone number.' });
    }

    const cleanCode = String(otpCode || '').replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      return res.status(400).json({ verified: false, error: 'Please enter the 6-digit verification code.' });
    }

    const challenge = pendingOtpChallenges.get(parsed.e164Phone);
    if (!challenge) {
      return res.status(400).json({
        verified: false,
        error: 'Verification code expired or not found. Tap Resend OTP to get a new code.',
      });
    }

    if (Date.now() > challenge.expiresAt) {
      pendingOtpChallenges.delete(parsed.e164Phone);
      return res.status(400).json({
        verified: false,
        error: 'This code has expired. Please tap Resend OTP for a fresh code.',
      });
    }

    if (challenge.attempts >= 5) {
      pendingOtpChallenges.delete(parsed.e164Phone);
      return res.status(429).json({
        verified: false,
        error: 'Too many incorrect attempts. Please request a new OTP code.',
      });
    }

    if (challenge.code !== cleanCode) {
      challenge.attempts += 1;
      return res.status(400).json({
        verified: false,
        error: `Incorrect verification code. ${5 - challenge.attempts} attempt(s) remaining.`,
      });
    }

    pendingOtpChallenges.delete(parsed.e164Phone);

    const existingCustomer = serverCustomers.find((c) => c.e164Phone === parsed.e164Phone);
    if (existingCustomer) {
      return res.json({
        verified: true,
        isReturningCustomer: true,
        normalizedPhone: parsed.normalizedPhone,
        e164Phone: parsed.e164Phone,
        customer: sanitizeCustomer(existingCustomer),
      });
    }

    const verificationToken = crypto.randomBytes(24).toString('hex');
    verifiedPhoneTokens.set(verificationToken, {
      e164Phone: parsed.e164Phone,
      normalizedPhone: parsed.normalizedPhone,
      expiresAt: Date.now() + 15 * 60 * 1000,
    });

    return res.json({
      verified: true,
      isReturningCustomer: false,
      verificationToken,
      normalizedPhone: parsed.normalizedPhone,
      e164Phone: parsed.e164Phone,
    });
  });

  app.post('/api/auth/register-phone', (req: Request, res: Response) => {
    const { phoneNumber, verificationToken, fullName, email } = req.body || {};
    const parsed = normalizeServerKenyanPhone(phoneNumber);
    if (!parsed.valid) {
      return res.status(400).json({ error: 'Valid Kenyan phone number is required.' });
    }

    if (!fullName || String(fullName).trim().length < 2) {
      return res.status(400).json({ error: 'Please enter your full name.' });
    }

    const tokenRecord = verificationToken ? verifiedPhoneTokens.get(String(verificationToken)) : undefined;
    if (!tokenRecord || tokenRecord.e164Phone !== parsed.e164Phone || Date.now() > tokenRecord.expiresAt) {
      return res.status(401).json({
        error: 'Phone verification expired. Please verify your phone number again.',
      });
    }

    verifiedPhoneTokens.delete(String(verificationToken));

    const cleanEmail = email && String(email).trim().includes('@')
      ? String(email).trim().toLowerCase()
      : `${parsed.e164Phone.replace('+', '')}@customer.oohgas.ke`;

    const existingIdx = serverCustomers.findIndex((c) => c.e164Phone === parsed.e164Phone);
    const nowIso = new Date().toISOString();

    const record: ServerCustomerRecord = {
      id: existingIdx !== -1 ? serverCustomers[existingIdx].id : `cust-${crypto.randomUUID()}`,
      fullName: String(fullName).trim(),
      phoneNumber: parsed.normalizedPhone,
      e164Phone: parsed.e164Phone,
      email: cleanEmail,
      role: 'customer',
      isVerified: true,
      createdAt: existingIdx !== -1 ? serverCustomers[existingIdx].createdAt : nowIso,
      updatedAt: nowIso,
    };

    if (existingIdx !== -1) {
      serverCustomers[existingIdx] = record;
    } else {
      serverCustomers.push(record);
    }
    saveServerCustomers();

    return res.status(201).json({ customer: sanitizeCustomer(record) });
  });

  app.post('/api/auth/register-email', (req: Request, res: Response) => {
    const { firstName, lastName, phoneNumber, email, password } = req.body || {};
    const cleanFirst = String(firstName || '').trim();
    const cleanLast = String(lastName || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const parsedPhone = normalizeServerKenyanPhone(String(phoneNumber || ''));

    if (cleanFirst.length < 2) {
      return res.status(400).json({ error: 'First name must be at least 2 characters.' });
    }
    if (cleanLast.length < 2) {
      return res.status(400).json({ error: 'Last name must be at least 2 characters.' });
    }
    if (!parsedPhone.valid) {
      return res.status(400).json({ error: 'Please enter a valid Kenyan phone number (e.g. 712 345 678).' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (!password || String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const duplicateEmail = serverCustomers.find((c) => c.email.toLowerCase() === cleanEmail);
    if (duplicateEmail) {
      return res.status(409).json({
        error: 'An account with this email already exists. Please log in instead.',
      });
    }

    const duplicatePhone = serverCustomers.find((c) => c.e164Phone === parsedPhone.e164Phone);
    if (duplicatePhone) {
      return res.status(409).json({
        error: 'An account with this phone number already exists. Please log in instead.',
      });
    }

    const nowIso = new Date().toISOString();
    const record: ServerCustomerRecord = {
      id: `cust-${crypto.randomUUID()}`,
      fullName: `${cleanFirst} ${cleanLast}`.trim(),
      phoneNumber: parsedPhone.normalizedPhone,
      e164Phone: parsedPhone.e164Phone,
      email: cleanEmail,
      passwordHash: hashServerPassword(String(password)),
      role: 'customer',
      isVerified: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    serverCustomers.push(record);
    saveServerCustomers();

    return res.status(201).json({ customer: sanitizeCustomer(record) });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { phoneNumber, email, password } = req.body || {};
    const passStr = String(password || '');

    if (passStr.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    let existing: ServerCustomerRecord | undefined;
    if (phoneNumber && String(phoneNumber).trim()) {
      const parsed = normalizeServerKenyanPhone(String(phoneNumber));
      if (!parsed.valid) {
        return res.status(400).json({ error: 'Enter a valid Kenyan mobile number (+254 7XX or 01XX).' });
      }
      existing = serverCustomers.find((c) => c.e164Phone === parsed.e164Phone);
    } else if (email && String(email).includes('@')) {
      const cleanEmail = String(email).trim().toLowerCase();
      existing = serverCustomers.find((c) => c.email.toLowerCase() === cleanEmail);
    } else {
      return res.status(400).json({ error: 'Please enter a valid Kenyan phone number.' });
    }

    if (!existing) {
      return res.status(404).json({
        error: 'No account found for this phone number. Tap Create account below to register.',
      });
    }

    if (existing.passwordHash && existing.passwordHash !== hashServerPassword(passStr)) {
      return res.status(401).json({
        error: 'Incorrect password. Please check your password and try again.',
      });
    }

    return res.json({ customer: sanitizeCustomer(existing) });
  });

  app.post('/api/auth/google', (req: Request, res: Response) => {
    const { email, fullName } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanName = String(fullName || '').trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'Valid Google email address is required.' });
    }
    if (cleanName.length < 2) {
      return res.status(400).json({ error: 'Google account display name is required.' });
    }

    const existingIdx = serverCustomers.findIndex((c) => c.email.toLowerCase() === cleanEmail);
    const nowIso = new Date().toISOString();

    if (existingIdx !== -1) {
      serverCustomers[existingIdx].updatedAt = nowIso;
      if (!serverCustomers[existingIdx].fullName) {
        serverCustomers[existingIdx].fullName = cleanName;
      }
      saveServerCustomers();
      return res.json({ customer: sanitizeCustomer(serverCustomers[existingIdx]), isNewCustomer: false });
    }

    const record: ServerCustomerRecord = {
      id: `cust-${crypto.randomUUID()}`,
      fullName: cleanName,
      phoneNumber: '',
      e164Phone: '',
      email: cleanEmail,
      role: 'customer',
      isVerified: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    serverCustomers.push(record);
    saveServerCustomers();

    return res.status(201).json({ customer: sanitizeCustomer(record), isNewCustomer: true });
  });

  // ==========================================
  // Protected Admin Management Endpoints
  // ==========================================

  // Admin login / token exchange
  app.post('/api/admin/login', (req: Request, res: Response) => {
    const { password } = req.body;
    if (password === DEFAULT_ADMIN_PASSWORD || password === 'admin2026') {
      return res.json({
        success: true,
        token: ADMIN_SECRET_TOKEN,
        expiresIn: '24h',
      });
    }
    return res.status(401).json({ success: false, error: 'Invalid administrator password' });
  });

  // Create new delivery zone
  app.post('/api/admin/zones', requireAdminAuth, (req: Request, res: Response) => {
    const { name, description, color, isActive, polygon, suppliers } = req.body;

    if (!name || !polygon || !Array.isArray(polygon) || polygon.length < 3) {
      return res.status(400).json({
        error: 'Zone name and a polygon with at least 3 coordinate vertices are required.',
      });
    }

    const newZone: DeliveryZone = {
      id: `zone-${Date.now()}`,
      name: name.trim(),
      description: (description || '').trim(),
      color: color || '#10b981',
      isActive: isActive !== false,
      polygon,
      suppliers: Array.isArray(suppliers) ? suppliers : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    deliveryZones.push(newZone);
    saveZones();
    res.status(201).json(newZone);
  });

  // Update existing zone
  app.put('/api/admin/zones/:id', requireAdminAuth, (req: Request, res: Response) => {
    const { id } = req.params;
    const index = deliveryZones.findIndex((z) => z.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Delivery zone not found' });
    }

    const existing = deliveryZones[index];
    const { name, description, color, isActive, polygon, suppliers } = req.body;

    if (polygon && (!Array.isArray(polygon) || polygon.length < 3)) {
      return res.status(400).json({ error: 'Polygon must contain at least 3 vertices' });
    }

    deliveryZones[index] = {
      ...existing,
      name: name !== undefined ? name.trim() : existing.name,
      description: description !== undefined ? description.trim() : existing.description,
      color: color || existing.color,
      isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      polygon: polygon || existing.polygon,
      suppliers: suppliers !== undefined ? suppliers : existing.suppliers,
      updatedAt: new Date().toISOString(),
    };

    saveZones();
    res.json(deliveryZones[index]);
  });

  // Fast toggle active/inactive status
  app.patch('/api/admin/zones/:id/toggle', requireAdminAuth, (req: Request, res: Response) => {
    const { id } = req.params;
    const zone = deliveryZones.find((z) => z.id === id);
    if (!zone) {
      return res.status(404).json({ error: 'Delivery zone not found' });
    }

    zone.isActive = !zone.isActive;
    zone.updatedAt = new Date().toISOString();
    saveZones();
    res.json(zone);
  });

  // Delete delivery zone
  app.delete('/api/admin/zones/:id', requireAdminAuth, (req: Request, res: Response) => {
    const { id } = req.params;
    const initialLen = deliveryZones.length;
    deliveryZones = deliveryZones.filter((z) => z.id !== id);

    if (deliveryZones.length === initialLen) {
      return res.status(404).json({ error: 'Delivery zone not found' });
    }

    saveZones();
    res.json({ success: true, message: 'Zone deleted successfully' });
  });

  // Reset to default zones
  app.post('/api/admin/zones/reset-defaults', requireAdminAuth, (req: Request, res: Response) => {
    deliveryZones = JSON.parse(JSON.stringify(INITIAL_DELIVERY_ZONES));
    saveZones();
    res.json({ success: true, count: deliveryZones.length, zones: deliveryZones });
  });

  // ==========================================
  // Vite SPA Frontend Integration
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Ooh Gas] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Ooh Gas] Server startup failed:', err);
  process.exit(1);
});
