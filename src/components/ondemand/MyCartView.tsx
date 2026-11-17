import React, { useState, useEffect } from 'react';
import {
  NairobiLocation,
  CoverageCheckResult,
  PaymentMethod,
} from '../../types';
import {
  CustomerAuthSession,
  getCustomerSavedAddresses,
} from '../../services/customerAuthService';
import { MOCK_SAVED_ADDRESSES } from '../../data/mockData';
import { CustomerAddress } from '../../types/multisupplier';
import { CartItem } from './CylinderDetailModal';
import {
  ArrowLeft,
  ChevronRight,
  MapPin,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import img6kg from '../../assets/images/lpg_cylinder_6kg_1791888342390.jpg';
import img13kg from '../../assets/images/lpg_cylinder_13kg_1791888361570.jpg';
import img29kg from '../../assets/images/lpg_cylinder_29kg_1791888380688.jpg';

interface MyCartViewProps {
  cartItems: CartItem[];
  onUpdateQuantity: (itemId: string, delta: number) => void;
  onRemoveItem: (itemId: string) => void;
  onBrowseMenu: () => void;
  onBackToHome: () => void;
  currentLocation: NairobiLocation;
  coverageResult?: CoverageCheckResult | null;
  onOpenLocationModal: () => void;
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
  onPlaceOrder: (details: {
    fullName: string;
    phoneNumber: string;
    estate: string;
    building: string;
    unitNumber: string;
    deliveryInstructions: string;
    paymentMethod: PaymentMethod;
  }) => void;
}

export const MyCartView: React.FC<MyCartViewProps> = ({
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onBrowseMenu,
  onBackToHome,
  currentLocation,
  coverageResult,
  onOpenLocationModal,
  customerSession,
  onRequestLogin,
  onPlaceOrder,
}) => {
  const defaultSaved = MOCK_SAVED_ADDRESSES[0];
  const [fullName, setFullName] = useState(customerSession?.user.fullName || defaultSaved.fullName);
  const [phoneNumber, setPhoneNumber] = useState(
    customerSession?.user.phoneNumber || defaultSaved.phoneNumber
  );
  const [building, setBuilding] = useState(defaultSaved.building);
  const [unitNumber, setUnitNumber] = useState(defaultSaved.unitNumber);
  const [deliveryInstructions, setDeliveryInstructions] = useState(
    defaultSaved.deliveryInstructions
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mpesa_on_delivery');
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);

  useEffect(() => {
    if (customerSession) {
      setFullName(customerSession.user.fullName);
      setPhoneNumber(customerSession.user.phoneNumber);
      getCustomerSavedAddresses().then((addrs) => {
        setSavedAddresses(addrs);
        const def = addrs.find((a) => a.isDefault) || addrs[0];
        if (def) {
          if (def.buildingName) setBuilding(def.buildingName);
          if (def.houseOrFlatNumber) setUnitNumber(def.houseOrFlatNumber);
          if (def.deliveryNotes) setDeliveryInstructions(def.deliveryNotes);
        }
      });
    }
  }, [customerSession]);

  const images: Record<string, string> = {
    '6kg': img6kg,
    '13kg': img13kg,
    '22.5kg': img29kg,
    '29kg': img29kg,
    '50kg': img29kg,
  };

  const zoneConfig = coverageResult?.eligibleSuppliers?.[0]?.zoneConfig;
  const deliveryFee = zoneConfig?.deliveryFee ?? 0;
  const isCovered = coverageResult?.isCovered ?? true;

  const subtotal = cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const totalCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = subtotal + (cartItems.length > 0 ? deliveryFee : 0);

  const handleCheckout = () => {
    const details = {
      fullName: fullName.trim() || 'Ooh Gas Customer',
      phoneNumber: phoneNumber.trim() || '0712 345 678',
      estate: currentLocation.name,
      building: building.trim() || currentLocation.area || 'Main Gate',
      unitNumber: unitNumber.trim() || 'Gate Delivery',
      deliveryInstructions: deliveryInstructions.trim(),
      paymentMethod,
    };

    if (!customerSession && onRequestLogin) {
      onRequestLogin(details);
      return;
    }

    onPlaceOrder(details);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5 pb-28 text-left animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-[#15191C] hover:text-[#226946] cursor-pointer min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>My Cart</span>
        </button>

        <span className="text-xs text-[#6B7280] font-medium tabular-nums">
          {totalCount} {totalCount === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Signature Forest Green Delivery Location Card (Matches Reference Row 4 Col 4) */}
      <button
        type="button"
        onClick={onOpenLocationModal}
        className="w-full bg-[#226946] hover:bg-[#195136] text-white rounded-2xl p-4 flex items-center justify-between gap-3 transition-colors cursor-pointer text-left shadow-sm"
      >
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-200 shrink-0" />
            <span className="text-sm font-bold truncate">
              Delivery to {currentLocation.name.split(',')[0]}
            </span>
          </div>
          <p className="text-xs text-emerald-100 truncate pl-6">
            {building ? `${building}, ` : ''}
            {currentLocation.area || 'Nairobi County'}
          </p>
          <div className="pl-6">
            <span className="inline-block bg-white text-[#226946] text-[11px] font-bold px-2.5 py-0.5 rounded-lg tabular-nums">
              {coverageResult?.primaryZone?.name || '1.8 km · Active Zone'}
            </span>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-emerald-100 shrink-0" />
      </button>

      {!isCovered && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Outside Delivery Zone</p>
            <p className="text-amber-800 mt-0.5">
              Please update your delivery pin above to an active Nairobi service area.
            </p>
          </div>
        </div>
      )}

      {/* Empty Cart State */}
      {cartItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#EDF6F1] text-[#226946] mx-auto flex items-center justify-center">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#15191C]">Your Cart is Empty</h3>
            <p className="text-xs text-[#6B7280] max-w-xs mx-auto">
              Choose a 6kg, 13kg, or 29kg cooking gas refill or complete cylinder to get started.
            </p>
          </div>
          <button
            type="button"
            onClick={onBrowseMenu}
            className="px-6 py-3 rounded-2xl bg-[#226946] hover:bg-[#195136] text-white text-sm font-bold transition-colors cursor-pointer"
          >
            Browse Gas Menu
          </button>
        </div>
      ) : (
        <>
          {/* Your Order List (Matches Reference Row 4 Col 4 Item Cards) */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-[#15191C]">
              Your Order ({totalCount})
            </h2>

            <div className="bg-white rounded-2xl border border-neutral-200/80 divide-y divide-neutral-100 overflow-hidden">
              {cartItems.map((item) => (
                <div key={item.id} className="p-3.5 flex items-center gap-3.5">
                  <div className="w-16 h-16 rounded-xl bg-[#F6F7F8] flex items-center justify-center p-1.5 shrink-0">
                    <img
                      src={images[item.size]}
                      alt={`${item.size} LPG`}
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-[#15191C] truncate">
                          {item.size} {item.purchaseType === 'refill' ? 'Gas Refill' : 'New Complete Set'}
                        </h3>
                        <p className="text-[11px] text-[#6B7280] truncate">
                          {item.brandPreference === 'Any' ? 'Any Verified Depot' : item.brandPreference}
                          {item.includeNewRegulator ? ' · + Regulator' : ''}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.id)}
                        className="p-1 text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      {/* Circular Green Stepper */}
                      <div className="inline-flex items-center gap-2.5 bg-[#F6F7F8] px-2 py-1 rounded-full">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.id, -1)}
                          className="w-6 h-6 rounded-full bg-white text-[#15191C] flex items-center justify-center shadow-2xs hover:bg-neutral-100 cursor-pointer"
                          aria-label="Decrease"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold text-[#15191C] w-4 text-center tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.id, 1)}
                          className="w-6 h-6 rounded-full bg-[#226946] text-white flex items-center justify-center hover:bg-[#195136] cursor-pointer"
                          aria-label="Increase"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="text-sm font-extrabold text-[#15191C] tabular-nums">
                        KSh {(item.unitPrice * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Saved Address Quick Selector & Contact Details */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#15191C]">Delivery Details</h3>
              {savedAddresses.length > 0 && (
                <div className="flex items-center gap-1.5">
                  {savedAddresses.slice(0, 2).map((addr) => (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => {
                        if (addr.buildingName) setBuilding(addr.buildingName);
                        if (addr.houseOrFlatNumber) setUnitNumber(addr.houseOrFlatNumber);
                        if (addr.deliveryNotes) setDeliveryInstructions(addr.deliveryNotes);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#EDF6F1] text-[#226946] text-[11px] font-bold hover:bg-[#DFEFE6] cursor-pointer"
                    >
                      {addr.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">
                  Recipient Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#F6F7F8] text-[#15191C] font-medium focus:outline-none focus:ring-2 focus:ring-[#226946]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#F6F7F8] text-[#15191C] font-medium focus:outline-none focus:ring-2 focus:ring-[#226946]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">
                  Building / Estate Court
                </label>
                <input
                  type="text"
                  value={building}
                  onChange={(e) => setBuilding(e.target.value)}
                  placeholder="e.g. Silver Oak Court"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#F6F7F8] text-[#15191C] font-medium focus:outline-none focus:ring-2 focus:ring-[#226946]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">
                  House / Unit Number
                </label>
                <input
                  type="text"
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(e.target.value)}
                  placeholder="e.g. Apt 4B"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#F6F7F8] text-[#15191C] font-medium focus:outline-none focus:ring-2 focus:ring-[#226946]"
                />
              </div>
            </div>

            {/* Payment Option Toggle */}
            <div className="pt-1">
              <span className="block text-[11px] font-semibold text-[#6B7280] mb-1.5">
                Payment on Delivery (After Digital Scale Verification)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('mpesa_on_delivery')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    paymentMethod === 'mpesa_on_delivery'
                      ? 'bg-[#EDF6F1] border-[#226946] text-[#226946]'
                      : 'bg-[#F6F7F8] border-transparent text-[#6B7280]'
                  }`}
                >
                  M-Pesa Paybill / Till
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash_on_delivery')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    paymentMethod === 'cash_on_delivery'
                      ? 'bg-[#EDF6F1] border-[#226946] text-[#226946]'
                      : 'bg-[#F6F7F8] border-transparent text-[#6B7280]'
                  }`}
                >
                  Cash on Delivery
                </button>
              </div>
            </div>
          </div>

          {/* Summary & Place Order CTA */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 p-4 space-y-3">
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-[#6B7280]">
                <span>Subtotal</span>
                <span className="font-semibold text-[#15191C] tabular-nums">
                  KSh {subtotal.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-[#6B7280]">
                <span>Delivery Fee</span>
                <span className="font-semibold text-[#226946] tabular-nums">
                  {deliveryFee === 0 ? 'Free' : `KSh ${deliveryFee}`}
                </span>
              </div>
              <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
                <span className="text-sm font-bold text-[#15191C]">Total</span>
                <span className="text-lg font-extrabold text-[#15191C] tabular-nums">
                  KSh {totalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            {!customerSession && (
              <p className="text-[11px] text-[#6B7280] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#226946] shrink-0" />
                <span>You will be prompted to sign in before dispatching your order.</span>
              </p>
            )}

            <button
              type="button"
              onClick={handleCheckout}
              disabled={!isCovered}
              className="w-full min-h-[48px] py-3.5 px-5 rounded-2xl bg-[#226946] hover:bg-[#195136] disabled:bg-neutral-300 text-white font-bold text-sm transition-colors cursor-pointer"
            >
              {customerSession
                ? `Place Order · KSh ${totalAmount.toLocaleString()}`
                : 'Sign In & Place Order'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
