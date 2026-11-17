import React, { useState, useEffect } from 'react';
import { CylinderSize, PurchaseType, GasBrand } from '../../types';
import { MARKET_BENCHMARK_PRICES } from '../../data/mockData';
import { ArrowLeft, Heart, Minus, Plus, Check, ShieldCheck } from 'lucide-react';
import img6kg from '../../assets/images/lpg_cylinder_6kg_1791888342390.jpg';
import img13kg from '../../assets/images/lpg_cylinder_13kg_1791888361570.jpg';
import img29kg from '../../assets/images/lpg_cylinder_29kg_1791888380688.jpg';

export interface CartItem {
  id: string;
  size: CylinderSize;
  purchaseType: PurchaseType;
  brandPreference: GasBrand;
  quantity: number;
  unitPrice: number;
  includeScaleCheck: boolean;
  includeNewRegulator: boolean;
}

interface CylinderDetailModalProps {
  isOpen: boolean;
  initialSize: CylinderSize;
  initialPurchaseType?: PurchaseType;
  initialBrand?: GasBrand;
  onClose: () => void;
  onAddToCart: (item: CartItem, buyNow?: boolean) => void;
}

export const CylinderDetailModal: React.FC<CylinderDetailModalProps> = ({
  isOpen,
  initialSize,
  initialPurchaseType = 'refill',
  initialBrand = 'Any',
  onClose,
  onAddToCart,
}) => {
  const [size, setSize] = useState<CylinderSize>(initialSize);
  const [purchaseType, setPurchaseType] = useState<PurchaseType>(initialPurchaseType);
  const [brandPreference, setBrandPreference] = useState<GasBrand>(initialBrand);
  const [quantity, setQuantity] = useState<number>(1);
  const [includeScaleCheck, setIncludeScaleCheck] = useState<boolean>(true);
  const [includeNewRegulator, setIncludeNewRegulator] = useState<boolean>(false);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setSize(initialSize);
      setPurchaseType(initialPurchaseType);
      setBrandPreference(initialBrand);
      setQuantity(1);
      setIncludeScaleCheck(true);
      setIncludeNewRegulator(false);
    }
  }, [isOpen, initialSize, initialPurchaseType, initialBrand]);

  if (!isOpen) return null;

  const images: Record<CylinderSize, string> = {
    '6kg': img6kg,
    '13kg': img13kg,
    '22.5kg': img29kg,
    '29kg': img29kg,
    '50kg': img29kg,
  };

  const titles: Record<CylinderSize, string> = {
    '6kg': '6kg Compact LPG Cylinder',
    '13kg': '13kg Standard Home Cylinder',
    '22.5kg': '22.5kg Large Home Cylinder',
    '29kg': '29kg Commercial Cylinder',
    '50kg': '50kg Industrial / Hotel Cylinder',
  };

  const descriptions: Record<CylinderSize, string> = {
    '6kg': 'Ideal for 1–2 people, studio apartments & quick meko refills',
    '13kg': 'Most popular Kenyan household cooking cylinder',
    '22.5kg': 'Extended capacity for large households, catering & baking',
    '29kg': 'High-capacity cylinder for large kitchens & commercial use',
    '50kg': 'Bulk LPG tank for restaurants, hotels & institutional kitchens',
  };

  const pricing = MARKET_BENCHMARK_PRICES[size];
  const refillPrice = pricing.refillPrice;
  const completeUpcharge = pricing.completePrice - pricing.refillPrice;
  const regulatorFee = includeNewRegulator ? 850 : 0;
  const baseUnitPrice = purchaseType === 'refill' ? refillPrice : pricing.completePrice;
  const unitWithExtras = baseUnitPrice + regulatorFee;
  const totalAmount = unitWithExtras * quantity;

  const brandOptions: { id: GasBrand; label: string; note: string }[] = [
    { id: 'Any', label: 'Any Verified Depot', note: 'Fastest (~18 min)' },
    { id: 'K-Gas', label: 'K-Gas (Rubis)', note: 'Standard valve' },
    { id: 'TotalEnergies', label: 'TotalEnergies', note: 'Unified seal' },
    { id: 'Shell Gas', label: 'Shell Afrigas', note: 'Clip-on / standard' },
  ];

  const handleConfirm = (buyNow: boolean) => {
    onAddToCart(
      {
        id: `${size}-${purchaseType}-${brandPreference}-${includeNewRegulator ? 'reg' : 'std'}`,
        size,
        purchaseType,
        brandPreference,
        quantity,
        unitPrice: unitWithExtras,
        includeScaleCheck,
        includeNewRegulator,
      },
      buyNow
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label={titles[size]}
    >
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col text-left">
        {/* Top Image Showcase (Matches Kupa Detail Screen) */}
        <div className="relative bg-[#F6F7F8] pt-4 pb-6 px-5 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white hover:bg-neutral-100 text-[#15191C] flex items-center justify-center shadow-xs transition-colors cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Size switcher */}
            <div className="flex items-center gap-0.5 bg-white p-1 rounded-xl border border-neutral-200/70 overflow-x-auto scrollbar-none max-w-[230px] sm:max-w-none">
              {(['6kg', '13kg', '22.5kg', '29kg', '50kg'] as CylinderSize[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    size === s
                      ? 'bg-[#226946] text-white'
                      : 'text-neutral-600 hover:text-[#15191C]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsFavorite(!isFavorite)}
              className="w-10 h-10 rounded-full bg-white hover:bg-neutral-100 flex items-center justify-center shadow-xs transition-colors cursor-pointer"
              aria-label="Favorite"
            >
              <Heart
                className={`w-5 h-5 ${
                  isFavorite ? 'fill-rose-500 text-rose-500' : 'text-neutral-400'
                }`}
              />
            </button>
          </div>

          <div className="w-44 h-44 mx-auto flex items-center justify-center">
            <img
              src={images[size]}
              alt={titles[size]}
              className="w-full h-full object-contain drop-shadow-md"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        {/* Scrollable Details & Options */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Title + Stepper + Price (Exact Reference Row 3 Col 3-4) */}
          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-[#15191C] tracking-tight">
              {titles[size]}
            </h2>
            <p className="text-xs text-[#6B7280]">{descriptions[size]}</p>

            <div className="flex items-center justify-between pt-1">
              <div className="inline-flex items-center gap-3 bg-[#F6F7F8] px-2.5 py-1.5 rounded-full">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="w-7 h-7 rounded-full bg-white text-[#15191C] flex items-center justify-center shadow-2xs hover:bg-neutral-100 disabled:opacity-40 cursor-pointer"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-sm font-bold text-[#15191C] w-5 text-center tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(5, q + 1))}
                  disabled={quantity >= 5}
                  className="w-7 h-7 rounded-full bg-[#226946] text-white flex items-center justify-center shadow-2xs hover:bg-[#195136] disabled:opacity-40 cursor-pointer"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <span className="text-lg font-extrabold text-[#226946] tabular-nums">
                KSh {baseUnitPrice.toLocaleString()}
              </span>
            </div>
          </div>

          <hr className="border-neutral-100" />

          {/* Section 1: Purchase Type (Matches "Sause" option list in Reference) */}
          <div className="space-y-2.5">
            <h3 className="text-sm font-bold text-[#15191C]">Order Type</h3>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setPurchaseType('refill')}
                className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl bg-[#F6F7F8] hover:bg-[#EDF6F1]/70 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                      purchaseType === 'refill'
                        ? 'bg-[#226946] border-[#226946] text-white'
                        : 'bg-white border-neutral-300'
                    }`}
                  >
                    {purchaseType === 'refill' && <Check className="w-3 h-3 stroke-[3]" />}
                  </span>
                  <div className="text-left">
                    <span className="text-sm font-semibold text-[#15191C] block">
                      Gas Refill Only
                    </span>
                    <span className="text-[11px] text-[#6B7280]">Swap your empty cylinder</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#15191C] tabular-nums">
                  KSh {refillPrice.toLocaleString()}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPurchaseType('complete')}
                className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl bg-[#F6F7F8] hover:bg-[#EDF6F1]/70 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                      purchaseType === 'complete'
                        ? 'bg-[#226946] border-[#226946] text-white'
                        : 'bg-white border-neutral-300'
                    }`}
                  >
                    {purchaseType === 'complete' && <Check className="w-3 h-3 stroke-[3]" />}
                  </span>
                  <div className="text-left">
                    <span className="text-sm font-semibold text-[#15191C] block">
                      New Complete Cylinder
                    </span>
                    <span className="text-[11px] text-[#6B7280]">Brand-new full tank + valve seal</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#15191C] tabular-nums">
                  +KSh {completeUpcharge.toLocaleString()}
                </span>
              </button>
            </div>
          </div>

          {/* Section 2: Brand Preference */}
          <div className="space-y-2.5">
            <h3 className="text-sm font-bold text-[#15191C]">LPG Brand</h3>
            <div className="space-y-1.5">
              {brandOptions.map((b) => {
                const isSelected = brandPreference === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBrandPreference(b.id)}
                    className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl bg-[#F6F7F8] hover:bg-[#EDF6F1]/70 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                          isSelected
                            ? 'bg-[#226946] border-[#226946] text-white'
                            : 'bg-white border-neutral-300'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </span>
                      <span className="text-sm font-semibold text-[#15191C]">{b.label}</span>
                    </div>
                    <span className="text-xs text-[#6B7280]">{b.note}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Add Safety Accessories (Matches "Add a Topping?" in Reference) */}
          <div className="space-y-2.5 pb-2">
            <h3 className="text-sm font-bold text-[#15191C]">Add Safety Option?</h3>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => setIncludeScaleCheck(!includeScaleCheck)}
                className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl bg-[#F6F7F8] hover:bg-[#EDF6F1]/70 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                      includeScaleCheck
                        ? 'bg-[#226946] border-[#226946] text-white'
                        : 'bg-white border-neutral-300'
                    }`}
                  >
                    {includeScaleCheck && <Check className="w-3 h-3 stroke-[3]" />}
                  </span>
                  <span className="text-sm font-medium text-[#15191C] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#226946]" />
                    <span>Doorstep Digital Scale Check</span>
                  </span>
                </div>
                <span className="text-xs font-bold text-[#226946] tabular-nums">KSh 0</span>
              </button>

              <button
                type="button"
                onClick={() => setIncludeNewRegulator(!includeNewRegulator)}
                className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl bg-[#F6F7F8] hover:bg-[#EDF6F1]/70 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                      includeNewRegulator
                        ? 'bg-[#226946] border-[#226946] text-white'
                        : 'bg-white border-neutral-300'
                    }`}
                  >
                    {includeNewRegulator && <Check className="w-3 h-3 stroke-[3]" />}
                  </span>
                  <span className="text-sm font-medium text-[#15191C]">
                    High-Pressure Regulator + Hose
                  </span>
                </div>
                <span className="text-xs font-bold text-[#15191C] tabular-nums">+KSh 850</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sticky Bottom CTA (Matches Reference Forest Green "Add to Cart ($XX)") */}
        <div className="p-4 border-t border-neutral-100 bg-white flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => handleConfirm(false)}
            className="flex-1 min-h-[48px] py-3 px-4 rounded-2xl bg-[#226946] hover:bg-[#195136] text-white font-bold text-sm transition-colors cursor-pointer tabular-nums"
          >
            Add to Cart (KSh {totalAmount.toLocaleString()})
          </button>
          <button
            type="button"
            onClick={() => handleConfirm(true)}
            className="min-h-[48px] py-3 px-4 rounded-2xl bg-[#EDF6F1] hover:bg-[#DFEFE6] text-[#226946] font-bold text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            Order Now
          </button>
        </div>
      </div>
    </div>
  );
};
