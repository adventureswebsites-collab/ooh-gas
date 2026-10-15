import { CylinderSize, PurchaseType, PolygonCoordinate } from './index';

export type UserRole = 'customer' | 'supplier_member' | 'admin';
export type SupplierMemberRole = 'owner' | 'manager' | 'staff' | 'rider';
export type SupplierStatus = 'draft' | 'pending_verification' | 'active' | 'suspended';

export type OrderStatus =
  | 'PENDING'
  | 'MATCHING_SUPPLIER'
  | 'SUPPLIER_OFFERED'
  | 'SUPPLIER_ACCEPTED'
  | 'PREPARING'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'SUPPLIER_REJECTED'
  | 'NO_SUPPLIER_AVAILABLE'
  // Support lowercase backward compatibility
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type OfferStatus =
  | 'offered'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'bypassed'
  | 'cancelled';

export type PaymentMethod = 'mpesa' | 'cash_on_delivery' | 'card' | 'payhero_mpesa';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
export type DeliveryStatus = 'assigned' | 'in_transit' | 'arrived' | 'completed' | 'failed';

export interface RankingWeights {
  coverage: number; // 0.25
  stock: number;    // 0.20
  distance: number; // 0.25
  eta: number;      // 0.15
  rating: number;   // 0.15
}

export interface SupplierScoreBreakdown {
  [key: string]: number;
  coverage: number;
  stock: number;
  distance: number;
  eta: number;
  rating: number;
}

export interface SupplierCandidateEvaluation {
  rank: number;
  supplierId: string;
  businessName: string;
  tradeName: string;
  distanceKm: number;
  zoneId: string;
  zoneName: string;
  deliveryFee: number;
  estimatedDeliveryMin: string;
  minStockCushion: number;
  compositeScore: number;
  scoreBreakdown: SupplierScoreBreakdown;
  rejectionReason?: string;
}

export interface SupplierOrderOffer {
  id: string;
  orderId: string;
  supplierId: string;
  rank: number;
  status: OfferStatus;
  offeredAt: string;
  expiresAt: string;
  respondedAt?: string;
  rejectionReason?: string;
  scoreBreakdown: Record<string, number>;
  createdAt: string;
  updatedAt: string;
  supplier?: SupplierBusiness;
}

export interface OrderMatchingSession {
  id: string;
  orderId: string;
  startedAt: string;
  completedAt?: string;
  status: 'evaluating' | 'offering' | 'matched' | 'exhausted' | 'cancelled';
  candidateCount: number;
  currentOfferId?: string;
  matchedSupplierId?: string;
  rankingWeights: RankingWeights;
  candidatesEvaluated: SupplierCandidateEvaluation[];
  failureReason?: string;
  currentOffer?: SupplierOrderOffer;
}

export interface DriverLocation {
  id: string;
  driverId: string;
  orderId?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speedKmh?: number;
  batteryLevel?: number;
  updatedAt: string;
}

export interface PayHeroInitiateRequest {
  orderId: string;
  phoneNumber: string;
  amount: number;
  channelId?: string;
  narrative?: string;
}

export interface PayHeroPaymentResponse {
  success: boolean;
  checkoutRequestId?: string;
  status: PaymentStatus;
  message: string;
  receiptNumber?: string;
  amount?: number;
}

export interface UserProfile {
  id: string;
  role: UserRole;
  phoneNumber: string;
  fullName: string;
  email?: string;
  avatarUrl?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Town {
  id: string;
  name: string;
  county: string;
  centerPoint: {
    lat: number;
    lng: number;
  };
  isActive: boolean;
  createdAt?: string;
}

export interface SupplierBusiness {
  id: string;
  businessName: string;
  tradeName: string;
  epraLicenseNumber?: string;
  kraPin?: string;
  phoneNumber: string;
  email?: string;
  primaryTownId: string;
  depotLocation: {
    lat: number;
    lng: number;
  };
  status: SupplierStatus;
  commissionRate: number;
  opensAt: string;
  closesAt: string;
  rating: number;
  reviewCount: number;
  logoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierMembership {
  id: string;
  userId: string;
  supplierId: string;
  role: SupplierMemberRole;
  isActive: boolean;
  createdAt: string;
}

export interface MultiSupplierDeliveryZone {
  id: string;
  supplierId: string;
  townId: string;
  name: string;
  color: string;
  boundary: PolygonCoordinate[];
  baseDeliveryFee: number;
  minOrderValue: number;
  estimatedDeliveryMin: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface MasterProduct {
  id: string;
  brand: string;
  cylinderSize: CylinderSize;
  valveType: string;
  tareWeightKg?: number;
  imageUrl?: string;
  description?: string;
  isActive: boolean;
}

export interface SupplierProduct {
  id: string;
  supplierId: string;
  productId: string;
  refillPrice: number;
  completePrice: number;
  exchangePrice?: number;
  stockRefill: number;
  stockComplete: number;
  isAvailable: boolean;
  minStockAlert: number;
  createdAt?: string;
  updatedAt?: string;
  product?: MasterProduct;
}

export interface CustomerAddress {
  id: string;
  customerId: string;
  townId: string;
  label: string;
  streetAddress: string;
  buildingName?: string;
  houseOrFlatNumber?: string;
  location: {
    lat: number;
    lng: number;
  };
  isDefault: boolean;
  deliveryNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MultiSupplierOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  supplierId: string;
  townId: string;
  deliveryZoneId?: string;
  status: OrderStatus;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  deliveryAddressSnapshot: Record<string, any>;
  deliveryPoint: {
    lat: number;
    lng: number;
  };
  deliveryTimingType: string;
  scheduledFor?: string;
  customerNotes?: string;
  cancellationReason?: string;
  deliveryOtp?: string;
  deliveryOtpVerifiedAt?: string;
  driverEtaMinutes?: number;
  driverDistanceKm?: number;
  driverLastLocation?: {
    lat: number;
    lng: number;
    accuracy?: number;
    heading?: number;
    speed?: number;
  };
  driverLastUpdatedAt?: string;
  createdAt: string;
  updatedAt: string;
  items?: MultiSupplierOrderItem[];
  supplier?: SupplierBusiness;
  delivery?: DeliveryTrackingInfo;
}

export interface CustomerAuthSession {
  user: {
    id: string;
    email: string;
    fullName: string;
    phoneNumber: string;
    role: UserRole;
    createdAt: string;
  } | null;
  profile: UserProfile | null;
  token?: string;
}

export interface MultiSupplierOrderItem {
  id: string;
  orderId: string;
  productId: string;
  supplierProductId?: string;
  purchaseType: PurchaseType;
  cylinderSize: CylinderSize;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface OrderPayment {
  id: string;
  orderId: string;
  customerId: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  phoneNumber: string;
  mpesaReceiptNumber?: string;
  mpesaCheckoutRequestId?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryTrackingInfo {
  id: string;
  orderId: string;
  riderId?: string;
  status: DeliveryStatus;
  currentLocation?: {
    lat: number;
    lng: number;
  };
  verificationCode?: string;
  riderNotes?: string;
  assignedAt: string;
  pickedUpAt?: string;
  deliveredAt?: string;
}
