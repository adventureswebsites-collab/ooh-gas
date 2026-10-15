import React from 'react';
import { Supplier, CylinderSize, PurchaseType } from '../../types';
import { SupplierLettermark } from '../BrandIdentities';
import { Minus, Plus, AlertCircle, ShieldCheck, Check } from 'lucide-react';

interface StepCylinderSelectionProps {
  supplier: Supplier;
  selectedSize: CylinderSize;
  onChangeSize: (size: CylinderSize) => void;
  purchaseType: PurchaseType;
  onChangePurchaseType: (type: PurchaseType) => void;
  quantity: number;
  onChangeQuantity: (qty: number) => void;
}

export const StepCylinderSelection: React.FC<StepCylinderSelectionProps> = ({
  supplier,
  selectedSize,
  onChangeSize,
  purchaseType,
  onChangePurchaseType,
  quantity,
  onChangeQuantity,
}) => {
  const currentCylinder =
    supplier.cylinders.find((c) => c.size === selectedSize) || supplier.cylinders[1];

  const unitPrice =
    purchaseType === 'refill' ? currentCylinder.refillPrice : currentCylinder.completePrice;

  const runningSubtotal = unitPrice * quantity;

  const handleDecrement = () => {
    if (quantity > 1) {
      onChangeQuantity(quantity - 1);
    }
  };

  const handleIncrement = () => {
    if (quantity < 5) {
      onChangeQuantity(quantity + 1);
    }
  };

  return (
    <div className="space-y-4 text-left">
      {/* 1. Selected Supplier Summary Card */}
      <div className="p-3 sm:p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <SupplierLettermark brand={supplier.brand} className="w-9 h-9 sm:w-10 sm:h-10 shrink-0" />
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              {supplier.name}
            </h3>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">
              {supplier.distanceKm} km · {supplier.deliveryTimeMin} · Closes {supplier.closingTime}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="text-[11px] font-bold text-[#166534] bg-[#f0fdf4] border border-[#bbf7d0] px-2 py-0.5 rounded">
            {supplier.deliveryFee === 0 ? 'Free Delivery' : `+KSh ${supplier.deliveryFee} Fee`}
          </span>
        </div>
      </div>

      {/* 2. Purchase Type: Refill vs Complete Cylinder */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Order Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onChangePurchaseType('refill')}
            className={`p-3 min-h-[52px] rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              purchaseType === 'refill'
                ? 'border-[#14532d] bg-[#f0fdf4] ring-1 ring-[#14532d]'
                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-bold text-slate-900">Refill Exchange</span>
              {purchaseType === 'refill' && (
                <span className="w-4 h-4 rounded-full bg-[#14532d] text-white flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Gas refill only (swap empty cylinder)</p>
          </button>

          <button
            type="button"
            onClick={() => onChangePurchaseType('complete')}
            className={`p-3 min-h-[52px] rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              purchaseType === 'complete'
                ? 'border-[#14532d] bg-[#f0fdf4] ring-1 ring-[#14532d]'
                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-bold text-slate-900">Complete Set</span>
              {purchaseType === 'complete' && (
                <span className="w-4 h-4 rounded-full bg-[#14532d] text-white flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">New cylinder + initial gas + valve</p>
          </button>
        </div>

        {/* Informative Refill Callout */}
        {purchaseType === 'refill' ? (
          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="leading-snug text-[11.5px]">
              <strong>Refill Requirement:</strong> A compatible empty <strong>{selectedSize}</strong> cylinder in good condition is required at delivery for exchange. If you do not have an empty cylinder to swap, choose <strong>Complete Set</strong>.
            </div>
          </div>
        ) : (
          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div className="leading-snug text-[11.5px]">
              <strong>Brand New Cylinder:</strong> Includes official certified brand cylinder, safety valve, and initial factory gas fill.
            </div>
          </div>
        )}
      </div>

      {/* 3. Cylinder Size Selector */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Select Cylinder Size
        </label>
        <div className="grid grid-cols-3 gap-2">
          {supplier.cylinders.map((cyl) => {
            const isSelected = cyl.size === selectedSize;
            const price = purchaseType === 'refill' ? cyl.refillPrice : cyl.completePrice;

            return (
              <button
                key={cyl.size}
                type="button"
                onClick={() => onChangeSize(cyl.size)}
                className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[72px] sm:min-h-[80px] active:scale-[0.98] ${
                  isSelected
                    ? 'border-[#14532d] bg-[#f0fdf4] ring-1 ring-[#14532d] shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-xs sm:text-sm font-bold uppercase ${isSelected ? 'text-[#14532d]' : 'text-slate-900'}`}>
                    {cyl.size}
                  </span>
                  {isSelected ? (
                    <div className="w-3.5 h-3.5 rounded-full bg-[#14532d] text-white flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  ) : cyl.popular ? (
                    <span className="text-[8.5px] font-semibold text-slate-500 uppercase bg-slate-100 px-1 py-0.2 rounded">
                      Std
                    </span>
                  ) : null}
                </div>

                <div className="mt-1">
                  <span className="text-[10px] text-slate-500 font-semibold mr-0.5">KSh</span>
                  <span className={`text-xs sm:text-sm font-extrabold tabular-nums ${isSelected ? 'text-[#14532d]' : 'text-slate-900'}`}>
                    {price.toLocaleString()}
                  </span>
                </div>

                <span className="text-[9.5px] text-slate-400 mt-0.5">
                  {cyl.size === '6kg' ? 'Compact' : cyl.size === '13kg' ? 'Standard' : 'Commercial'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Quantity Selector (+ and - controls) */}
      <div className="space-y-1.5 pt-1">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Quantity
        </label>
        <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white">
          <div>
            <div className="text-xs sm:text-sm font-bold text-slate-900">
              {selectedSize} {purchaseType === 'refill' ? 'Refill' : 'Complete Cylinder'}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              KSh {unitPrice.toLocaleString()} each
            </div>
          </div>

          {/* Stepper with Min 44px Touch Targets */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDecrement}
              disabled={quantity <= 1}
              className={`w-11 h-11 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                quantity <= 1
                  ? 'border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed'
                  : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-100 active:scale-95'
              }`}
              aria-label="Decrease quantity"
            >
              <Minus className="w-4 h-4 stroke-[2.5]" />
            </button>

            <span className="text-base sm:text-lg font-extrabold text-slate-900 min-w-[24px] text-center tabular-nums">
              {quantity}
            </span>

            <button
              type="button"
              onClick={handleIncrement}
              disabled={quantity >= 5}
              className={`w-11 h-11 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                quantity >= 5
                  ? 'border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed'
                  : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-100 active:scale-95'
              }`}
              aria-label="Increase quantity"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Running Subtotal Bar */}
      <div className="p-3 sm:p-3.5 rounded-xl bg-slate-100/90 border border-slate-200 flex items-center justify-between text-xs">
        <div>
          <span className="text-slate-500">Item Subtotal:</span>
          <div className="text-[11px] text-slate-600 font-medium">
            {quantity} × KSh {unitPrice.toLocaleString()}
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm sm:text-base font-extrabold text-[#14532d] tabular-nums">
            KSh {runningSubtotal.toLocaleString()}
          </div>
          <div className="text-[10.5px] text-slate-500">
            {supplier.deliveryFee === 0 ? 'Free delivery' : `+KSh ${supplier.deliveryFee} delivery`}
          </div>
        </div>
      </div>
    </div>
  );
};
