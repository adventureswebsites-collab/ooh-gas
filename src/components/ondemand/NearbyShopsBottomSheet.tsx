import React, { useState, useRef } from 'react';
import {
  Supplier,
  RiderInfo,
  CylinderSize,
  PurchaseType,
  CoverageCheckResult,
} from '../../types';
import { MARKET_BENCHMARK_PRICES } from '../../data/mockData';
import { SupplierLettermark } from '../BrandIdentities';
import {
  MapPin,
  Star,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Clock,
  Heart,
  ShieldCheck,
  X,
  Bike,
  CheckCircle2,
  Flame,
} from 'lucide-react';

interface NearbyShopsBottomSheetProps {
  suppliers: Supplier[];
  selectedSize: CylinderSize;
  onChangeSize: (size: CylinderSize) => void;
  purchaseType: PurchaseType;
  onChangePurchaseType: (type: PurchaseType) => void;
  searchQuery: string;
  coverageResult?: CoverageCheckResult | null;
  favoriteSupplierIds: string[];
  onToggleFavoriteSupplier: (id: string) => void;
  onSelectShop: (supplier: Supplier) => void;
  onOrderGasNow: (supplier?: Supplier) => void;
  isExpanded: boolean;
  onToggleExpand: (expanded: boolean) => void;
}

const ALL_SIZES: CylinderSize[] = ['6kg', '13kg', '22.5kg', '29kg', '50kg'];

