import React, { useState } from 'react';
import { Supplier, CylinderSize, PurchaseType } from '../types';
import { SupplierLettermark } from './BrandIdentities';
import { CylinderPriceOptions } from './CylinderPriceOptions';
import { Star, ArrowRight } from 'lucide-react';

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
    <article className="rounded-xl border border-slate-200 bg-white p-3 min-[360px]:p-3.5 sm:p-4 transition-all shadow-xs flex flex-col text-left">
      {/* Top Header: Supplier Identity & Meta */}
      <div className="flex items-start justify-between gap-2 min-[360px]:gap-3">
        <div className="flex items-start gap-2 min-[360px]:gap-2.5 min-w-0 flex-1">
          <SupplierLettermark brand={supplier.brand} className="w-9 h-9 min-[360px]:w-10 min-[360px]:h-10 mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold text-slate-900 text-xs min-[360px]:text-sm sm:text-base leading-tight truncate">
                {supplier.name}
              </h3>
              {supplier.isSampleListing && (
                <span className="text-[9px] min-[360px]:text-[10px] font-semibold text-slate-500 bg-slate-100 px-1 py-0.2 rounded shrink-0">
                  Sample
                </span>
              )}
            </div>

            {/* Zero-Pill Unboxed Metadata: Rating · Distance · Delivery Time */}
            <div className="mt-0.5 min-[360px]:mt-1 flex items-center flex-wrap gap-x-1.5 gap-y-0.5 text-[11px] min-[360px]:text-xs text-slate-600">
              <div className="flex items-center gap-0.5 font-semibold text-slate-800 shrink-0">
                <Star className="w-3 h-3 min-[360px]:w-3.5 min-[360px]:h-3.5 fill-amber-400 text-amber-400" />
                <span>{supplier.rating.toFixed(1)}</span>
                <span className="text-slate-400 font-normal">({supplier.reviewCount})</span>
              </div>

              <span className="text-slate-300" aria-hidden="true">·</span>

              <span className="shrink-0">{supplier.distanceKm} km</span>

              <span className="text-slate-300" aria-hidden="true">·</span>

              <span className="font-medium text-[#166534] shrink-0">{supplier.deliveryTimeMin}</span>
            </div>

            <p className="mt-0.5 text-[10.5px] min-[360px]:text-xs text-slate-500 truncate">
              {supplier.locationArea}
            </p>
          </div>
        </div>

        {/* Delivery Fee Notice */}
        <div className="shrink-0 text-right">
          {supplier.deliveryFee === 0 ? (
            <span className="text-[11px] min-[360px]:text-xs font-bold text-[#166534] whitespace-nowrap">
              Free delivery
            </span>
          ) : (
            <span className="text-[11px] min-[360px]:text-xs font-medium text-slate-600 whitespace-nowrap">
              KSh {supplier.deliveryFee} fee
            </span>
          )}
        </div>
      </div>

      {/* Segmented Switcher: Refill vs Complete Cylinder (Fluid Mobile Stacking) */}
      <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-col min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between gap-1.5">
        <span className="text-[11px] min-[360px]:text-xs font-semibold text-slate-700">
          Select Cylinder Size
        </span>

        {/* Clean, functional segmented control */}
        <div className="grid grid-cols-2 min-[420px]:inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs w-full min-[420px]:w-auto">
          <button
            type="button"
            onClick={() => setPurchaseType('refill')}
            className={`py-1.5 px-2 min-[420px]:px-2.5 rounded-md text-[11px] min-[360px]:text-xs font-medium transition-colors cursor-pointer text-center ${
              purchaseType === 'refill'
                ? 'bg-white text-slate-900 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="min-[400px]:hidden">Refill</span>
            <span className="hidden min-[400px]:inline">Refill (Gas Only)</span>
          </button>
          <button
            type="button"
            onClick={() => setPurchaseType('complete')}
            className={`py-1.5 px-2 min-[420px]:px-2.5 rounded-md text-[11px] min-[360px]:text-xs font-medium transition-colors cursor-pointer text-center ${
              purchaseType === 'complete'
                ? 'bg-white text-slate-900 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="min-[400px]:hidden">New Cylinder</span>
            <span className="hidden min-[400px]:inline">New Complete Set</span>
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

      {/* Bottom Action Row: Selected summary + Order button (Min 44px Touch Target) */}
      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 min-[360px]:gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] min-[360px]:text-[11px] text-slate-500 truncate">
            Selected: <strong className="text-slate-800">{selectedSize} {purchaseType === 'refill' ? 'Refill' : 'New'}</strong>
          </div>
          <div className="text-sm min-[360px]:text-base font-extrabold text-[#14532d] leading-tight truncate">
            KSh {activePrice.toLocaleString()}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onOrderNow(supplier, selectedSize, purchaseType)}
          className="flex items-center justify-center gap-1.5 px-3 min-[360px]:px-4 py-2.5 min-h-[44px] rounded-lg bg-[#14532d] hover:bg-[#166534] active:scale-[0.98] text-white text-xs min-[360px]:text-sm font-semibold transition-all cursor-pointer shrink-0 shadow-xs"
        >
          <span>Order Now</span>
          <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      </div>
    </article>
  );
};
