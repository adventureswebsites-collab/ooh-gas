import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { AppIntroSplash } from './components/AppIntroSplash';
import { WelcomeScreen } from './components/WelcomeScreen';
import { MapboxDeliveryMap } from './components/map/MapboxDeliveryMap';
import {
  ShopDetailSheetModal,
  RiderDetailSheetModal,
} from './components/ondemand/NearbyShopsBottomSheet';
import { DestinationHomeScreen } from './components/ondemand/DestinationHomeScreen';
import { DestinationMapStep } from './components/ondemand/DestinationMapStep';
import {
  OrderGasFlow,
  OrderFlowStep,
  CompletedCheckoutPayload,
} from './components/ondemand/OrderGasFlow';
import { MenuCatalogView } from './components/ondemand/MenuCatalogView';
import { MyCartView } from './components/ondemand/MyCartView';
import { CylinderDetailModal, CartItem } from './components/ondemand/CylinderDetailModal';
import { ConfirmRequestDrawer } from './components/ondemand/ConfirmRequestDrawer';
import { MatchingModal } from './components/ondemand/MatchingModal';
import { LiveDeliveryTracker } from './components/ondemand/LiveDeliveryTracker';
import { BottomNav, NavTab } from './components/BottomNav';
import { LocationModal } from './components/LocationModal';
import { NotificationModal } from './components/NotificationModal';
import { SafetyModal } from './components/SafetyModal';
import { OrderFlowModal } from './components/ordering/OrderFlowModal';
import {
  OrdersView,
  NotificationsView,
  FavoritesView,
  HelpSupportView,
  ProfileView,
  ScheduledOrderRecord,
} from './components/SecondaryViews';
import { SupplierDashboardModal } from './components/supplier/SupplierDashboardModal';
import { AdminOrdersMatchingView } from './components/admin/AdminOrdersMatchingView';
import { RiderDeliveryPortalModal } from './components/driver/RiderDeliveryPortalModal';
import { AuthModal } from './components/auth/AuthModal';
import { LoginPage } from './components/auth/LoginPage';
import { SignUpPage } from './components/auth/SignUpPage';
import { PasswordResetPage } from './components/auth/PasswordResetPage';
import {
  CustomerAuthSession,
  OtpRequestResult,
  subscribeToCustomerAuth,
  getCurrentCustomerSession,
} from './services/customerAuthService';
import { createRealtimeOrder, initiatePayHeroMpesa } from './services/multiSupplierService';
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
  RiderInfo,
  CylinderSize,
  PurchaseType,
  GasBrand,
  NairobiLocation,
  NotificationItem,
  OnDemandOrderState,
  PaymentMethod,
  DeliveryZone,
  CoverageCheckResult,
  DeliveryTimingType,
} from './types';
import { Smartphone, Tablet, Monitor } from 'lucide-react';

const FAVORITES_STORAGE_KEY = 'oohgas_favorite_suppliers';
const SCHEDULED_STORAGE_KEY = 'oohgas_scheduled_orders';

