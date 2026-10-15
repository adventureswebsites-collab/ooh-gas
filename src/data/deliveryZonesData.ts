import { DeliveryZone, PolygonCoordinate } from '../types';

/**
 * Standard default delivery zones across Nairobi, Kenya.
 * Polygons define realistic geographic perimeters for Kilimani, Westlands,
 * Lavington, Karen, and South B.
 */
export const INITIAL_DELIVERY_ZONES: DeliveryZone[] = [
  {
    id: 'zone-kilimani',
    name: 'Kilimani & Hurlingham Zone',
    description: 'Covers Kilimani, Yaya Centre, Hurlingham, Dennis Pritt Rd, Argwings Kodhek Rd, and Ring Road Kilimani.',
    color: '#10b981', // Emerald green
    isActive: true,
    polygon: [
      { lat: -1.2820, lng: 36.7730 },
      { lat: -1.2820, lng: 36.8080 },
      { lat: -1.2950, lng: 36.8120 },
      { lat: -1.3060, lng: 36.8050 },
      { lat: -1.3060, lng: 36.7730 },
      { lat: -1.2930, lng: 36.7690 },
    ],
    suppliers: [
      {
        supplierId: 'k-gas-hub',
        deliveryFee: 0, // Free doorstep delivery in home zone
        minOrderValue: 1300,
        operatingHours: { opensAt: '07:30', closesAt: '21:30' },
        estimatedDeliveryMin: '20–28 min',
      },
      {
        supplierId: 'total-energies-station',
        deliveryFee: 100,
        minOrderValue: 1000,
        operatingHours: { opensAt: '07:00', closesAt: '22:00' },
        estimatedDeliveryMin: '25–35 min',
      },
      {
        supplierId: 'shell-gas-point',
        deliveryFee: 150,
        minOrderValue: 1300,
        operatingHours: { opensAt: '08:00', closesAt: '21:00' },
        estimatedDeliveryMin: '30–40 min',
      },
    ],
    createdAt: '2026-01-15T08:00:00Z',
    updatedAt: '2026-10-13T10:00:00Z',
  },
  {
    id: 'zone-westlands',
    name: 'Westlands & Parklands Zone',
    description: 'Covers Sarit Centre, Mpaka Road, Westlands Commercial Square, Parklands, and Highridge.',
    color: '#3b82f6', // Royal blue
    isActive: true,
    polygon: [
      { lat: -1.2480, lng: 36.7880 },
      { lat: -1.2480, lng: 36.8320 },
      { lat: -1.2650, lng: 36.8350 },
      { lat: -1.2750, lng: 36.8180 },
      { lat: -1.2750, lng: 36.7880 },
      { lat: -1.2600, lng: 36.7820 },
    ],
    suppliers: [
      {
        supplierId: 'total-energies-station',
        deliveryFee: 120,
        minOrderValue: 1000,
        operatingHours: { opensAt: '07:00', closesAt: '22:00' },
        estimatedDeliveryMin: '20–30 min',
      },
      {
        supplierId: 'shell-gas-point',
        deliveryFee: 100,
        minOrderValue: 1300,
        operatingHours: { opensAt: '08:00', closesAt: '21:00' },
        estimatedDeliveryMin: '25–35 min',
      },
    ],
    createdAt: '2026-02-01T08:00:00Z',
    updatedAt: '2026-10-13T10:00:00Z',
  },
  {
    id: 'zone-lavington',
    name: 'Lavington & Kileleshwa Zone',
    description: 'Covers James Gichuru Rd, Muthangari, Gatundu Rd, Kileleshwa, and Valley Arcade.',
    color: '#f59e0b', // Amber
    isActive: true,
    polygon: [
      { lat: -1.2680, lng: 36.7520 },
      { lat: -1.2680, lng: 36.7860 },
      { lat: -1.2850, lng: 36.7880 },
      { lat: -1.2960, lng: 36.7720 },
      { lat: -1.2960, lng: 36.7520 },
      { lat: -1.2800, lng: 36.7480 },
    ],
    suppliers: [
      {
        supplierId: 'k-gas-hub',
        deliveryFee: 100,
        minOrderValue: 1300,
        operatingHours: { opensAt: '07:30', closesAt: '21:30' },
        estimatedDeliveryMin: '25–35 min',
      },
      {
        supplierId: 'shell-gas-point',
        deliveryFee: 120,
        minOrderValue: 1300,
        operatingHours: { opensAt: '08:00', closesAt: '21:00' },
        estimatedDeliveryMin: '30–40 min',
      },
    ],
    createdAt: '2026-02-10T08:00:00Z',
    updatedAt: '2026-10-13T10:00:00Z',
  },
  {
    id: 'zone-karen',
    name: 'Karen & Langata Zone',
    description: 'Covers Karen Road, Hardy, The Hub, Ngong Road Karen end, and Langata Road junction.',
    color: '#8b5cf6', // Violet
    isActive: true,
    polygon: [
      { lat: -1.3050, lng: 36.6850 },
      { lat: -1.3050, lng: 36.7450 },
      { lat: -1.3400, lng: 36.7450 },
      { lat: -1.3480, lng: 36.7100 },
      { lat: -1.3300, lng: 36.6850 },
    ],
    suppliers: [
      {
        supplierId: 'shell-gas-point',
        deliveryFee: 200,
        minOrderValue: 2850,
        operatingHours: { opensAt: '08:30', closesAt: '20:30' },
        estimatedDeliveryMin: '35–45 min',
      },
    ],
    createdAt: '2026-03-01T08:00:00Z',
    updatedAt: '2026-10-13T10:00:00Z',
  },
  {
    id: 'zone-south-b',
    name: 'South B & South C (Coming Soon)',
    description: 'Covers Mombasa Road, Bellevue, South B Hazina, and South C. Currently inactive during depot ramp-up.',
    color: '#94a3b8', // Gray
    isActive: false, // Inactive zone for testing coverage rejection & reactivation
    polygon: [
      { lat: -1.3000, lng: 36.8180 },
      { lat: -1.3000, lng: 36.8550 },
      { lat: -1.3350, lng: 36.8550 },
      { lat: -1.3350, lng: 36.8180 },
    ],
    suppliers: [],
    createdAt: '2026-03-15T08:00:00Z',
    updatedAt: '2026-10-13T10:00:00Z',
  },
];

/**
 * High-performance Ray-Casting algorithm for Point-in-Polygon (PIP) testing.
 * Same mathematical logic as PostGIS ST_Contains for GeoJSON 2D polygons.
 *
 * @param point Customer coordinate { lat, lng }
 * @param polygon Closed or unclosed array of vertices [{ lat, lng }]
 * @returns boolean true if point is strictly inside polygon
 */
export function isPointInPolygon(point: { lat: number; lng: number }, polygon: PolygonCoordinate[]): boolean {
  if (!polygon || polygon.length < 3) return false;

  const x = point.lng;
  const y = point.lat;

  // Bounding box pre-check for O(1) fast rejection
  let minX = polygon[0].lng;
  let maxX = polygon[0].lng;
  let minY = polygon[0].lat;
  let maxY = polygon[0].lat;

  for (let i = 1; i < polygon.length; i++) {
    const q = polygon[i];
    minX = Math.min(minX, q.lng);
    maxX = Math.max(maxX, q.lng);
    minY = Math.min(minY, q.lat);
    maxY = Math.max(maxY, q.lat);
  }

  if (x < minX || x > maxX || y < minY || y > maxY) {
    return false;
  }

  // Ray-casting algorithm
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}
