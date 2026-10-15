/**
 * Automated Verification Test for Ooh Gas Delivery Zones
 * Tests authoritative spatial point-in-polygon algorithm, supplier eligibility,
 * active/inactive status enforcement, and order pre-validation rules.
 */

import { INITIAL_DELIVERY_ZONES, isPointInPolygon } from '../src/data/deliveryZonesData.js';
import { MOCK_SUPPLIERS, MARKET_BENCHMARK_PRICES } from '../src/data/mockData.js';
import { DeliveryZone, CoverageCheckResult, OrderValidationResponse } from '../src/types/index.js';

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

console.log('\n======================================================');
console.log('--- Ooh Gas Delivery Zones Spatial & Policy Tests ---');
console.log('======================================================\n');

// 1. Point in Active Zone Test (Kilimani - Yaya Centre)
console.log('Test 1: Pinned location in Kilimani active zone');
const kilimaniPoint = { lat: -1.2921, lng: 36.7856 };
const kilimaniZone = INITIAL_DELIVERY_ZONES.find((z) => z.id === 'zone-kilimani')!;
const inKilimani = isPointInPolygon(kilimaniPoint, kilimaniZone.polygon);
assert(inKilimani === true, 'Coordinates (-1.2921, 36.7856) fall inside Kilimani & Hurlingham polygon');
assert(kilimaniZone.isActive === true, 'Kilimani zone is active');
assert(kilimaniZone.suppliers.length === 3, 'Kilimani zone has 3 assigned suppliers');

// 2. Point in Active Zone Test (Westlands - Sarit Centre)
console.log('\nTest 2: Pinned location in Westlands active zone');
const westlandsPoint = { lat: -1.2644, lng: 36.8044 };
const westlandsZone = INITIAL_DELIVERY_ZONES.find((z) => z.id === 'zone-westlands')!;
const inWestlands = isPointInPolygon(westlandsPoint, westlandsZone.polygon);
assert(inWestlands === true, 'Coordinates (-1.2644, 36.8044) fall inside Westlands & Parklands polygon');
assert(westlandsZone.isActive === true, 'Westlands zone is active');

// 3. Point in Inactive Zone Test (South B - Mombasa Road)
console.log('\nTest 3: Point inside an Inactive Zone (South B)');
const southBPoint = { lat: -1.3122, lng: 36.8322 };
const southBZone = INITIAL_DELIVERY_ZONES.find((z) => z.id === 'zone-south-b')!;
const inSouthB = isPointInPolygon(southBPoint, southBZone.polygon);
assert(inSouthB === true, 'Coordinates (-1.3122, 36.8322) physically fall inside South B polygon');
assert(southBZone.isActive === false, 'South B zone is marked inactive');

// Verify that an active coverage check correctly rejects South B
const activeZones = INITIAL_DELIVERY_ZONES.filter((z) => z.isActive);
const activeMatchForSouthB = activeZones.filter((z) => isPointInPolygon(southBPoint, z.polygon));
assert(activeMatchForSouthB.length === 0, 'Inactive zone is excluded from active coverage matches');

// 4. Point Completely Outside Coverage (Thika / Nairobi outskirts)
console.log('\nTest 4: Location outside all service zones (Thika / outskirts)');
const thikaPoint = { lat: -1.0333, lng: 37.0667 };
const allMatchesThika = INITIAL_DELIVERY_ZONES.filter((z) => isPointInPolygon(thikaPoint, z.polygon));
assert(allMatchesThika.length === 0, 'Out-of-coverage coordinates match 0 zones');

// 5. Multi-Supplier Eligibility & Zone-Specific Delivery Fees
console.log('\nTest 5: Supplier-specific fees and eligibility');
const kilimaniKGas = kilimaniZone.suppliers.find((s) => s.supplierId === 'k-gas-hub');
assert(kilimaniKGas !== undefined, 'K-Gas is assigned to Kilimani');
assert(kilimaniKGas?.deliveryFee === 0, 'K-Gas doorstep delivery is KSh 0 in its home zone');

const westlandsTotal = westlandsZone.suppliers.find((s) => s.supplierId === 'total-energies-station');
assert(westlandsTotal !== undefined, 'TotalEnergies is assigned to Westlands');
assert(westlandsTotal?.deliveryFee === 120, 'TotalEnergies delivery fee is KSh 120 in Westlands');

// 6. Ray-casting Bounding Box Fast Rejection
console.log('\nTest 6: Ray-casting bounding box optimization');
const farawayPoint = { lat: 10.0, lng: 50.0 };
const fastRejection = isPointInPolygon(farawayPoint, kilimaniZone.polygon);
assert(fastRejection === false, 'Extreme out-of-bounds coordinates rejected instantly');

// 7. Backend Order Pre-Validation Logic
console.log('\nTest 7: Order pre-validation policy check');
function mockValidateOrder(lat: number, lng: number, supplierId: string, orderTotal: number) {
  const matched = activeZones.filter((z) => isPointInPolygon({ lat, lng }, z.polygon));
  if (matched.length === 0) return { valid: false, error: 'Destination outside coverage' };

  const z = matched[0];
  const config = z.suppliers.find((s) => s.supplierId === supplierId);
  if (!config) return { valid: false, error: 'Supplier not authorized in this zone' };

  if (orderTotal < config.minOrderValue) {
    return { valid: false, error: `Below minimum order value of KSh ${config.minOrderValue}` };
  }
  return { valid: true, fee: config.deliveryFee };
}

// Valid order
const validOrderRes = mockValidateOrder(-1.2921, 36.7856, 'k-gas-hub', 1300);
assert(validOrderRes.valid === true, 'Valid order in Kilimani with KSh 1,300 is approved');

// Order outside zone
const invalidLocationOrder = mockValidateOrder(-1.0333, 37.0667, 'k-gas-hub', 1300);
assert(invalidLocationOrder.valid === false, 'Order in Thika rejected for coverage');

// Order below min order value (e.g. KSh 500 when min is 1300)
const belowMinOrder = mockValidateOrder(-1.2921, 36.7856, 'k-gas-hub', 500);
assert(belowMinOrder.valid === false, 'Order below minimum order value is rejected');

// Order with unassigned supplier
const unassignedOrder = mockValidateOrder(-1.2644, 36.8044, 'k-gas-hub', 1300);
assert(unassignedOrder.valid === false, 'Order rejected if supplier is not assigned to that zone');

console.log('\n======================================================');
console.log(`Results: ${passedTests} Passed, ${failedTests} Failed`);
console.log('======================================================\n');

if (failedTests > 0) {
  process.exit(1);
}
