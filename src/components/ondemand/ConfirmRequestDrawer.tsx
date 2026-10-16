import React, { useState, useEffect } from 'react';
import {
  CylinderSize,
  PurchaseType,
  GasBrand,
  PaymentMethod,
  NairobiLocation,
  CoverageCheckResult,
} from '../../types';
import { MOCK_SAVED_ADDRESSES, MARKET_BENCHMARK_PRICES } from '../../data/mockData';
import { validateOrderEligibility } from '../../services/deliveryZoneService';
import {
  CustomerAuthSession,
  getCustomerSavedAddresses,
} from '../../services/customerAuthService';
import { CustomerAddress } from '../../types/multisupplier';
import {
  X,
  MapPin,
  Scale,
  Phone,
  User,
  Check,
  ArrowRight,
  Banknote,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Lock,
  Sparkles,
} from 'lucide-react';

interface ConfirmRequestDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSize: CylinderSize;
  purchaseType: PurchaseType;
  brandPreference: GasBrand;
  quantity: number;
  currentLocation: NairobiLocation;
  coverageResult?: CoverageCheckResult | null;
  customerSession?: CustomerAuthSession | null;
  onRequestLogin?: (pendingDetails: {
    fullName: string;
    phoneNumber: string;
    estate: string;
    building: string;
    unitNumber: string;
    deliveryInstructions: string;
    paymentMethod: PaymentMethod;
  }) => void;
  onConfirmAndMatch: (details: {
    fullName: string;
    phoneNumber: string;
    estate: string;
    building: string;
    unitNumber: string;
    deliveryInstructions: string;
    paymentMethod: PaymentMethod;
  }) => void;
}