export const NearbyShopsBottomSheet: React.FC<NearbyShopsBottomSheetProps> = ({
  suppliers,
  selectedSize,
  onChangeSize,
  purchaseType,
  onChangePurchaseType,
  searchQuery,
  coverageResult,
  favoriteSupplierIds,
  onToggleFavoriteSupplier,
  onSelectShop,
  onOrderGasNow,
  isExpanded,
  onToggleExpand,
}) => {
  const dragStartYRef = useRef<number | null>(null);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredSuppliers = suppliers.filter((shop) => {
    if (!normalizedQuery) return true;
    return (
      shop.name.toLowerCase().includes(normalizedQuery) ||
      shop.brand.toLowerCase().includes(normalizedQuery) ||
      shop.locationArea.toLowerCase().includes(normalizedQuery) ||
      shop.cylinders.some((c) => c.size.toLowerCase().includes(normalizedQuery))
    );
  });

  const visibleShops = isExpanded ? filteredSuppliers : filteredSuppliers.slice(0, 2);

  const getPrice = (shop: Supplier) => {
    const found = shop.cylinders.find((c) => c.size === selectedSize);
    if (found) {
      return purchaseType === 'refill' ? found.refillPrice : found.completePrice;
    }
    const bench = MARKET_BENCHMARK_PRICES[selectedSize];
    return purchaseType === 'refill' ? bench.refillPrice : bench.completePrice;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartYRef.current = e.clientY;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragStartYRef.current === null) return;
    const deltaY = e.clientY - dragStartYRef.current;
    dragStartYRef.current = null;
    if (deltaY < -35) {
      onToggleExpand(true);
    } else if (deltaY > 35) {
      onToggleExpand(false);
    }
  };

  return (
    <section
      aria-label="Nearby Gas Shops"
      className={`bg-white rounded-t-3xl lg:rounded-3xl border border-neutral-200/80 shadow-[0_-10px_32px_rgba(0,0,0,0.10)] lg:shadow-sm flex flex-col transition-all duration-300 text-left ${
        isExpanded ? 'max-h-[76dvh] lg:max-h-none' : 'lg:max-h-none'
      }`}
    >
      {/* Draggable Handle Header */}
      <div
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onClick={() => onToggleExpand(!isExpanded)}
        className="pt-2.5 pb-2 px-4 sm:px-5 cursor-grab active:cursor-grabbing select-none shrink-0"
      >
        <div className="w-11 h-1.5 rounded-full bg-neutral-300 mx-auto mb-2.5 lg:hidden" />

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-6 h-6 rounded-full bg-[#EDF6F1] text-[#226946] flex items-center justify-center shrink-0">
              <MapPin className="w-3.5 h-3.5" />
            </span>
            <h2 className="text-base sm:text-lg font-extrabold text-[#15191C] tracking-tight truncate">
              Nearby Gas Shops
            </h2>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(!isExpanded);
            }}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#226946] hover:text-[#195136] cursor-pointer shrink-0 py-1 px-1.5"
          >
            <span>{isExpanded ? 'Collapse' : 'See all'}</span>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Expandable Filter Strip (Visible when expanded or always on Desktop) */}
      <div
        className={`px-4 sm:px-5 pb-2.5 space-y-2 border-b border-neutral-100 ${
          isExpanded ? 'block' : 'hidden lg:block'
        }`}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="inline-flex p-0.5 bg-[#F6F7F8] rounded-xl gap-0.5">
            <button
              type="button"
              onClick={() => onChangePurchaseType('refill')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                purchaseType === 'refill'
                  ? 'bg-white text-[#226946] shadow-2xs'
                  : 'text-[#6B7280] hover:text-[#15191C]'
              }`}
            >
              Refill
            </button>
            <button
              type="button"
              onClick={() => onChangePurchaseType('complete')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                purchaseType === 'complete'
                  ? 'bg-white text-[#226946] shadow-2xs'
                  : 'text-[#6B7280] hover:text-[#15191C]'
              }`}
            >
              Complete Set
            </button>
          </div>

          {coverageResult?.primaryZone && (
            <span className="text-[11px] font-semibold text-[#226946]">
              {coverageResult.primaryZone.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
          {ALL_SIZES.map((sz) => {
            const active = selectedSize === sz;
            return (
              <button
                key={sz}
                type="button"
                onClick={() => onChangeSize(sz)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                  active
                    ? 'bg-[#226946] text-white'
                    : 'bg-[#F6F7F8] text-[#15191C] hover:bg-neutral-200/70'
                }`}
              >
                {sz}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable Supplier Cards List */}
      <div className="px-4 sm:px-5 py-2.5 space-y-2.5 overflow-y-auto flex-1">
        {visibleShops.length === 0 ? (
          <div className="py-6 text-center space-y-1">
            <p className="text-sm font-bold text-[#15191C]">No matching gas shops found</p>
            <p className="text-xs text-[#6B7280]">
              Try clearing your search filter or selecting another cylinder size.
            </p>
          </div>
        ) : (
          visibleShops.map((shop) => {
            const price = getPrice(shop);
            const isFav = favoriteSupplierIds.includes(shop.id);

            return (
              <div
                key={shop.id}
                onClick={() => onSelectShop(shop)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectShop(shop);
                  }
                }}
                className="w-full p-3 rounded-2xl border border-neutral-200/80 bg-white hover:border-[#226946]/50 hover:bg-[#F8FAF9] transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs"
              >
                {/* Left: Supplier Logo Tile + Metadata */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <SupplierLettermark
                    brand={shop.brand}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl shrink-0"
                  />

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm sm:text-base font-extrabold text-[#15191C] truncate">
                        {shop.name}
                      </h3>
                      {isFav && (
                        <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 shrink-0" />
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-xs text-[#6B7280]">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                      <span className="font-bold text-[#15191C] tabular-nums">
                        {shop.rating.toFixed(1)}
                      </span>
                      <span className="truncate">({shop.reviewCount} reviews)</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-[#6B7280] tabular-nums">
                      <Clock className="w-3.5 h-3.5 text-[#226946] shrink-0" />
                      <span className="truncate">
                        {shop.deliveryTimeMin} · {shop.distanceKm} km
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Price, Stock Availability & Arrow */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <span className="text-sm sm:text-base font-extrabold text-[#226946] tabular-nums block">
                      KSh {price.toLocaleString()}
                    </span>
                    <span
                      className={`inline-block text-[10.5px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${
                        shop.isOpen
                          ? 'bg-[#EDF6F1] text-[#226946]'
                          : 'bg-neutral-100 text-neutral-500'
                      }`}
                    >
                      {shop.isOpen ? 'In Stock' : 'Closed'}
                    </span>
                  </div>

                  <span
                    className="w-7 h-7 rounded-full bg-[#F6F7F8] text-neutral-500 flex items-center justify-center shrink-0"
                    aria-hidden="true"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            );
          })
        )}

        {!isExpanded && filteredSuppliers.length > 2 && (
          <button
            type="button"
            onClick={() => onToggleExpand(true)}
            className="w-full py-1.5 text-xs font-bold text-[#226946] hover:underline flex items-center justify-center gap-1 cursor-pointer lg:hidden"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            <span>Show {filteredSuppliers.length - 2} more nearby shops</span>
          </button>
        )}
      </div>

      {/* Prominent Green "Order Gas Now" Primary CTA */}
      <div className="px-4 sm:px-5 pt-1.5 pb-4 shrink-0">
        <button
          type="button"
          onClick={() => onOrderGasNow(filteredSuppliers[0])}
          className="w-full min-h-[52px] py-3.5 px-5 rounded-full bg-[#226946] hover:bg-[#195136] active:scale-[0.99] text-white font-bold text-sm sm:text-base shadow-md transition-all cursor-pointer flex items-center justify-between"
        >
          <span className="w-6 flex items-center justify-center" aria-hidden="true">
            {/* Clean LPG cylinder mark */}
            <svg width="18" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M9 3h6M10 3v2h4V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <rect x="6" y="5.5" width="12" height="15" rx="3" fill="currentColor" />
            </svg>
          </span>
          <span>Order Gas Now</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </section>
  );
};

// ==============================================================================
// Shop Pin / Card Detail Modal (Opened when tapping green cylinder pin or shop card)
// ==============================================================================
interface ShopDetailSheetModalProps {
  supplier: Supplier | null;
  selectedSize: CylinderSize;
  purchaseType: PurchaseType;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onClose: () => void;
  onOrderFromShop: (supplier: Supplier, size: CylinderSize, type: PurchaseType) => void;
}

export const ShopDetailSheetModal: React.FC<ShopDetailSheetModalProps> = ({
  supplier,
  selectedSize,
  purchaseType,
  isFavorite,
  onToggleFavorite,
  onClose,
  onOrderFromShop,
}) => {
  const [modalSize, setModalSize] = useState<CylinderSize>(selectedSize);
  const [modalType, setModalType] = useState<PurchaseType>(purchaseType);

  React.useEffect(() => {
    setModalSize(selectedSize);
    setModalType(purchaseType);
  }, [selectedSize, purchaseType, supplier?.id]);

  if (!supplier) return null;

  const cyl = supplier.cylinders.find((c) => c.size === modalSize) || supplier.cylinders[1];
  const price =
    cyl ? (modalType === 'refill' ? cyl.refillPrice : cyl.completePrice) : MARKET_BENCHMARK_PRICES[modalSize].refillPrice;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
      role="presentation"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl text-left animate-in slide-in-from-bottom-4 duration-150"
        role="dialog"
        aria-modal="true"
        aria-label={`${supplier.name} details`}
      >
        <div className="w-10 h-1 rounded-full bg-neutral-300 mx-auto -mt-1 sm:hidden" />

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <SupplierLettermark brand={supplier.brand} className="w-12 h-12 rounded-2xl shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-extrabold text-[#15191C] truncate">
                  {supplier.name}
                </h3>
                <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-[#EDF6F1] text-[#226946] shrink-0">
                  {supplier.isOpen ? 'In Stock' : 'Closed'}
                </span>
              </div>
              <p className="text-xs text-[#6B7280] truncate">{supplier.locationArea}</p>
              <div className="flex items-center gap-2 text-xs text-[#6B7280] mt-0.5 tabular-nums">
                <span className="inline-flex items-center gap-0.5 font-bold text-[#15191C]">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  {supplier.rating.toFixed(1)} ({supplier.reviewCount})
                </span>
                <span>·</span>
                <span>{supplier.distanceKm} km</span>
                <span>·</span>
                <span className="text-[#226946] font-bold">{supplier.deliveryTimeMin}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onToggleFavorite(supplier.id)}
              className="w-9 h-9 rounded-full bg-[#F6F7F8] hover:bg-rose-50 flex items-center justify-center cursor-pointer"
              aria-label="Toggle favourite gas shop"
            >
              <Heart
                className={`w-4.5 h-4.5 ${isFavorite ? 'fill-rose-500 text-rose-500' : 'text-neutral-500'}`}
              />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-[#F6F7F8] hover:bg-neutral-200 flex items-center justify-center cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4.5 h-4.5 text-[#15191C]" />
            </button>
          </div>
        </div>

        {/* Refill / Exchange Selector */}
        <div className="grid grid-cols-2 p-1 bg-[#F6F7F8] rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setModalType('refill')}
            className={`py-2 rounded-lg text-xs font-bold cursor-pointer ${
              modalType === 'refill' ? 'bg-white text-[#226946] shadow-2xs' : 'text-[#6B7280]'
            }`}
          >
            Refill Cylinder
          </button>
          <button
            type="button"
            onClick={() => setModalType('complete')}
            className={`py-2 rounded-lg text-xs font-bold cursor-pointer ${
              modalType === 'complete' ? 'bg-white text-[#226946] shadow-2xs' : 'text-[#6B7280]'
            }`}
          >
            Complete Cylinder
          </button>
        </div>

        {/* Cylinder Sizes */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
          {ALL_SIZES.map((sz) => {
            const item = supplier.cylinders.find((c) => c.size === sz);
            const itemPrice = item
              ? modalType === 'refill'
                ? item.refillPrice
                : item.completePrice
              : modalType === 'refill'
              ? MARKET_BENCHMARK_PRICES[sz].refillPrice
              : MARKET_BENCHMARK_PRICES[sz].completePrice;
            const active = modalSize === sz;

            return (
              <button
                key={sz}
                type="button"
                onClick={() => setModalSize(sz)}
                className={`p-2 rounded-xl border text-left cursor-pointer ${
                  active
                    ? 'border-[#226946] bg-[#EDF6F1] ring-1 ring-[#226946]'
                    : 'border-neutral-200 bg-white'
                }`}
              >
                <span className="text-xs font-extrabold text-[#15191C] block">{sz}</span>
                <span className="text-[11px] font-bold text-[#226946] tabular-nums">
                  {itemPrice.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>

        <div className="p-3 rounded-2xl bg-[#F6F7F8] flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 text-[#15191C] font-semibold">
            <Flame className="w-4 h-4 text-[#226946]" />
            <span>
              Delivery Fee:{' '}
              <strong className="text-[#226946]">
                {supplier.deliveryFee === 0 ? 'Free' : `KSh ${supplier.deliveryFee}`}
              </strong>
            </span>
          </span>
          <span className="text-[#6B7280]">Closes {supplier.closingTime}</span>
        </div>

        <button
          type="button"
          onClick={() => onOrderFromShop(supplier, modalSize, modalType)}
          className="w-full min-h-[50px] py-3.5 px-5 rounded-full bg-[#226946] hover:bg-[#195136] text-white font-bold text-sm flex items-center justify-between cursor-pointer shadow-sm"
        >
          <span>Order {modalSize} Gas</span>
          <span className="inline-flex items-center gap-1.5 font-extrabold tabular-nums">
            <span>KSh {price.toLocaleString()}</span>
            <ArrowRight className="w-4 h-4" />
          </span>
        </button>
      </div>
    </div>
  );
};

// ==============================================================================
// Rider Pin Detail Modal (Opened when tapping a delivery motorcycle marker)
// ==============================================================================
interface RiderDetailSheetModalProps {
  rider: RiderInfo | null;
  onClose: () => void;
  onOrderWithRider: () => void;
}

export const RiderDetailSheetModal: React.FC<RiderDetailSheetModalProps> = ({
  rider,
  onClose,
  onOrderWithRider,
}) => {
  if (!rider) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
      role="presentation"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl text-left animate-in slide-in-from-bottom-4 duration-150"
        role="dialog"
        aria-modal="true"
        aria-label={`Rider ${rider.name}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-full bg-[#226946] text-white font-extrabold text-base flex items-center justify-center shrink-0">
              {rider.photoInitial}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-extrabold text-[#15191C] truncate">{rider.name}</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EDF6F1] text-[#226946]">
                  Available Nearby
                </span>
              </div>
              <p className="text-xs text-[#6B7280] mt-0.5 flex items-center gap-1">
                <Bike className="w-3.5 h-3.5 text-[#226946]" />
                <span>
                  {rider.vehicleModel} · <strong>{rider.plateNumber}</strong>
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F6F7F8] hover:bg-neutral-200 flex items-center justify-center cursor-pointer"
            aria-label="Close rider info"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2.5 rounded-2xl bg-[#F6F7F8]">
            <span className="text-sm font-extrabold text-[#15191C] tabular-nums block">
              ★ {rider.rating}
            </span>
            <span className="text-[10.5px] text-[#6B7280]">Rating</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-[#F6F7F8]">
            <span className="text-sm font-extrabold text-[#15191C] tabular-nums block">
              {rider.deliveriesCount}
            </span>
            <span className="text-[10.5px] text-[#6B7280]">Deliveries</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-[#EDF6F1]">
            <span className="text-sm font-extrabold text-[#226946] flex items-center justify-center gap-0.5">
              <ShieldCheck className="w-4 h-4" /> EPRA
            </span>
            <span className="text-[10.5px] text-[#226946]">Scale Equipped</span>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-[#F6F7F8] flex items-center gap-2 text-xs text-[#15191C]">
          <CheckCircle2 className="w-4 h-4 text-[#226946] shrink-0" />
          <span>Current zone: {rider.currentLocationName}</span>
        </div>

        <button
          type="button"
          onClick={onOrderWithRider}
          className="w-full min-h-[48px] py-3 rounded-full bg-[#226946] hover:bg-[#195136] text-white font-bold text-sm cursor-pointer flex items-center justify-center gap-2"
        >
          <span>Order Gas Now</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
