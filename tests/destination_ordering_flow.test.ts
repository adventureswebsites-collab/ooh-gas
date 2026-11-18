import assert from 'node:assert';
import {
  filterQualifiedSuppliers,
  findNearestDeliveryDepots,
  haversineDistanceKm,
} from '../src/services/supplierMatchingService';
import { MOCK_SUPPLIERS, NAIROBI_LOCATIONS } from '../src/data/mockData';
import { INITIAL_DELIVERY_ZONES } from '../src/data/deliveryZonesData';
import { checkDeliveryCoverage } from '../src/services/deliveryZoneService';
import { searchPlaces, reverseGeocode } from '../src/services/mapboxService';
import { CoverageCheckResult, Supplier } from '../src/types';

async function runTests() {
  console.log('Running Destination-First Ordering Flow tests...');

  // 1. Test Haversine Distance Calculation
  const kilimani = NAIROBI_LOCATIONS[0];
  const westlands = NAIROBI_LOCATIONS[1];
  const distKm = haversineDistanceKm(kilimani.coordinates, westlands.coordinates);
  assert.ok(distKm > 2 && distKm < 6, `Kilimani to Westlands should be ~3-4km, got ${distKm}km`);
  console.log('✓ Haversine distance verified:', distKm, 'km');

  // 2. Test Out-of-Zone Rejection (NEVER selects suppliers based only on raw distance!)
  const outOfZoneLocation = {
    id: 'machakos',
    name: 'Machakos Junction',
    area: 'Mombasa Highway',
    details: 'Outside Nairobi zones',
    coordinates: { lat: -1.48, lng: 37.05 },
  };
  const outCoverage = await checkDeliveryCoverage(
    outOfZoneLocation.coordinates.lat,
    outOfZoneLocation.coordinates.lng,
    INITIAL_DELIVERY_ZONES
  );
  assert.strictEqual(outCoverage.isCovered, false, 'Out-of-zone location should not be covered');

  const outMatch = filterQualifiedSuppliers({
    suppliers: MOCK_SUPPLIERS,
    coverageResult: outCoverage,
    destination: outOfZoneLocation,
    selectedSize: '13kg',
    purchaseType: 'refill',
    brandPreference: 'Any',
  });
  assert.strictEqual(outMatch.isCovered, false);
  assert.strictEqual(outMatch.qualifiedSuppliers.length, 0, 'Must return 0 suppliers when destination is out of zone');
  assert.strictEqual(outMatch.emptyReason, 'out_of_zone');
  console.log('✓ Out-of-zone location properly rejected (0 suppliers returned regardless of proximity)');

  // 3. Test Product Stock Availability Check (22.5kg where Shell Gas has inStock: false)
  const kilimaniCoverage = await checkDeliveryCoverage(
    kilimani.coordinates.lat,
    kilimani.coordinates.lng,
    INITIAL_DELIVERY_ZONES
  );
  assert.strictEqual(kilimaniCoverage.isCovered, true, 'Kilimani must be covered');

  const match22_5 = filterQualifiedSuppliers({
    suppliers: MOCK_SUPPLIERS,
    coverageResult: kilimaniCoverage,
    destination: kilimani,
    selectedSize: '22.5kg',
    purchaseType: 'refill',
    brandPreference: 'Any',
  });
  assert.strictEqual(match22_5.isCovered, true);
  assert.ok(
    match22_5.qualifiedSuppliers.every((s) => s.id !== 'shell-gas-point'),
    'Shell Gas Hub has 22.5kg out of stock and must be excluded'
  );
  assert.ok(
    match22_5.qualifiedSuppliers.some((s) => s.id === 'k-gas-hub'),
    'K-Gas Kilimani Depot stocks 22.5kg and must be included'
  );
  console.log('✓ Stock availability filtering excluded out-of-stock 22.5kg supplier');

  // 4. Test Closed Depot Filtering even inside Covered Zone
  const closedSuppliers: Supplier[] = kilimaniCoverage.eligibleSuppliers.map((s) => ({
    ...s,
    isOpen: false,
  }));
  const closedCoverage: CoverageCheckResult = {
    ...kilimaniCoverage,
    eligibleSuppliers: closedSuppliers as any,
  };
  const closedResult = filterQualifiedSuppliers({
    suppliers: closedSuppliers,
    coverageResult: closedCoverage,
    destination: kilimani,
    selectedSize: '13kg',
    purchaseType: 'refill',
    brandPreference: 'Any',
  });
  assert.strictEqual(closedResult.qualifiedSuppliers.length, 0);
  assert.strictEqual(closedResult.emptyReason, 'closed');
  console.log('✓ Closed depots strictly excluded from available suppliers');

  // 5. Test Brand Preference Priority & Pricing Accuracy (Refill vs Exchange/Complete)
  const shellPrefMatch = filterQualifiedSuppliers({
    suppliers: MOCK_SUPPLIERS,
    coverageResult: kilimaniCoverage,
    destination: kilimani,
    selectedSize: '13kg',
    purchaseType: 'complete',
    brandPreference: 'Shell Gas',
  });
  assert.strictEqual(shellPrefMatch.qualifiedSuppliers[0].brand, 'Shell Gas');
  assert.strictEqual(shellPrefMatch.qualifiedSuppliers[0].unitPriceForSelection, 8490);
  console.log('✓ Brand preference & complete/exchange cylinder pricing verified');

  // 6. Test Geocoding Fallback Autocomplete & Reverse Geocoding without Mapbox token
  const searchHits = await searchPlaces('Yaya Centre', { lat: -1.2921, lng: 36.7856 }, '');
  assert.ok(searchHits.length >= 1, 'Should return Nairobi autocomplete matches even without Mapbox token');
  assert.ok(searchHits[0].name.toLowerCase().includes('yaya'));

  const rev = await reverseGeocode(36.7875, -1.2929, '');
  assert.ok(rev.name.toLowerCase().includes('yaya') || rev.area.toLowerCase().includes('kilimani'));
  console.log('✓ Offline/fallback Nairobi autocomplete & reverse geocoding verified:', rev.name);

  // 7. Test Nearby Gas Station / Delivery Depot Discovery for Map Pinning
  const nearbyKilimani = findNearestDeliveryDepots({
    destination: kilimani,
    coverageResult: kilimaniCoverage,
    suppliers: MOCK_SUPPLIERS,
  });
  assert.strictEqual(nearbyKilimani.found, true);
  assert.ok(nearbyKilimani.primaryDepot, 'Should return nearest primary depot for Kilimani');
  assert.ok(
    nearbyKilimani.nearbyDepots[0].calculatedDistanceKm <=
      nearbyKilimani.nearbyDepots[nearbyKilimani.nearbyDepots.length - 1].calculatedDistanceKm,
    'Nearby depots must be sorted closest-first for direct map pinning'
  );

  const nearbyOut = findNearestDeliveryDepots({
    destination: outOfZoneLocation,
    coverageResult: outCoverage,
    suppliers: MOCK_SUPPLIERS,
  });
  assert.strictEqual(nearbyOut.found, false);
  assert.strictEqual(nearbyOut.primaryDepot, null);
  console.log(
    '✓ Nearby depot discovery verified (pinned nearest:',
    nearbyKilimani.primaryDepot?.name,
    'at',
    nearbyKilimani.primaryDepot?.calculatedDistanceKm,
    'km)'
  );

  console.log('\nALL DESTINATION-FIRST ORDERING FLOW TESTS PASSED!');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