export const ConfirmRequestDrawer: React.FC<ConfirmRequestDrawerProps> = ({
  isOpen,
  onClose,
  selectedSize,
  purchaseType,
  brandPreference,
  quantity,
  currentLocation,
  coverageResult,
  customerSession,
  onRequestLogin,
  onConfirmAndMatch,
}) => {
  const defaultSaved = MOCK_SAVED_ADDRESSES[0];
  const [fullName, setFullName] = useState(customerSession?.user.fullName || defaultSaved.fullName);
  const [phoneNumber, setPhoneNumber] = useState(customerSession?.user.phoneNumber || defaultSaved.phoneNumber);
  const [estate, setEstate] = useState(currentLocation.name);
  const [building, setBuilding] = useState(defaultSaved.building);
  const [unitNumber, setUnitNumber] = useState(defaultSaved.unitNumber);
  const [deliveryInstructions, setDeliveryInstructions] = useState(defaultSaved.deliveryInstructions);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mpesa_on_delivery');

  // Customer Saved Addresses from database
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  // Backend verification state
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setEstate(currentLocation.name);
    setValidationError(null);
  }, [currentLocation.name]);

  useEffect(() => {
    if (customerSession) {
      setFullName(customerSession.user.fullName);
      setPhoneNumber(customerSession.user.phoneNumber);

      getCustomerSavedAddresses().then((addrs) => {
        setSavedAddresses(addrs);
        const defaultAddr = addrs.find((a) => a.isDefault) || addrs[0];
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
          if (defaultAddr.buildingName) setBuilding(defaultAddr.buildingName);
          if (defaultAddr.houseOrFlatNumber) setUnitNumber(defaultAddr.houseOrFlatNumber);
          if (defaultAddr.deliveryNotes) setDeliveryInstructions(defaultAddr.deliveryNotes);
        }
      });
    }
  }, [customerSession]);

  if (!isOpen) return null;

  const currentPricing = MARKET_BENCHMARK_PRICES[selectedSize];
  const unitPrice =
    purchaseType === 'refill' ? currentPricing.refillPrice : currentPricing.completePrice;

  // Use zone-specific delivery fee from backend coverage
  const zoneConfig = coverageResult?.eligibleSuppliers?.[0]?.zoneConfig;
  const deliveryFee = zoneConfig?.deliveryFee ?? 0;
  const subtotal = unitPrice * quantity;
  const totalPrice = subtotal + deliveryFee;

  const handleSelectSavedAddress = (addr: CustomerAddress) => {
    setSelectedAddressId(addr.id);
    if (addr.buildingName) setBuilding(addr.buildingName);
    if (addr.houseOrFlatNumber) setUnitNumber(addr.houseOrFlatNumber);
    if (addr.deliveryNotes) setDeliveryInstructions(addr.deliveryNotes);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const pendingDetails = {
      fullName,
      phoneNumber,
      estate,
      building,
      unitNumber,
      deliveryInstructions,
      paymentMethod,
    };

    // REQUIRE LOGIN BEFORE COMPLETING ORDER
    if (!customerSession) {
      onRequestLogin?.(pendingDetails);
      return;
    }

    setIsValidating(true);

    // Authoritative backend recheck before accepting order
    const validationRes = await validateOrderEligibility({
      lat: currentLocation.coordinates.lat,
      lng: currentLocation.coordinates.lng,
      cylinderSize: selectedSize,
      purchaseType,
      quantity,
    });

    setIsValidating(false);

    if (!validationRes.valid) {
      setValidationError(
        validationRes.error || 'Destination coordinates are not covered by an active delivery zone.'
      );
      return;
    }

    onConfirmAndMatch(pendingDetails);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity"
      role="presentation"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-4 duration-200 text-left"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-request-title"
      >
        {/* Mobile Grab Notch */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300 mx-auto mt-2 mb-0.5 sm:hidden shrink-0" />

        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div>
            <h2 id="confirm-request-title" className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
              Confirm Delivery Details
            </h2>
            <p className="text-[11px] text-slate-500">
              Delivery to {currentLocation.name.split(',')[0]}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center cursor-pointer transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 space-y-4 flex-1">
          {/* Authentication Status Banner */}
          {customerSession ? (
            <div className="p-2.5 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] text-xs text-[#14532d] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#166534] shrink-0" />
                <span className="truncate">
                  Ordering as <strong>{customerSession.user.fullName}</strong> ({customerSession.user.phoneNumber})
                </span>
              </div>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                Logged In ✓
              </span>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5 animate-in fade-in">
              <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="block">Sign In Required to Complete Order</strong>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  You will be prompted to sign in or create your customer account so you can track your live courier and verify cylinder weight.
                </p>
              </div>
            </div>
          )}

          {/* Summary Box */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
            <div>
              <div className="text-xs font-bold text-slate-900">
                {quantity}x {selectedSize} ({purchaseType === 'refill' ? 'Refill' : 'Complete Set'})
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Gas: KSh {subtotal.toLocaleString()} + Zone Delivery: {deliveryFee === 0 ? 'Free' : `KSh ${deliveryFee}`}
              </div>
            </div>
            <div className="text-right">
              <div className="text-base font-black text-[#14532d]">
                KSh {totalPrice.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500">Pay on delivery</div>
            </div>
          </div>

          {/* Saved Addresses Quick Pick (if logged in and has saved addresses) */}
          {customerSession && savedAddresses.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider">
                Select Saved Address
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {savedAddresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => handleSelectSavedAddress(addr)}
                    className={`py-1 px-2.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                      selectedAddressId === addr.id
                        ? 'bg-[#14532d] text-white border-[#14532d]'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>{addr.label}</span>
                    {addr.isDefault && (
                      <span className="text-[9px] opacity-80">(Default)</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Delivery Address Fields */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#14532d]" />
              <span>Delivery Recipient Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Recipient Name
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#14532d]"
                    placeholder="Full Name"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#14532d]"
                    placeholder="0712 345 678"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Building / Apartment / Court
                </label>
                <input
                  type="text"
                  required
                  value={building}
                  onChange={(e) => setBuilding(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#14532d]"
                  placeholder="e.g. Silver Oak Court"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  House / Unit #
                </label>
                <input
                  type="text"
                  required
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#14532d]"
                  placeholder="e.g. Block B, Apt 4B"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Estate / Delivery Area
              </label>
              <input
                type="text"
                required
                value={estate}
                onChange={(e) => setEstate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#14532d]"
                placeholder="e.g. Kilimani"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Doorstep Delivery Instructions
              </label>
              <textarea
                value={deliveryInstructions}
                onChange={(e) => setDeliveryInstructions(e.target.value)}
                rows={2}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#14532d]"
                placeholder="e.g. Call when at the security gate, 2nd floor, elevator available"
              />
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Banknote className="w-3.5 h-3.5 text-[#14532d]" />
              <span>Payment Option</span>
            </h3>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('mpesa_on_delivery')}
                className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors cursor-pointer ${
                  paymentMethod === 'mpesa_on_delivery'
                    ? 'border-[#14532d] bg-[#f0fdf4]'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-[#008638] text-white font-extrabold text-[10px] flex items-center justify-center">
                    M
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Lipa Na M-Pesa on Delivery
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Pay via M-Pesa prompt after doorstep weight verification
                    </div>
                  </div>
                </div>
                {paymentMethod === 'mpesa_on_delivery' && (
                  <Check className="w-4 h-4 text-[#14532d] stroke-[3]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('cash_on_delivery')}
                className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors cursor-pointer ${
                  paymentMethod === 'cash_on_delivery'
                    ? 'border-[#14532d] bg-[#f0fdf4]'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-slate-800 text-white font-extrabold text-[10px] flex items-center justify-center">
                    KES
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Cash on Delivery
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Pay cash to courier upon verification
                    </div>
                  </div>
                </div>
                {paymentMethod === 'cash_on_delivery' && (
                  <Check className="w-4 h-4 text-[#14532d] stroke-[3]" />
                )}
              </button>
            </div>
          </div>

          {/* Scale notice */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 flex items-start gap-2 text-[11px] text-slate-600">
            <Scale className="w-4 h-4 text-[#14532d] shrink-0 mt-0.5" />
            <div>
              <strong>Digital Scale Guarantee:</strong> Courier carries a calibrated digital scale to verify net gas weight before payment is finalized.
            </div>
          </div>

          {/* Backend Validation Error Banner */}
          {validationError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 flex items-start gap-2 text-[11px] text-rose-800 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong>Order Pre-Check Error:</strong> {validationError}
              </div>
            </div>
          )}

          {/* Action Trigger */}
          <button
            type="submit"
            disabled={isValidating}
            className="w-full min-h-[48px] py-3 rounded-xl bg-[#14532d] hover:bg-[#166534] active:bg-[#0f3d21] text-white font-extrabold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isValidating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-lime-300" />
                <span>Verifying Coverage & Supplier Stock...</span>
              </>
            ) : !customerSession ? (
              <>
                <Lock className="w-4 h-4 text-[#bef264]" />
                <span>Sign In to Complete Order</span>
                <ArrowRight className="w-4 h-4 text-[#bef264]" />
              </>
            ) : (
              <>
                <span>Confirm & Find My Gas</span>
                <ArrowRight className="w-4 h-4 text-[#bef264]" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
