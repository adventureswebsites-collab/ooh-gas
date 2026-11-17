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
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {cylinders.map((cyl) => {
          const isSelected = selectedSize === cyl.size;
          const price = purchaseType === 'refill' ? cyl.refillPrice : cyl.completePrice;

          return (
            <button
              key={cyl.size}
              type="button"
              onClick={() => onSelectSize(cyl.size)}
                className={`text-left p-2 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between min-h-[58px] active:scale-[0.99] ${
                isSelected
                  ? 'border-[#226946] bg-[#EDF6F1]/60 ring-1 ring-[#226946]'
                  : 'border-neutral-200 bg-white hover:border-neutral-300 text-[#15191C]'
              }`}
              aria-label={`Select ${cyl.size} at KSh ${price.toLocaleString()}`}
            >
              {/* Header row: Size & check indicator */}
              <div className="flex items-center justify-between w-full">
                <span
                  className={`text-xs font-bold uppercase tracking-tight ${
                    isSelected ? 'text-[#226946] font-extrabold' : 'text-neutral-700'
                  }`}
                >
                  {cyl.size}
                </span>

                {isSelected ? (
                  <div className="w-3.5 h-3.5 rounded-full bg-[#226946] text-white flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                ) : cyl.popular ? (
                  <span className="text-[8.5px] font-semibold text-neutral-400 uppercase">
                    Std
                  </span>
                ) : null}
              </div>

              {/* Price display in KSh */}
              <div className="my-0.5 w-full">
                <div className="flex items-baseline whitespace-nowrap">
                  <span className="text-[10px] text-neutral-500 font-semibold mr-0.5">KSh</span>
                  <span
                    className={`text-xs min-[360px]:text-sm sm:text-base font-extrabold tracking-tight tabular-nums leading-tight ${
                      isSelected ? 'text-[#15191C]' : 'text-neutral-900'
                    }`}
                  >
                    {price.toLocaleString()}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
