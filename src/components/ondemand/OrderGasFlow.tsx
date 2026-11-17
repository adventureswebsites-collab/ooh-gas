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
  CustomerAuthSession,
  getCustomerSavedAddresses,
  saveCustomerAddress,
} from '../../services/customerAuthService';
import { CustomerAddress } from '../../types/multisupplier';
import { SupplierLettermark } from '../BrandIdentities';
import { MapboxDeliveryMap } from '../map/MapboxDeliveryMap';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Flame,
  Heart,
  Info,
  Loader2,
  Lock,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  Smartphone,
  Banknote,
  Star,
  Calendar,
  Zap,
  X,
} from 'lucide-react';
import img6kg from '../../assets/images/lpg_cylinder_6kg_1791888342390.jpg';
import img13kg from '../../assets/images/lpg_cylinder_13kg_1791888361570.jpg';
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
  onSelectLocation: (loc: NairobiLocation) => void;
  onRequestAuthForCheckout: (stepToReturnTo: OrderFlowStep) => void;
  onSubmitConfirmedOrder: (
    payload: CompletedCheckoutPayload
  ) => Promise<{ orderNumber: string; isScheduled: boolean }>;
  onTrackPlacedOrder: () => void;
  onCancelFlow: () => void;
}

const CYLINDER_SIZES: CylinderSize[] = ['6kg', '13kg', '22.5kg', '29kg', '50kg'];

