import {
  CoverageCheckResult,
  CylinderSize,
  GasBrand,
  NairobiLocation,
  PurchaseType,
  Supplier,
} from '../types';
import { MARKET_BENCHMARK_PRICES } from '../data/mockData';

export interface QualifiedSupplierResult extends Supplier {
  calculatedDistanceKm: number;
  unitPriceForSelection: number;
  matchesSelectedBrand: boolean;
  hasProductInStock: boolean;
  matchedZoneName?: string;
}

export interface SupplierMatchingSummary {
  isCovered: boolean;
  qualifiedSuppliers: QualifiedSupplierResult[];
  exactBrandCount: number;
  alternativeBrandCount: number;
  emptyReason?: 'out_of_zone' | 'out_of_stock' | 'closed';
  message: string;
}

/**
 * Great-circle Haversine distance in kilometers between two lat/lng coordinates.
 */
export function haversineDistanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const x =
    sinDLat * sinDLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinDLng *
      sinDLng;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)) * 10) / 10;
}

/**
 * Selects suppliers for Step 4 ("Find Gas Suppliers"):
 * 1. NEVER selects based solely on raw distance.
 * 2. Requires active delivery zone coverage to the customer's confirmed destination.
 * 3. Requires the depot to be open AND have the selected cylinder size in stock.
 * 4. Ranks exact brand matches first, followed by delivery time & real distance.
 */
export function filterQualifiedSuppliers(params: {
  suppliers: Supplier[];
  coverageResult: CoverageCheckResult | null;
  destination: NairobiLocation;
  selectedSize: CylinderSize;
  purchaseType: PurchaseType;
  brandPreference: GasBrand;
}): SupplierMatchingSummary {
  const {
    suppliers,
    coverageResult,
    destination,
    selectedSize,
    purchaseType,
    brandPreference,
  } = params;

  // 1. Check geographical zone service coverage first
  if (coverageResult && !coverageResult.isCovered) {
    return {
      isCovered: false,
      qualifiedSuppliers: [],
      exactBrandCount: 0,
      alternativeBrandCount: 0,
      emptyReason: 'out_of_zone',
      message:
        coverageResult.message ||
        'This delivery pin is outside our active Nairobi delivery zones. Move your pin into an active area to view serving depots.',
    };
  }

  // Only inspect suppliers registered for this destination zone when coverageResult is available
  const zoneEligiblePool: Supplier[] =
    coverageResult && coverageResult.eligibleSuppliers.length > 0
      ? coverageResult.eligibleSuppliers
      : suppliers;

  // 2. Enforce open depot status AND product stock availability for selectedSize
  const openInZone = zoneEligiblePool.filter((shop) => shop.isOpen);
  if (openInZone.length === 0) {
    return {
      isCovered: true,
      qualifiedSuppliers: [],
      exactBrandCount: 0,
      alternativeBrandCount: 0,
      emptyReason: 'closed',
      message: 'All depots serving this area are currently closed. Try scheduling for morning delivery.',
    };
  }

  const stockedInZone = openInZone.filter((shop) => {
    const cyl = shop.cylinders.find((c) => c.size === selectedSize);
    return Boolean(cyl && cyl.inStock !== false);
  });

  if (stockedInZone.length === 0) {
    return {
      isCovered: true,
      qualifiedSuppliers: [],
      exactBrandCount: 0,
      alternativeBrandCount: 0,
      emptyReason: 'out_of_stock',
      message: `No depot serving ${destination.name.split(',')[0]} currently has ${selectedSize} cylinders in stock. Try selecting 6kg or 13kg.`,
    };
  }

  // 3. Enrich with real Haversine distance to confirmed destination & exact selection price
  const enriched: QualifiedSupplierResult[] = stockedInZone.map((shop) => {
    const cyl = shop.cylinders.find((c) => c.size === selectedSize);
    const benchmark = MARKET_BENCHMARK_PRICES[selectedSize];
    const unitPrice = cyl
      ? purchaseType === 'refill'
        ? cyl.refillPrice
        : cyl.completePrice
      : purchaseType === 'refill'
        ? benchmark.refillPrice
        : benchmark.completePrice;

    const calculatedDistanceKm = shop.coordinates
      ? haversineDistanceKm(destination.coordinates, shop.coordinates)
      : shop.distanceKm;

    const matchesSelectedBrand =
      brandPreference === 'Any' || shop.brand === brandPreference;

    return {
      ...shop,
      distanceKm: calculatedDistanceKm,
      calculatedDistanceKm,
      unitPriceForSelection: unitPrice,
      matchesSelectedBrand,
      hasProductInStock: true,
      matchedZoneName: coverageResult?.primaryZone?.name,
    };
  });

  // 4. Prioritize exact brand match, then delivery fee, then distance
  const sorted = enriched.sort((a, b) => {
    if (a.matchesSelectedBrand !== b.matchesSelectedBrand) {
      return a.matchesSelectedBrand ? -1 : 1;
    }
    if ((a.deliveryFee ?? 0) !== (b.deliveryFee ?? 0)) {
      return (a.deliveryFee ?? 0) - (b.deliveryFee ?? 0);
    }
    return a.calculatedDistanceKm - b.calculatedDistanceKm;
  });

  const exactBrandCount = sorted.filter((s) => s.matchesSelectedBrand).length;
  const alternativeBrandCount = sorted.length - exactBrandCount;

  const summaryArea = coverageResult?.primaryZone?.name || destination.name.split(',')[0];
  const message =
    brandPreference !== 'Any' && exactBrandCount === 0
      ? `No ${brandPreference} depot serves ${summaryArea} with ${selectedSize}. Showing verified partner depots with ${selectedSize} in stock.`
      : `${sorted.length} verified gas ${sorted.length === 1 ? 'supplier serves' : 'suppliers serve'} ${summaryArea} with ${selectedSize} in stock.`;

  return {
    isCovered: true,
    qualifiedSuppliers: sorted,
    exactBrandCount,
    alternativeBrandCount,
    message,
  };
}
