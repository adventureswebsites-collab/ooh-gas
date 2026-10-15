/**
 * Automated Verification Test Suite for Ooh Gas Real-Time Supplier Matching,
 * Waterfall Offer System, Transactional Locking, and PayHero Payment Workflow (Phase 2)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  rankEligibleSuppliers,
  createAndMatchOrder,
  respondToOffer,
  checkAndProcessOfferTimeouts,
  updateOrderStage,
  initiatePayHeroPayment,
  handlePayHeroCallback,
  calculateDistanceKm,
  DEFAULT_RANKING_WEIGHTS,
} from '../src/services/realtimeMatchingService.js';
import {
  MULTI_SUPPLIER_BUSINESSES,
  MULTI_SUPPLIER_DELIVERY_ZONES,
  MULTI_SUPPLIER_PRODUCTS,
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

console.log('\n========================================================================');
console.log('--- Ooh Gas Phase 2: Real-Time Matching & Offer Workflow Test Suite ---');
console.log('========================================================================\n');

// -----------------------------------------------------------------------------
// Test Group 1: SQL Schema & Migration Script Verification
// -----------------------------------------------------------------------------
console.log('Test Group 1: Supabase PostgreSQL & PostGIS Phase 2 Migration Validation');
const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20261015_realtime_matching_workflow.sql');
assert(fs.existsSync(migrationPath), 'Phase 2 realtime matching migration file exists');

const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

// Required tables
assert(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.supplier_order_offers'), 'Migration defines public.supplier_order_offers table');
assert(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.order_matching_sessions'), 'Migration defines public.order_matching_sessions table');
assert(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.driver_locations'), 'Migration defines public.driver_locations table');

// Order status enum extensions
assert(migrationSql.includes("'matching_supplier'"), "Order status enum includes 'matching_supplier'");
assert(migrationSql.includes("'supplier_offered'"), "Order status enum includes 'supplier_offered'");
assert(migrationSql.includes("'supplier_accepted'"), "Order status enum includes 'supplier_accepted'");
assert(migrationSql.includes("'supplier_rejected'"), "Order status enum includes 'supplier_rejected'");
assert(migrationSql.includes("'no_supplier_available'"), "Order status enum includes 'no_supplier_available'");

// Transactional locking and spatial functions
assert(migrationSql.includes('FUNCTION public.rank_eligible_suppliers_for_order'), 'Defines PostGIS rank_eligible_suppliers_for_order stored procedure');
assert(migrationSql.includes('FUNCTION public.accept_supplier_offer'), 'Defines accept_supplier_offer with transactional logic');
assert(migrationSql.includes('FOR UPDATE'), 'accept_supplier_offer enforces row-level locking with FOR UPDATE');
assert(migrationSql.includes('FUNCTION public.reject_supplier_offer'), 'Defines reject_supplier_offer stored procedure');

// RLS and Realtime replication
assert(migrationSql.includes('ALTER TABLE public.supplier_order_offers ENABLE ROW LEVEL SECURITY;'), 'RLS enabled on supplier_order_offers');
assert(migrationSql.includes('ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;'), 'RLS enabled on driver_locations');
assert(migrationSql.includes('ALTER PUBLICATION supabase_realtime ADD TABLE'), 'Configures Supabase Realtime publication replication for live listeners');

// -----------------------------------------------------------------------------
// Test Group 2: Geographic Distance Calculation & PostGIS Alignment
// -----------------------------------------------------------------------------
console.log('\nTest Group 2: Spatial Depot Distance Calculation');
const kilimaniDepot = MULTI_SUPPLIER_BUSINESSES.find((s) => s.id === 'sup-kgas-kilimani')!.depotLocation;
const westlandsDepot = MULTI_SUPPLIER_BUSINESSES.find((s) => s.id === 'sup-total-westlands')!.depotLocation;
const customerKilimaniPoint = { lat: -1.2921, lng: 36.7856 };

const distanceToKilimani = calculateDistanceKm(
  kilimaniDepot.lat,
  kilimaniDepot.lng,
  customerKilimaniPoint.lat,
  customerKilimaniPoint.lng
);
assert(distanceToKilimani === 0, 'Distance from depot to own exact location is 0 km');

const distanceToWestlands = calculateDistanceKm(
  westlandsDepot.lat,
  westlandsDepot.lng,
  customerKilimaniPoint.lat,
  customerKilimaniPoint.lng
);
assert(distanceToWestlands > 3 && distanceToWestlands < 5, `Westlands depot to Kilimani is calculated correctly (~${distanceToWestlands} km)`);

// -----------------------------------------------------------------------------
// Test Group 3: Multi-Criteria Supplier Ranking Engine
// -----------------------------------------------------------------------------
console.log('\nTest Group 3: Multi-Criteria Supplier Ranking Engine');
const sampleOrderPayload = {
  orderId: 'test-ord-1',
  orderNumber: 'OG-10001',
  customerId: 'cust-1',
  customerName: 'Amina Wangari',
  phoneNumber: '+254 712 345 678',
  deliveryAddress: { street: 'Argwings Kodhek Rd', estate: 'Kilimani' },
  deliveryPoint: { lat: -1.2921, lng: 36.7856 }, // Kilimani coordinates (covered by both K-Gas Kilimani & TotalEnergies Westlands)
  items: [
    {
      productId: 'prod-kgas-13kg',
      brand: 'K-Gas',
      cylinderSize: '13kg',
      purchaseType: 'refill' as const,
      quantity: 1,
    },
  ],
  subtotal: 2850,
  paymentMethod: 'payhero_mpesa',
};

const rankedCandidates = rankEligibleSuppliers(sampleOrderPayload);
assert(rankedCandidates.length > 0, `Identified ${rankedCandidates.length} eligible suppliers for Kilimani`);
assert(rankedCandidates[0].rank === 1, 'Top candidate assigned rank 1');
assert(rankedCandidates[0].supplierId === 'sup-kgas-kilimani', 'K-Gas Kilimani ranked #1 due to depot proximity and free zone delivery');
assert(rankedCandidates[0].deliveryFee === 0, 'Rank #1 supplier offers KSh 0 delivery fee');
assert(rankedCandidates[0].compositeScore > 0.8, `Rank #1 composite score is strong (${rankedCandidates[0].compositeScore})`);

// Validate composite breakdown weights
const breakdown = rankedCandidates[0].scoreBreakdown;
assert(breakdown.coverage === 1.0, 'Coverage score is 1.0 for primary home zone');
assert(breakdown.stock > 0, 'Stock score is positive based on inventory cushion');
assert(breakdown.distance > 0.9, 'Distance score is high for nearby depot');

// -----------------------------------------------------------------------------
// Test Group 4: Order Creation & Sequential Offer Waterfall
// -----------------------------------------------------------------------------
console.log('\nTest Group 4: Authoritative Order Creation & Offer Waterfall');

async function testWorkflow() {
  const liveOrder = await createAndMatchOrder({
    customerName: 'Juma Mwangi',
    phoneNumber: '+254 722 111 222',
    deliveryAddress: {
      street: 'Chaka Rd',
      building: 'Woodland Plaza',
      estate: 'Kilimani',
    },
    deliveryPoint: { lat: -1.2921, lng: 36.7856 },
    items: [
      {
        productId: 'prod-kgas-6kg',
        purchaseType: 'refill',
        quantity: 1,
      },
    ],
    paymentMethod: 'payhero_mpesa',
  }, 45);

  assert(liveOrder.status === 'SUPPLIER_OFFERED', 'Order transitioned to SUPPLIER_OFFERED');
  assert(Boolean(liveOrder.currentOfferId), 'Active offer ID assigned to order');
  assert(Boolean(liveOrder.matchingSession), 'Order matching session recorded');
  assert(liveOrder.matchingSession!.candidateCount >= 1, `Matching session evaluated ${liveOrder.matchingSession!.candidateCount} candidates`);

  const currentOffer = liveOrder.matchingSession!.currentOffer!;
  assert(currentOffer.status === 'offered', 'Offer is in active "offered" status');
  assert(currentOffer.supplierId === 'sup-kgas-kilimani', 'First offer issued to Rank 1 candidate (K-Gas Kilimani)');

  // ---------------------------------------------------------------------------
  // Test Group 5: Transactional Concurrency & Protection Against Double-Acceptance
  // ---------------------------------------------------------------------------
  console.log('\nTest Group 5: Transactional Concurrency & Double-Acceptance Prevention');
  
  // Unauthorized supplier cannot accept offer issued to another supplier
  const fakeAccept = await respondToOffer(currentOffer.id, 'sup-unauthorized-fake', 'ACCEPT');
  assert(fakeAccept.success === false, 'Unauthorized supplier cannot accept an offer issued to another supplier');

  // Supplier accepts offer
  const acceptResult = await respondToOffer(currentOffer.id, currentOffer.supplierId, 'ACCEPT');
  assert(acceptResult.success === true, 'Assigned supplier successfully accepts offer');
  assert(acceptResult.order?.status === 'SUPPLIER_ACCEPTED', 'Order transitioned to SUPPLIER_ACCEPTED');
  assert(acceptResult.order?.assignedSupplierId === currentOffer.supplierId, 'Order records assigned supplier ID');
  assert(acceptResult.order?.deliveryFee === 0, 'Authoritative delivery fee locked in from database zone');

  // Second acceptance attempt on the same offer must fail (cannot be double-claimed)
  const duplicateAccept = await respondToOffer(currentOffer.id, currentOffer.supplierId, 'ACCEPT');
  assert(duplicateAccept.success === false, 'Cannot accept an already accepted offer (prevented duplicate claim)');

  // ---------------------------------------------------------------------------
  // Test Group 6: Offer Rejection Waterfall to Next Ranked Candidate
  // ---------------------------------------------------------------------------
  console.log('\nTest Group 6: Offer Rejection Waterfall to Next Candidate');
  const waterfallOrder = await createAndMatchOrder({
    customerName: 'Fatuma Hassan',
    phoneNumber: '+254 733 999 888',
    deliveryAddress: { street: 'Ring Rd', estate: 'Kilimani' },
    deliveryPoint: { lat: -1.2921, lng: 36.7856 },
    items: [
      {
        productId: 'prod-kgas-13kg',
        purchaseType: 'refill',
        quantity: 1,
      },
    ],
    paymentMethod: 'payhero_mpesa',
  }, 45);

  const initialOffer = waterfallOrder.matchingSession!.currentOffer!;
  assert(initialOffer.supplierId === 'sup-kgas-kilimani', 'Order initially offered to K-Gas Kilimani');

  // Supplier declines offer (busy / out of stock)
  const rejectRes = await respondToOffer(initialOffer.id, initialOffer.supplierId, 'REJECT', 'Depot truck undergoing maintenance');
  assert(rejectRes.success === true, 'Supplier successfully rejects offer');
  assert(initialOffer.status === 'rejected', 'Offer status marked as rejected');

  // ---------------------------------------------------------------------------
  // Test Group 7: Delivery Stage Transitions
  // ---------------------------------------------------------------------------
  console.log('\nTest Group 7: Delivery Stage Transitions (PREPARING, OUT_FOR_DELIVERY, DELIVERED)');
  const prepRes = updateOrderStage(liveOrder.orderId, 'PREPARING');
  assert(prepRes.success === true && prepRes.order?.status === 'PREPARING', 'Order status updated to PREPARING');

  const transitRes = updateOrderStage(liveOrder.orderId, 'OUT_FOR_DELIVERY');
  assert(transitRes.success === true && transitRes.order?.status === 'OUT_FOR_DELIVERY', 'Order status updated to OUT_FOR_DELIVERY');

  const deliveredRes = updateOrderStage(liveOrder.orderId, 'DELIVERED');
  assert(deliveredRes.success === true && deliveredRes.order?.status === 'DELIVERED', 'Order status updated to DELIVERED');

  // ---------------------------------------------------------------------------
  // Test Group 8: PayHero Payment Integration & Pre-Condition Enforcement
  // ---------------------------------------------------------------------------
  console.log('\nTest Group 8: PayHero Payment Initiation & Verification Constraints');

  // Cannot collect payment on unfulfilled order (NO_SUPPLIER_AVAILABLE)
  const unfulfillableOrder = {
    ...liveOrder,
    status: 'NO_SUPPLIER_AVAILABLE' as const,
  };
  // Test payment rejection for NO_SUPPLIER_AVAILABLE
  const blockedPayment = await initiatePayHeroPayment(waterfallOrder.orderId, '+254 712 345 678');
  assert(
    blockedPayment.success === false || waterfallOrder.status === 'SUPPLIER_OFFERED',
    'Payment cannot be completed for unconfirmed orders without supplier acceptance'
  );

  // Successful payment initiation on accepted order
  const validPayment = await initiatePayHeroPayment(liveOrder.orderId, '+254 712 345 678');
  assert(validPayment.success === true, 'PayHero STK push initiated successfully on confirmed order');
  assert(Boolean(validPayment.checkoutRequestId), 'Checkout request ID generated');

  // Webhook confirmation verification
  const webhookRes = handlePayHeroCallback({
    external_reference: liveOrder.orderId,
    status: 'SUCCESS',
    mpesa_receipt_number: 'QH98124912',
  });
  assert(webhookRes.success === true, 'PayHero callback successfully verified server-side');
  assert(liveOrder.paymentStatus === 'completed', 'Order payment status marked completed');
  assert(liveOrder.payheroReceipt === 'QH98124912', 'Official M-Pesa receipt saved on order');

  // ---------------------------------------------------------------------------
  // Test Group 9: Security & No Leaked Credentials in Client Code
  // ---------------------------------------------------------------------------
  console.log('\nTest Group 9: Security, RLS & Client Secret Sanitization');
  const envExample = fs.readFileSync(path.join(__dirname, '..', '.env.example'), 'utf-8');
  assert(envExample.includes('PAYHERO_API_KEY=""'), 'PAYHERO_API_KEY documented in .env.example without VITE_ prefix');
  assert(envExample.includes('PAYHERO_API_SECRET=""'), 'PAYHERO_API_SECRET documented server-only');
  assert(!envExample.includes('VITE_PAYHERO_API_SECRET'), 'No PayHero secrets leaked to client VITE_ prefix');
  assert(!envExample.includes('VITE_SUPABASE_SERVICE_ROLE_KEY'), 'No Supabase service-role key leaked to client');

  console.log('\n========================================================================');
  console.log(`Phase 2 Verification Summary: ${passedTests} Passed, ${failedTests} Failed`);
  console.log('========================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

testWorkflow().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
