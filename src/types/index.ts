export type CylinderSize = '6kg' | '13kg' | '29kg';

export type PurchaseType = 'refill' | 'complete'; // refill empty cylinder vs buy new cylinder with gas

export type GasBrand = 'Any' | 'K-Gas' | 'TotalEnergies' | 'Shell Gas';

export interface CylinderPriceItem {
  size: CylinderSize;
  weightLabel: string;
  refillPrice: number; // in KSh
  completePrice: number; // in KSh
  popular?: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  brand: 'K-Gas' | 'TotalEnergies' | 'Shell Gas';
  brandLettermark: string; // e.g. "KG", "TE", "SG"
  brandColor: string; // Subtle brand accent
  locationArea: string; // e.g. "Kilimani, Argwings Kodhek"
  distanceKm: number;
  deliveryTimeMin: string; // e.g. "20–30 min"
  deliveryFee: number; // KSh (0 for free)
  rating: number;
  reviewCount: number;
  isOpen: boolean;
  closingTime: string;
  isSampleListing: boolean;
  cylinders: CylinderPriceItem[];
  coordinates?: {
    lat: number;
    lng: number;
    x: number; // SVG map relative X percent (0-100)
    y: number; // SVG map relative Y percent (0-100)
  };
}

export interface NairobiLocation {
  id: string;
  name: string;
  area: string;
  details: string;
  isPopular?: boolean;
  coordinates: {
    lat: number;
    lng: number;
    x?: number; // SVG map relative X percent (0-100)
    y?: number; // SVG map relative Y percent (0-100)
  };
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'promo' | 'safety' | 'order';
  read: boolean;
}

export interface SavedAddress {
  id: string;
  label: 'Home' | 'Work' | 'Other';
  fullName: string;
  phoneNumber: string;
  estate: string;
  building: string;
  unitNumber: string;
  deliveryInstructions: string;
}

export interface DeliveryAddressForm {
  fullName: string;
  phoneNumber: string;
  estate: string;
  building: string;
  unitNumber: string;
  deliveryInstructions: string;
  pinLocation: {
    lat: number;
    lng: number;
    areaName: string;
    isCustomPinned: boolean;
  };
}

export interface RiderInfo {
  id: string;
  name: string;
  phone: string;
  rating: number;
  deliveriesCount: number;
  vehicleModel: string; // e.g. "Boxer 150 Motorbike"
  plateNumber: string; // e.g. "KMD 824J"
  photoInitial: string;
  safetyCertified: boolean;
  currentLocationName: string;
  mapCoords?: { x: number; y: number };
}

export type OnDemandRequestStage =
  | 'idle'
  | 'confirm_request'
  | 'searching_supplier'
  | 'supplier_offered'
  | 'supplier_accepted'
  | 'preparing'
  | 'rider_assigned'
  | 'in_transit'
  | 'arrived_at_gate'
  | 'scale_verification'
  | 'completed'
  | 'no_supplier_available'
  | 'cancelled';

export type PaymentMethod = 'mpesa_on_delivery' | 'cash_on_delivery' | 'wallet' | 'payhero_mpesa';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'rider' | 'system';
  text: string;
  timestamp: string;
}

export interface OnDemandOrderState {
  orderId: string;
  createdAt: string;
  cylinderSize: CylinderSize;
  purchaseType: PurchaseType;
  brandPreference: GasBrand;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  deliveryFee: number;
  totalPrice: number;
  paymentMethod: PaymentMethod;
  destination: DeliveryAddressForm;
  matchedSupplier: Supplier | null;
  assignedRider: RiderInfo | null;
  handoverPin: string;
  etaMinutes: number;
  stage: OnDemandRequestStage;
  // Enhanced lifecycle and real-time matching attributes
  orderStatus?: string;
  supplierOfferCountdown?: number;
  offeredSupplierName?: string;
  matchingCandidateCount?: number;
  payheroStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  payheroReceipt?: string;
  deliveryNotes?: string;
  cancellationReason?: string;
  scaleReadingKg?: number;
  rating?: number;
  feedbackTags?: string[];
}

export type DeliveryTimingType = 'asap' | 'scheduled';

export interface DeliveryTimingSelection {
  type: DeliveryTimingType;
  asapEstimateWindow: string;
  scheduledDate: string;
  scheduledDateFormatted: string;
  scheduledSlotId: string;
  scheduledSlotLabel: string;
}

export interface CustomerOrderFlowState {
  supplier: Supplier;
  cylinderSize: CylinderSize;
  purchaseType: PurchaseType;
  quantity: number;
  address: DeliveryAddressForm;
  timing: DeliveryTimingSelection;
}

// ==========================================
// Delivery Zone System Types
// ==========================================

export interface PolygonCoordinate {
  lat: number;
  lng: number;
}

export interface ZoneSupplierConfig {
  supplierId: string;
  deliveryFee: number; // KSh (supplier-specific fee in this zone)
  minOrderValue: number; // Minimum order value in KSh
  operatingHours: {
    opensAt: string; // e.g. "07:30"
    closesAt: string; // e.g. "21:30"
  };
  estimatedDeliveryMin: string; // e.g. "20–30 min"
  isAvailableNow?: boolean;
}

export interface DeliveryZone {
  id: string;
  name: string;
  description: string;
  color: string; // Hex color for map boundary, e.g. "#10b981"
  isActive: boolean;
  // Closed polygon vertices: GeoJSON style coordinates [[lng, lat], ...] or array of {lat, lng}
  polygon: PolygonCoordinate[];
  suppliers: ZoneSupplierConfig[];
  createdAt: string;
  updatedAt: string;
}

export interface CoverageCheckResult {
  isCovered: boolean;
  checkedAt: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  matchedZones: DeliveryZone[];
  primaryZone?: DeliveryZone;
  eligibleSuppliers: Array<Supplier & { zoneConfig: ZoneSupplierConfig }>;
  message: string;
}

export interface OrderValidationRequest {
  lat: number;
  lng: number;
  cylinderSize: CylinderSize;
  purchaseType: PurchaseType;
  quantity: number;
  supplierId?: string;
}

export interface OrderValidationResponse {
  valid: boolean;
  error?: string;
  zone?: DeliveryZone;
  supplier?: Supplier;
  deliveryFee: number;
  estimatedDeliveryMin: string;
}

export * from './multisupplier';
