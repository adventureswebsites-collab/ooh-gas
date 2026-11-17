import React, { useState } from 'react';
import {
  CylinderSize,
  PurchaseType,
  GasBrand,
  Supplier,
  CoverageCheckResult,
  NairobiLocation,
} from '../../types';
import { MARKET_BENCHMARK_PRICES } from '../../data/mockData';
import { SupplierCard } from '../SupplierCard';
import { Search, Plus, Flame, ShieldCheck, SlidersHorizontal, ArrowLeft } from 'lucide-react';
import img6kg from '../../assets/images/lpg_cylinder_6kg_1791888342390.jpg';
import img13kg from '../../assets/images/lpg_cylinder_13kg_1791888361570.jpg';
import img29kg from '../../assets/images/lpg_cylinder_29kg_1791888380688.jpg';

interface MenuCatalogViewProps {
  suppliers: Supplier[];
  currentLocation: NairobiLocation;
  coverageResult?: CoverageCheckResult | null;
  onBackToHome: () => void;
  onOpenCylinderDetail: (
    size: CylinderSize,
    purchaseType?: PurchaseType,
    brand?: GasBrand
  ) => void;
  onOrderFromSupplier: (
    supplier: Supplier,
    size: CylinderSize,
    purchaseType: PurchaseType
  ) => void;
}

type CategoryTab = 'All' | 'Popular' | 'Refills' | 'Complete Sets' | 'K-Gas' | 'TotalEnergies' | 'Shell Gas';

interface CatalogProduct {
  id: string;
  title: string;
  subtitle: string;
  size: CylinderSize;
  purchaseType: PurchaseType;
  brand: GasBrand;
  price: number;
  image: string;
  popular?: boolean;
}

