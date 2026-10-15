import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { MapboxDeliveryMap } from './components/map/MapboxDeliveryMap';
import { WhatGasDoYouNeed } from './components/ondemand/WhatGasDoYouNeed';
import { ConfirmRequestDrawer } from './components/ondemand/ConfirmRequestDrawer';
import { MatchingModal } from './components/ondemand/MatchingModal';
import { LiveDeliveryTracker } from './components/ondemand/LiveDeliveryTracker';
import { SupplierCard } from './components/SupplierCard';
import { BottomNav, NavTab } from './components/BottomNav';
import { LocationModal } from './components/LocationModal';
import { NotificationModal } from './components/NotificationModal';
import { SafetyModal } from './components/SafetyModal';
import { OrderFlowModal } from './components/ordering/OrderFlowModal';
import { OrdersView, WalletView, ProfileView } from './components/SecondaryViews';
import { SupplierDashboardModal } from './components/supplier/SupplierDashboardModal';
import { AdminOrdersMatchingView } from './components/admin/AdminOrdersMatchingView';
import { createRealtimeOrder } from './services/multiSupplierService';
import { MULTI_SUPPLIER_BUSINESSES, MASTER_PRODUCTS } from './data/multiSupplierData';
import {
  MOCK_SUPPLIERS,
  NAIROBI_LOCATIONS,
  MOCK_NOTIFICATIONS,
  MOCK_RIDERS,
  MARKET_BENCHMARK_PRICES,
} from './data/mockData';
import { INITIAL_DELIVERY_ZONES } from './data/deliveryZonesData';
import { fetchDeliveryZones, checkDeliveryCoverage } from './services/deliveryZoneService';
import {
  Supplier,
  CylinderSize,
  PurchaseType,
  GasBrand,
  NairobiLocation,
  NotificationItem,
  OnDemandOrderState,
  PaymentMethod,
  DeliveryZone,
  CoverageCheckResult,
} from './types';
import { Search, ChevronDown, ChevronUp, Smartphone, Tablet, Monitor } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('home');

  // Location state
  const [currentLocation, setCurrentLocation] = useState<NairobiLocation>(NAIROBI_LOCATIONS[0]);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // Delivery Zones & Authoritative Coverage Check State
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>(INITIAL_DELIVERY_ZONES);
  const [coverageResult, setCoverageResult] = useState<CoverageCheckResult | null>(null);
  const [isCoverageLoading, setIsCoverageLoading] = useState(false);

  // Notification state
  const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  // Safety modal state
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);

  // Gas Selection State
  const [selectedSize, setSelectedSize] = useState<CylinderSize>('13kg');
  const [purchaseType, setPurchaseType] = useState<PurchaseType>('refill');
  const [quantity, setQuantity] = useState<number>(1);
  const [brandPreference, setBrandPreference] = useState<GasBrand>('Any');

  // Flow Modals
  const [isConfirmDrawerOpen, setIsConfirmDrawerOpen] = useState(false);
  const [isMatchingModalOpen, setIsMatchingModalOpen] = useState(false);
  const [isLiveTrackerOpen, setIsLiveTrackerOpen] = useState(false);

  // Active Order State
  const [activeOrder, setActiveOrder] = useState<OnDemandOrderState | null>(null);

  // Optional manual supplier comparison (secondary)
  const [showManualSuppliers, setShowManualSuppliers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'K-Gas' | 'TotalEnergies' | 'Shell Gas' | 'fastest'>('all');

  // Legacy manual supplier order flow modal
  const [isManualOrderModalOpen, setIsManualOrderModalOpen] = useState(false);
  const [selectedSupplierForManualOrder, setSelectedSupplierForManualOrder] = useState<Supplier | null>(null);

  // Supplier Portal and Admin Monitor Modal states
  const [isSupplierPortalOpen, setIsSupplierPortalOpen] = useState(false);
  const [isAdminOrdersViewOpen, setIsAdminOrdersViewOpen] = useState(false);

  // Developer testing harness: preserved outside normal customer UI (active via ?dev=true or Alt+D)
  const [isDevTestingMode, setIsDevTestingMode] = useState<boolean>(() => {
    return (
      typeof window !== 'undefined' &&
      (window.location.search.includes('dev=true') || window.location.search.includes('test=true'))
    );
  });
  const [simulatedWidth, setSimulatedWidth] = useState<number | null>(null);

  // Fetch zones and check coverage on location change
  const refreshZonesAndCoverage = useCallback(async () => {
    setIsCoverageLoading(true);
    const zones = await fetchDeliveryZones();
    setDeliveryZones(zones);

    const lat = currentLocation.coordinates.lat;
    const lng = currentLocation.coordinates.lng;
    const coverage = await checkDeliveryCoverage(lat, lng, zones);
    setCoverageResult(coverage);
    setIsCoverageLoading(false);
  }, [currentLocation.coordinates.lat, currentLocation.coordinates.lng]);

  useEffect(() => {
    refreshZonesAndCoverage();
  }, [refreshZonesAndCoverage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && e.key.toLowerCase() === 'd') || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd')) {
        setIsDevTestingMode((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // 1. Customer taps "Find My Gas"
  const handleInitiateRequest = () => {
    setIsConfirmDrawerOpen(true);
  };

  // 2. Customer confirms address and payment option -> start matching with zone supplier
  const handleConfirmAndStartMatching = async (details: {
    fullName: string;
    phoneNumber: string;
    estate: string;
    building: string;
    unitNumber: string;
    deliveryInstructions: string;
    paymentMethod: PaymentMethod;
  }) => {
    setIsConfirmDrawerOpen(false);

    // Resolve matching master product ID
    let targetBrand = brandPreference === 'Any' ? 'K-Gas' : brandPreference;
    let matchedMasterProduct = MASTER_PRODUCTS.find(
      (p) => p.brand.toLowerCase() === targetBrand.toLowerCase() && p.cylinderSize === selectedSize
    );
    if (!matchedMasterProduct) {
      matchedMasterProduct = MASTER_PRODUCTS[0];
    }

    const priceInfo = MARKET_BENCHMARK_PRICES[selectedSize];
    const unitPrice = purchaseType === 'refill' ? priceInfo.refillPrice : priceInfo.completePrice;
    const subtotal = unitPrice * quantity;

    // Default placeholder before server locks in delivery fee
    const tempOrder: OnDemandOrderState = {
      orderId: `OG-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: 'Just now',
      cylinderSize: selectedSize,
      purchaseType,
      brandPreference,
      quantity,
      unitPrice,
      subtotal,
      deliveryFee: 0,
      totalPrice: subtotal,
      paymentMethod: details.paymentMethod,
      destination: {
        fullName: details.fullName,
        phoneNumber: details.phoneNumber,
        estate: details.estate,
        building: details.building,
        unitNumber: details.unitNumber,
        deliveryInstructions: details.deliveryInstructions,
        pinLocation: {
          lat: currentLocation.coordinates.lat,
          lng: currentLocation.coordinates.lng,
          areaName: details.estate || currentLocation.name,
          isCustomPinned: true,
        },
      },
      matchedSupplier: null,
      assignedRider: MOCK_RIDERS[0],
      handoverPin: `${Math.floor(1000 + Math.random() * 9000)}`,
      etaMinutes: 20,
      stage: 'searching_supplier',
      orderStatus: 'MATCHING_SUPPLIER',
    };

    setActiveOrder(tempOrder);
    setIsMatchingModalOpen(true);

    try {
      const serverOrder = await createRealtimeOrder({
        customerName: details.fullName,
        phoneNumber: details.phoneNumber,
        deliveryAddress: {
          street: details.building ? `${details.building}, ${details.estate}` : details.estate,
          building: details.building,
          unitNumber: details.unitNumber,
          estate: details.estate,
          notes: details.deliveryInstructions,
        },
        deliveryPoint: {
          lat: currentLocation.coordinates.lat,
          lng: currentLocation.coordinates.lng,
        },
        items: [
          {
            productId: matchedMasterProduct.id,
            purchaseType: purchaseType === 'refill' ? 'refill' : 'complete_unit',
            quantity,
          },
        ],
        paymentMethod: details.paymentMethod,
        timeoutSeconds: 45,
      });

      if (serverOrder && serverOrder.orderId) {
        setActiveOrder((prev) =>
          prev
            ? {
                ...prev,
                orderId: serverOrder.orderId,
                orderStatus: serverOrder.status,
                matchingCandidateCount: serverOrder.matchingSession?.candidateCount || 0,
              }
            : null
        );
      }
    } catch (err) {
      console.warn('[Matching Flow] Server-side order creation notice:', err);
    }
  };

  // 3. Matching completes -> transition to dedicated Live Tracker screen
  const handleMatchCompleted = (acceptedData?: any) => {
    setIsMatchingModalOpen(false);

    if (activeOrder) {
      // Resolve accepted supplier details
      let finalSupplier: Supplier = MOCK_SUPPLIERS[0];
      let finalFee = activeOrder.deliveryFee;

      if (acceptedData && acceptedData.supplierId) {
        const business = MULTI_SUPPLIER_BUSINESSES.find((s) => s.id === acceptedData.supplierId);
        if (business) {
          finalSupplier = {
            id: business.id,
            name: business.tradeName,
            brand: (business.tradeName.includes('Total') ? 'TotalEnergies' : 'K-Gas') as any,
            brandLettermark: business.tradeName.includes('Total') ? 'TE' : 'KG',
            brandColor: business.tradeName.includes('Total') ? '#0284c7' : '#059669',
            locationArea: business.tradeName.split('—')[1]?.trim() || business.primaryTownId,
            distanceKm: 1.4,
            deliveryTimeMin: acceptedData.estimatedDeliveryMin || '20–30 min',
            deliveryFee: acceptedData.deliveryFee ?? 0,
            rating: business.rating,
            reviewCount: business.reviewCount,
            isOpen: true,
            closingTime: business.closesAt || '22:00',
            isSampleListing: false,
            cylinders: [],
            coordinates: {
              lat: business.depotLocation.lat,
              lng: business.depotLocation.lng,
              x: 50,
              y: 50,
            },
          };
          finalFee = acceptedData.deliveryFee ?? 0;
        }
      }

      setActiveOrder((prev) =>
        prev
          ? {
              ...prev,
              stage: 'in_transit',
              orderStatus: 'SUPPLIER_ACCEPTED',
              matchedSupplier: finalSupplier,
              deliveryFee: finalFee,
              totalPrice: prev.subtotal + finalFee,
            }
          : null
      );
    }
    setIsLiveTrackerOpen(true);
  };

  // Manual Supplier Order Flow fallback
  const handleOpenManualOrderFlow = (
    supplier: Supplier,
    size: CylinderSize,
    pType: PurchaseType
  ) => {
    setSelectedSupplierForManualOrder(supplier);
    setSelectedSize(size);
    setPurchaseType(pType);
    setIsManualOrderModalOpen(true);
  };

  // Filtered manual suppliers list
  const filteredSuppliers = MOCK_SUPPLIERS.filter((supplier) => {
    const matchesSearch =
      supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.locationArea.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === 'all') return true;
    if (activeFilter === 'fastest') return supplier.distanceKm <= 1.5;
    return supplier.brand === activeFilter;
  });

  const testViewports = [
    { label: '320px', width: 320, icon: Smartphone, desc: 'Small Phone' },
    { label: '360px', width: 360, icon: Smartphone, desc: 'Standard Phone' },
    { label: '375px', width: 375, icon: Smartphone, desc: 'iPhone X/Mini' },
    { label: '390px', width: 390, icon: Smartphone, desc: 'iPhone 14/15' },
    { label: '414px', width: 414, icon: Smartphone, desc: 'Plus Phone' },
    { label: '430px', width: 430, icon: Smartphone, desc: 'Pro Max' },
    { label: '768px', width: 768, icon: Tablet, desc: 'Tablet' },
    { label: '1024px', width: 1024, icon: Monitor, desc: 'Desktop' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-slate-800 flex flex-col font-['Plus_Jakarta_Sans',sans-serif] overflow-x-hidden w-full relative">
      {/* Developer Viewport Test Harness (Preserved outside customer UI: accessible via ?dev=true or Alt+D) */}
      {isDevTestingMode && (
        <aside
          aria-label="Developer Viewport Tester"
          className="bg-emerald-950 text-emerald-200 border-b border-emerald-900 px-2.5 py-1.5 text-[11px] shrink-0 sticky top-0 z-50 shadow-md"
        >
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="w-2 h-2 rounded-full bg-[#84cc16]"></span>
              <span className="font-bold text-white">Dev Viewport Testing Tool:</span>
              <span className="text-emerald-300 hidden sm:inline">
                {simulatedWidth ? `${simulatedWidth}px container width` : '100% Fluid Viewport'}
              </span>
            </div>

            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
              <button
                type="button"
                onClick={() => setSimulatedWidth(null)}
                className={`px-2 py-0.5 min-h-[28px] rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                  simulatedWidth === null
                    ? 'bg-[#166534] text-white ring-1 ring-lime-400'
                    : 'text-emerald-300 hover:bg-emerald-900'
                }`}
                title="Fluid browser width"
              >
                100% Fluid
              </button>

              {testViewports.map((vp) => (
                <button
                  key={vp.width}
                  type="button"
                  onClick={() => setSimulatedWidth(vp.width)}
                  className={`px-1.5 py-0.5 min-h-[28px] rounded text-[10px] font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-0.5 ${
                    simulatedWidth === vp.width
                      ? 'bg-[#166534] text-white ring-1 ring-lime-400'
                      : 'text-emerald-300 hover:bg-emerald-900'
                  }`}
                  title={`${vp.desc} (${vp.width}px)`}
                >
                  <span>{vp.label}</span>
                </button>
              ))}

              <button
                type="button"
                onClick={() => setIsDevTestingMode(false)}
                className="text-emerald-400 hover:text-white text-[11px] ml-1 px-1.5 min-h-[28px] flex items-center cursor-pointer"
                title="Hide test bar (Press Alt+D to re-open)"
              >
                ✕ Hide
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Main Layout Container */}
      <div
        className={`w-full mx-auto flex-1 flex flex-col transition-all duration-200 ${
          simulatedWidth
            ? 'border-x-2 border-emerald-900/30 shadow-2xl bg-[#F8FAF8] my-0'
            : ''
        }`}
        style={{
          maxWidth: simulatedWidth ? `${simulatedWidth}px` : '100%',
        }}
      >
        {/* Sticky Header with Safe Padding & Location Selector */}
        <Header
          currentLocation={currentLocation}
          onOpenLocationModal={() => setIsLocationModalOpen(true)}
          onOpenNotificationModal={() => setIsNotificationModalOpen(true)}
          unreadCount={unreadCount}
        />

        {/* Real-time Multi-Supplier Operations Switcher */}
        <div className="bg-[#14532d] text-white px-3 py-1.5 text-xs shadow-xs border-b border-[#0f3d21]">
          <div className="max-w-xl mx-auto flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse shrink-0" />
              <span className="font-bold text-[11px] truncate">Ooh Gas Multi-Supplier Network</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsSupplierPortalOpen(true)}
                className="px-2 py-0.5 rounded bg-white/15 hover:bg-white/25 active:bg-white/30 text-lime-300 font-bold text-[10.5px] transition-colors cursor-pointer border border-lime-400/30 flex items-center gap-1"
                title="Open Supplier Operations Portal to receive, accept or reject incoming offers"
              >
                <span>🏢 Supplier Portal</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAdminOrdersViewOpen(true)}
                className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 active:bg-white/25 text-white font-bold text-[10.5px] transition-colors cursor-pointer border border-white/20 flex items-center gap-1"
                title="Open Admin Dispatch & Matching Monitor"
              >
                <span>🛡️ Admin Monitor</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Main Body Content */}
        <div className="w-full max-w-xl mx-auto flex-1 flex flex-col px-3 min-[360px]:px-4 sm:px-5 py-3 sm:py-4">
          {activeTab === 'home' && (
            <>
              {/* If Live Tracker is open, show the dedicated live delivery tracker view */}
              {isLiveTrackerOpen && activeOrder ? (
                <LiveDeliveryTracker
                  order={activeOrder}
                  suppliers={MOCK_SUPPLIERS}
                  riders={MOCK_RIDERS}
                  currentLocation={currentLocation}
                  onUpdateStage={(stage) =>
                    setActiveOrder((prev) => (prev ? { ...prev, stage } : null))
                  }
                  onCloseTracker={() => setIsLiveTrackerOpen(false)}
                  onResetOrder={() => {
                    setActiveOrder(null);
                    setIsLiveTrackerOpen(false);
                  }}
                />
              ) : (
                <main className="space-y-3 sm:space-y-3.5 pb-24 sm:pb-28">
                  {/* Active Order Banner (shown if an order is active while browsing home) */}
                  {activeOrder && activeOrder.stage !== 'completed' && (
                    <div className="bg-[#14532d] text-white rounded-xl p-3 flex items-center justify-between gap-2.5 shadow-sm border border-[#0f3d21]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#84cc16] animate-ping shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">
                            Delivery in progress: {activeOrder.quantity}x {activeOrder.cylinderSize}
                          </p>
                          <p className="text-[10.5px] text-emerald-200 truncate">
                            Courier {activeOrder.assignedRider?.name.split(' ')[0]} · ~{activeOrder.etaMinutes}m away
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsLiveTrackerOpen(true)}
                        className="py-1.5 px-3 rounded-lg bg-white text-[#14532d] font-bold text-xs hover:bg-emerald-50 cursor-pointer shrink-0 transition-colors shadow-2xs"
                      >
                        Track Order →
                      </button>
                    </div>
                  )}

                  {/* 1. Real Interactive Mapbox Delivery Map with Zones */}
                  <MapboxDeliveryMap
                    currentLocation={currentLocation}
                    suppliers={MOCK_SUPPLIERS}
                    activeOrder={null}
                    coverageResult={coverageResult}
                    isCoverageLoading={isCoverageLoading}
                    zones={deliveryZones}
                    onZonesUpdated={refreshZonesAndCoverage}
                    onOpenLocationModal={() => setIsLocationModalOpen(true)}
                    onSelectLocation={(newLocation) => setCurrentLocation(newLocation)}
                  />

                  {/* 2. Main Hero Section: "What gas do you need today?" */}
                  <WhatGasDoYouNeed
                    selectedSize={selectedSize}
                    onChangeSize={setSelectedSize}
                    purchaseType={purchaseType}
                    onChangePurchaseType={setPurchaseType}
                    quantity={quantity}
                    onChangeQuantity={setQuantity}
                    currentLocation={currentLocation}
                    coverageResult={coverageResult}
                    isCoverageLoading={isCoverageLoading}
                    onRequestGas={handleInitiateRequest}
                    onOpenLocationModal={() => setIsLocationModalOpen(true)}
                    onOpenSupplierComparison={() => setShowManualSuppliers((prev) => !prev)}
                  />

                  {/* 3. Secondary Manual Supplier Browsing (Discrete, collapsed by default) */}
                  {showManualSuppliers && (
                    <section className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-3 shadow-2xs text-left animate-in fade-in-50 duration-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                            Nearby Gas Depots
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            {coverageResult?.isCovered
                              ? `Serving ${coverageResult.primaryZone?.name}`
                              : `Unserviced zone for ${currentLocation.name.split(',')[0]}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowManualSuppliers(false)}
                          className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                        >
                          Hide
                        </button>
                      </div>

                      {/* Filter Bar */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none w-full">
                        {(['all', 'K-Gas', 'TotalEnergies', 'Shell Gas'] as const).map((filter) => (
                          <button
                            key={filter}
                            type="button"
                            onClick={() => setActiveFilter(filter)}
                            className={`px-2.5 py-1 min-h-[30px] rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border flex items-center shrink-0 ${
                              activeFilter === filter
                                ? 'bg-[#14532d] text-white border-[#14532d]'
                                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            {filter === 'all' ? 'All Depots' : filter}
                          </button>
                        ))}
                      </div>

                      {/* Suppliers Grid */}
                      <div className="space-y-2.5">
                        {filteredSuppliers.map((supplier) => (
                          <SupplierCard
                            key={supplier.id}
                            supplier={supplier}
                            onOrderNow={handleOpenManualOrderFlow}
                          />
                        ))}
                      </div>
                    </section>
                  )}
                </main>
              )}
            </>
          )}

          {/* Secondary Views (Tab Switching) */}
          {activeTab === 'orders' && (
            <main className="flex-1 pt-1 pb-24">
              <OrdersView
                onBackToHome={() => setActiveTab('home')}
                activeOrder={activeOrder}
                onOpenTracker={() => {
                  setActiveTab('home');
                  setIsLiveTrackerOpen(true);
                }}
              />
            </main>
          )}

          {activeTab === 'wallet' && (
            <main className="flex-1 pt-1 pb-24">
              <WalletView onBackToHome={() => setActiveTab('home')} />
            </main>
          )}

          {activeTab === 'profile' && (
            <main className="flex-1 pt-1 pb-24">
              <ProfileView onBackToHome={() => setActiveTab('home')} />
            </main>
          )}
        </div>

        {/* Bottom Navigation with Safe Area Support */}
        <BottomNav activeTab={activeTab} onChangeTab={(tab) => setActiveTab(tab)} />
      </div>

      {/* Interactive Modals */}
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentLocation={currentLocation}
        onSelectLocation={(loc) => setCurrentLocation(loc)}
      />

      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        notifications={notifications}
        onMarkAllAsRead={handleMarkAllNotificationsRead}
      />

      <SafetyModal
        isOpen={isSafetyModalOpen}
        onClose={() => setIsSafetyModalOpen(false)}
      />

      {/* Request Flow Step 1: Confirm Details */}
      <ConfirmRequestDrawer
        isOpen={isConfirmDrawerOpen}
        onClose={() => setIsConfirmDrawerOpen(false)}
        selectedSize={selectedSize}
        purchaseType={purchaseType}
        brandPreference={brandPreference}
        quantity={quantity}
        currentLocation={currentLocation}
        coverageResult={coverageResult}
        onConfirmAndMatch={handleConfirmAndStartMatching}
      />

      {/* Request Flow Step 2: Animated Radar Matching Overlay */}
      {activeOrder && (
        <MatchingModal
          isOpen={isMatchingModalOpen}
          selectedSize={selectedSize}
          brandPreference={brandPreference}
          matchedSupplier={activeOrder.matchedSupplier || MOCK_SUPPLIERS[0]}
          assignedRider={activeOrder.assignedRider || MOCK_RIDERS[0]}
          onCancel={() => {
            setIsMatchingModalOpen(false);
            setActiveOrder(null);
          }}
          onMatchedComplete={handleMatchCompleted}
        />
      )}

      {/* Manual Specific Supplier Order Modal (if customer selects depot directly) */}
      <OrderFlowModal
        isOpen={isManualOrderModalOpen}
        onClose={() => setIsManualOrderModalOpen(false)}
        supplier={selectedSupplierForManualOrder}
        initialSize={selectedSize}
        initialPurchaseType={purchaseType}
        currentLocationName={currentLocation.name}
      />

      {/* Supplier Operations Portal Modal (Offer Accept/Reject & Dispatches) */}
      <SupplierDashboardModal
        isOpen={isSupplierPortalOpen}
        onClose={() => setIsSupplierPortalOpen(false)}
        activeOrderNumber={activeOrder?.orderId}
      />

      {/* Admin Multi-Supplier Dispatch & Matching Monitor View */}
      <AdminOrdersMatchingView
        isOpen={isAdminOrdersViewOpen}
        onClose={() => setIsAdminOrdersViewOpen(false)}
      />
    </div>
  );
}
