/**
 * Automated Verification Test Suite for Ooh Gas Real-Time Supplier Matching,
 * Sequential Waterfall Offer System, Transactional Locking & Delivery Workflow (Phase 2)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  rankEligibleSuppliers,
  createAndMatchOrder,
  respondToOffer,
  checkAndProcessOfferTimeouts,
  getOrderById,
  getAllOrders,
  getOffersForSupplier,
  getMatchingSessionByOrderId,
  initiatePayHeroPayment,
  recordDriverLocation,
  DEFAULT_RANKING_WEIGHTS,
  MatchingOrderPayload,
} from '../src/services/realtimeMatchingService.js';
import {
  MULTI_SUPPLIER_BUSINESSES,
  MULTI_SUPPLIER_DELIVERY_ZONES,
  MULTI_SUPPLIER_PRODUCTS,
  MASTER_PRODUCTS,
} from '../src/data/multiSupplierData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedTests++;
  }
}

async function runTests() {
  console.log('\n=============================================================================');
  console.log('--- Ooh Gas Phase 2: Real-Time Supplier Matching & Delivery Workflow Tests ---');
  console.log('=============================================================================\n');

  // -----------------------------------------------------------------------------
  // Test Group 1: SQL Migration Integrity & Database Schema Completeness
  // -----------------------------------------------------------------------------
  console.log('Test Group 1: PostgreSQL & PostGIS Phase 2 Migration Validation');
  const migrationPath = path.join(
    __dirname,
    '..',
    'supabase',
    'migrations',
    '20261015_realtime_matching_workflow.sql'
  );
  assert(fs.existsSync(migrationPath), 'Phase 2 migration file exists');

  const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

  const requiredTables = [
    'supplier_order_offers',
    'order_matching_sessions',
    'driver_locations',
  ];

  requiredTables.forEach((table) => {
    assert(
      migrationSql.includes(`public.${table}`) || migrationSql.includes(table),
      `Migration creates table '${table}'`
    );
  });

  const requiredStates = [
    'matching_supplier',
    'supplier_offered',
    'supplier_accepted',
    'supplier_rejected',
    'no_supplier_available',
  ];

  requiredStates.forEach((st) => {
    assert(migrationSql.includes(`'${st}'`), `Migration contains order status '${st}'`);
  });

  assert(
    migrationSql.includes('rank_eligible_suppliers_for_order'),
    'RPC function rank_eligible_suppliers_for_order is defined'
  );
  assert(
    migrationSql.includes('accept_supplier_offer') && migrationSql.includes('FOR UPDATE'),
    'RPC function accept_supplier_offer is defined with FOR UPDATE row locking'
  );
  assert(
    migrationSql.includes('driver_locations') && migrationSql.includes('GEOMETRY(Point, 4326)'),
    'PostGIS driver_locations table is defined with Point(4326) geometry'
  );
  assert(
    migrationSql.includes('ENABLE ROW LEVEL SECURITY'),
    'Row Level Security (RLS) is enabled for offers, sessions, and driver locations'
  );
  assert(
    migrationSql.includes('ALTER PUBLICATION supabase_realtime'),
    'Supabase Realtime publications configured for live streaming'
  );

  // -----------------------------------------------------------------------------
  // Test Group 2: Multi-Criteria Ranking Algorithm & PostGIS Spatial Isolation
  // -----------------------------------------------------------------------------
  console.log('\nTest Group 2: Server-Side Supplier Eligibility & Multi-Criteria Ranking');

  const kilimaniCustomer = {
    lat: -1.2921,
    lng: 36.7856,
  };

  const kGasRefill = MASTER_PRODUCTS.find((p) => p.brand === 'K-Gas' && p.cylinderSize === '13kg')!;

  const testPayload: MatchingOrderPayload = {
    orderId: 'test-order-1',
    orderNumber: 'OG-TEST1',
    customerId: 'cust-1',
    customerName: 'Amina Odhiambo',
    phoneNumber: '+254712345678',
    deliveryAddress: { street: 'Argwings Kodhek', estate: 'Kilimani' },
    deliveryPoint: kilimaniCustomer,
    items: [{ productId: kGasRefill.id, brand: 'K-Gas', cylinderSize: '13kg', purchaseType: 'refill', quantity: 1 }],
    subtotal: 2850,
    paymentMethod: 'mpesa',
  };

  const rankedCandidates = rankEligibleSuppliers(testPayload, DEFAULT_RANKING_WEIGHTS);

  assert(rankedCandidates.length >= 2, `Found multiple eligible ranked suppliers for Kilimani (${rankedCandidates.length} found)`);

  if (rankedCandidates.length >= 2) {
    assert(
      rankedCandidates[0].compositeScore >= rankedCandidates[1].compositeScore,
      `Candidate #1 score (${rankedCandidates[0].compositeScore.toFixed(3)}) >= Candidate #2 score (${rankedCandidates[1].compositeScore.toFixed(3)})`
    );
  }

  const topCandidate = rankedCandidates[0];
  const topSupplier = MULTI_SUPPLIER_BUSINESSES.find((s) => s.id === topCandidate.supplierId)!;
  assert(
    topSupplier.primaryTownId === 'nairobi',
    `Top ranked supplier (${topSupplier.tradeName}) belongs to customer town`
  );
  assert(
    topCandidate.minStockCushion > 0,
    `Top ranked supplier has revalidated sufficient stock on backend (${topCandidate.minStockCushion} units)`
  );
  assert(
    topCandidate.deliveryFee !== undefined,
    `Top ranked supplier has backend-verified delivery fee: KSh ${topCandidate.deliveryFee}`
  );

  // Out of bounds location (Mount Kenya: -0.1521, 37.3084)
  const outOfBoundsCustomer = { lat: -0.1521, lng: 37.3084 };
  const outOfBoundsPayload: MatchingOrderPayload = {
    ...testPayload,
    deliveryPoint: outOfBoundsCustomer,
  };
  const emptyCandidates = rankEligibleSuppliers(outOfBoundsPayload, DEFAULT_RANKING_WEIGHTS);
  assert(
    emptyCandidates.length === 0,
    'Locations outside all active delivery zones correctly yield zero eligible suppliers'
  );

  // Quantity exceeding stock
  const hugeOrderPayload: MatchingOrderPayload = {
    ...testPayload,
    items: [{ productId: kGasRefill.id, brand: 'K-Gas', cylinderSize: '13kg', purchaseType: 'refill', quantity: 99999 }],
  };
  const hugeOrderCandidates = rankEligibleSuppliers(hugeOrderPayload, DEFAULT_RANKING_WEIGHTS);
  assert(
    hugeOrderCandidates.length === 0,
    'Orders exceeding available supplier inventory are rejected on backend'
  );

  // -----------------------------------------------------------------------------
  // Test Group 3: Sequential Waterfall Offer System & State Transitions
  // -----------------------------------------------------------------------------
  console.log('\nTest Group 3: Sequential Offer Waterfall & Order State Lifecycle');

  const testOrder = await createAndMatchOrder({
    customerName: 'Amina Odhiambo',
    phoneNumber: '+254712345678',
    deliveryAddress: {
      street: 'Argwings Kodhek Road',
      building: 'Silver Oak Court',
      unitNumber: 'A4',
      estate: 'Kilimani',
      notes: 'Gate buzzer 104',
    },
    deliveryPoint: kilimaniCustomer,
    items: [{ productId: kGasRefill.id, purchaseType: 'refill', quantity: 1 }],
    paymentMethod: 'mpesa',
  }, 45);

  assert(testOrder.orderId.startsWith('ord-'), `Order successfully created with ID: ${testOrder.orderId}`);
  assert(
    testOrder.status === 'SUPPLIER_OFFERED',
    `Initial order status is SUPPLIER_OFFERED (was ${testOrder.status})`
  );
  assert(testOrder.matchingSession !== undefined, 'Matching session initialized on order');
  assert(
    testOrder.matchingSession?.candidateCount === rankedCandidates.length,
    `Matching session registered all ${rankedCandidates.length} eligible candidates`
  );

  const initialOffer = testOrder.matchingSession?.currentOffer;
  assert(initialOffer !== undefined, 'Active offer generated for Rank #1 candidate');
  assert(initialOffer?.rank === 1, 'Initial offer is offered strictly to Rank #1 candidate');
  assert(initialOffer?.status === 'offered', 'Offer status is offered');

  // Test Case 3b: Supplier #1 Rejection triggers automatic waterfall advancement to Supplier #2
  console.log('  Testing Waterfall: Simulating Supplier #1 Declining Order...');
  const declineRes = await respondToOffer(
    initialOffer!.id,
    initialOffer!.supplierId,
    'REJECT',
    'All delivery motorbikes currently on route'
  );

  assert(declineRes.success === true, 'Supplier rejection successfully registered');

  const orderAfterDecline = getOrderById(testOrder.orderId)!;
  assert(
    orderAfterDecline.status === 'SUPPLIER_OFFERED',
    'Order status remains SUPPLIER_OFFERED as waterfall advances to Candidate #2'
  );

  const sessionAfterDecline = getMatchingSessionByOrderId(orderAfterDecline.orderId)!;
  assert(
    sessionAfterDecline.currentOffer?.rank === 2,
    `Matching session current offer advanced to Rank 2 (was ${sessionAfterDecline.currentOffer?.rank})`
  );
  assert(
    sessionAfterDecline.currentOffer?.supplierId !== initialOffer?.supplierId,
    'Next offer is assigned to a different supplier in coverage zone'
  );

  // Test Case 3c: Supplier #2 Accepts the Order (Transactional Lock)
  console.log('  Testing Acceptance: Supplier #2 Accepts Order...');
  const activeOffer = sessionAfterDecline.currentOffer!;
  const acceptRes = await respondToOffer(
    activeOffer.id,
    activeOffer.supplierId,
    'ACCEPT'
  );

  assert(acceptRes.success === true, 'Supplier acceptance succeeded');

  const orderAfterAccept = getOrderById(testOrder.orderId)!;
  assert(
    orderAfterAccept.status === 'SUPPLIER_ACCEPTED',
    `Order status transitioned to SUPPLIER_ACCEPTED (is: ${orderAfterAccept.status})`
  );
  assert(
    orderAfterAccept.assignedSupplierId === activeOffer.supplierId,
    'Order locked in with accepted supplier ID'
  );

  // Test Case 3d: Concurrency guard - prevent rejected supplier or late claim
  const lateAcceptRes = await respondToOffer(
    initialOffer!.id,
    initialOffer!.supplierId,
    'ACCEPT'
  );
  assert(
    lateAcceptRes.success === false,
    'Concurrent/late claim on an expired or non-active offer is strictly rejected'
  );

  // -----------------------------------------------------------------------------
  // Test Group 4: "NO_SUPPLIER_AVAILABLE" Waterfall Exhaustion
  // -----------------------------------------------------------------------------
  console.log('\nTest Group 4: Full Waterfall Exhaustion to NO_SUPPLIER_AVAILABLE');

  const exhaustionOrder = await createAndMatchOrder({
    customerName: 'Juma Mwangi',
    phoneNumber: '+254799887766',
    deliveryAddress: {
      street: 'Ngong Road',
      estate: 'Kilimani',
    },
    deliveryPoint: kilimaniCustomer,
    items: [{ productId: kGasRefill.id, purchaseType: 'refill', quantity: 1 }],
    paymentMethod: 'mpesa',
  }, 1);

  let currentOrderState = exhaustionOrder;
  let safetyCounter = 0;

  while (
    currentOrderState.status === 'SUPPLIER_OFFERED' &&
    currentOrderState.currentOfferId &&
    safetyCounter < 10
  ) {
    safetyCounter++;
    const sess = getMatchingSessionByOrderId(currentOrderState.orderId);
    const offer = sess?.currentOffer;
    if (!offer) break;
    await respondToOffer(offer.id, offer.supplierId, 'REJECT', 'Depot closed for stock take');
    currentOrderState = getOrderById(currentOrderState.orderId)!;
  }

  assert(
    currentOrderState.status === 'NO_SUPPLIER_AVAILABLE',
    `Order correctly reached NO_SUPPLIER_AVAILABLE when all candidates decline (status: ${currentOrderState.status})`
  );

  // -----------------------------------------------------------------------------
  // Test Group 5: PayHero Kenya Payment Integration & Telemetry Validation
  // -----------------------------------------------------------------------------
  console.log('\nTest Group 5: PayHero Payment Processing & Driver Telemetry');

  const payheroRes = await initiatePayHeroPayment(
    testOrder.orderId,
    '+254712345678'
  );

  assert(payheroRes.success === true, 'PayHero STK push successfully dispatched server-side');
  assert(
    !!payheroRes.checkoutRequestId && payheroRes.checkoutRequestId.toLowerCase().startsWith('ph-'),
    `PayHero checkout reference generated: ${payheroRes.checkoutRequestId}`
  );

  // Driver telemetry location ingestion
  const validGps = recordDriverLocation({
    driverId: 'drv-nairobi-01',
    orderId: testOrder.orderId,
    latitude: -1.2930,
    longitude: 36.7860,
    accuracy: 8.5,
    heading: 145,
    speed: 28.4,
  });

  assert(validGps.recorded === true, 'Valid GPS telemetry recorded (<15m accuracy)');

  const inaccurateGps = recordDriverLocation({
    driverId: 'drv-nairobi-01',
    orderId: testOrder.orderId,
    latitude: -1.2930,
    longitude: 36.7860,
    accuracy: 150.0, // poor accuracy > 100m
    heading: 145,
    speed: 28.4,
  });

  assert(
    inaccurateGps.recorded === false,
    'Inaccurate GPS coordinates (>100m) are filtered out to prevent jumping map markers'
  );

  // -----------------------------------------------------------------------------
  // Final Test Summary
  // -----------------------------------------------------------------------------
  console.log('\n=============================================================================');
  console.log(`Phase 2 Automated Verification Completed: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('=============================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
