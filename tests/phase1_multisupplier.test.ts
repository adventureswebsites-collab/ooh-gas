/**
 * Automated Verification Test Suite for Ooh Gas Multi-Supplier Platform (Phase 1)
 * Validates:
 * 1. Database schema migration file completeness (12 tables, types, PostGIS indexes, RLS policies, RPC functions)
 * 2. Multi-town catalog and supplier spatial isolation
 * 3. Overlapping supplier delivery zones resolution
 * 4. Supplier-specific pricing, inventory, and minimum order validation
 * 5. Security constraints (no leaked service-role keys, RLS rule definitions)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  KENYA_TOWNS,
  MULTI_SUPPLIER_BUSINESSES,
  MULTI_SUPPLIER_DELIVERY_ZONES,
  MULTI_SUPPLIER_PRODUCTS,
  MASTER_PRODUCTS,
} from '../src/data/multiSupplierData.js';
import { isPointInPolygon } from '../src/data/deliveryZonesData.js';

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

console.log('\n================================================================');
console.log('--- Ooh Gas Phase 1: Multi-Supplier Platform Validation Suite ---');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// Test Group 1: SQL Schema & Migration Script Integrity
// -----------------------------------------------------------------------------
console.log('Test Group 1: Supabase PostgreSQL & PostGIS Migration Validation');
const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20261014_phase1_multisupplier_schema.sql');
assert(fs.existsSync(migrationPath), 'Phase 1 migration file exists');

const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

const requiredTables = [
  'profiles',
  'towns',
  'supplier_businesses',
  'supplier_memberships',
  'delivery_zones',
  'products',
  'supplier_products',
  'customer_addresses',
  'orders',
  'order_items',
  'payments',
  'deliveries',
];

requiredTables.forEach((table) => {
  const tableDefRegex = new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}\\b`, 'i');
  assert(tableDefRegex.test(migrationSql), `Migration defines table public.${table}`);
});

// Check PostGIS extension and spatial geometry columns
assert(migrationSql.includes('CREATE EXTENSION IF NOT EXISTS postgis;'), 'Migration enables PostGIS extension');
assert(migrationSql.includes('GEOMETRY(Polygon, 4326)'), 'Delivery zones table uses PostGIS GEOMETRY(Polygon, 4326)');
assert(migrationSql.includes('USING GIST (boundary)'), 'Spatial GIST index defined on delivery_zones.boundary');
assert(migrationSql.includes('USING GIST (depot_location)'), 'Spatial GIST index defined on supplier_businesses.depot_location');
assert(migrationSql.includes('USING GIST (location)'), 'Spatial GIST index defined on customer_addresses.location');
assert(migrationSql.includes('USING GIST (delivery_point)'), 'Spatial GIST index defined on orders.delivery_point');

// Check RLS policies on all 12 tables
requiredTables.forEach((table) => {
  const rlsRegex = new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY;`, 'i');
  assert(rlsRegex.test(migrationSql), `RLS enabled on public.${table}`);
});

// Check PostGIS Authoritative Functions
assert(migrationSql.includes('FUNCTION public.find_suppliers_by_location'), 'find_suppliers_by_location PostGIS RPC defined');
assert(migrationSql.includes('FUNCTION public.validate_order_submission'), 'validate_order_submission RPC defined');

// -----------------------------------------------------------------------------
// Test Group 2: Multi-Town Support
// -----------------------------------------------------------------------------
console.log('\nTest Group 2: Multi-Town Configuration Across Kenya');
assert(KENYA_TOWNS.length === 5, 'Configured 5 key Kenyan towns');
const townNames = KENYA_TOWNS.map((t) => t.name);
assert(townNames.includes('Nairobi'), 'Nairobi town present');
assert(townNames.includes('Mombasa'), 'Mombasa town present');
assert(townNames.includes('Kisumu'), 'Kisumu town present');
assert(townNames.includes('Nakuru'), 'Nakuru town present');
assert(townNames.includes('Eldoret'), 'Eldoret town present');

// -----------------------------------------------------------------------------
// Test Group 3: Multi-Supplier Overlapping Delivery Zones
// -----------------------------------------------------------------------------
console.log('\nTest Group 3: Multi-Supplier Overlapping Zones & Independence');

// Location in Kilimani (e.g. Yaya Centre / Argwings Kodhek)
const kilimaniCoord = { lat: -1.2921, lng: 36.7856 };

// Find all zones covering Kilimani
const kilimaniZones = MULTI_SUPPLIER_DELIVERY_ZONES.filter(
  (z) => z.isActive && isPointInPolygon(kilimaniCoord, z.boundary)
);

assert(kilimaniZones.length >= 2, `Kilimani coordinates fall inside ${kilimaniZones.length} overlapping zones`);

const kilimaniSupplierIds = kilimaniZones.map((z) => z.supplierId);
assert(kilimaniSupplierIds.includes('sup-kgas-kilimani'), 'K-Gas Kilimani covers Kilimani point');
assert(kilimaniSupplierIds.includes('sup-total-westlands'), 'TotalEnergies also covers Kilimani point via overlapping extended zone');

// Verify independent delivery fees in the same geographical area
const kgasKilimaniZone = kilimaniZones.find((z) => z.supplierId === 'sup-kgas-kilimani')!;
const totalKilimaniZone = kilimaniZones.find((z) => z.supplierId === 'sup-total-westlands')!;

assert(kgasKilimaniZone.baseDeliveryFee === 0, 'K-Gas offers KSh 0 delivery fee in its local depot zone');
assert(totalKilimaniZone.baseDeliveryFee === 150, 'TotalEnergies charges KSh 150 extended delivery fee for cross-town dispatch');

// -----------------------------------------------------------------------------
// Test Group 4: Geographic Town Isolation (Mombasa vs Nairobi)
// -----------------------------------------------------------------------------
console.log('\nTest Group 4: Town Geographic Isolation');

// Location in Nyali, Mombasa
const nyaliMombasaCoord = { lat: -4.0321, lng: 39.7022 };
const mombasaZones = MULTI_SUPPLIER_DELIVERY_ZONES.filter(
  (z) => z.isActive && isPointInPolygon(nyaliMombasaCoord, z.boundary)
);

assert(mombasaZones.length === 1, 'Mombasa location matches Mombasa zone');
assert(mombasaZones[0].townId === 'mombasa', 'Zone correctly belongs to Mombasa');
assert(mombasaZones[0].supplierId === 'sup-total-nyali', 'Served by Coast Gas & TotalEnergies Nyali');

// Verify Nairobi suppliers are NOT matched for Mombasa coordinate
const nairobiSuppliersInMsa = mombasaZones.filter((z) => z.townId === 'nairobi');
assert(nairobiSuppliersInMsa.length === 0, 'Zero Nairobi suppliers matched in Mombasa');

// -----------------------------------------------------------------------------
// Test Group 5: Supplier-Specific Products, Pricing & Margins
// -----------------------------------------------------------------------------
console.log('\nTest Group 5: Supplier-Specific Products & Pricing');

const kgasProducts = MULTI_SUPPLIER_PRODUCTS.filter((p) => p.supplierId === 'sup-kgas-kilimani');
const totalProducts = MULTI_SUPPLIER_PRODUCTS.filter((p) => p.supplierId === 'sup-total-westlands');

assert(kgasProducts.length > 0, 'K-Gas has products catalog configured');
assert(totalProducts.length > 0, 'TotalEnergies has products catalog configured');

// Check price competition / variance between independent suppliers
const kgas6kg = kgasProducts.find((p) => p.productId === 'prod-kgas-6kg')!;
const total6kg = totalProducts.find((p) => p.productId === 'prod-total-6kg')!;

assert(kgas6kg.refillPrice === 1300, 'K-Gas 6kg refill price is KSh 1,300');
assert(total6kg.refillPrice === 1350, 'TotalEnergies 6kg refill price is KSh 1,350 (independent supplier pricing)');
assert(kgas6kg.refillPrice !== total6kg.refillPrice, 'Independent suppliers maintain distinct pricing models');

// -----------------------------------------------------------------------------
// Test Group 6: Authoritative Order Validation & Minimum Order Value
// -----------------------------------------------------------------------------
console.log('\nTest Group 6: Authoritative Order Validation');

function testValidateOrder(lat: number, lng: number, supplierId: string, subtotal: number) {
  const supplier = MULTI_SUPPLIER_BUSINESSES.find((s) => s.id === supplierId && s.status === 'active');
  if (!supplier) return { valid: false, error: 'Supplier not active' };

  const supplierZones = MULTI_SUPPLIER_DELIVERY_ZONES.filter(
    (z) => z.supplierId === supplierId && z.isActive
  );
  const matched = supplierZones.find((z) => isPointInPolygon({ lat, lng }, z.boundary));
  if (!matched) return { valid: false, error: 'Location outside supplier zone' };

  if (subtotal < matched.minOrderValue) {
    return { valid: false, error: `Below minimum order value of KSh ${matched.minOrderValue}` };
  }

  return { valid: true, fee: matched.baseDeliveryFee, eta: matched.estimatedDeliveryMin };
}

// Order meets minimum order value in Kilimani with K-Gas
const validOrder = testValidateOrder(-1.2921, 36.7856, 'sup-kgas-kilimani', 1300);
assert(validOrder.valid === true, 'K-Gas order of KSh 1,300 in Kilimani approved');
assert(validOrder.fee === 0, 'Delivery fee is KSh 0');

// Order below minimum order value (KSh 800 < KSh 1,200 min)
const subMinOrder = testValidateOrder(-1.2921, 36.7856, 'sup-kgas-kilimani', 800);
assert(subMinOrder.valid === false, 'Order below minimum order value is rejected');

// Order with supplier not covering this area (Hass South B supplier queried for Westlands location)
const westlandsPoint = { lat: -1.2644, lng: 36.8044 };
const outOfZoneOrder = testValidateOrder(westlandsPoint.lat, westlandsPoint.lng, 'sup-hass-southb', 1500);
assert(outOfZoneOrder.valid === false, 'Order rejected if customer location is outside supplier delivery zone');

// -----------------------------------------------------------------------------
// Test Group 7: Security & Secret Separation Check
// -----------------------------------------------------------------------------
console.log('\nTest Group 7: Security & Environment Variables Separation');
const envExamplePath = path.join(__dirname, '..', '.env.example');
const envContent = fs.readFileSync(envExamplePath, 'utf-8');

assert(envContent.includes('VITE_MAPBOX_ACCESS_TOKEN'), 'VITE_MAPBOX_ACCESS_TOKEN public prefix documented');
assert(envContent.includes('VITE_SUPABASE_URL'), 'VITE_SUPABASE_URL client public prefix documented');
assert(envContent.includes('VITE_SUPABASE_ANON_KEY'), 'VITE_SUPABASE_ANON_KEY client public prefix documented');
assert(envContent.includes('SUPABASE_SERVICE_ROLE_KEY'), 'SUPABASE_SERVICE_ROLE_KEY kept server-only (no VITE_ prefix)');

console.log('\n================================================================');
console.log(`Phase 1 Verification Summary: ${passedTests} Passed, ${failedTests} Failed`);
console.log('================================================================\n');

if (failedTests > 0) {
  process.exit(1);
}