export default function App() {
  // Customer Authentication & Session State
  const [customerSession, setCustomerSession] = useState<CustomerAuthSession | null>(() =>
    getCurrentCustomerSession()
  );

  // App Intro Splash (Animated Gas Bike on Road shown on initial app open)
  const [showAppIntro, setShowAppIntro] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return !window.location.search.includes('skipIntro');
  });

  // Welcome Screen (Screen 1) on fresh unauthenticated load
  const [showWelcomeScreen, setShowWelcomeScreen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const hasSession = Boolean(getCurrentCustomerSession());
    const hasHash = Boolean(window.location.hash);
    const skipParam = window.location.search.includes('skipWelcome');
    return !hasSession && !hasHash && !skipParam;
  });

  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [ordersInitialFilter, setOrdersInitialFilter] = useState<
    'all' | 'scheduled' | 'completed' | 'cancelled'
  >('all');

  // Location state
  const [currentLocation, setCurrentLocation] = useState<NairobiLocation>(NAIROBI_LOCATIONS[0]);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // Delivery Zones & Coverage State
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>(INITIAL_DELIVERY_ZONES);
  const [coverageResult, setCoverageResult] = useState<CoverageCheckResult | null>(null);
  const [isCoverageLoading, setIsCoverageLoading] = useState(false);

  // Notification state
  const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  // Favourite Gas Shops (Persisted)
  const [favoriteSupplierIds, setFavoriteSupplierIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return ['k-gas-hub', 'total-energies-station'];
  });

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteSupplierIds));
    } catch (_) {}
  }, [favoriteSupplierIds]);

  const handleToggleFavoriteSupplier = (supplierId: string) => {
    setFavoriteSupplierIds((prev) =>
      prev.includes(supplierId) ? prev.filter((id) => id !== supplierId) : [...prev, supplierId]
    );
  };

  // Scheduled Orders (Persisted)
  const [scheduledOrders, setScheduledOrders] = useState<ScheduledOrderRecord[]>(() => {
    try {
      const raw = localStorage.getItem(SCHEDULED_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(SCHEDULED_STORAGE_KEY, JSON.stringify(scheduledOrders));
    } catch (_) {}
  }, [scheduledOrders]);

  const handleCancelScheduledOrder = (id: string) => {
    setScheduledOrders((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'cancelled' } : item))
    );
  };

  // Safety modal state
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);

  // Gas Selection State
  const [selectedSize, setSelectedSize] = useState<CylinderSize>('13kg');
  const [purchaseType, setPurchaseType] = useState<PurchaseType>('refill');
  const [quantity, setQuantity] = useState<number>(1);
  const [brandPreference, setBrandPreference] = useState<GasBrand>('Any');

  // Guided Screens 4–9 OrderGasFlow State
  const [orderFlowStep, setOrderFlowStep] = useState<OrderFlowStep | null>(null);
  const [orderFlowTiming, setOrderFlowTiming] = useState<DeliveryTimingType>('asap');
  const [pendingOrderFlowStep, setPendingOrderFlowStep] = useState<OrderFlowStep | null>(null);

  // Cart & Cylinder Customization State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailInitialSize, setDetailInitialSize] = useState<CylinderSize>('13kg');
  const [detailInitialPurchaseType, setDetailInitialPurchaseType] = useState<PurchaseType>('refill');
  const [detailInitialBrand, setDetailInitialBrand] = useState<GasBrand>('Any');

  // Legacy Drawer / Matching Overlays
  const [isConfirmDrawerOpen, setIsConfirmDrawerOpen] = useState(false);
  const [isMatchingModalOpen, setIsMatchingModalOpen] = useState(false);
  const [isLiveTrackerOpen, setIsLiveTrackerOpen] = useState(false);

  // Active Order State
  const [activeOrder, setActiveOrder] = useState<OnDemandOrderState | null>(null);

  // Destination-First Home Flow State (Step 1: Destination Search -> Step 2: Interactive Map Pin)
  const [homeStep, setHomeStep] = useState<'destination' | 'map_pin'>('destination');
  const [autoDetectGpsInMap, setAutoDetectGpsInMap] = useState<boolean>(false);
  const [initialSearchQueryInMap, setInitialSearchQueryInMap] = useState<string>('');
  const [autoSearchDepotsInMap, setAutoSearchDepotsInMap] = useState<boolean>(true);
  const [selectedShopPinModal, setSelectedShopPinModal] = useState<Supplier | null>(null);
  const [selectedRiderPinModal, setSelectedRiderPinModal] = useState<RiderInfo | null>(null);
  const [flowInitialSupplier, setFlowInitialSupplier] = useState<Supplier | null>(null);

  // Manual supplier order flow modal
  const [isManualOrderModalOpen, setIsManualOrderModalOpen] = useState(false);
  const [selectedSupplierForManualOrder, setSelectedSupplierForManualOrder] =
    useState<Supplier | null>(null);

  // Supplier Portal, Admin Monitor, and Rider GPS Console Modal states
  const [isSupplierPortalOpen, setIsSupplierPortalOpen] = useState(false);
  const [isAdminOrdersViewOpen, setIsAdminOrdersViewOpen] = useState(false);
  const [isRiderPortalOpen, setIsRiderPortalOpen] = useState(false);

  // Auth modals & redirects
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authInitialMode] = useState<'signin' | 'signup'>('signin');
  const [authRedirectReason, setAuthRedirectReason] = useState<string | null>(null);
  const [authRedirectDestination, setAuthRedirectDestination] = useState<string | null>(null);
  const [welcomePendingOtp, setWelcomePendingOtp] = useState<OtpRequestResult | null>(null);
  const [authEmailFallbackMode, setAuthEmailFallbackMode] = useState<boolean>(false);
  const [pendingOrderDetails, setPendingOrderDetails] = useState<{
    fullName: string;
    phoneNumber: string;
    estate: string;
    building: string;
    unitNumber: string;
    deliveryInstructions: string;
    paymentMethod: PaymentMethod;
  } | null>(null);

  // Standalone full-page view for Sign Up / Login / Reset Password
  const [authPage, setAuthPage] = useState<'login' | 'signup' | 'reset-password' | null>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#login' || hash.startsWith('#login')) return 'login';
      if (hash === '#signup' || hash.startsWith('#signup') || hash === '#register') return 'signup';
      if (hash === '#reset-password' || hash.startsWith('#reset-password')) return 'reset-password';
      const urlParams = new URLSearchParams(window.location.search);
      const page = urlParams.get('page');
      if (page === 'login') return 'login';
      if (page === 'signup' || page === 'register') return 'signup';
      if (page === 'reset-password') return 'reset-password';
    }
    return null;
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#login' || hash.startsWith('#login')) {
        setShowWelcomeScreen(false);
        setAuthPage('login');
      } else if (hash === '#signup' || hash.startsWith('#signup') || hash === '#register') {
        setShowWelcomeScreen(false);
        setAuthPage('signup');
      } else if (hash === '#reset-password' || hash.startsWith('#reset-password')) {
        setShowWelcomeScreen(false);
        setAuthPage('reset-password');
      } else if (hash === '#menu') {
        setAuthPage(null);
        setActiveTab('menu');
      } else if (hash === '#cart') {
        setAuthPage(null);
        setActiveTab('cart');
      } else if (hash === '#orders') {
        setAuthPage(null);
        setActiveTab('orders');
      } else if (hash === '#notifications') {
        setAuthPage(null);
        setActiveTab('notifications');
      } else if (hash === '#favorites') {
        setAuthPage(null);
        setActiveTab('favorites');
      } else if (hash === '#profile') {
        setAuthPage(null);
        setActiveTab('profile');
      } else if (hash === '' || hash === '#home') {
        setAuthPage(null);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToCustomerAuth((session) => {
      setCustomerSession(session);
    });
    return unsubscribe;
  }, []);

  const handleOpenAuthPage = (
    mode: 'login' | 'signup' | 'reset-password' = 'login',
    reason?: string,
    destination?: string
  ) => {
    setShowWelcomeScreen(false);
    setAuthPage(mode);
    setAuthRedirectReason(reason || null);
    if (destination) setAuthRedirectDestination(destination);
    try {
      window.location.hash = `#${mode}`;
    } catch (_) {}
  };

  const handleCloseAuthPage = () => {
    setAuthPage(null);
    setAuthRedirectReason(null);
    setWelcomePendingOtp(null);
    setAuthEmailFallbackMode(false);
    try {
      if (
        window.location.hash.startsWith('#login') ||
        window.location.hash.startsWith('#signup') ||
        window.location.hash.startsWith('#reset-password')
      ) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    } catch (_) {}
  };

  const handleRequestLoginForOrder = (details: {
    fullName: string;
    phoneNumber: string;
    estate: string;
    building: string;
    unitNumber: string;
    deliveryInstructions: string;
    paymentMethod: PaymentMethod;
  }) => {
    setPendingOrderDetails(details);
    setAuthRedirectDestination('order');
    handleOpenAuthPage(
      'login',
      'Please sign in or create an account to complete your gas order.',
      'order'
    );
  };

  // Developer testing harness (?dev=true or Alt+D)
  const [isDevTestingMode, setIsDevTestingMode] = useState<boolean>(() => {
    return (
      typeof window !== 'undefined' &&
      (window.location.search.includes('dev=true') || window.location.search.includes('test=true'))
    );
  });
  const [simulatedWidth, setSimulatedWidth] = useState<number | null>(null);

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
      if (
        (e.altKey && e.key.toLowerCase() === 'd') ||
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd')
      ) {
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

  // Cart & Product Detail handlers
  const handleOpenCylinderDetail = (
    size: CylinderSize,
    pType: PurchaseType = purchaseType,
    brand: GasBrand = brandPreference
  ) => {
    setDetailInitialSize(size);
    setDetailInitialPurchaseType(pType);
    setDetailInitialBrand(brand);
    setIsDetailModalOpen(true);
  };

  const handleAddToCart = (newItem: CartItem, buyNow = false) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === newItem.id);
      if (existing) {
        return prev.map((i) =>
          i.id === newItem.id ? { ...i, quantity: Math.min(5, i.quantity + newItem.quantity) } : i
        );
      }
      return [...prev, newItem];
    });
    setSelectedSize(newItem.size);
    setPurchaseType(newItem.purchaseType);
    setBrandPreference(newItem.brandPreference);
    setIsDetailModalOpen(false);
    if (buyNow) {
      setAuthPage(null);
      setOrderFlowStep(null);
      setActiveTab('cart');
    }
  };

  const handleUpdateCartQuantity = (itemId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.id === itemId ? { ...item, quantity: Math.min(5, item.quantity + delta) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveCartItem = (itemId: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  // Start Guided 11-Screen Flow (Screen 4: Select Your Gas)
  const handleStartGuidedOrderFlow = (timingMode: DeliveryTimingType = 'asap') => {
    setAuthPage(null);
    setIsLiveTrackerOpen(false);
    setActiveTab('home');
    setOrderFlowTiming(timingMode);
    setOrderFlowStep('select_gas');
  };

  // Confirm Guided Order (Screen 8 -> Screen 9 Confirmation)
  const handleSubmittedOrderFlow = async (
    payload: CompletedCheckoutPayload
  ): Promise<{ orderNumber: string; isScheduled: boolean }> => {
    const generatedNum = `OG-${Math.floor(10000 + Math.random() * 89999)}`;
    const targetBrand =
      payload.brandPreference === 'Any' ? payload.selectedSupplier.brand : payload.brandPreference;
    const matchedMasterProduct =
      MASTER_PRODUCTS.find(
        (p) =>
          p.brand.toLowerCase() === targetBrand.toLowerCase() &&
          p.cylinderSize === payload.cylinderSize
      ) || MASTER_PRODUCTS[0];

    let finalOrderNumber = generatedNum;

    try {
      const serverOrder = await createRealtimeOrder({
        customerId: customerSession?.user.id,
        customerName: payload.deliveryDetails.fullName,
        phoneNumber: payload.deliveryDetails.phoneNumber,
        deliveryAddress: {
          street: payload.deliveryDetails.building
            ? `${payload.deliveryDetails.building}, ${payload.deliveryDetails.estate}`
            : payload.deliveryDetails.estate,
          building: payload.deliveryDetails.building,
          unitNumber: payload.deliveryDetails.unitNumber,
          estate: payload.deliveryDetails.estate,
          notes: payload.deliveryDetails.deliveryInstructions,
        },
        deliveryPoint: {
          lat: currentLocation.coordinates.lat,
          lng: currentLocation.coordinates.lng,
        },
        items: [
          {
            productId: matchedMasterProduct.id,
            purchaseType: payload.purchaseType === 'refill' ? 'refill' : 'complete_unit',
            quantity: payload.quantity,
          },
        ],
        paymentMethod: payload.deliveryDetails.paymentMethod,
        timeoutSeconds: 45,
      });

      if (serverOrder && serverOrder.orderId) {
        finalOrderNumber = serverOrder.orderId;
      }

      if (payload.deliveryDetails.paymentMethod === 'payhero_mpesa' && finalOrderNumber) {
        await initiatePayHeroMpesa(finalOrderNumber, payload.deliveryDetails.phoneNumber).catch(
          () => {}
        );
      }
    } catch (err) {
      console.warn('[OrderGasFlow] Backend order sync notice:', err);
    }

    if (payload.timingType === 'scheduled' && payload.scheduledFor) {
      const newSchedule: ScheduledOrderRecord = {
        id: `sched-${Date.now()}`,
        orderNumber: finalOrderNumber,
        cylinderSize: payload.cylinderSize,
        purchaseType: payload.purchaseType,
        brand: targetBrand,
        quantity: payload.quantity,
        supplierName: payload.selectedSupplier.name,
        supplierBrand: payload.selectedSupplier.brand,
        date: payload.scheduledFor.date,
        dateFormatted: payload.scheduledFor.dateFormatted,
        slotLabel: payload.scheduledFor.slotLabel,
        totalAmount: payload.totalPrice,
        deliveryFee: payload.deliveryFee,
        locationName: currentLocation.name,
        status: 'scheduled',
      };
      setScheduledOrders((prev) => [newSchedule, ...prev]);

      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          title: 'Scheduled Delivery Confirmed',
          message: `Your ${payload.cylinderSize} gas from ${payload.selectedSupplier.name} is booked for ${payload.scheduledFor?.dateFormatted} (${payload.scheduledFor?.slotLabel}).`,
          time: 'Just now',
          type: 'order',
          read: false,
        },
        ...prev,
      ]);

      return { orderNumber: finalOrderNumber, isScheduled: true };
    }

    // Immediate On-Demand Active Order for Screen 10 (Track Order)
    const newActiveOrder: OnDemandOrderState = {
      orderId: finalOrderNumber,
      createdAt: 'Just now',
      cylinderSize: payload.cylinderSize,
      purchaseType: payload.purchaseType,
      brandPreference: payload.brandPreference,
      quantity: payload.quantity,
      unitPrice: payload.unitPrice,
      subtotal: payload.subtotal,
      deliveryFee: payload.deliveryFee,
      totalPrice: payload.totalPrice,
      paymentMethod: payload.deliveryDetails.paymentMethod,
      destination: {
        fullName: payload.deliveryDetails.fullName,
        phoneNumber: payload.deliveryDetails.phoneNumber,
        estate: payload.deliveryDetails.estate,
        building: payload.deliveryDetails.building,
        unitNumber: payload.deliveryDetails.unitNumber,
        deliveryInstructions: payload.deliveryDetails.deliveryInstructions,
        pinLocation: {
          lat: currentLocation.coordinates.lat,
          lng: currentLocation.coordinates.lng,
          areaName: payload.deliveryDetails.estate,
          isCustomPinned: true,
        },
      },
      matchedSupplier: payload.selectedSupplier,
      assignedRider: MOCK_RIDERS[0],
      handoverPin: `${Math.floor(1000 + Math.random() * 9000)}`,
      etaMinutes: 18,
      stage: 'order_received',
      orderStatus: 'MATCHING_SUPPLIER',
      deliveryTimingType: 'asap',
    };

    setActiveOrder(newActiveOrder);
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: `Order #${finalOrderNumber} Placed`,
        message: `${payload.selectedSupplier.name} has received your ${payload.quantity}x ${payload.cylinderSize} order. Tap Orders or Track Order to follow your rider.`,
        time: 'Just now',
        type: 'order',
        read: false,
      },
      ...prev,
    ]);

    return { orderNumber: finalOrderNumber, isScheduled: false };
  };

  // Legacy Cart / Quick-Request handler preserved
  const handleConfirmAndStartMatching = async (
    details: {
      fullName: string;
      phoneNumber: string;
      estate: string;
      building: string;
      unitNumber: string;
      deliveryInstructions: string;
      paymentMethod: PaymentMethod;
    },
    overrideCart?: CartItem[]
  ) => {
    setIsConfirmDrawerOpen(false);

    const activeCart = overrideCart || [];
    const primaryCartItem = activeCart[0];

    const orderSize = primaryCartItem?.size || selectedSize;
    const orderPurchaseType = primaryCartItem?.purchaseType || purchaseType;
    const orderBrand = primaryCartItem?.brandPreference || brandPreference;
    const orderQuantity =
      activeCart.length > 0
        ? activeCart.reduce((sum, i) => sum + i.quantity, 0)
        : quantity;

    const targetBrand = orderBrand === 'Any' ? 'K-Gas' : orderBrand;
    const matchedMasterProduct =
      MASTER_PRODUCTS.find(
        (p) => p.brand.toLowerCase() === targetBrand.toLowerCase() && p.cylinderSize === orderSize
      ) || MASTER_PRODUCTS[0];

    const priceInfo = MARKET_BENCHMARK_PRICES[orderSize];
    const defaultUnitPrice =
      orderPurchaseType === 'refill' ? priceInfo.refillPrice : priceInfo.completePrice;
    const subtotal =
      activeCart.length > 0
        ? activeCart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
        : defaultUnitPrice * quantity;
    const unitPrice = primaryCartItem?.unitPrice || defaultUnitPrice;

    const tempOrder: OnDemandOrderState = {
      orderId: `OG-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: 'Just now',
      cylinderSize: orderSize,
      purchaseType: orderPurchaseType,
      brandPreference: orderBrand,
      quantity: orderQuantity,
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

    if (activeCart.length > 0) {
      setCartItems([]);
      setActiveTab('home');
    }

    setActiveOrder(tempOrder);
    setIsMatchingModalOpen(true);

    try {
      const serverOrder = await createRealtimeOrder({
        customerId: customerSession?.user.id,
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
            purchaseType: orderPurchaseType === 'refill' ? 'refill' : 'complete_unit',
            quantity: orderQuantity,
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

  // Resume and submit/return after successful customer login/registration
  const handleAuthSuccess = (session: CustomerAuthSession, updatedLocation?: NairobiLocation) => {
    setCustomerSession(session);
    setShowWelcomeScreen(false);
    setAuthPage(null);
    setIsAuthModalOpen(false);
    setWelcomePendingOtp(null);
    setAuthEmailFallbackMode(false);

    if (updatedLocation) {
      setCurrentLocation(updatedLocation);
    }

    try {
      if (
        window.location.hash.startsWith('#login') ||
        window.location.hash.startsWith('#signup') ||
        window.location.hash.startsWith('#reset-password')
      ) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    } catch (_) {}

    if (pendingOrderFlowStep) {
      const stepToRestore = pendingOrderFlowStep;
      setPendingOrderFlowStep(null);
      setAuthRedirectReason(null);
      setAuthRedirectDestination(null);
      setActiveTab('home');
      setOrderFlowStep(stepToRestore);
    } else if (pendingOrderDetails) {
      const detailsToSubmit = {
        ...pendingOrderDetails,
        fullName: session.user.fullName,
        phoneNumber: session.user.phoneNumber,
        estate: updatedLocation ? updatedLocation.name : pendingOrderDetails.estate,
      };
      setPendingOrderDetails(null);
      setAuthRedirectReason(null);
      setAuthRedirectDestination(null);
      handleConfirmAndStartMatching(detailsToSubmit, cartItems.length > 0 ? cartItems : undefined);
    } else if (authRedirectDestination === 'orders') {
      setActiveTab('orders');
      setAuthRedirectDestination(null);
    } else if (authRedirectDestination === 'profile') {
      setActiveTab('profile');
      setAuthRedirectDestination(null);
    } else {
      setActiveTab('home');
      setOrderFlowStep(null);
      setHomeStep('destination');
    }
  };

  // Matching completes -> transition to dedicated Live Tracker screen
  const handleMatchCompleted = (acceptedData?: any) => {
    setIsMatchingModalOpen(false);

    if (activeOrder) {
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
            brandColor: business.tradeName.includes('Total') ? '#0284c7' : '#226946',
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

  // Manual Supplier Order Flow
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

  const isDestinationHomeView =
    authPage === null &&
    activeTab === 'home' &&
    orderFlowStep === null &&
    homeStep === 'destination' &&
    !(isLiveTrackerOpen && activeOrder);

  const isHomeMapView =
    authPage === null &&
    activeTab === 'home' &&
    orderFlowStep === null &&
    homeStep === 'map_pin' &&
    !(isLiveTrackerOpen && activeOrder);

  const shouldHideMobileBottomNav =
    isHomeMapView || orderFlowStep !== null || (isLiveTrackerOpen && Boolean(activeOrder));

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

  // SCREEN 0: Animated App Intro (Gas Bike with Gas Cylinder Moving on Road)
  if (showAppIntro) {
    return (
      <AppIntroSplash
        onComplete={() => setShowAppIntro(false)}
      />
    );
  }

  // SCREEN 1: Welcome Screen (when user hasn't entered yet)
  if (showWelcomeScreen && !customerSession && authPage === null) {
    return (
      <WelcomeScreen
        onContinueWithOtp={(otpData) => {
          setWelcomePendingOtp(otpData);
          setAuthEmailFallbackMode(false);
          handleOpenAuthPage('login');
        }}
        onBrowseAsGuest={() => {
          setShowWelcomeScreen(false);
          setAuthPage(null);
          setActiveTab('home');
        }}
        onOpenEmailLogin={() => {
          setWelcomePendingOtp(null);
          setAuthEmailFallbackMode(true);
          handleOpenAuthPage('login');
        }}
      />
    );
  }

  // SCREEN 2A: Standalone Full-Bleed Login & Registration Pages
  if (authPage === 'login' && !welcomePendingOtp) {
    return (
      <LoginPage
        onBackToHome={handleCloseAuthPage}
        onNavigateToSignUp={() => handleOpenAuthPage('signup')}
        onNavigateToPasswordReset={() => handleOpenAuthPage('reset-password')}
        redirectReason={authRedirectReason}
        initialLocation={currentLocation}
        initialEmailMode={authEmailFallbackMode}
        onSuccess={handleAuthSuccess}
      />
    );
  }

  if (authPage === 'signup') {
    return (
      <SignUpPage
        onBackToHome={handleCloseAuthPage}
        onNavigateToSignIn={() => handleOpenAuthPage('login')}
        onNavigateToPasswordReset={() => handleOpenAuthPage('reset-password')}
        redirectReason={authRedirectReason}
        initialOtpData={welcomePendingOtp}
        initialLocation={currentLocation}
        onSuccess={handleAuthSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#15191C] flex flex-col font-['Plus_Jakarta_Sans',sans-serif] overflow-x-clip w-full relative">
      {/* Developer Viewport Test Harness (?dev=true or Alt+D) */}
      {isDevTestingMode && (
        <aside
          aria-label="Developer Viewport Tester"
          className="bg-neutral-950 text-neutral-200 border-b border-neutral-800 px-2.5 py-1.5 text-[11px] shrink-0 sticky top-0 z-50 shadow-md"
        >
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-bold text-white">Viewport Tester:</span>
              <span className="text-neutral-400 hidden sm:inline">
                {simulatedWidth ? `${simulatedWidth}px` : 'Fluid'}
              </span>
            </div>

            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
              <button
                type="button"
                onClick={() => setSimulatedWidth(null)}
                className={`px-2 py-0.5 min-h-[28px] rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                  simulatedWidth === null
                    ? 'bg-[#226946] text-white'
                    : 'text-neutral-400 hover:bg-neutral-800'
                }`}
              >
                Fluid
              </button>

              {testViewports.map((vp) => (
                <button
                  key={vp.width}
                  type="button"
                  onClick={() => setSimulatedWidth(vp.width)}
                  className={`px-1.5 py-0.5 min-h-[28px] rounded text-[10px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    simulatedWidth === vp.width
                      ? 'bg-[#226946] text-white'
                      : 'text-neutral-400 hover:bg-neutral-800'
                  }`}
                >
                  {vp.label}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setIsDevTestingMode(false)}
                className="text-neutral-400 hover:text-white text-[11px] ml-1 px-1.5 min-h-[28px] flex items-center cursor-pointer"
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
          simulatedWidth ? 'border-x border-neutral-200 shadow-2xl bg-white my-0' : ''
        }`}
        style={{
          maxWidth: simulatedWidth ? `${simulatedWidth}px` : '100%',
        }}
      >
        {/* Top App Bar: OohGas Logo only, seamless over homepage header wave */}
        <Header
          transparentOverlay={isDestinationHomeView}
          onNavigateHome={() => {
            setAuthPage(null);
            setOrderFlowStep(null);
            setIsLiveTrackerOpen(false);
            setHomeStep('destination');
            setActiveTab('home');
          }}
        />

        {/* Dynamic Main Body Content */}
        <div
          className={
            isHomeMapView
              ? 'w-full max-w-6xl mx-auto flex-1 flex flex-col px-0 lg:px-6 pt-0 lg:py-5'
              : isDestinationHomeView
                ? 'w-full flex-1 flex flex-col px-0 py-0'
                : 'w-full max-w-6xl mx-auto flex-1 flex flex-col px-4 sm:px-6 py-4 sm:py-5'
          }
        >
          {/* SCREEN 2: Welcome OTP Continuation / Reset Password Pages */}
          {authPage === 'login' && welcomePendingOtp && (
            <LoginPage
              onBackToHome={handleCloseAuthPage}
              onNavigateToSignUp={() => handleOpenAuthPage('signup')}
              onNavigateToPasswordReset={() => handleOpenAuthPage('reset-password')}
              redirectReason={authRedirectReason}
              initialOtpData={welcomePendingOtp}
              initialLocation={currentLocation}
              initialEmailMode={authEmailFallbackMode}
              onSuccess={handleAuthSuccess}
            />
          )}

          {authPage === 'reset-password' && (
            <PasswordResetPage
              onBackToLogin={() => handleOpenAuthPage('login')}
              onBackToHome={handleCloseAuthPage}
            />
          )}

          {/* SCREENS 3–11: HOME / GUIDED FLOW / LIVE TRACKER */}
          {authPage === null && activeTab === 'home' && (
            <>
              {/* SCREEN 10 & 11: LIVE DELIVERY TRACKER & ORDER COMPLETED */}
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
                  onOrderAgain={(prevOrder) => {
                    setSelectedSize(prevOrder.cylinderSize);
                    setPurchaseType(prevOrder.purchaseType);
                    setBrandPreference(prevOrder.brandPreference);
                    setQuantity(prevOrder.quantity);
                    setIsLiveTrackerOpen(false);
                    setOrderFlowTiming('asap');
                    setOrderFlowStep('select_gas');
                  }}
                />
              ) : orderFlowStep !== null ? (
                /* SCREENS 4–9: GUIDED GAS ORDERING FLOW */
                <OrderGasFlow
                  initialStep={orderFlowStep}
                  initialTiming={orderFlowTiming}
                  initialSupplier={flowInitialSupplier}
                  selectedSize={selectedSize}
                  onChangeSize={setSelectedSize}
                  purchaseType={purchaseType}
                  onChangePurchaseType={setPurchaseType}
                  brandPreference={brandPreference}
                  onChangeBrandPreference={setBrandPreference}
                  quantity={quantity}
                  onChangeQuantity={setQuantity}
                  currentLocation={currentLocation}
                  coverageResult={coverageResult}
                  suppliers={MOCK_SUPPLIERS}
                  favoriteSupplierIds={favoriteSupplierIds}
                  onToggleFavoriteSupplier={handleToggleFavoriteSupplier}
                  customerSession={customerSession}
                  onOpenLocationModal={() => setIsLocationModalOpen(true)}
                  onChangeDestinationOnMap={() => {
                    setOrderFlowStep(null);
                    setAutoDetectGpsInMap(false);
                    setHomeStep('map_pin');
                  }}
                  onSelectLocation={(newLocation) => setCurrentLocation(newLocation)}
                  onRequestAuthForCheckout={(stepToReturnTo) => {
                    setPendingOrderFlowStep(stepToReturnTo);
                    handleOpenAuthPage(
                      'login',
                      'Sign in or register to confirm your gas order and track delivery.',
                      'order_flow'
                    );
                  }}
                  onSubmitConfirmedOrder={handleSubmittedOrderFlow}
                  onTrackPlacedOrder={() => {
                    setOrderFlowStep(null);
                    setFlowInitialSupplier(null);
                    setHomeStep('destination');
                    setIsLiveTrackerOpen(true);
                  }}
                  onCancelFlow={() => {
                    setOrderFlowStep(null);
                    setFlowInitialSupplier(null);
                    setHomeStep('destination');
                    setActiveTab('home');
                  }}
                />
              ) : homeStep === 'map_pin' ? (
                /* STEP 2: INTERACTIVE DESTINATION MAP & PIN CONFIRMATION */
                <DestinationMapStep
                  initialLocation={currentLocation}
                  initialSearchQuery={initialSearchQueryInMap}
                  autoDetectGpsOnMount={autoDetectGpsInMap}
                  autoSearchDepotsOnMount={autoSearchDepotsInMap}
                  customerId={customerSession?.user.id}
                  suppliers={MOCK_SUPPLIERS}
                  riders={MOCK_RIDERS}
                  zones={deliveryZones}
                  initialSize={selectedSize}
                  initialBrandPreference={brandPreference}
                  initialQuantity={quantity}
                  initialPurchaseType={purchaseType}
                  onZonesUpdated={refreshZonesAndCoverage}
                  onBack={() => {
                    setAutoDetectGpsInMap(false);
                    setInitialSearchQueryInMap('');
                    setHomeStep('destination');
                  }}
                  onConfirmLocation={(confirmedLoc, confirmedCoverage, gasSelection) => {
                    setCurrentLocation(confirmedLoc);
                    if (confirmedCoverage) {
                      setCoverageResult(confirmedCoverage);
                    }
                    if (gasSelection) {
                      setSelectedSize(gasSelection.cylinderSize);
                      setBrandPreference(gasSelection.brandPreference);
                      setQuantity(gasSelection.quantity);
                      setPurchaseType(gasSelection.purchaseType);
                      setFlowInitialSupplier(gasSelection.pinnedDepot);
                    } else {
                      setFlowInitialSupplier(null);
                    }
                    setAutoDetectGpsInMap(false);
                    setInitialSearchQueryInMap('');
                    setOrderFlowTiming('asap');
                    setOrderFlowStep('select_gas');
                  }}
                />
              ) : (
                /* STEP 1: CLEAN DESTINATION-FIRST HOME SCREEN */
                <DestinationHomeScreen
                  customerSession={customerSession}
                  activeOrder={activeOrder}
                  onOpenMapSearch={(options) => {
                    setAutoDetectGpsInMap(Boolean(options?.autoDetectGps));
                    setInitialSearchQueryInMap(options?.initialQuery || '');
                    setAutoSearchDepotsInMap(options?.autoSearchDepots !== false);
                    setHomeStep('map_pin');
                  }}
                  onSelectLocationForMapConfirm={(loc) => {
                    setCurrentLocation(loc);
                    setAutoDetectGpsInMap(false);
                    setInitialSearchQueryInMap(loc.name);
                    setAutoSearchDepotsInMap(true);
                    setHomeStep('map_pin');
                  }}
                  onTrackActiveOrder={() => setIsLiveTrackerOpen(true)}
                />
              )}
            </>
          )}

          {/* MENU CATALOG TAB */}
          {authPage === null && activeTab === 'menu' && (
            <main className="flex-1 pt-1">
              <MenuCatalogView
                suppliers={MOCK_SUPPLIERS}
                currentLocation={currentLocation}
                coverageResult={coverageResult}
                onBackToHome={() => setActiveTab('home')}
                onOpenCylinderDetail={handleOpenCylinderDetail}
                onOrderFromSupplier={handleOpenManualOrderFlow}
              />
            </main>
          )}

          {/* CART TAB */}
          {authPage === null && activeTab === 'cart' && (
            <main className="flex-1 pt-1">
              <MyCartView
                cartItems={cartItems}
                onUpdateQuantity={handleUpdateCartQuantity}
                onRemoveItem={handleRemoveCartItem}
                onBrowseMenu={() => setActiveTab('menu')}
                onBackToHome={() => setActiveTab('home')}
                currentLocation={currentLocation}
                coverageResult={coverageResult}
                onOpenLocationModal={() => setIsLocationModalOpen(true)}
                customerSession={customerSession}
                onRequestLogin={handleRequestLoginForOrder}
                onPlaceOrder={(details) => handleConfirmAndStartMatching(details, cartItems)}
              />
            </main>
          )}

          {/* ORDERS & SCHEDULED ORDERS TAB */}
          {authPage === null && activeTab === 'orders' && (
            <main className="flex-1 pt-1 pb-24">
              <OrdersView
                onBackToHome={() => setActiveTab('home')}
                activeOrder={activeOrder}
                scheduledOrders={scheduledOrders}
                onCancelScheduledOrder={handleCancelScheduledOrder}
                initialFilter={ordersInitialFilter}
                customerSession={customerSession}
                onOpenAuthModal={(mode) =>
                  handleOpenAuthPage(
                    mode === 'signup' ? 'signup' : 'login',
                    'Sign in to view your order history and scheduled deliveries.',
                    'orders'
                  )
                }
                onOpenTracker={() => {
                  setActiveTab('home');
                  setOrderFlowStep(null);
                  setIsLiveTrackerOpen(true);
                }}
                onReorderCylinder={(brand, size) => {
                  const sz = (size as CylinderSize) || '13kg';
                  setSelectedSize(sz);
                  setBrandPreference((brand as GasBrand) || 'Any');
                  handleStartGuidedOrderFlow('asap');
                }}
              />
            </main>
          )}

          {/* NOTIFICATIONS TAB */}
          {authPage === null && activeTab === 'notifications' && (
            <main className="flex-1 pt-1 pb-24">
              <NotificationsView
                notifications={notifications}
                onMarkAllRead={handleMarkAllNotificationsRead}
                onBackToHome={() => setActiveTab('home')}
                onOrderNow={() => handleStartGuidedOrderFlow('asap')}
              />
            </main>
          )}

          {/* FAVOURITE GAS SHOPS VIEW */}
          {authPage === null && activeTab === 'favorites' && (
            <main className="flex-1 pt-1 pb-24">
              <FavoritesView
                suppliers={MOCK_SUPPLIERS}
                favoriteSupplierIds={favoriteSupplierIds}
                onToggleFavorite={handleToggleFavoriteSupplier}
                onOrderFromShop={(shop) => {
                  setBrandPreference(shop.brand);
                  handleStartGuidedOrderFlow('asap');
                }}
                onBackToHome={() => setActiveTab('home')}
              />
            </main>
          )}

          {/* HELP & SUPPORT VIEW */}
          {authPage === null && activeTab === 'help' && (
            <main className="flex-1 pt-1 pb-24">
              <HelpSupportView onBackToHome={() => setActiveTab('home')} />
            </main>
          )}

          {/* PROFILE TAB */}
          {authPage === null && activeTab === 'profile' && (
            <main className="flex-1 pt-1 pb-24">
              <ProfileView
                onBackToHome={() => setActiveTab('home')}
                customerSession={customerSession}
                onOpenHelp={() => setActiveTab('help')}
                unreadCount={unreadCount}
                favoriteCount={favoriteSupplierIds.length}
                scheduledCount={scheduledOrders.filter((s) => s.status === 'scheduled').length}
                onOpenOrderHistory={() => {
                  setOrdersInitialFilter('all');
                  setActiveTab('orders');
                }}
                onOpenScheduledOrders={() => {
                  setOrdersInitialFilter('scheduled');
                  setActiveTab('orders');
                }}
                onOpenFavorites={() => setActiveTab('favorites')}
                onOpenNotifications={() => setActiveTab('notifications')}
                onOpenRiderPortal={() => setIsRiderPortalOpen(true)}
                onOpenSupplierPortal={() => setIsSupplierPortalOpen(true)}
                onOpenAdminMonitor={() => setIsAdminOrdersViewOpen(true)}
                onOpenAuthModal={(mode) =>
                  handleOpenAuthPage(
                    mode === 'signup' ? 'signup' : 'login',
                    'Sign in or create an account to manage your profile and saved addresses.',
                    'profile'
                  )
                }
              />
            </main>
          )}
        </div>

        {/* Mobile Bottom Navigation Bar: Home, Orders, Notifications, Profile */}
        {!shouldHideMobileBottomNav && (
          <BottomNav
            activeTab={activeTab}
            unreadNotifications={unreadCount}
            onChangeTab={(tab) => {
              setAuthPage(null);
              setOrderFlowStep(null);
              setIsLiveTrackerOpen(false);
              if (tab === 'home') setHomeStep('destination');
              if (tab === 'orders') setOrdersInitialFilter('all');
              setActiveTab(tab);
            }}
          />
        )}
      </div>

      {/* Interactive Modals */}
      <CylinderDetailModal
        isOpen={isDetailModalOpen}
        initialSize={detailInitialSize}
        initialPurchaseType={detailInitialPurchaseType}
        initialBrand={detailInitialBrand}
        onClose={() => setIsDetailModalOpen(false)}
        onAddToCart={handleAddToCart}
      />

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

      <SafetyModal isOpen={isSafetyModalOpen} onClose={() => setIsSafetyModalOpen(false)} />

      {/* Quick Drawer Request Flow */}
      <ConfirmRequestDrawer
        isOpen={isConfirmDrawerOpen}
        onClose={() => setIsConfirmDrawerOpen(false)}
        selectedSize={selectedSize}
        purchaseType={purchaseType}
        brandPreference={brandPreference}
        quantity={quantity}
        currentLocation={currentLocation}
        coverageResult={coverageResult}
        customerSession={customerSession}
        onRequestLogin={handleRequestLoginForOrder}
        onConfirmAndMatch={(details) => handleConfirmAndStartMatching(details)}
      />

      {/* Animated Radar Matching Overlay */}
      {activeOrder && (
        <MatchingModal
          isOpen={isMatchingModalOpen}
          selectedSize={selectedSize}
          brandPreference={brandPreference}
          matchedSupplier={activeOrder.matchedSupplier || MOCK_SUPPLIERS[0]}
          assignedRider={activeOrder.assignedRider || MOCK_RIDERS[0]}
          activeOrder={activeOrder}
          onCancel={() => {
            setIsMatchingModalOpen(false);
            setActiveOrder(null);
          }}
          onMatchedComplete={handleMatchCompleted}
        />
      )}

      {/* Manual Specific Supplier Order Modal */}
      <OrderFlowModal
        isOpen={isManualOrderModalOpen}
        onClose={() => setIsManualOrderModalOpen(false)}
        supplier={selectedSupplierForManualOrder}
        initialSize={selectedSize}
        initialPurchaseType={purchaseType}
        currentLocationName={currentLocation.name}
        customerSession={customerSession}
        onRequestLogin={() => {
          setIsManualOrderModalOpen(false);
          handleOpenAuthPage(
            'login',
            `Please sign in or create an account to place your order with ${
              selectedSupplierForManualOrder?.name || 'this gas shop'
            }.`,
            'manual_order'
          );
        }}
      />

      {/* Customer Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authInitialMode}
        redirectReason={authRedirectReason}
        initialLocation={currentLocation}
        onNavigateToPasswordReset={() => handleOpenAuthPage('reset-password')}
        onSuccess={handleAuthSuccess}
      />

      {/* Partner Portals (Accessible via Slide-Out Menu Drawer) */}
      <SupplierDashboardModal
        isOpen={isSupplierPortalOpen}
        onClose={() => setIsSupplierPortalOpen(false)}
        activeOrderNumber={activeOrder?.orderId}
      />

      <AdminOrdersMatchingView
        isOpen={isAdminOrdersViewOpen}
        onClose={() => setIsAdminOrdersViewOpen(false)}
      />

      <RiderDeliveryPortalModal
        isOpen={isRiderPortalOpen}
        onClose={() => setIsRiderPortalOpen(false)}
        activeOrder={activeOrder}
        riders={MOCK_RIDERS}
        suppliers={MOCK_SUPPLIERS}
        currentLocation={currentLocation}
      />

      {/* Interactive Shop Pin / Card Detail Modal */}
      <ShopDetailSheetModal
        supplier={selectedShopPinModal}
        selectedSize={selectedSize}
        purchaseType={purchaseType}
        isFavorite={selectedShopPinModal ? favoriteSupplierIds.includes(selectedShopPinModal.id) : false}
        onToggleFavorite={handleToggleFavoriteSupplier}
        onClose={() => setSelectedShopPinModal(null)}
        onOrderFromShop={(shop, size, pType) => {
          setSelectedSize(size);
          setPurchaseType(pType);
          setFlowInitialSupplier(shop);
          setSelectedShopPinModal(null);
          setOrderFlowTiming('asap');
          setOrderFlowStep('order_summary');
        }}
      />

      {/* Interactive Rider Motorbike Pin Detail Modal */}
      <RiderDetailSheetModal
        rider={selectedRiderPinModal}
        onClose={() => setSelectedRiderPinModal(null)}
        onOrderWithRider={() => {
          setSelectedRiderPinModal(null);
          setFlowInitialSupplier(null);
          setOrderFlowTiming('asap');
          setOrderFlowStep('select_gas');
        }}
      />
    </div>
  );
}
