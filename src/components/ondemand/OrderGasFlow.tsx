import React, { useState, useEffect } from 'react';
import {
  CylinderSize,
  PurchaseType,
  GasBrand,
  Supplier,
  NairobiLocation,
  CoverageCheckResult,
  PaymentMethod,
  DeliveryTimingType,
} from '../../types';
import {
  MARKET_BENCHMARK_PRICES,
  AVAILABLE_DELIVERY_TIME_SLOTS,
  MOCK_SUPPLIERS,
} from '../../data/mockData';
import {
  getCustomerSavedAddresses,
  CustomerAuthSession,
} from '../../services/customerAuthService';
import { SupplierLettermark } from '../BrandIdentities';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Loader2,
  Lock,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  Smartphone,
  Banknote,
  Calendar,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { findNearestDeliveryDepots } from '../../services/supplierMatchingService';
import img6kg from '../../assets/images/lpg_cylinder_6kg_1791888342390.jpg';
import img13kg from '../../assets/images/lpg_cylinder_13kg_1791888361570.jpg';
import img22_5kg from '../../assets/images/lpg_cylinder_22_5kg_1795082200575.jpg';
import img29kg from '../../assets/images/lpg_cylinder_29kg_1791888380688.jpg';

export type OrderFlowStep =
  | 'select_gas'
  | 'nearby_shops'
  | 'delivery_details'
  | 'order_summary'
  | 'payment'
  | 'confirmation';

export interface CompletedCheckoutPayload {
  cylinderSize: CylinderSize;
  purchaseType: PurchaseType;
  brandPreference: GasBrand;
  quantity: number;
  selectedSupplier: Supplier;
  unitPrice: number;
  subtotal: number;
  deliveryFee: number;
  totalPrice: number;
  timingType: DeliveryTimingType;
  scheduledFor?: {
    date: string;
    dateFormatted: string;
    slotLabel: string;
  };
  deliveryDetails: {
    fullName: string;
    phoneNumber: string;
    estate: string;
    building: string;
    unitNumber: string;
    deliveryInstructions: string;
    paymentMethod: PaymentMethod;
  };
}

interface OrderGasFlowProps {
  initialStep?: OrderFlowStep;
  initialTiming?: DeliveryTimingType;
  initialSupplier?: Supplier | null;
  selectedSize: CylinderSize;
  onChangeSize: (s: CylinderSize) => void;
  purchaseType: PurchaseType;
  onChangePurchaseType: (p: PurchaseType) => void;
  brandPreference: GasBrand;
  onChangeBrandPreference: (b: GasBrand) => void;
  quantity: number;
  onChangeQuantity: (q: number) => void;
  currentLocation: NairobiLocation;
  coverageResult: CoverageCheckResult | null;
  suppliers: Supplier[];
  favoriteSupplierIds: string[];
  onToggleFavoriteSupplier: (supplierId: string) => void;
  customerSession: CustomerAuthSession | null;
  onOpenLocationModal: () => void;
  onChangeDestinationOnMap?: () => void;
  onSelectLocation: (loc: NairobiLocation) => void;
  onRequestAuthForCheckout: (stepToReturnTo: OrderFlowStep) => void;
  onSubmitConfirmedOrder: (
    payload: CompletedCheckoutPayload
  ) => Promise<{ orderNumber: string; isScheduled: boolean }>;
  onTrackPlacedOrder: () => void;
  onCancelFlow: () => void;
}

const FEATURED_CYLINDER_SIZES: Array<{
  size: CylinderSize;
  subtitle: string;
}> = [
  { size: '6kg', subtitle: 'Compact' },
  { size: '13kg', subtitle: 'Home' },
  { size: '22.5kg', subtitle: 'Family+' },
  { size: '29kg', subtitle: 'Commercial' },
];

const CYLINDER_IMAGES: Record<CylinderSize, string> = {
  '6kg': img6kg,
  '13kg': img13kg,
  '22.5kg': img22_5kg,
  '29kg': img29kg,
  '50kg': img29kg,
};