const CYLINDER_IMAGES: Record<CylinderSize, string> = {
  '6kg': img6kg,
  '13kg': img13kg,
  '22.5kg': img29kg,
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
  onSelectLocation,
  onRequestAuthForCheckout,
  onSubmitConfirmedOrder,
  onTrackPlacedOrder,
  onCancelFlow,
}) => {
  const [step, setStep] = useState<OrderFlowStep>(initialStep);
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
  const [infoShopModal, setInfoShopModal] = useState<Supplier | null>(null);

  // Delivery Details Form
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [fullName, setFullName] = useState(customerSession?.user.fullName || 'Wangari Mwangi');
  const [phoneNumber, setPhoneNumber] = useState(customerSession?.user.phoneNumber || '0712 345 678');
  const [building, setBuilding] = useState(currentLocation.details || '');
  const [unitNumber, setUnitNumber] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState(
    'Call at gate. Digital scale weight check required.'
  );
  const [saveNewAddress, setSaveNewAddress] = useState(false);
  const [addressLabel, setAddressLabel] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [isPinMapOpen, setIsPinMapOpen] = useState(false);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('payhero_mpesa');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Confirmation
  const [confirmedOrderNumber, setConfirmedOrderNumber] = useState<string>('OG-10428');
  const [confirmedWasScheduled, setConfirmedWasScheduled] = useState(false);

  useEffect(() => {
    setStep(initialStep);
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
          setSavedAddresses(addrs);
          const def = addrs.find((a) => a.isDefault) || addrs[0];
          if (def) {
            setSelectedAddressId(def.id);
            if (def.buildingName) setBuilding(def.buildingName);
            if (def.houseOrFlatNumber) setUnitNumber(def.houseOrFlatNumber);
            if (def.deliveryNotes) setDeliveryInstructions(def.deliveryNotes);
          }
        })
        .catch(() => {});
    }
  }, [customerSession]);

  // Compute shop list based on coverage + brand filter
  const availableShops = React.useMemo(() => {
    const baseList =
      coverageResult?.eligibleSuppliers && coverageResult.eligibleSuppliers.length > 0
        ? coverageResult.eligibleSuppliers
        : suppliers;

    const sorted = [...baseList].sort((a, b) => {
      const aBrandMatch = brandPreference === 'Any' || a.brand === brandPreference ? 0 : 1;
      const bBrandMatch = brandPreference === 'Any' || b.brand === brandPreference ? 0 : 1;
      if (aBrandMatch !== bBrandMatch) return aBrandMatch - bBrandMatch;
      return a.distanceKm - b.distanceKm;
    });
    return sorted;
  }, [coverageResult, suppliers, brandPreference]);

  const getShopPriceForSelection = (shop: Supplier) => {
    const cyl = shop.cylinders.find((c) => c.size === selectedSize);
    if (cyl) {
      return purchaseType === 'refill' ? cyl.refillPrice : cyl.completePrice;
    }
    const bench = MARKET_BENCHMARK_PRICES[selectedSize];
    return purchaseType === 'refill' ? bench.refillPrice : bench.completePrice;
  };

  const unitPrice = getShopPriceForSelection(selectedSupplier);
  const subtotal = unitPrice * quantity;
  const deliveryFee = selectedSupplier.deliveryFee ?? 0;
  const totalPrice = subtotal + deliveryFee;

  const selectedDateObj = upcomingDates.find((d) => d.dateKey === selectedDateKey) || upcomingDates[0];
  const scheduledSummary = `${selectedDateObj.label} (${selectedDateObj.dayNum} ${selectedDateObj.month}) · ${selectedSlotLabel}`;

  const stepIndexMap: Record<OrderFlowStep, number> = {
    select_gas: 1,
    nearby_shops: 2,
    delivery_details: 3,
    order_summary: 4,
    payment: 5,
    confirmation: 6,
  };

  const stepTitles: Record<OrderFlowStep, string> = {
    select_gas: 'Select Your Gas',
    nearby_shops: 'Nearby Gas Shops',
    delivery_details: 'Delivery Details',
    order_summary: 'Order Summary',
    payment: 'Payment Method',
    confirmation: 'Order Confirmed',
  };

  const handleBack = () => {
    if (step === 'select_gas' || step === 'confirmation') {
      onCancelFlow();
    } else if (step === 'nearby_shops') {
      setStep('select_gas');
    } else if (step === 'delivery_details') {
      setStep('nearby_shops');
    } else if (step === 'order_summary') {
      setStep('delivery_details');
    } else if (step === 'payment') {
      setStep('order_summary');
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
      if (saveNewAddress && building.trim()) {
        await saveCustomerAddress({
          label: addressLabel,
          streetAddress: currentLocation.area || currentLocation.name,
          buildingName: building.trim(),
          houseOrFlatNumber: unitNumber.trim(),
          deliveryNotes: deliveryInstructions.trim(),
          location: {
            lat: currentLocation.coordinates.lat,
            lng: currentLocation.coordinates.lng,
          },
          isDefault: savedAddresses.length === 0,
        }).catch(() => {});
      }

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
      {/* Top Progress Header */}
      {step !== 'confirmation' && (
        <div className="mb-4 space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#15191C] hover:text-[#226946] cursor-pointer min-h-[40px]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{step === 'select_gas' ? 'Home' : 'Back'}</span>
            </button>

            <h1 className="text-base sm:text-lg font-extrabold text-[#15191C] tracking-tight">
              {stepTitles[step]}
            </h1>

            <span className="text-xs font-bold text-[#226946] tabular-nums">
              Step {stepIndexMap[step]}/5
            </span>
          </div>

          <div className="w-full h-1.5 bg-[#F6F7F8] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#226946] rounded-full transition-all duration-300"
              style={{ width: `${(stepIndexMap[step] / 5) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SCREEN 4: SELECT YOUR GAS                                */}
      {/* ======================================================== */}
      {step === 'select_gas' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-7 bg-white rounded-3xl border border-neutral-200/80 p-4 sm:p-6 space-y-5 shadow-2xs">
            {/* Delivery Timing Toggle (Order Now vs Schedule) */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 p-1 bg-[#F6F7F8] rounded-2xl gap-1">
                <button
                  type="button"
                  onClick={() => setTimingType('asap')}
                  className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    timingType === 'asap'
                      ? 'bg-[#226946] text-white shadow-xs'
                      : 'text-[#6B7280] hover:text-[#15191C]'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Order Now</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTimingType('scheduled')}
                  className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    timingType === 'scheduled'
                      ? 'bg-[#226946] text-white shadow-xs'
                      : 'text-[#6B7280] hover:text-[#15191C]'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Schedule</span>
                </button>
              </div>

              {timingType === 'scheduled' && (
                <div className="p-3.5 rounded-2xl bg-[#F8FAF9] border border-neutral-200/80 space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {upcomingDates.map((d) => (
                      <button
                        key={d.dateKey}
                        type="button"
                        onClick={() => setSelectedDateKey(d.dateKey)}
                        className={`px-3 py-2 rounded-xl border text-center min-w-[72px] shrink-0 cursor-pointer transition-all ${
                          selectedDateKey === d.dateKey
                            ? 'bg-[#226946] border-[#226946] text-white'
                            : 'bg-white border-neutral-200 text-[#15191C]'
                        }`}
                      >
                        <span className="text-[10px] font-semibold block opacity-80">{d.label}</span>
                        <span className="text-sm font-extrabold tabular-nums">
                          {d.dayNum} {d.month}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {AVAILABLE_DELIVERY_TIME_SLOTS.slice(0, 4).map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setSelectedSlotLabel(slot.label)}
                        className={`px-3 py-2 rounded-xl border text-left text-xs font-semibold cursor-pointer flex items-center justify-between ${
                          selectedSlotLabel === slot.label
                            ? 'bg-[#EDF6F1] border-[#226946] text-[#226946]'
                            : 'bg-white border-neutral-200 text-[#15191C]'
                        }`}
                      >
                        <span>{slot.label}</span>
                        {selectedSlotLabel === slot.label && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Refill vs Exchange / New Complete Set */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                1. Order Type
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => onChangePurchaseType('refill')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    purchaseType === 'refill'
                      ? 'border-[#226946] bg-[#EDF6F1] ring-1 ring-[#226946]'
                      : 'border-neutral-200 bg-white hover:bg-[#F6F7F8]'
                  }`}
                >
                  <span className="text-sm font-extrabold text-[#15191C] block">Refill Gas</span>
                  <span className="text-[11px] text-[#6B7280]">Swap your empty cylinder</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChangePurchaseType('complete')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    purchaseType === 'complete'
                      ? 'border-[#226946] bg-[#EDF6F1] ring-1 ring-[#226946]'
                      : 'border-neutral-200 bg-white hover:bg-[#F6F7F8]'
                  }`}
                >
                  <span className="text-sm font-extrabold text-[#15191C] block">
                    Exchange / Complete
                  </span>
                  <span className="text-[11px] text-[#6B7280]">Full cylinder + tamper seal</span>
                </button>
              </div>
            </div>

            {/* Cylinder Sizes: 6kg, 13kg, 22.5kg, 29kg, 50kg */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                2. Cylinder Size
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {CYLINDER_SIZES.map((sz) => {
                  const info = MARKET_BENCHMARK_PRICES[sz];
                  const price = purchaseType === 'refill' ? info.refillPrice : info.completePrice;
                  const active = selectedSize === sz;
                  return (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => onChangeSize(sz)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                        active
                          ? 'border-[#226946] bg-[#EDF6F1] ring-1 ring-[#226946]'
                          : 'border-neutral-200 bg-white hover:border-neutral-300'
                      }`}
                    >
                      <img
                        src={CYLINDER_IMAGES[sz]}
                        alt={sz}
                        className="w-10 h-10 object-contain rounded-lg bg-[#F6F7F8] p-1 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <span className="text-sm font-extrabold text-[#15191C] block">{sz}</span>
                        <span className="text-xs font-bold text-[#226946] tabular-nums block">
                          KSh {price.toLocaleString()}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* LPG Brand Preference */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                3. Gas Brand
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(
                  [
                    { id: 'Any', label: 'Any Brand' },
                    { id: 'K-Gas', label: 'K-Gas' },
                    { id: 'TotalEnergies', label: 'TotalEnergies' },
                    { id: 'Shell Gas', label: 'Shell Gas' },
                  ] as Array<{ id: GasBrand; label: string }>
                ).map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => onChangeBrandPreference(b.id)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      brandPreference === b.id
                        ? 'bg-[#226946] border-[#226946] text-white'
                        : 'bg-[#F6F7F8] border-transparent text-[#15191C] hover:bg-neutral-200/70'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity Stepper */}
            <div className="p-3.5 rounded-2xl bg-[#F6F7F8] flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-[#15191C] block">Quantity</span>
                <span className="text-xs text-[#6B7280]">
                  {MARKET_BENCHMARK_PRICES[selectedSize].approxWeight}
                </span>
              </div>
              <div className="inline-flex items-center gap-3 bg-white px-3 py-1.5 rounded-full border border-neutral-200">
                <button
                  type="button"
                  onClick={() => onChangeQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="w-7 h-7 rounded-full bg-[#F6F7F8] text-[#15191C] flex items-center justify-center disabled:opacity-35 cursor-pointer"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-sm font-extrabold text-[#15191C] w-5 text-center tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => onChangeQuantity(Math.min(5, quantity + 1))}
                  disabled={quantity >= 5}
                  className="w-7 h-7 rounded-full bg-[#226946] text-white flex items-center justify-center disabled:opacity-35 cursor-pointer"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Summary Card */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-neutral-200/80 p-5 space-y-4 shadow-2xs lg:sticky lg:top-20">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-[#F6F7F8] p-2 flex items-center justify-center shrink-0">
                <img
                  src={CYLINDER_IMAGES[selectedSize]}
                  alt={selectedSize}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <p className="text-xs font-bold text-[#226946] uppercase tracking-wider">
                  {brandPreference === 'Any' ? 'Any Verified Shop' : brandPreference}
                </p>
                <h3 className="text-lg font-extrabold text-[#15191C]">
                  {quantity}x {selectedSize} {purchaseType === 'refill' ? 'Refill' : 'Complete Set'}
                </h3>
                <p className="text-xs text-[#6B7280]">
                  {timingType === 'scheduled' ? scheduledSummary : 'ASAP Express Delivery'}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-sm">
              <span className="text-[#6B7280]">Estimated Product Price</span>
              <span className="text-lg font-extrabold text-[#15191C] tabular-nums">
                KSh{' '}
                {(
                  (purchaseType === 'refill'
                    ? MARKET_BENCHMARK_PRICES[selectedSize].refillPrice
                    : MARKET_BENCHMARK_PRICES[selectedSize].completePrice) * quantity
                ).toLocaleString()}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setStep('nearby_shops')}
              className="w-full min-h-[50px] py-3.5 px-5 rounded-2xl bg-[#226946] hover:bg-[#195136] text-white font-bold text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
            >
              <span>Find Nearby Gas Shops</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SCREEN 5: NEARBY GAS SHOPS                               */}
      {/* ======================================================== */}
      {step === 'nearby_shops' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-2.5">
            <MapboxDeliveryMap
              currentLocation={currentLocation}
              suppliers={availableShops}
              activeOrder={null}
              coverageResult={coverageResult}
              onSelectLocation={onSelectLocation}
              heightClassName="h-[220px] sm:h-[280px] lg:h-[400px]"
              hideSearchOverlay={true}
            />
            <div className="px-1 flex items-center justify-between text-xs text-[#6B7280]">
              <span>
                Showing {availableShops.length} nearby shops for{' '}
                <strong className="text-[#15191C]">{selectedSize}</strong>
              </span>
              <button
                type="button"
                onClick={onOpenLocationModal}
                className="font-bold text-[#226946] hover:underline cursor-pointer"
              >
                Change Area
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-3">
            {availableShops.map((shop) => {
              const isSelected = selectedSupplier.id === shop.id;
              const isFav = favoriteSupplierIds.includes(shop.id);
              const shopUnitPrice = getShopPriceForSelection(shop);

              return (
                <div
                  key={shop.id}
                  onClick={() => setSelectedSupplier(shop)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedSupplier(shop);
                    }
                  }}
                  className={`rounded-2xl border p-4 transition-all cursor-pointer bg-white flex flex-col gap-3 ${
                    isSelected
                      ? 'border-[#226946] ring-2 ring-[#226946]/25 bg-[#EDF6F1]/30'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <SupplierLettermark brand={shop.brand} className="w-11 h-11 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm sm:text-base font-extrabold text-[#15191C] truncate">
                            {shop.name}
                          </h3>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              shop.isOpen
                                ? 'bg-[#EDF6F1] text-[#226946]'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {shop.isOpen ? 'Open' : 'Closed'}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center flex-wrap gap-x-2 text-xs text-[#6B7280]">
                          <span className="inline-flex items-center gap-0.5 font-bold text-[#15191C]">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            {shop.rating.toFixed(1)}
                          </span>
                          <span>·</span>
                          <span className="tabular-nums">{shop.distanceKm} km away</span>
                          <span>·</span>
                          <span className="font-semibold text-[#226946] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {shop.deliveryTimeMin}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-base font-extrabold text-[#15191C] tabular-nums block">
                        KSh {shopUnitPrice.toLocaleString()}
                      </span>
                      <span className="text-[11px] font-semibold text-[#226946]">
                        {shop.deliveryFee === 0 ? 'Free delivery' : `+KSh ${shop.deliveryFee} delivery`}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-neutral-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavoriteSupplier(shop.id);
                        }}
                        className="p-2 rounded-xl bg-[#F6F7F8] hover:bg-[#EDF6F1] text-[#6B7280] cursor-pointer"
                        aria-label="Toggle favourite gas shop"
                      >
                        <Heart
                          className={`w-4 h-4 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInfoShopModal(shop);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#F6F7F8] hover:bg-neutral-200 text-xs font-bold text-[#15191C] inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Info className="w-3.5 h-3.5 text-[#226946]" />
                        <span>Shop Details</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSupplier(shop);
                        setStep('delivery_details');
                      }}
                      className="px-4 py-2 rounded-xl bg-[#226946] hover:bg-[#195136] text-white text-xs font-bold cursor-pointer transition-colors"
                    >
                      Select Shop →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SCREEN 6: DELIVERY DETAILS                               */}
      {/* ======================================================== */}
      {step === 'delivery_details' && (
        <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 space-y-5 shadow-2xs">
          {/* Pinned Location + Interactive Pin Trigger */}
          <div className="p-4 rounded-2xl bg-[#EDF6F1] border border-[#226946]/20 flex items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <MapPin className="w-5 h-5 text-[#226946] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-[#226946]">
                  Pinned Delivery Location
                </p>
                <p className="text-sm font-extrabold text-[#15191C] truncate">
                  {currentLocation.name}
                </p>
                <p className="text-xs text-[#6B7280] truncate">{currentLocation.area}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsPinMapOpen(!isPinMapOpen)}
              className="px-3 py-2 rounded-xl bg-white hover:bg-neutral-50 text-[#226946] text-xs font-bold border border-[#226946]/20 cursor-pointer shrink-0"
            >
              {isPinMapOpen ? 'Hide Map' : 'Move Pin'}
            </button>
          </div>

          {isPinMapOpen && (
            <div className="space-y-2 animate-in fade-in">
              <MapboxDeliveryMap
                currentLocation={currentLocation}
                suppliers={[selectedSupplier]}
                coverageResult={coverageResult}
                onSelectLocation={onSelectLocation}
                heightClassName="h-[220px]"
              />
              <p className="text-[11px] text-[#6B7280]">
                Drag the green pin or use GPS to set your exact gate coordinates.
              </p>
            </div>
          )}

          {/* Saved Delivery Addresses Quick Selectors */}
          {savedAddresses.length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                Saved Delivery Addresses
              </label>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {savedAddresses.map((addr) => {
                  const active = selectedAddressId === addr.id;
                  return (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => {
                        setSelectedAddressId(addr.id);
                        if (addr.buildingName) setBuilding(addr.buildingName);
                        if (addr.houseOrFlatNumber) setUnitNumber(addr.houseOrFlatNumber);
                        if (addr.deliveryNotes) setDeliveryInstructions(addr.deliveryNotes);
                      }}
                      className={`px-3.5 py-2 rounded-xl border text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                        active
                          ? 'bg-[#226946] border-[#226946] text-white'
                          : 'bg-[#F6F7F8] border-transparent text-[#15191C] hover:bg-neutral-200'
                      }`}
                    >
                      {addr.label} · {addr.buildingName || addr.streetAddress}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Customer Contact & Address Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div>
              <label className="block font-bold text-[#15191C] mb-1">Recipient Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-3.5 py-3 rounded-xl bg-[#F6F7F8] text-sm text-[#15191C] font-medium outline-hidden focus:ring-2 focus:ring-[#226946] focus:bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-[#15191C] mb-1">Phone Number</label>
              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="0712 345 678"
                className="w-full px-3.5 py-3 rounded-xl bg-[#F6F7F8] text-sm text-[#15191C] font-medium outline-hidden focus:ring-2 focus:ring-[#226946] focus:bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-[#15191C] mb-1">Building / Apartment / Court</label>
              <input
                type="text"
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                placeholder="e.g. Silver Oak Court"
                className="w-full px-3.5 py-3 rounded-xl bg-[#F6F7F8] text-sm text-[#15191C] font-medium outline-hidden focus:ring-2 focus:ring-[#226946] focus:bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-[#15191C] mb-1">House / Floor / Gate #</label>
              <input
                type="text"
                value={unitNumber}
                onChange={(e) => setUnitNumber(e.target.value)}
                placeholder="e.g. Apt 4B, 2nd Floor"
                className="w-full px-3.5 py-3 rounded-xl bg-[#F6F7F8] text-sm text-[#15191C] font-medium outline-hidden focus:ring-2 focus:ring-[#226946] focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#15191C] mb-1">
              Delivery Instructions
            </label>
            <textarea
              rows={2}
              value={deliveryInstructions}
              onChange={(e) => setDeliveryInstructions(e.target.value)}
              placeholder="Optional gate instructions or landmarks..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F7F8] text-sm text-[#15191C] font-medium outline-hidden focus:ring-2 focus:ring-[#226946] focus:bg-white"
            />
          </div>

          {customerSession && (
            <div className="p-3 rounded-2xl bg-[#F6F7F8] flex flex-wrap items-center justify-between gap-2 text-xs">
              <label className="flex items-center gap-2 font-semibold text-[#15191C] cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveNewAddress}
                  onChange={(e) => setSaveNewAddress(e.target.checked)}
                  className="w-4 h-4 accent-[#226946] rounded cursor-pointer"
                />
                <span>Save this location to my profile</span>
              </label>

              {saveNewAddress && (
                <div className="flex items-center gap-1">
                  {(['Home', 'Work', 'Other'] as const).map((lbl) => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setAddressLabel(lbl)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] cursor-pointer ${
                        addressLabel === lbl
                          ? 'bg-[#226946] text-white'
                          : 'bg-white text-[#6B7280]'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setStep('order_summary')}
            className="w-full min-h-[50px] py-3.5 px-5 rounded-2xl bg-[#226946] hover:bg-[#195136] text-white font-bold text-sm transition-colors cursor-pointer"
          >
            Continue to Order Summary
          </button>
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
            <button
              type="button"
              onClick={() => setStep('nearby_shops')}
              className="text-xs font-bold text-[#226946] hover:underline cursor-pointer shrink-0"
            >
              Change
            </button>
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

      {/* Shop Detail Info Bottom Sheet Modal (Reference Row 1 Col 5) */}
      {infoShopModal && (
        <div
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4"
          onClick={() => setInfoShopModal(null)}
          role="presentation"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl text-left animate-in slide-in-from-bottom-4 duration-150"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-[#15191C]">Gas Shop Information</h3>
              <button
                type="button"
                onClick={() => setInfoShopModal(null)}
                className="w-8 h-8 rounded-full hover:bg-[#F6F7F8] flex items-center justify-center cursor-pointer"
                aria-label="Close shop details"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#F6F7F8]">
              <SupplierLettermark brand={infoShopModal.brand} className="w-12 h-12 shrink-0" />
              <div>
                <h4 className="text-base font-extrabold text-[#15191C]">{infoShopModal.name}</h4>
                <p className="text-xs text-[#6B7280]">{infoShopModal.locationArea}</p>
                <p className="text-xs font-bold text-[#226946] mt-0.5">
                  ★ {infoShopModal.rating.toFixed(1)} ({infoShopModal.reviewCount} verified reviews)
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs sm:text-sm divide-y divide-neutral-100">
              <div className="flex justify-between py-2">
                <span className="text-[#6B7280]">{selectedSize} Price</span>
                <span className="font-extrabold text-[#15191C] tabular-nums">
                  KSh {getShopPriceForSelection(infoShopModal).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[#6B7280]">Estimated Delivery Time</span>
                <span className="font-bold text-[#226946]">{infoShopModal.deliveryTimeMin}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[#6B7280]">Hours Today</span>
                <span className="font-semibold text-[#15191C]">Closes {infoShopModal.closingTime}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#EDF6F1] text-xs text-[#195136] flex items-start gap-2">
              <Flame className="w-4 h-4 text-[#226946] shrink-0 mt-0.5" />
              <span>
                EPRA-licensed gas depot. Every dispatch includes a certified digital hanging scale check and tamper-seal verification at your doorstep.
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedSupplier(infoShopModal);
                setInfoShopModal(null);
                setStep('delivery_details');
              }}
              className="w-full min-h-[48px] py-3 rounded-2xl bg-[#226946] hover:bg-[#195136] text-white font-bold text-sm cursor-pointer"
            >
              Confirm Gas Shop
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
