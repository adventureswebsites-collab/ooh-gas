import React, { useState } from 'react';
import { Supplier, CylinderSize, PurchaseType } from '../types';
import { SupplierLettermark } from './BrandIdentities';
import { CylinderPriceOptions } from './CylinderPriceOptions';
import { Star, ArrowRight, Clock } from 'lucide-react';

interface SupplierCardProps {
  supplier: Supplier;
  onOrderNow: (supplier: Supplier, size: CylinderSize, purchaseType: PurchaseType) => void;
}

export const SupplierCard: React.FC<SupplierCardProps> = ({ supplier, onOrderNow }) => {
  const [selectedSize, setSelectedSize] = useState<CylinderSize>('13kg');
  const [purchaseType, setPurchaseType] = useState<PurchaseType>('refill');

  const selectedCylinder =
    supplier.cylinders.find((c) => c.size === selectedSize) || supplier.cylinders[1];
  const activePrice =
    purchaseType === 'refill' ? selectedCylinder.refillPrice : selectedCylinder.completePrice;

  return (
    <article className="rounded-2xl border border-neutral-200/90 bg-white p-3.5 sm:p-4 transition-all hover:border-neutral-300 shadow-2xs flex flex-col text-left">
      {/* Top Header: Supplier Identity & Meta */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <SupplierLettermark
            brand={supplier.brand}
            className="w-10 h-10 mt-0.5 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-extrabold text-black text-sm sm:text-base leading-tight truncate">
                {supplier.name}
              </h3>
              {supplier.isSampleListing && (
                <span className="text-[9px] font-semibold text-neutral-500 bg-neutral-100 px-1.5 py-0.2 rounded shrink-0">
                  Verified
                </span>
              )}
            </div>

            {/* Zero-Pill Unboxed Metadata: Rating · Distance · Delivery Time */}
            <div className="mt-1 flex items-center flex-wrap gap-x-1.5 gap-y-0.5 text-xs text-neutral-600">
              <div className="flex items-center gap-0.5 font-bold text-black shrink-0">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{supplier.rating.toFixed(1)}</span>
                <span className="text-neutral-400 font-normal">({supplier.reviewCount})</span>
              </div>

              <span className="text-neutral-300" aria-hidden="true">·</span>

              <span className="shrink-0">{supplier.distanceKm} km</span>

              <span className="text-neutral-300" aria-hidden="true">·</span>

              <span className="font-medium text-emerald-700 shrink-0 flex items-center gap-0.5">
                <Clock className="w-3 h-3 inline text-emerald-600" />
                <span>{supplier.deliveryTimeMin}</span>
              </span>
            </div>

            <p className="mt-0.5 text-[11px] text-neutral-500 truncate">
              {supplier.locationArea}
            </p>
          </div>
        </div>

        {/* Delivery Fee Notice */}
        <div className="shrink-0 text-right">
          {supplier.deliveryFee === 0 ? (
            <span className="text-xs font-bold text-emerald-700 whitespace-nowrap">
              Free delivery
            </span>
          ) : (
            <span className="text-xs font-medium text-neutral-600 whitespace-nowrap">
              KSh {supplier.deliveryFee} fee
            </span>
          )}
        </div>
      </div>

      {/* Segmented Switcher: Refill vs Complete Cylinder */}
      <div className="mt-2.5 pt-2 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
        <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
          Cylinder Options
        </span>

        <div className="grid grid-cols-2 sm:inline-flex rounded-lg bg-[#F6F7F8] p-1 text-xs w-full sm:w-auto gap-1">
          <button
            type="button"
            onClick={() => setPurchaseType('refill')}
            className={`py-1 px-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer text-center ${
              purchaseType === 'refill'
                ? 'bg-white text-[#226946] font-bold shadow-2xs'
                : 'text-[#6B7280] hover:text-[#15191C]'
            }`}
          >
            Refill (Gas Only)
          </button>
          <button
            type="button"
            onClick={() => setPurchaseType('complete')}
            className={`py-1 px-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer text-center ${
              purchaseType === 'complete'
                ? 'bg-white text-[#226946] font-bold shadow-2xs'
                : 'text-[#6B7280] hover:text-[#15191C]'
            }`}
          >
            New Complete Set
          </button>
        </div>
      </div>

      {/* Cylinder Prices: Horizontal 6kg, 13kg, 29kg */}
      <div className="mt-2">
        <CylinderPriceOptions
          cylinders={supplier.cylinders}
          selectedSize={selectedSize}
          purchaseType={purchaseType}
          onSelectSize={(size) => setSelectedSize(size)}
        />
      </div>

      {/* Bottom Action Row: Selected summary + Order button */}
      <div className="mt-2.5 pt-2 border-t border-neutral-100 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] text-[#6B7280] truncate">
            {selectedSize} {purchaseType === 'refill' ? 'Refill' : 'New Set'}
          </div>
          <div className="text-base sm:text-lg font-extrabold text-[#15191C] leading-tight truncate tabular-nums">
            KSh {activePrice.toLocaleString()}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onOrderNow(supplier, selectedSize, purchaseType)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[42px] rounded-xl bg-[#226946] hover:bg-[#195136] text-white text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 shadow-xs"
        >
          <span>Order Now</span>
          <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      </div>
    </article>
  );
};