export const OrderGasFlow: React.FC<OrderGasFlowProps> = ({
  initialStep = 'select_gas',
  initialTiming = 'asap',
  initialSupplier = null,
  selectedSize,
  onChangeSize,
  purchaseType,
  onChangePurchaseType,
  brandPreference,
  onChangeBrandPreference,
  quantity,
  onChangeQuantity,
  currentLocation,
  coverageResult,
  suppliers,
  favoriteSupplierIds,
  onToggleFavoriteSupplier,
  customerSession,
  onOpenLocationModal,
  onChangeDestinationOnMap,
  onSelectLocation,
  onRequestAuthForCheckout,
  onSubmitConfirmedOrder,
  onTrackPlacedOrder,
  onCancelFlow,
}) => {
  const normalizeStep = (incoming: OrderFlowStep): OrderFlowStep => {
    if (incoming === 'nearby_shops') return 'select_gas';
    if (incoming === 'delivery_details') return 'order_summary';
    return incoming;
  };

  const [step, setStep] = useState<OrderFlowStep>(() => normalizeStep(initialStep));
  const [timingType, setTimingType] = useState<DeliveryTimingType>(initialTiming);

  // Upcoming 7 dates for Scheduled delivery
  const upcomingDates = React.useMemo(() => {
    const list: Array<{ dateKey: string; label: string; dayNum: number; month: string }> = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const label =
        i === 0
          ? 'Today'
          : i === 1
          ? 'Tomorrow'
          : d.toLocaleDateString('en-GB', { weekday: 'short' });
      list.push({
        dateKey: `${yyyy}-${mm}-${dd}`,
        label,
        dayNum: d.getDate(),
        month: d.toLocaleDateString('en-GB', { month: 'short' }),
      });
    }
    return list;
  }, []);

  const [selectedDateKey, setSelectedDateKey] = useState(upcomingDates[1]?.dateKey || upcomingDates[0].dateKey);
  const [selectedSlotLabel, setSelectedSlotLabel] = useState(AVAILABLE_DELIVERY_TIME_SLOTS[1].label);

  // Selected Gas Shop
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier>(
    initialSupplier || suppliers[0] || MOCK_SUPPLIERS[0]
  );

  // Auto-filled customer contact & address from session + pinned location
  const [fullName, setFullName] = useState(customerSession?.user.fullName || 'Wangari Mwangi');
  const [phoneNumber, setPhoneNumber] = useState(customerSession?.user.phoneNumber || '0712 345 678');
  const [building, setBuilding] = useState(currentLocation.details || '');
  const [unitNumber, setUnitNumber] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState(
    'Call at gate. Digital scale weight check required.'
  );

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('payhero_mpesa');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Confirmation
  const [confirmedOrderNumber, setConfirmedOrderNumber] = useState<string>('OG-10428');
  const [confirmedWasScheduled, setConfirmedWasScheduled] = useState(false);

  useEffect(() => {
    setStep(normalizeStep(initialStep));
  }, [initialStep]);

  useEffect(() => {
    if (initialSupplier) {
      setSelectedSupplier(initialSupplier);
    }
  }, [initialSupplier]);

  useEffect(() => {
    if (customerSession) {
      setFullName(customerSession.user.fullName);
      setPhoneNumber(customerSession.user.phoneNumber);
      getCustomerSavedAddresses()
        .then((addrs) => {
          const def = addrs.find((a) => a.isDefault) || addrs[0];
          if (def) {
            if (def.buildingName) setBuilding(def.buildingName);
            if (def.houseOrFlatNumber) setUnitNumber(def.houseOrFlatNumber);
            if (def.deliveryNotes) setDeliveryInstructions(def.deliveryNotes);
          }
        })
        .catch(() => {});
    }
  }, [customerSession]);

  // Compute nearby open depots serving the confirmed destination
  const nearbyDepotSearch = React.useMemo(() => {
    return findNearestDeliveryDepots({
      destination: currentLocation,
      coverageResult,
      suppliers,
    });
  }, [currentLocation, coverageResult, suppliers]);

  const eligibleSuppliers = nearbyDepotSearch.nearbyDepots;

  useEffect(() => {
    if (
      eligibleSuppliers.length > 0 &&
      !eligibleSuppliers.some((s) => s.id === selectedSupplier.id)
    ) {
      setSelectedSupplier(eligibleSuppliers[0]);
    }
  }, [eligibleSuppliers, selectedSupplier.id]);

  const getCylinderDetailsForShop = (shop: Supplier, size: CylinderSize) => {
    const cyl = shop.cylinders.find((c) => c.size === size);
    if (cyl) {
      return {
        price: purchaseType === 'refill' ? cyl.refillPrice : cyl.completePrice,
        inStock: cyl.inStock !== false,
      };
    }
    const bench = MARKET_BENCHMARK_PRICES[size];
    return {
      price: purchaseType === 'refill' ? bench.refillPrice : bench.completePrice,
      inStock: true,
    };
  };

  const activeCylinderStatus = getCylinderDetailsForShop(selectedSupplier, selectedSize);
  const unitPrice = activeCylinderStatus.price;
  const subtotal = unitPrice * quantity;
  const deliveryFee = selectedSupplier.deliveryFee ?? 0;
  const totalPrice = subtotal + deliveryFee;

  const selectedDateObj = upcomingDates.find((d) => d.dateKey === selectedDateKey) || upcomingDates[0];
  const scheduledSummary = `${selectedDateObj.label} (${selectedDateObj.dayNum} ${selectedDateObj.month}) · ${selectedSlotLabel}`;

  const handleSelectCylinderSize = (size: CylinderSize) => {
    const currentShopCheck = getCylinderDetailsForShop(selectedSupplier, size);
    if (currentShopCheck.inStock) {
      onChangeSize(size);
      return;
    }
    const stockedSupplier = eligibleSuppliers.find(
      (s) => getCylinderDetailsForShop(s, size).inStock
    );
    if (stockedSupplier) {
      setSelectedSupplier(stockedSupplier);
      onChangeBrandPreference(stockedSupplier.brand);
      onChangeSize(size);
    }
  };

  const stepTitles: Record<OrderFlowStep, string> = {
    select_gas: '',
    nearby_shops: '',
    delivery_details: '',
    order_summary: 'Order Summary',
    payment: 'Payment Method',
    confirmation: 'Order Confirmed',
  };

  const handleBack = () => {
    if (step === 'select_gas' || step === 'confirmation') {
      onCancelFlow();
    } else if (step === 'order_summary') {
      setStep('select_gas');
    } else if (step === 'payment') {
      setStep('order_summary');
    } else {
      setStep('select_gas');
    }
  };

  const handleConfirmAndPay = async () => {
    if (!customerSession) {
      onRequestAuthForCheckout('order_summary');
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const result = await onSubmitConfirmedOrder({
        cylinderSize: selectedSize,
        purchaseType,
        brandPreference,
        quantity,
        selectedSupplier,
        unitPrice,
        subtotal,
        deliveryFee,
        totalPrice,
        timingType,
        scheduledFor:
          timingType === 'scheduled'
            ? {
                date: selectedDateObj.dateKey,
                dateFormatted: `${selectedDateObj.label} (${selectedDateObj.dayNum} ${selectedDateObj.month})`,
                slotLabel: selectedSlotLabel,
              }
            : undefined,
        deliveryDetails: {
          fullName: fullName.trim() || customerSession.user.fullName,
          phoneNumber: phoneNumber.trim() || customerSession.user.phoneNumber,
          estate: currentLocation.name,
          building: building.trim() || currentLocation.area || 'Main Gate',
          unitNumber: unitNumber.trim() || 'Gate Delivery',
          deliveryInstructions: deliveryInstructions.trim(),
          paymentMethod,
        },
      });

      setConfirmedOrderNumber(result.orderNumber);
      setConfirmedWasScheduled(result.isScheduled);
      setStep('confirmation');
    } catch (err: any) {
      setSubmitError(err?.message || 'Unable to place order right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto pb-28 text-left animate-in fade-in duration-150">
      {/* Minimal Header for Summary / Payment Steps (No "Order Gas" header or step counter) */}
      {(step === 'order_summary' || step === 'payment') && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#15191C] hover:text-[#0E8A45] cursor-pointer min-h-[44px] pr-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <h1 className="text-sm sm:text-base font-extrabold text-[#15191C] tracking-tight truncate">
            {stepTitles[step]}
          </h1>

          <div className="w-12" aria-hidden="true" />
        </div>
      )}

      {/* ======================================================== */}
      {/* SCREEN 4: CLEAN UBER-STYLE GAS SELECTION & CHECKOUT      */}
      {/* ======================================================== */}
      {step === 'select_gas' && (
        <div className="space-y-3">
          {/* 1. Clean Delivery Location Header with Back + Pin + Change */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={handleBack}
                  aria-label="Back to map"
                  className="w-9 h-9 rounded-full bg-[#F6F7F8] hover:bg-[#EDF6F1] text-[#15191C] flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="w-9 h-9 rounded-full bg-[#EDF6F1] text-[#0E8A45] flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-[#6B7280] block leading-tight">
                    Deliver to
                  </span>
                  <p className="text-sm font-extrabold text-[#15191C] truncate">
                    {currentLocation.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onChangeDestinationOnMap || onOpenLocationModal}
                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#F6F7F8] hover:bg-[#EDF6F1] text-xs font-extrabold text-[#0E8A45] transition-colors cursor-pointer shrink-0 whitespace-nowrap"
              >
                Change
              </button>
            </div>

            {/* Compact Deliver Now vs Schedule Selector */}
            <div className="flex items-center gap-1.5 bg-[#F6F7F8] p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setTimingType('asap')}
                className={`flex-1 min-h-[36px] px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  timingType === 'asap'
                    ? 'bg-white text-[#15191C] shadow-xs'
                    : 'text-[#6B7280] hover:text-[#15191C]'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-[#0E8A45]" />
                <span>Deliver now · 15–25 min</span>
              </button>
              <button
                type="button"
                onClick={() => setTimingType('scheduled')}
                className={`flex-1 min-h-[36px] px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  timingType === 'scheduled'
                    ? 'bg-white text-[#15191C] shadow-xs'
                    : 'text-[#6B7280] hover:text-[#15191C]'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-[#0E8A45]" />
                <span>Schedule</span>
              </button>
            </div>

            {timingType === 'scheduled' && (
              <div className="pt-1 space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                  {upcomingDates.map((d) => (
                    <button
                      key={d.dateKey}
                      type="button"
                      onClick={() => setSelectedDateKey(d.dateKey)}
                      className={`px-2.5 py-1.5 rounded-xl border text-center min-w-[64px] shrink-0 cursor-pointer transition-all ${
                        selectedDateKey === d.dateKey
                          ? 'bg-[#0E8A45] border-[#0E8A45] text-white'
                          : 'bg-white border-neutral-200 text-[#15191C]'
                      }`}
                    >
                      <span className="text-[10px] font-semibold block opacity-85">{d.label}</span>
                      <span className="text-xs font-extrabold tabular-nums">
                        {d.dayNum} {d.month}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {AVAILABLE_DELIVERY_TIME_SLOTS.slice(0, 4).map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setSelectedSlotLabel(slot.label)}
                      className={`px-2.5 py-1.5 rounded-xl border text-left text-[11px] font-bold cursor-pointer flex items-center justify-between ${
                        selectedSlotLabel === slot.label
                          ? 'bg-[#EDF6F1] border-[#0E8A45] text-[#0E8A45]'
                          : 'bg-white border-neutral-200 text-[#15191C]'
                      }`}
                    >
                      <span className="truncate">{slot.label}</span>
                      {selectedSlotLabel === slot.label && <Check className="w-3 h-3 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Out-of-zone warning if needed */}
          {coverageResult && !coverageResult.isCovered && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs text-rose-800">
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-semibold truncate">{coverageResult.message}</span>
              </div>
              <button
                type="button"
                onClick={onChangeDestinationOnMap || onOpenLocationModal}
                className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold shrink-0 cursor-pointer"
              >
                Move Pin
              </button>
            </div>
          )}

          {/* Refill / New Gas Toggle + Clean Quantity Selector */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs p-2.5 flex flex-wrap items-center justify-between gap-2">
            <div
              role="tablist"
              aria-label="Gas order type"
              className="inline-flex items-center bg-[#F6F7F8] p-1 rounded-xl"
            >
              <button
                type="button"
                role="tab"
                aria-selected={purchaseType === 'refill'}
                onClick={() => onChangePurchaseType('refill')}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                  purchaseType === 'refill'
                    ? 'bg-[#0E8A45] text-white shadow-xs'
                    : 'text-[#6B7280] hover:text-[#15191C]'
                }`}
              >
                Refill
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={purchaseType === 'complete'}
                onClick={() => onChangePurchaseType('complete')}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                  purchaseType === 'complete'
                    ? 'bg-[#0E8A45] text-white shadow-xs'
                    : 'text-[#6B7280] hover:text-[#15191C]'
                }`}
              >
                New Gas
              </button>
            </div>

            {/* Clean Quantity Stepper */}
            <div className="inline-flex items-center gap-2 bg-[#F6F7F8] px-1.5 py-1 rounded-xl">
              <button
                type="button"
                onClick={() => onChangeQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
                className="w-9 h-9 rounded-lg bg-white border border-neutral-200/80 text-[#15191C] flex items-center justify-center disabled:opacity-40 cursor-pointer active:scale-95 transition-transform"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-6 text-center text-sm font-extrabold text-[#15191C] tabular-nums">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => onChangeQuantity(Math.min(5, quantity + 1))}
                disabled={quantity >= 5}
                aria-label="Increase quantity"
                className="w-9 h-9 rounded-lg bg-[#0E8A45] text-white flex items-center justify-center disabled:opacity-40 cursor-pointer active:scale-95 transition-transform"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Cylinder Sizes (6kg, 13kg, 22.5kg, 29kg) with Product Images & Prices */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-0.5">
              <h2 className="text-sm font-extrabold text-[#15191C]">Select cylinder size</h2>
              <span className="text-xs font-medium text-[#6B7280]">
                {purchaseType === 'refill' ? 'Swap empty cylinder' : 'Full cylinder included'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {FEATURED_CYLINDER_SIZES.map(({ size, subtitle }) => {
                const { price, inStock } = getCylinderDetailsForShop(selectedSupplier, size);
                const isSelected = selectedSize === size;
                const anySupplierStocks = eligibleSuppliers.some(
                  (s) => getCylinderDetailsForShop(s, size).inStock
                );

                return (
                  <button
                    key={size}
                    type="button"
                    disabled={eligibleSuppliers.length > 0 && !anySupplierStocks}
                    onClick={() => handleSelectCylinderSize(size)}
                    className={`relative rounded-2xl border p-2.5 text-left transition-all cursor-pointer flex flex-col justify-between bg-white disabled:opacity-45 disabled:cursor-not-allowed ${
                      isSelected
                        ? 'border-[#0E8A45] bg-[#F5FBF7] ring-1 ring-[#0E8A45]/35 shadow-sm'
                        : 'border-neutral-200/90 hover:border-[#0E8A45]/45 shadow-2xs'
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#0E8A45] text-white flex items-center justify-center z-10 shadow-xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}

                    <div className="w-full h-24 sm:h-28 rounded-xl bg-[#F6F7F8] overflow-hidden flex items-center justify-center p-1.5 mb-2">
                      <img
                        src={CYLINDER_IMAGES[size]}
                        alt={`${size} LPG cooking gas cylinder`}
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div>
                      <div className="flex items-baseline justify-between gap-1">
                        <span className="text-sm font-extrabold text-[#15191C]">{size}</span>
                        <span className="text-[11px] font-medium text-[#6B7280] truncate">
                          {subtitle}
                        </span>
                      </div>
                      <p
                        className={`text-xs sm:text-sm font-extrabold tabular-nums mt-0.5 ${
                          inStock ? 'text-[#0E8A45]' : 'text-amber-700'
                        }`}
                      >
                        {inStock ? `KSh ${price.toLocaleString()}` : 'Available nearby'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prominent Green Sticky Checkout Bar -> Direct to Order Summary */}
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200/90 shadow-[0_-8px_24px_rgba(15,23,42,0.08)]">
            <div className="max-w-4xl mx-auto px-3 sm:px-6 py-2.5">
              <button
                type="button"
                disabled={eligibleSuppliers.length === 0 || !activeCylinderStatus.inStock}
                onClick={() => setStep('order_summary')}
                className="w-full min-h-[50px] px-4 rounded-2xl bg-[#0E8A45] hover:bg-[#0B7138] active:scale-[0.99] disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-extrabold transition-all cursor-pointer flex items-center justify-between gap-3 shadow-md shadow-[#0E8A45]/20"
              >
                <div className="min-w-0 text-left">
                  <span className="text-xs sm:text-sm block truncate">
                    {eligibleSuppliers.length === 0
                      ? 'Move pin inside a delivery zone'
                      : `${quantity}× ${selectedSize} ${
                          purchaseType === 'refill' ? 'Refill' : 'New Gas'
                        } · ${selectedSupplier.name}`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 tabular-nums text-sm sm:text-base">
                  <span>KSh {totalPrice.toLocaleString()}</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SCREEN 7: ORDER SUMMARY                                  */}
      {/* ======================================================== */}
      {step === 'order_summary' && (
        <div className="max-w-xl mx-auto bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 space-y-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-[#226946] uppercase tracking-wider">
                {timingType === 'scheduled' ? 'Scheduled Delivery' : 'Express Delivery'}
              </span>
              <h2 className="text-lg font-extrabold text-[#15191C]">
                {timingType === 'scheduled'
                  ? scheduledSummary
                  : `Arriving in ${selectedSupplier.deliveryTimeMin}`}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setStep('select_gas')}
              className="text-xs font-bold text-[#226946] hover:underline cursor-pointer"
            >
              Edit
            </button>
          </div>

          {/* Selected Gas Shop */}
          <div className="p-3.5 rounded-2xl bg-[#F6F7F8] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <SupplierLettermark brand={selectedSupplier.brand} className="w-10 h-10 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-[#15191C] truncate">
                  {selectedSupplier.name}
                </p>
                <p className="text-xs text-[#6B7280] truncate">
                  ★ {selectedSupplier.rating.toFixed(1)} · {selectedSupplier.distanceKm} km away
                </p>
              </div>
            </div>
          </div>

          {/* Selected Cylinder + Delivery Destination */}
          <div className="space-y-2.5 divide-y divide-neutral-100 text-xs sm:text-sm">
            <div className="flex items-center justify-between py-2">
              <span className="text-[#6B7280]">Gas Product</span>
              <span className="font-bold text-[#15191C]">
                {quantity}x {selectedSize} {purchaseType === 'refill' ? 'Refill' : 'Exchange Set'} (
                {brandPreference === 'Any' ? selectedSupplier.brand : brandPreference})
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-[#6B7280]">Deliver To</span>
              <span className="font-bold text-[#15191C] text-right max-w-[60%] truncate">
                {building ? `${building}, ` : ''}
                {unitNumber ? `${unitNumber}, ` : ''}
                {currentLocation.name.split(',')[0]}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-[#6B7280]">Customer Contact</span>
              <span className="font-bold text-[#15191C] tabular-nums">
                {fullName} · {phoneNumber}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-[#6B7280]">Gas Price</span>
              <span className="font-bold text-[#15191C] tabular-nums">
                KSh {subtotal.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-[#6B7280]">Delivery Fee</span>
              <span className="font-bold text-[#226946] tabular-nums">
                {deliveryFee === 0 ? 'Free' : `KSh ${deliveryFee.toLocaleString()}`}
              </span>
            </div>
            <div className="flex items-center justify-between pt-3 text-base font-extrabold text-[#15191C]">
              <span>Total Amount</span>
              <span className="text-xl text-[#226946] tabular-nums">
                KSh {totalPrice.toLocaleString()}
              </span>
            </div>
          </div>

          {!customerSession ? (
            <div className="p-4 rounded-2xl bg-[#EDF6F1] border border-[#226946]/25 space-y-3">
              <div className="flex items-start gap-2.5 text-xs text-[#195136]">
                <Lock className="w-4 h-4 text-[#226946] shrink-0 mt-0.5" />
                <span>
                  Please sign in or create an account to confirm your order and enable live rider tracking.
                </span>
              </div>
              <button
                type="button"
                onClick={() => onRequestAuthForCheckout('order_summary')}
                className="w-full min-h-[48px] py-3 rounded-2xl bg-[#226946] hover:bg-[#195136] text-white font-bold text-sm cursor-pointer"
              >
                Sign In to Confirm Order
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setStep('payment')}
              className="w-full min-h-[50px] py-3.5 px-5 rounded-2xl bg-[#226946] hover:bg-[#195136] text-white font-bold text-sm transition-colors cursor-pointer"
            >
              Confirm Order &amp; Choose Payment
            </button>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SCREEN 8: PAYMENT                                        */}
      {/* ======================================================== */}
      {step === 'payment' && (
        <div className="max-w-xl mx-auto bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 space-y-5 shadow-2xs">
          <div>
            <h2 className="text-lg font-extrabold text-[#15191C]">Select Payment Method</h2>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Pay safely via M-Pesa or Cash after doorstep weight verification
            </p>
          </div>

          {submitError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {submitError}
            </div>
          )}

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => setPaymentMethod('payhero_mpesa')}
              className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between gap-3 cursor-pointer transition-all ${
                paymentMethod === 'payhero_mpesa'
                  ? 'border-[#226946] bg-[#EDF6F1] ring-1 ring-[#226946]'
                  : 'border-neutral-200 bg-white hover:bg-[#F6F7F8]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#226946] text-white flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-extrabold text-[#15191C] block">
                    M-Pesa Instant STK Push
                  </span>
                  <span className="text-xs text-[#6B7280]">
                    Prompt sent directly to {phoneNumber}
                  </span>
                </div>
              </div>
              <span
                className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                  paymentMethod === 'payhero_mpesa'
                    ? 'bg-[#226946] border-[#226946] text-white'
                    : 'border-neutral-300 bg-white'
                }`}
              >
                {paymentMethod === 'payhero_mpesa' && <Check className="w-3 h-3 stroke-[3]" />}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('mpesa_on_delivery')}
              className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between gap-3 cursor-pointer transition-all ${
                paymentMethod === 'mpesa_on_delivery'
                  ? 'border-[#226946] bg-[#EDF6F1] ring-1 ring-[#226946]'
                  : 'border-neutral-200 bg-white hover:bg-[#F6F7F8]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-neutral-200 text-[#226946] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-extrabold text-[#15191C] block">
                    M-Pesa Paybill on Delivery
                  </span>
                  <span className="text-xs text-[#6B7280]">
                    Pay when rider arrives with digital scale
                  </span>
                </div>
              </div>
              <span
                className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                  paymentMethod === 'mpesa_on_delivery'
                    ? 'bg-[#226946] border-[#226946] text-white'
                    : 'border-neutral-300 bg-white'
                }`}
              >
                {paymentMethod === 'mpesa_on_delivery' && <Check className="w-3 h-3 stroke-[3]" />}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('cash_on_delivery')}
              className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between gap-3 cursor-pointer transition-all ${
                paymentMethod === 'cash_on_delivery'
                  ? 'border-[#226946] bg-[#EDF6F1] ring-1 ring-[#226946]'
                  : 'border-neutral-200 bg-white hover:bg-[#F6F7F8]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-neutral-200 text-[#15191C] flex items-center justify-center shrink-0">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-extrabold text-[#15191C] block">
                    Cash on Delivery
                  </span>
                  <span className="text-xs text-[#6B7280]">Pay cash upon cylinder handover</span>
                </div>
              </div>
              <span
                className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                  paymentMethod === 'cash_on_delivery'
                    ? 'bg-[#226946] border-[#226946] text-white'
                    : 'border-neutral-300 bg-white'
                }`}
              >
                {paymentMethod === 'cash_on_delivery' && <Check className="w-3 h-3 stroke-[3]" />}
              </span>
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-[#F6F7F8] space-y-1.5 text-xs">
            <div className="flex justify-between text-[#6B7280]">
              <span>
                {quantity}x {selectedSize} · {selectedSupplier.name}
              </span>
              <span className="font-bold text-[#15191C] tabular-nums">
                KSh {subtotal.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-[#6B7280]">
              <span>Delivery Fee</span>
              <span className="font-bold text-[#226946] tabular-nums">
                {deliveryFee === 0 ? 'Free' : `KSh ${deliveryFee.toLocaleString()}`}
              </span>
            </div>
            <div className="pt-2 border-t border-neutral-200 flex justify-between text-sm font-extrabold text-[#15191C]">
              <span>Total Amount</span>
              <span className="text-base text-[#226946] tabular-nums">
                KSh {totalPrice.toLocaleString()}
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirmAndPay}
            className="w-full min-h-[52px] py-3.5 px-5 rounded-2xl bg-[#226946] hover:bg-[#195136] text-white font-bold text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Confirming Gas Order...</span>
              </>
            ) : (
              <span>
                {paymentMethod === 'payhero_mpesa'
                  ? `Pay Now · KSh ${totalPrice.toLocaleString()}`
                  : `Place Order · KSh ${totalPrice.toLocaleString()}`}
              </span>
            )}
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* SCREEN 9: ORDER CONFIRMATION                             */}
      {/* ======================================================== */}
      {step === 'confirmation' && (
        <div className="max-w-md mx-auto py-8 animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-3xl border border-neutral-200/80 p-7 sm:p-8 text-center space-y-6 shadow-sm">
            <div className="w-20 h-20 rounded-full bg-[#226946] text-white mx-auto flex items-center justify-center shadow-md">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-extrabold text-[#15191C] tracking-tight">
                Order placed successfully!
              </h1>
              <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed">
                {confirmedWasScheduled
                  ? `Your ${selectedSize} gas delivery is scheduled for ${scheduledSummary}.`
                  : `Thanks for ordering with Ooh Gas. ${selectedSupplier.name} has received your request.`}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#F6F7F8] text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Order Number</span>
                <span className="font-mono font-extrabold text-[#15191C]">#{confirmedOrderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Selected Gas Shop</span>
                <span className="font-bold text-[#15191C]">{selectedSupplier.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Status</span>
                <span className="font-bold text-[#226946]">
                  {confirmedWasScheduled ? 'Scheduled' : 'Order Received'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Total</span>
                <span className="font-extrabold text-[#15191C] tabular-nums">
                  KSh {totalPrice.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              {!confirmedWasScheduled && (
                <button
                  type="button"
                  onClick={onTrackPlacedOrder}
                  className="w-full min-h-[48px] py-3 px-5 rounded-2xl bg-[#226946] hover:bg-[#195136] text-white font-bold text-sm transition-colors cursor-pointer"
                >
                  Track Order
                </button>
              )}
              <button
                type="button"
                onClick={onCancelFlow}
                className="w-full min-h-[46px] py-3 px-5 rounded-2xl bg-[#F6F7F8] hover:bg-neutral-200 text-[#15191C] font-bold text-sm transition-colors cursor-pointer"
              >
                Back Home
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
