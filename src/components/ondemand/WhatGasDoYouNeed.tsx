import { CylinderSize, PurchaseType, NairobiLocation, CoverageCheckResult } from '../../types';
import { MARKET_BENCHMARK_PRICES } from '../../data/mockData';
import { Plus, Minus, ArrowRight, Check, AlertTriangle, MapPin } from 'lucide-react';
import img6kg from '../../assets/images/lpg_cylinder_6kg_1791888342390.jpg';
import img13kg from '../../assets/images/lpg_cylinder_13kg_1791888361570.jpg';
import img29kg from '../../assets/images/lpg_cylinder_29kg_1791888380688.jpg';

interface WhatGasDoYouNeedProps {
  selectedSize: CylinderSize;
  onChangeSize: (size: CylinderSize) => void;
  purchaseType: PurchaseType;
  onChangePurchaseType: (type: PurchaseType) => void;
  quantity: number;
  onChangeQuantity: (qty: number) => void;
  currentLocation: NairobiLocation;
  coverageResult?: CoverageCheckResult | null;
  isCoverageLoading?: boolean;
  onRequestGas: () => void;
  onOpenLocationModal?: () => void;
  onOpenSupplierComparison?: () => void;
}

export const WhatGasDoYouNeed: React.FC<WhatGasDoYouNeedProps> = ({
  selectedSize,
  onChangeSize,
  purchaseType,
  onChangePurchaseType,
  quantity,
  onChangeQuantity,
  currentLocation,
  coverageResult,
  isCoverageLoading = false,
  onRequestGas,
  onOpenLocationModal,
  onOpenSupplierComparison,
}) => {
  const currentPricing = MARKET_BENCHMARK_PRICES[selectedSize];
  const unitPrice =
    purchaseType === 'refill' ? currentPricing.refillPrice : currentPricing.completePrice;

  // Derive zone-specific delivery fee if covered, default 100
  const isCovered = coverageResult?.isCovered ?? true;
  const primarySupplierConfig = coverageResult?.eligibleSuppliers?.[0]?.zoneConfig;
  const deliveryFee = primarySupplierConfig?.deliveryFee ?? 100;
  const deliveryWindow = primarySupplierConfig?.estimatedDeliveryMin ?? '15–25 min';

  const subtotal = unitPrice * quantity;
  const totalPrice = subtotal + deliveryFee;

  const cylinderOptions: {
    size: CylinderSize;
    label: string;
    description: string;
    image: string;
    popular?: boolean;
  }[] = [
    {
      size: '6kg',
      label: 'Compact',
      description: 'Ideal for 1–2 people',
      image: img6kg,
    },
    {
      size: '13kg',
      label: 'Standard',
      description: 'Most popular family size',
      image: img13kg,
      popular: true,
    },
    {
      size: '29kg',
      label: 'Large',
      description: 'Commercial & heavy use',
      image: img29kg,
    },
  ];

  return (
    <section className="bg-white rounded-2xl border border-slate-200/90 p-3.5 min-[360px]:p-4 sm:p-5 shadow-sm space-y-4 text-left">
      {/* Friendly, Clean Heading */}
      <div>
        <h1 className="text-lg min-[360px]:text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
          What gas do you need today?
        </h1>
        <p className="text-xs text-slate-500 mt-1 leading-normal">
          Doorstep delivery to{' '}
          <span className="font-semibold text-slate-800">
            {currentLocation.name.split(',')[0]}
          </span>{' '}
          in ~15–20 minutes.
        </p>
      </div>

      {/* 1. Cylinder Cards with Realistic Product Photos */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-800 block">
          Select Cylinder Size
        </label>

        <div className="grid grid-cols-3 gap-1.5 min-[360px]:gap-2 sm:gap-2.5">
          {cylinderOptions.map((item) => {
            const isSelected = selectedSize === item.size;
            const price =
              purchaseType === 'refill'
                ? MARKET_BENCHMARK_PRICES[item.size].refillPrice
                : MARKET_BENCHMARK_PRICES[item.size].completePrice;

            return (
              <button
                key={item.size}
                type="button"
                onClick={() => onChangeSize(item.size)}
                className={`relative p-2 min-[360px]:p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#14532d] bg-emerald-50/30 ring-1 ring-[#14532d] shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                {/* Subtle Popular Pill */}
                {item.popular && (
                  <span className="absolute -top-2 right-1.5 sm:right-2 text-[9px] font-bold text-white bg-[#14532d] px-1.5 py-0.5 rounded-full shadow-2xs">
                    Popular
                  </span>
                )}

                {/* Cylinder Product Photo */}
                <div className="w-full aspect-square max-h-16 min-[360px]:max-h-20 sm:max-h-24 rounded-lg overflow-hidden bg-slate-50 mb-1.5 flex items-center justify-center p-1 border border-slate-100">
                  <img
                    src={item.image}
                    alt={`${item.size} cooking gas cylinder`}
                    className="w-full h-full object-contain"
                    loading="eager"
                  />
                </div>

                {/* Cylinder Details */}
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs min-[360px]:text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                      {item.size}
                    </span>
                    {isSelected && (
                      <span className="w-3.5 h-3.5 min-[360px]:w-4 min-[360px]:h-4 rounded-full bg-[#14532d] text-white flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] min-[360px]:text-[11px] text-slate-500 block truncate leading-tight mt-0.5">
                    {item.label}
                  </span>
                </div>

                {/* Price Display */}
                <div className="mt-2 pt-1.5 border-t border-slate-100">
                  <span className="text-xs min-[360px]:text-sm font-extrabold text-slate-900 block leading-tight truncate">
                    KSh {price.toLocaleString()}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Clear Refill vs Complete Cylinder Segmented Control */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-800 block">
          Order Type
        </label>

        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200/80 gap-1 text-xs">
          <button
            type="button"
            onClick={() => onChangePurchaseType('refill')}
            className={`py-2 px-2 rounded-lg font-bold transition-all text-center cursor-pointer min-h-[42px] flex flex-col items-center justify-center ${
              purchaseType === 'refill'
                ? 'bg-white text-[#14532d] shadow-2xs ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="leading-tight text-xs font-bold">Refill Only</span>
            <span className="text-[10px] font-normal text-slate-500 hidden min-[360px]:inline">
              I have an empty cylinder to swap
            </span>
          </button>

          <button
            type="button"
            onClick={() => onChangePurchaseType('complete')}
            className={`py-2 px-2 rounded-lg font-bold transition-all text-center cursor-pointer min-h-[42px] flex flex-col items-center justify-center ${
              purchaseType === 'complete'
                ? 'bg-white text-[#14532d] shadow-2xs ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="leading-tight text-xs font-bold">Complete Cylinder Set</span>
            <span className="text-[10px] font-normal text-slate-500 hidden min-[360px]:inline">
              New cylinder + gas included
            </span>
          </button>
        </div>
      </div>

      {/* 3. Quantity & Pricing Breakdown */}
      <div className="space-y-2 pt-0.5">
        <div className="flex items-center justify-between py-0.5">
          <span className="text-xs font-bold text-slate-800">Quantity</span>
          <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
            <button
              type="button"
              onClick={() => onChangeQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="w-6 h-6 rounded border border-slate-200 bg-white flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Decrease quantity"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="w-4 text-center text-xs font-bold text-slate-900">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => onChangeQuantity(Math.min(5, quantity + 1))}
              disabled={quantity >= 5}
              className="w-6 h-6 rounded border border-slate-200 bg-white flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Increase quantity"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Clear, Honest Price Breakdown */}
        <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3 space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-slate-600">
            <span>
              {quantity}x {selectedSize} {purchaseType === 'refill' ? 'Refill' : 'Complete Set'}
            </span>
            <span className="font-semibold text-slate-900">
              KSh {subtotal.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-600">
            <span>
              Doorstep delivery fee ({deliveryWindow})
            </span>
            <span className="font-semibold text-slate-900">
              {deliveryFee === 0 ? (
                <span className="text-emerald-700 font-bold uppercase text-[11px]">Free</span>
              ) : (
                `KSh ${deliveryFee}`
              )}
            </span>
          </div>

          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-900 block leading-tight">
                Total Estimate
              </span>
              <span className="text-[10px] text-slate-500">
                Pay on delivery after weight check
              </span>
            </div>
            <span className="text-base sm:text-lg font-black text-[#14532d]">
              KSh {totalPrice.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Out of Delivery Zone Warning Banner */}
      {!isCovered && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1.5 animate-in fade-in">
          <div className="flex items-center gap-1.5 font-bold text-xs">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Outside Active Delivery Coverage</span>
          </div>
          <p className="text-[11px] text-rose-700 leading-relaxed">
            {coverageResult?.message ||
              'Your pinned location is outside active delivery zones. Ooh Gas currently serves Kilimani, Westlands, Lavington, and Karen.'}
          </p>
          {onOpenLocationModal && (
            <button
              type="button"
              onClick={onOpenLocationModal}
              className="mt-1 text-xs font-bold text-rose-800 hover:text-rose-950 underline flex items-center gap-1 cursor-pointer"
            >
              <MapPin className="w-3 h-3" />
              <span>Choose Supported Nairobi Area</span>
            </button>
          )}
        </div>
      )}

      {/* 4. Action Button: "Find My Gas" or "Select Supported Location" */}
      {isCovered ? (
        <button
          type="button"
          onClick={onRequestGas}
          className="w-full min-h-[48px] sm:min-h-[52px] py-3 px-5 rounded-xl bg-[#14532d] hover:bg-[#166534] active:bg-[#0f3d21] text-white font-extrabold text-sm sm:text-base shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Find My Gas</span>
          <ArrowRight className="w-4 h-4 text-[#bef264]" />
        </button>
      ) : (
        <button
          type="button"
          onClick={onOpenLocationModal || onRequestGas}
          className="w-full min-h-[48px] sm:min-h-[52px] py-3 px-5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-sm sm:text-base shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <MapPin className="w-4 h-4 text-slate-500" />
          <span>Change Location (Unsupported Area)</span>
        </button>
      )}

      {/* Honest Reassurance Note */}
      <p className="text-center text-[11px] text-slate-500">
        Every cylinder includes a doorstep scale weight verification before payment.
      </p>

      {/* Discrete Secondary Link */}
      {onOpenSupplierComparison && (
        <div className="pt-1 text-center border-t border-slate-100">
          <button
            type="button"
            onClick={onOpenSupplierComparison}
            className="text-xs font-semibold text-slate-500 hover:text-[#14532d] hover:underline cursor-pointer py-1 inline-flex items-center gap-1"
          >
            <span>Or browse nearby suppliers directly</span>
            <span aria-hidden="true">↓</span>
          </button>
        </div>
      )}
    </section>
  );
};
