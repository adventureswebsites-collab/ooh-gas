import React from 'react';
import { CylinderSize, PurchaseType, CylinderPriceItem } from '../types';
import { Check } from 'lucide-react';

interface CylinderPriceOptionsProps {
  cylinders: CylinderPriceItem[];
  selectedSize: CylinderSize;
  purchaseType: PurchaseType;
  onSelectSize: (size: CylinderSize) => void;
}

export const CylinderPriceOptions: React.FC<CylinderPriceOptionsProps> = ({
  cylinders,
  selectedSize,
  purchaseType,
  onSelectSize,
}) => {
  return (
    <div className="w-full">
      <div className="grid grid-cols-3 gap-1.5 min-[360px]:gap-2 sm:gap-2.5">
        {cylinders.map((cyl) => {
          const isSelected = selectedSize === cyl.size;
          const price = purchaseType === 'refill' ? cyl.refillPrice : cyl.completePrice;

          return (
            <button
              key={cyl.size}
              type="button"
              onClick={() => onSelectSize(cyl.size)}
              className={`text-left p-1.5 min-[360px]:p-2 min-[400px]:p-2.5 rounded-lg border transition-all cursor-pointer relative flex flex-col justify-between min-h-[60px] min-[360px]:min-h-[64px] active:scale-[0.98] ${
                isSelected
                  ? 'border-[#166534] bg-[#f0fdf4] ring-1 ring-[#166534] shadow-xs'
                  : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-800'
              }`}
              aria-label={`Select ${cyl.size} at KSh ${price.toLocaleString()}`}
            >
              {/* Header row: Size & check indicator */}
              <div className="flex items-center justify-between w-full">
                <span
                  className={`text-[11px] min-[360px]:text-xs font-bold uppercase tracking-tight ${
                    isSelected ? 'text-[#14532d]' : 'text-slate-800'
                  }`}
                >
                  {cyl.size}
                </span>

                {isSelected ? (
                  <div className="w-3.5 h-3.5 rounded-full bg-[#166534] text-white flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                ) : cyl.popular ? (
                  <span className="text-[8.5px] min-[360px]:text-[9px] font-semibold text-slate-500 uppercase">
                    Std
                  </span>
                ) : null}
              </div>

              {/* Price display in KSh - Guaranteed no clipping on 320px–430px */}
              <div className="my-0.5 w-full">
                <div className="flex items-baseline whitespace-nowrap">
                  <span className="text-[9.5px] min-[360px]:text-[10.5px] sm:text-xs text-slate-500 font-semibold mr-0.5">
                    KSh
                  </span>
                  <span
                    className={`text-[12px] min-[360px]:text-[13px] min-[400px]:text-[14px] sm:text-base font-extrabold tracking-tight tabular-nums leading-tight ${
                      isSelected ? 'text-[#14532d]' : 'text-slate-900'
                    }`}
                  >
                    {price.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Purchase type descriptor */}
              <div className="text-[8.5px] min-[360px]:text-[9.5px] sm:text-[10px] text-slate-500 font-medium truncate w-full">
                {purchaseType === 'refill' ? 'Refill only' : 'New cylinder'}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