export const MenuCatalogView: React.FC<MenuCatalogViewProps> = ({
  suppliers,
  currentLocation,
  coverageResult,
  onBackToHome,
  onOpenCylinderDetail,
  onOrderFromSupplier,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<CategoryTab>('All');

  const tabs: CategoryTab[] = [
    'All',
    'Popular',
    'Refills',
    'Complete Sets',
    'K-Gas',
    'TotalEnergies',
    'Shell Gas',
  ];

  const catalogProducts: CatalogProduct[] = [
    {
      id: '13kg-refill-any',
      title: '13kg LPG Refill',
      subtitle: 'Standard household · Cylinder swap',
      size: '13kg',
      purchaseType: 'refill',
      brand: 'Any',
      price: MARKET_BENCHMARK_PRICES['13kg'].refillPrice,
      image: img13kg,
      popular: true,
    },
    {
      id: '6kg-refill-any',
      title: '6kg Meko Refill',
      subtitle: 'Compact 1–2 person cylinder swap',
      size: '6kg',
      purchaseType: 'refill',
      brand: 'Any',
      price: MARKET_BENCHMARK_PRICES['6kg'].refillPrice,
      image: img6kg,
      popular: true,
    },
    {
      id: '22_5kg-refill-any',
      title: '22.5kg Large Home Refill',
      subtitle: 'Large family & catering swap',
      size: '22.5kg',
      purchaseType: 'refill',
      brand: 'Any',
      price: MARKET_BENCHMARK_PRICES['22.5kg'].refillPrice,
      image: img29kg,
    },
    {
      id: '29kg-refill-any',
      title: '29kg Commercial Refill',
      subtitle: 'Large kitchen & restaurant swap',
      size: '29kg',
      purchaseType: 'refill',
      brand: 'Any',
      price: MARKET_BENCHMARK_PRICES['29kg'].refillPrice,
      image: img29kg,
    },
    {
      id: '50kg-refill-any',
      title: '50kg Industrial / Hotel Refill',
      subtitle: 'Bulk commercial cylinder exchange',
      size: '50kg',
      purchaseType: 'refill',
      brand: 'Any',
      price: MARKET_BENCHMARK_PRICES['50kg'].refillPrice,
      image: img29kg,
    },
    {
      id: '13kg-complete-kgas',
      title: '13kg K-Gas Complete Set',
      subtitle: 'New full cylinder + EPRA valve seal',
      size: '13kg',
      purchaseType: 'complete',
      brand: 'K-Gas',
      price: MARKET_BENCHMARK_PRICES['13kg'].completePrice,
      image: img13kg,
      popular: true,
    },
    {
      id: '6kg-complete-total',
      title: '6kg TotalEnergies Set',
      subtitle: 'New filled tank + unified seal',
      size: '6kg',
      purchaseType: 'complete',
      brand: 'TotalEnergies',
      price: MARKET_BENCHMARK_PRICES['6kg'].completePrice,
      image: img6kg,
    },
    {
      id: '13kg-refill-shell',
      title: '13kg Shell Afrigas Refill',
      subtitle: 'Clip-on / standard valve exchange',
      size: '13kg',
      purchaseType: 'refill',
      brand: 'Shell Gas',
      price: MARKET_BENCHMARK_PRICES['13kg'].refillPrice + 50,
      image: img13kg,
    },
  ];

  const filteredProducts = catalogProducts.filter((item) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q) ||
      item.brand.toLowerCase().includes(q) ||
      item.size.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (activeTab === 'All') return true;
    if (activeTab === 'Popular') return Boolean(item.popular);
    if (activeTab === 'Refills') return item.purchaseType === 'refill';
    if (activeTab === 'Complete Sets') return item.purchaseType === 'complete';
    return item.brand === activeTab;
  });

  const filteredSuppliers = suppliers.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.brand.toLowerCase().includes(q) ||
      s.locationArea.toLowerCase().includes(q);
    if (!matchesSearch) return false;
    if (activeTab === 'K-Gas' || activeTab === 'TotalEnergies' || activeTab === 'Shell Gas') {
      return s.brand === activeTab;
    }
    return true;
  });

  return (
    <div className="w-full space-y-5 pb-28 text-left animate-in fade-in duration-150">
      {/* Header matching Reference Row 3 Col 2 & Row 4 Col 1-2 ("Our Gas · Special For You") */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={onBackToHome}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#6B7280] hover:text-[#226946] mb-1 cursor-pointer md:hidden"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>
          <p className="text-xs font-medium text-[#6B7280]">Our LPG Catalog</p>
          <h1 className="text-2xl font-extrabold text-[#226946] tracking-tight leading-tight">
            Special For You
          </h1>
        </div>

        <button
          type="button"
          onClick={() => onOpenCylinderDetail('13kg', 'refill', 'Any')}
          className="px-3 py-2 rounded-xl bg-[#EDF6F1] hover:bg-[#DFEFE6] text-[#226946] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Custom Order</span>
        </button>
      </div>

      {/* Light Mode Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search 6kg, 13kg, K-Gas, TotalEnergies, Kilimani..."
          className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#F6F7F8] border border-transparent focus:border-[#226946] focus:bg-white text-sm text-[#15191C] placeholder:text-[#6B7280] transition-all outline-hidden"
        />
      </div>

      {/* Clean Underline Category Tabs (Matching Reference Row 3 Col 2 & Row 4 Col 1-2) */}
      <div className="flex items-center gap-5 overflow-x-auto scrollbar-none border-b border-neutral-200/80 pb-0.5">
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`pb-2.5 text-sm whitespace-nowrap transition-all cursor-pointer border-b-2 shrink-0 ${
                isActive
                  ? 'border-[#226946] text-[#15191C] font-bold'
                  : 'border-transparent text-[#6B7280] hover:text-[#15191C] font-medium'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Product Grid */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-[#15191C]">
            {activeTab === 'All' ? 'All LPG Cylinders' : activeTab}
          </h2>
          <span className="text-xs text-[#6B7280] flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#226946]" />
            <span>Digital scale verified</span>
          </span>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="bg-[#F6F7F8] rounded-2xl p-8 text-center space-y-2">
            <Flame className="w-6 h-6 text-[#226946] mx-auto" />
            <p className="text-sm font-bold text-[#15191C]">No cylinders match "{searchQuery}"</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveTab('All');
              }}
              className="text-xs font-bold text-[#226946] hover:underline cursor-pointer"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() =>
                  onOpenCylinderDetail(product.size, product.purchaseType, product.brand)
                }
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenCylinderDetail(product.size, product.purchaseType, product.brand);
                  }
                }}
                className="group bg-white rounded-2xl border border-neutral-200/80 hover:border-[#226946]/50 p-3 flex flex-col justify-between transition-all cursor-pointer shadow-2xs hover:shadow-sm text-left"
              >
                <div>
                  <div className="w-full aspect-square rounded-xl bg-[#F6F7F8] p-3 flex items-center justify-center overflow-hidden mb-2.5">
                    <img
                      src={product.image}
                      alt={product.title}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <h3 className="text-sm font-bold text-[#15191C] leading-snug line-clamp-1">
                    {product.title}
                  </h3>
                  <p className="text-[11px] text-[#6B7280] mt-0.5 line-clamp-1">
                    {product.subtitle}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2.5 mt-2">
                  <span className="text-sm font-extrabold text-[#226946] tabular-nums">
                    KSh {product.price.toLocaleString()}
                  </span>
                  <span className="w-7 h-7 rounded-full bg-[#EDF6F1] group-hover:bg-[#226946] text-[#226946] group-hover:text-white flex items-center justify-center transition-colors">
                    <Plus className="w-4 h-4" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Verified Nearby Depots Section */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-[#15191C]">
              Nearby Gas Depots
            </h2>
            <p className="text-xs text-[#6B7280]">
              {coverageResult?.isCovered
                ? `Delivering to ${currentLocation.name.split(',')[0]}`
                : 'Licensed Nairobi LPG depots'}
            </p>
          </div>
          <span className="text-xs font-semibold text-[#6B7280] tabular-nums">
            {filteredSuppliers.length} depots
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredSuppliers.map((supplier) => (
            <SupplierCard
              key={supplier.id}
              supplier={supplier}
              onOrderNow={onOrderFromSupplier}
            />
          ))}
        </div>
      </section>
    </div>
  );
};
