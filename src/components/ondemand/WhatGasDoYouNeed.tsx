import React, { useState } from 'react';
import {
  CylinderSize,
  PurchaseType,
  GasBrand,
  NairobiLocation,
  CoverageCheckResult,
} from '../../types';
import { MARKET_BENCHMARK_PRICES } from '../../data/mockData';
import {
  ArrowRight,
  AlertTriangle,
  MapPin,
  Search,
  Zap,
  Calendar,
  ChevronRight,
} from 'lucide-react';

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
  onRequestGas: (timingMode?: 'asap' | 'scheduled') => void;
  onOpenLocationModal?: () => void;
  onOpenSupplierComparison?: () => void;
  onOpenMenu?: () => void;
  onOpenCylinderDetail?: (size: CylinderSize, purchaseType?: PurchaseType) => void;
  brandPreference?: GasBrand;
  onChangeBrandPreference?: (brand: GasBrand) => void;
}

const ALL_SIZES: CylinderSize[] = ['6kg', '13kg', '22.5kg', '29kg', '50kg'];

export const WhatGasDoYouNeed: React.FC<WhatGasDoYouNeedProps> = ({
  selectedSize,
  onChangeSize,
  purchaseType,
  onChangePurchaseType,
  currentLocation,
  coverageResult,
  onRequestGas,
  onOpenLocationModal,
  onOpenMenu,
  brandPreference = 'Any',
  onChangeBrandPreference,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const currentPricing = MARKET_BENCHMARK_PRICES[selectedSize];
  const unitPrice =
    purchaseType === 'refill' ? currentPricing.refillPrice : currentPricing.completePrice;

  const isCovered = coverageResult?.isCovered ?? true;
  const primarySupplierConfig = coverageResult?.eligibleSuppliers?.[0]?.zoneConfig;
  const deliveryWindow = primarySupplierConfig?.estimatedDeliveryMin ?? '15–20 min';

  const handleQuickSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.toLowerCase();
    if (q.includes('6')) onChangeSize('6kg');
    else if (q.includes('22')) onChangeSize('22.5kg');
    else if (q.includes('29')) onChangeSize('29kg');
    else if (q.includes('50')) onChangeSize('50kg');
    else if (q.includes('13')) onChangeSize('13kg');

    if (q.includes('k-gas') || q.includes('kgas')) onChangeBrandPreference?.('K-Gas');
    else if (q.includes('total')) onChangeBrandPreference?.('TotalEnergies');
    else if (q.includes('shell')) onChangeBrandPreference?.('Shell Gas');

    onRequestGas('asap');
  };

  return (
    <section className="bg-white rounded-3xl border border-neutral-200/80 p-4 sm:p-5 space-y-4 text-left shadow-sm">
      {/* Bottom-Sheet Drag Notch on Mobile (Reference Row 1 Col 2) */}
      <div className="w-10 h-1 rounded-full bg-neutral-200 mx-auto -mt-1 md:hidden" />

      {/* Current Delivery Location Pill Bar */}
      <button
        type="button"
        onClick={onOpenLocationModal}
        className="w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-2xl bg-[#EDF6F1] hover:bg-[#DFEFE6] text-left transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="w-4 h-4 text-[#226946] shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-[#15191C] truncate">
              {currentLocation.name}
            </p>
            <p className="text-[11px] text-[#226946] font-medium truncate tabular-nums">
              {isCovered
                ? `Active delivery zone · ETA ${deliveryWindow}`
                : 'Tap to switch to an active delivery zone'}
            </p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-[#226946] shrink-0" />
      </button>

      {/* Main Prompt Heading + Search Gas Input */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#15191C] tracking-tight">
            What gas do you need?
          </h1>
          {onOpenMenu && (
            <button
              type="button"
              onClick={onOpenMenu}
              className="text-xs font-bold text-[#226946] hover:underline cursor-pointer shrink-0"
            >
              Browse All
            </button>
          )}
        </div>

        <form onSubmit={handleQuickSearchSubmit} className="relative">
          <Search className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search 6kg, 13kg, 22.5kg, K-Gas, TotalEnergies..."
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#F6F7F8] focus:bg-white border border-transparent focus:border-[#226946] text-sm text-[#15191C] placeholder:text-[#6B7280] outline-hidden transition-all"
          />
        </form>
      </div>

      {/* Mode Cards matching Reference Row 1 Col 2 (Order Now vs Schedule) */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => onRequestGas('asap')}
          className="p-3.5 rounded-2xl bg-[#EDF6F1] hover:bg-[#DFEFE6] border border-[#226946]/25 text-left transition-all cursor-pointer flex items-center justify-between gap-2"
        >
          <div>
            <span className="text-sm font-extrabold text-[#15191C] block">Order Now</span>
            <span className="text-[11px] text-[#226946] font-semibold">
              ASAP · {deliveryWindow}
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-[#226946] text-white flex items-center justify-center shrink-0">
            <Zap className="w-4.5 h-4.5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onRequestGas('scheduled')}
          className="p-3.5 rounded-2xl bg-[#F6F7F8] hover:bg-[#EFF1F3] border border-neutral-200/70 text-left transition-all cursor-pointer flex items-center justify-between gap-2"
        >
          <div>
            <span className="text-sm font-extrabold text-[#15191C] block">Schedule</span>
            <span className="text-[11px] text-[#6B7280] font-medium">Pick date &amp; slot</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-white border border-neutral-200 text-[#226946] flex items-center justify-center shrink-0">
            <Calendar className="w-4.5 h-4.5" />
          </div>
        </button>
      </div>

      {/* Quick Refill vs Exchange Toggle + All 5 Cylinder Sizes */}
      <div className="space-y-2.5 pt-1">
        <div className="grid grid-cols-2 p-1 bg-[#F6F7F8] rounded-xl gap-1">
          <button
            type="button"
            onClick={() => onChangePurchaseType('refill')}
            className={`py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              purchaseType === 'refill'
                ? 'bg-white text-[#226946] shadow-2xs'
                : 'text-[#6B7280] hover:text-[#15191C]'
            }`}
          >
            Refill Gas
          </button>
          <button
            type="button"
            onClick={() => onChangePurchaseType('complete')}
            className={`py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              purchaseType === 'complete'
                ? 'bg-white text-[#226946] shadow-2xs'
                : 'text-[#6B7280] hover:text-[#15191C]'
            }`}
          >
            Exchange / New Set
          </button>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
          {ALL_SIZES.map((sz) => {
            const active = selectedSize === sz;
            const info = MARKET_BENCHMARK_PRICES[sz];
            const szPrice = purchaseType === 'refill' ? info.refillPrice : info.completePrice;
            return (
              <button
                key={sz}
                type="button"
                onClick={() => onChangeSize(sz)}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  active
                    ? 'border-[#226946] bg-[#EDF6F1] ring-1 ring-[#226946]'
                    : 'border-neutral-200 bg-white hover:bg-[#F6F7F8]'
                }`}
              >
                <span
                  className={`text-xs font-extrabold block ${
                    active ? 'text-[#226946]' : 'text-[#15191C]'
                  }`}
                >
                  {sz}
                </span>
                <span className="text-[11px] font-bold text-[#6B7280] tabular-nums block">
                  KSh {szPrice.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {!isCovered && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Outside Active Delivery Coverage</span>
          </div>
          <p className="text-[11px] text-amber-800">
            {coverageResult?.message || 'Tap location above to choose a covered estate.'}
          </p>
        </div>
      )}

      {/* Prominent "Order Gas" Primary CTA Button (Screen 3) */}
      <button
        type="button"
        onClick={() => onRequestGas('asap')}
        className="w-full min-h-[52px] py-3.5 px-5 rounded-2xl bg-[#226946] hover:bg-[#195136] text-white font-bold text-sm sm:text-base shadow-sm transition-colors flex items-center justify-between cursor-pointer"
      >
        <span>
          Order Gas · {selectedSize} {brandPreference !== 'Any' ? `(${brandPreference})` : ''}
        </span>
        <span className="inline-flex items-center gap-1.5 font-extrabold tabular-nums">
          <span>KSh {unitPrice.toLocaleString()}</span>
          <ArrowRight className="w-4 h-4" />
        </span>
      </button>
    </section>
  );
};
