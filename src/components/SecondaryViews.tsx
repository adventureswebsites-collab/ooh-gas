import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
  HelpCircle,
  ShieldCheck,
  Sparkles,
  LogOut,
  User,
  Phone,
  Mail,
  Plus,
  Trash2,
  Check,
  Edit2,
  Loader2,
  Copy,
  Bell,
  Heart,
  Star,
  Clock,
  CalendarClock,
  MessageCircle,
  Flame,
  Scale,
  XCircle,
} from 'lucide-react';
import { SupplierLettermark } from './BrandIdentities';
import {
  OnDemandOrderState,
  NotificationItem,
  Supplier,
  CylinderSize,
  PurchaseType,
} from '../types';
import {
  CustomerAuthSession,
  signOutCustomer,
  updateCustomerProfile,
  resetCustomerPassword,
  getCustomerSavedAddresses,
  saveCustomerAddress,
  deleteCustomerAddress,
  setDefaultCustomerAddress,
  getCustomerOrderHistory,
  loginWithDemoAccount,
} from '../services/customerAuthService';
import { CustomerAddress, MultiSupplierOrder } from '../types/multisupplier';
import { DOORSTEP_SAFETY_POINTS, MARKET_BENCHMARK_PRICES } from '../data/mockData';

export interface ScheduledOrderRecord {
  id: string;
  orderNumber: string;
  cylinderSize: CylinderSize;
  purchaseType: PurchaseType;
  brand: string;
  quantity: number;
  supplierName: string;
  supplierBrand: Supplier['brand'];
  date: string;
  dateFormatted: string;
  slotLabel: string;
  totalAmount: number;
  deliveryFee: number;
  locationName: string;
  status: 'scheduled' | 'cancelled';
}

interface ViewProps {
  onBackToHome: () => void;
  activeOrder?: OnDemandOrderState | null;
  onOpenTracker?: () => void;
  customerSession?: CustomerAuthSession | null;
  onOpenAuthModal?: (mode?: 'signin' | 'signup') => void;
  onReorderCylinder?: (brand: string, size: string) => void;
  scheduledOrders?: ScheduledOrderRecord[];
  onCancelScheduledOrder?: (id: string) => void;
  initialFilter?: 'all' | 'scheduled' | 'completed' | 'cancelled';
  onOpenHelp?: () => void;
}

// ==============================================================================
// 1. ORDERS VIEW (Order History + Scheduled Orders Tabs + RLS Protection)
// ==============================================================================
export const OrdersView: React.FC<ViewProps> = ({
  onBackToHome,
  activeOrder,
  onOpenTracker,
  customerSession,
  onOpenAuthModal,
  onReorderCylinder,
  scheduledOrders = [],
  onCancelScheduledOrder,
  initialFilter = 'all',
}) => {
  const [orders, setOrders] = useState<MultiSupplierOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterTab, setFilterTab] = useState<'all' | 'scheduled' | 'completed' | 'cancelled'>(
    initialFilter
  );

  useEffect(() => {
    setFilterTab(initialFilter);
  }, [initialFilter]);

  useEffect(() => {
    if (!customerSession) {
      setOrders([]);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    getCustomerOrderHistory(customerSession.user.id)
      .then((data) => {
        if (isMounted) {
          setOrders(data);
        }
      })
      .catch((err) => console.warn('[OrdersView] Failed fetching orders:', err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [customerSession?.user.id]);

  const defaultRecentOrders = [
    {
      id: 'ord-mock-1',
      orderNumber: 'OG-91823',
      brand: 'TotalEnergies',
      supplierName: 'TotalEnergies Service Station',
      cylinderSize: '13kg',
      purchaseType: 'Refill',
      quantity: 1,
      estate: 'Kilimani, Nairobi',
      date: '18 Oct 2026',
      deliveryFee: 0,
      totalAmount: 2920,
      paymentStatus: 'M-Pesa Paid',
      orderStatus: 'Delivered',
      deliveryStatus: 'Verified 27.2 kg',
    },
    {
      id: 'ord-mock-2',
      orderNumber: 'OG-82711',
      brand: 'K-Gas',
      supplierName: 'K-Gas Kilimani Depot',
      cylinderSize: '6kg',
      purchaseType: 'Refill',
      quantity: 1,
      estate: 'Westlands, Nairobi',
      date: '02 Sep 2026',
      deliveryFee: 100,
      totalAmount: 1400,
      paymentStatus: 'M-Pesa Paid',
      orderStatus: 'Delivered',
      deliveryStatus: 'Verified 13.1 kg',
    },
  ];

  const activeScheduled = scheduledOrders.filter((s) => s.status === 'scheduled');
  const cancelledScheduled = scheduledOrders.filter((s) => s.status === 'cancelled');

  return (
    <div className="space-y-4 pb-24 text-left max-w-2xl mx-auto w-full animate-in fade-in duration-150">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#15191C] hover:text-[#226946] cursor-pointer min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back Home</span>
        </button>
        <h1 className="text-base font-extrabold text-[#15191C]">My Orders</h1>
      </div>

      {/* Segmented Filter Tabs (All, Scheduled, Completed, Cancelled) */}
      <div className="grid grid-cols-4 p-1 bg-[#F6F7F8] rounded-2xl gap-1">
        {(
          [
            { id: 'all', label: 'All' },
            { id: 'scheduled', label: `Scheduled (${activeScheduled.length})` },
            { id: 'completed', label: 'Completed' },
            { id: 'cancelled', label: 'Cancelled' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterTab(tab.id)}
            className={`py-2 px-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer truncate ${
              filterTab === tab.id
                ? 'bg-[#226946] text-white shadow-2xs'
                : 'text-[#6B7280] hover:text-[#15191C]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active On-Demand Order Banner */}
      {activeOrder && activeOrder.stage !== 'completed' && (filterTab === 'all' || filterTab === 'scheduled') && (
        <div className="rounded-3xl bg-[#226946] text-white p-4 sm:p-5 space-y-3 shadow-sm animate-in slide-in-from-top-2">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider block">
                Active Delivery · #{activeOrder.orderId}
              </span>
              <h3 className="text-base font-extrabold text-white truncate">
                {activeOrder.quantity}x {activeOrder.cylinderSize} (
                {activeOrder.purchaseType === 'refill' ? 'Refill' : 'Exchange Set'})
              </h3>
              <p className="text-xs text-emerald-100/90 truncate">
                {activeOrder.matchedSupplier?.name || 'Verified Gas Depot'} · Rider:{' '}
                <strong className="text-white">{activeOrder.assignedRider?.name || 'Juma Kiprono'}</strong>
              </p>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] text-emerald-200 font-semibold uppercase block">
                Handover PIN
              </span>
              <span className="font-mono text-base font-extrabold text-[#226946] bg-white px-2.5 py-1 rounded-xl inline-block mt-0.5 tabular-nums">
                {activeOrder.handoverPin}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2.5 border-t border-white/15 text-xs">
            <span className="text-emerald-100 font-semibold tabular-nums">
              ETA: ~{activeOrder.etaMinutes} min · KSh {activeOrder.totalPrice.toLocaleString()}
            </span>
            <button
              type="button"
              onClick={onOpenTracker}
              className="py-2 px-4 rounded-xl bg-white hover:bg-emerald-50 text-[#226946] text-xs font-bold transition-colors cursor-pointer"
            >
              Track Order →
            </button>
          </div>
        </div>
      )}

      {/* Scheduled Deliveries Section */}
      {(filterTab === 'scheduled' || (filterTab === 'all' && activeScheduled.length > 0)) && (
        <div className="rounded-3xl border border-neutral-200/80 bg-white p-4 sm:p-5 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-extrabold text-[#15191C] flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-[#226946]" />
              <span>Scheduled Gas Deliveries</span>
            </h2>
            <span className="text-xs font-semibold text-[#6B7280] tabular-nums">
              {activeScheduled.length} upcoming
            </span>
          </div>

          {activeScheduled.length === 0 ? (
            <div className="py-6 text-center space-y-2">
              <p className="text-xs text-[#6B7280]">No scheduled gas deliveries yet.</p>
              <button
                type="button"
                onClick={onBackToHome}
                className="px-4 py-2 rounded-xl bg-[#EDF6F1] text-[#226946] text-xs font-bold cursor-pointer"
              >
                Schedule a Delivery
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {activeScheduled.map((sched) => (
                <div
                  key={sched.id}
                  className="p-3.5 rounded-2xl border border-neutral-200 bg-[#F8FAF9] space-y-2.5 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <SupplierLettermark brand={sched.supplierBrand} className="w-9 h-9 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-extrabold text-[#15191C] truncate">
                          {sched.quantity}x {sched.cylinderSize} ({sched.purchaseType === 'refill' ? 'Refill' : 'Complete'})
                        </p>
                        <p className="text-[11px] text-[#6B7280] truncate">
                          {sched.supplierName} · #{sched.orderNumber}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10.5px] font-bold text-[#226946] bg-[#EDF6F1] px-2.5 py-1 rounded-lg shrink-0">
                      Scheduled
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-200/70 text-[11px]">
                    <div>
                      <span className="text-[#6B7280] block">Date &amp; Window</span>
                      <span className="font-bold text-[#15191C]">
                        {sched.dateFormatted} · {sched.slotLabel}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[#6B7280] block">Total</span>
                      <span className="font-extrabold text-[#226946] tabular-nums">
                        KSh {sched.totalAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {onCancelScheduledOrder && (
                    <button
                      type="button"
                      onClick={() => onCancelScheduledOrder(sched.id)}
                      className="w-full py-2 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Cancel Scheduled Order
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cancelled Tab */}
      {filterTab === 'cancelled' && (
        <div className="rounded-3xl border border-neutral-200/80 bg-white p-5 space-y-3 shadow-2xs">
          <h2 className="text-sm sm:text-base font-extrabold text-[#15191C]">Cancelled Orders</h2>
          {cancelledScheduled.length === 0 ? (
            <div className="py-8 text-center space-y-1.5">
              <XCircle className="w-7 h-7 text-neutral-300 mx-auto" />
              <p className="text-xs text-[#6B7280]">You have no cancelled gas orders.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cancelledScheduled.map((c) => (
                <div key={c.id} className="p-3 rounded-2xl border border-neutral-200 bg-[#F6F7F8] flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-[#15191C]">
                      #{c.orderNumber} · {c.quantity}x {c.cylinderSize}
                    </p>
                    <p className="text-[11px] text-[#6B7280]">{c.dateFormatted} · {c.supplierName}</p>
                  </div>
                  <span className="text-xs font-bold text-rose-600">Cancelled</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Order History (All & Completed) */}
      {(filterTab === 'all' || filterTab === 'completed') && (
        <>
          {!customerSession ? (
            <div className="rounded-3xl border border-neutral-200 bg-white p-6 text-center space-y-3 shadow-2xs">
              <div className="w-12 h-12 rounded-full bg-[#EDF6F1] text-[#226946] mx-auto flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#15191C]">
                  Sign In to View Your Orders
                </h3>
                <p className="text-xs text-[#6B7280] max-w-sm mx-auto mt-0.5">
                  Access your private order history, digital scale weight receipts, and one-tap cylinder refills.
                </p>
              </div>
              <div className="pt-2 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenAuthModal?.('signin')}
                  className="py-2.5 px-5 rounded-xl bg-[#226946] hover:bg-[#195136] text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuthModal?.('signup')}
                  className="py-2.5 px-4 rounded-xl border border-neutral-200 bg-[#F6F7F8] hover:bg-neutral-100 text-[#15191C] text-xs font-bold transition-colors cursor-pointer"
                >
                  Register
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-neutral-200/80 bg-white p-4 sm:p-5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <h2 className="text-sm sm:text-base font-extrabold text-[#15191C]">
                  Past Gas Orders
                </h2>
                <span className="text-[11px] font-semibold text-[#226946]">
                  Private · Supabase RLS
                </span>
              </div>

              {isLoading ? (
                <div className="py-8 flex flex-col items-center justify-center text-[#6B7280] gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[#226946]" />
                  <span className="text-xs">Loading your orders...</span>
                </div>
              ) : orders.length > 0 ? (
                <div className="space-y-3">
                  {orders.map((ord: any) => (
                    <div
                      key={ord.id || ord.orderNumber}
                      className="p-3.5 rounded-2xl border border-neutral-200 bg-[#F8FAF9] space-y-2.5 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <SupplierLettermark
                            brand={ord.items?.[0]?.product?.brand || 'K-Gas'}
                            className="w-9 h-9 shrink-0"
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-extrabold text-[#15191C] truncate">
                              Order #{ord.orderNumber}
                            </h4>
                            <p className="text-[11px] text-[#6B7280] truncate">
                              {ord.supplierName || 'Verified Depot'} · {ord.deliveryAddress?.estate || 'Nairobi'} ·{' '}
                              {new Date(ord.createdAt || Date.now()).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-[#226946] bg-[#EDF6F1] px-2 py-0.5 rounded-lg flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-3 h-3" /> {ord.status || 'Delivered'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-neutral-200/70 text-[11px]">
                        <div>
                          <span className="text-[#6B7280] block">Product</span>
                          <span className="font-bold text-[#15191C]">
                            {ord.items?.[0]?.quantity || 1}x {ord.items?.[0]?.product?.cylinderSize || '13kg'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#6B7280] block">Delivery Fee</span>
                          <span className="font-bold text-[#15191C] tabular-nums">
                            KSh {(ord.deliveryFee ?? 0).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#6B7280] block">Payment</span>
                          <span className="font-bold text-[#226946]">
                            {ord.paymentStatus || 'Verified'}
                          </span>
                        </div>
                        <div className="sm:text-right">
                          <span className="text-[#6B7280] block">Total</span>
                          <span className="font-extrabold text-[#15191C] tabular-nums">
                            KSh {(ord.totalAmount || 2850).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onReorderCylinder?.(
                            ord.items?.[0]?.product?.brand || 'K-Gas',
                            ord.items?.[0]?.product?.cylinderSize || '13kg'
                          );
                        }}
                        className="w-full min-h-[40px] py-2 rounded-xl bg-[#226946] hover:bg-[#195136] text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        Order Again
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {defaultRecentOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-3.5 rounded-2xl border border-neutral-200 bg-[#F8FAF9] space-y-2.5 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <SupplierLettermark brand={ord.brand as any} className="w-9 h-9 shrink-0" />
                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-extrabold text-[#15191C] truncate">
                              #{ord.orderNumber} · {ord.quantity}x {ord.brand} {ord.cylinderSize}
                            </h4>
                            <p className="text-[11px] text-[#6B7280] truncate">
                              {ord.supplierName} · {ord.date}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-[#226946] bg-[#EDF6F1] px-2 py-0.5 rounded-lg flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-3 h-3" /> {ord.orderStatus}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-neutral-200/70 text-[11px]">
                        <div>
                          <span className="text-[#6B7280] block">Status</span>
                          <span className="font-bold text-[#15191C]">{ord.deliveryStatus}</span>
                        </div>
                        <div>
                          <span className="text-[#6B7280] block">Delivery Fee</span>
                          <span className="font-bold text-[#15191C] tabular-nums">
                            {ord.deliveryFee === 0 ? 'Free' : `KSh ${ord.deliveryFee}`}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#6B7280] block">Payment</span>
                          <span className="font-bold text-[#226946]">{ord.paymentStatus}</span>
                        </div>
                        <div className="sm:text-right">
                          <span className="text-[#6B7280] block">Total</span>
                          <span className="font-extrabold text-[#15191C] tabular-nums">
                            KSh {ord.totalAmount.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onReorderCylinder?.(ord.brand, ord.cylinderSize)}
                        className="w-full min-h-[40px] py-2 rounded-xl bg-[#226946] hover:bg-[#195136] text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        Order Again
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ==============================================================================
// 2. NOTIFICATIONS VIEW (Bottom Nav Tab)
// ==============================================================================
interface NotificationsViewProps {
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
  onBackToHome: () => void;
  onOrderNow?: () => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  notifications,
  onMarkAllRead,
  onBackToHome,
  onOrderNow,
}) => {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-4 pb-24 text-left max-w-2xl mx-auto w-full animate-in fade-in duration-150">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#15191C] hover:text-[#226946] cursor-pointer min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back Home</span>
        </button>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="text-xs font-bold text-[#226946] hover:underline cursor-pointer"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-[#15191C]">Notifications</h1>
          <p className="text-xs text-[#6B7280]">
            Order alerts, refill reminders, and gas safety updates
          </p>
        </div>
        {unreadCount > 0 && (
          <span className="px-2.5 py-1 rounded-xl bg-[#EDF6F1] text-[#226946] text-xs font-bold tabular-nums">
            {unreadCount} new
          </span>
        )}
      </div>

      <div className="space-y-2.5">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`rounded-2xl border p-4 flex items-start gap-3 transition-colors ${
              n.read
                ? 'border-neutral-200/80 bg-white'
                : 'border-[#226946]/30 bg-[#EDF6F1]/50'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                n.type === 'safety'
                  ? 'bg-[#EDF6F1] text-[#226946]'
                  : n.type === 'promo'
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-[#226946] text-white'
              }`}
            >
              {n.type === 'safety' ? (
                <ShieldCheck className="w-5 h-5" />
              ) : n.type === 'promo' ? (
                <Flame className="w-5 h-5" />
              ) : (
                <Bell className="w-5 h-5" />
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-extrabold text-[#15191C] truncate">{n.title}</h3>
                <span className="text-[11px] text-[#6B7280] shrink-0">{n.time}</span>
              </div>
              <p className="text-xs text-[#6B7280] leading-relaxed">{n.message}</p>
            </div>
          </div>
        ))}
      </div>

      {onOrderNow && (
        <button
          type="button"
          onClick={onOrderNow}
          className="w-full min-h-[48px] py-3 rounded-2xl bg-[#226946] hover:bg-[#195136] text-white text-sm font-bold cursor-pointer transition-colors"
        >
          Order Cooking Gas Now
        </button>
      )}
    </div>
  );
};

// ==============================================================================
// 3. FAVOURITE GAS SHOPS VIEW
// ==============================================================================
interface FavoritesViewProps {
  suppliers: Supplier[];
  favoriteSupplierIds: string[];
  onToggleFavorite: (id: string) => void;
  onOrderFromShop: (supplier: Supplier) => void;
  onBackToHome: () => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  suppliers,
  favoriteSupplierIds,
  onToggleFavorite,
  onOrderFromShop,
  onBackToHome,
}) => {
  const favSuppliers = suppliers.filter((s) => favoriteSupplierIds.includes(s.id));

  return (
    <div className="space-y-4 pb-24 text-left max-w-2xl mx-auto w-full animate-in fade-in duration-150">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#15191C] hover:text-[#226946] cursor-pointer min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back Home</span>
        </button>
        <span className="text-xs font-bold text-[#226946] tabular-nums">
          {favSuppliers.length} Saved
        </span>
      </div>

      <div>
        <h1 className="text-xl font-extrabold text-[#15191C]">Favourite Gas Shops</h1>
        <p className="text-xs text-[#6B7280]">
          Quick 1-tap ordering from your trusted neighbourhood LPG depots
        </p>
      </div>

      {favSuppliers.length === 0 ? (
        <div className="rounded-3xl border border-neutral-200 bg-white p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#F6F7F8] text-neutral-400 mx-auto flex items-center justify-center">
            <Heart className="w-6 h-6" />
          </div>
          <h3 className="text-base font-extrabold text-[#15191C]">No Favourite Shops Yet</h3>
          <p className="text-xs text-[#6B7280] max-w-xs mx-auto">
            Tap the heart icon on any nearby gas shop while ordering to save it here.
          </p>
          <button
            type="button"
            onClick={onBackToHome}
            className="px-5 py-2.5 rounded-xl bg-[#226946] text-white text-xs font-bold cursor-pointer"
          >
            Browse Nearby Gas Shops
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {favSuppliers.map((shop) => {
            const price13kg =
              shop.cylinders.find((c) => c.size === '13kg')?.refillPrice ??
              MARKET_BENCHMARK_PRICES['13kg'].refillPrice;
            return (
              <div
                key={shop.id}
                className="rounded-2xl border border-neutral-200 bg-white p-4 flex items-center justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <SupplierLettermark brand={shop.brand} className="w-11 h-11 shrink-0" />
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-extrabold text-[#15191C] truncate">
                      {shop.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-[#6B7280] mt-0.5 flex-wrap">
                      <span className="inline-flex items-center gap-0.5 font-bold text-[#15191C]">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {shop.rating.toFixed(1)}
                      </span>
                      <span>·</span>
                      <span className="tabular-nums">{shop.distanceKm} km</span>
                      <span>·</span>
                      <span className="text-[#226946] font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {shop.deliveryTimeMin}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6B7280] mt-0.5 tabular-nums">
                      13kg Refill from KSh {price13kg.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(shop.id)}
                    className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer"
                    aria-label={`Remove ${shop.name} from favourites`}
                  >
                    <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onOrderFromShop(shop)}
                    className="px-3.5 py-2 rounded-xl bg-[#226946] hover:bg-[#195136] text-white text-xs font-bold cursor-pointer"
                  >
                    Order Gas
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ==============================================================================
// 4. HELP & SUPPORT VIEW
// ==============================================================================
export const HelpSupportView: React.FC<{ onBackToHome: () => void }> = ({ onBackToHome }) => {
  return (
    <div className="space-y-4 pb-24 text-left max-w-2xl mx-auto w-full animate-in fade-in duration-150">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#15191C] hover:text-[#226946] cursor-pointer min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back Home</span>
        </button>
        <span className="text-xs font-bold text-[#226946]">24/7 Gas Support</span>
      </div>

      <div className="rounded-3xl bg-[#226946] text-white p-5 sm:p-6 space-y-2 shadow-sm">
        <div className="flex items-center gap-2 text-emerald-100 text-xs font-bold uppercase tracking-wider">
          <HelpCircle className="w-4 h-4" />
          <span>Ooh Gas Help Center</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold">Need assistance with your gas delivery?</h1>
        <p className="text-xs text-emerald-100/90">
          Direct dispatch desk for scale verification, missing tamper seals, or urgent cylinder hookups.
        </p>
        <div className="pt-2 flex flex-wrap gap-2 text-xs font-bold">
          <span className="px-3.5 py-2 rounded-xl bg-white text-[#226946] inline-flex items-center gap-1.5 tabular-nums">
            <Phone className="w-3.5 h-3.5" /> +254 700 840 900
          </span>
          <span className="px-3.5 py-2 rounded-xl bg-[#195136] text-white inline-flex items-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5" /> support@oohgas.co.ke
          </span>
        </div>
      </div>

      {/* Doorstep Safety Checklist */}
      <div className="rounded-3xl border border-neutral-200/80 bg-white p-5 space-y-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <Scale className="w-4.5 h-4.5 text-[#226946]" />
          <h2 className="text-base font-extrabold text-[#15191C]">Doorstep Gas Safety Guide</h2>
        </div>

        <div className="space-y-2.5">
          {DOORSTEP_SAFETY_POINTS.map((pt) => (
            <div key={pt.num} className="p-3 rounded-2xl bg-[#F6F7F8] flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#226946] text-white text-xs font-bold flex items-center justify-center shrink-0">
                {pt.num}
              </span>
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-[#15191C]">{pt.title}</h3>
                <p className="text-xs text-[#6B7280] mt-0.5 leading-relaxed">{pt.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Common FAQs */}
      <div className="rounded-3xl border border-neutral-200/80 bg-white p-5 space-y-3 shadow-2xs">
        <h2 className="text-base font-extrabold text-[#15191C]">Quick Answers</h2>
        <div className="space-y-2.5 text-xs divide-y divide-neutral-100">
          <div className="pt-1">
            <p className="font-bold text-[#15191C]">What cylinder sizes can I order?</p>
            <p className="text-[#6B7280] mt-0.5">
              Ooh Gas delivers 6kg, 13kg, 22.5kg, 29kg, and 50kg LPG cylinders across Nairobi for both refills and new complete sets.
            </p>
          </div>
          <div className="pt-2.5">
            <p className="font-bold text-[#15191C]">How does doorstep weight verification work?</p>
            <p className="text-[#6B7280] mt-0.5">
              Every rider carries a digital hanging scale. Tap &quot;Check Digital Scale&quot; on the live tracking screen to confirm gross weight equals tare + gas weight.
            </p>
          </div>
          <div className="pt-2.5">
            <p className="font-bold text-[#15191C]">Can I pay with M-Pesa or Cash on delivery?</p>
            <p className="text-[#6B7280] mt-0.5">
              Yes. Choose M-Pesa Instant STK Push, M-Pesa Paybill on delivery, or Cash on Delivery at checkout.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==============================================================================
// 5. WALLET VIEW (Kept exported for compatibility)
// ==============================================================================
export const WalletView: React.FC<ViewProps> = ({ onBackToHome, customerSession }) => {
  return (
    <div className="space-y-3 pb-24 text-left max-w-xl mx-auto w-full animate-in fade-in duration-150">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#226946] hover:underline cursor-pointer min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back Home</span>
        </button>
        <span className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
          Ooh Gas Wallet
        </span>
      </div>

      <div className="rounded-3xl bg-[#226946] p-5 text-white shadow-sm">
        <span className="text-[11px] font-semibold text-emerald-200 uppercase tracking-wider">
          M-Pesa Linked Account
        </span>
        <div className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums">
          KSh 3,250
        </div>
        <p className="mt-1 text-xs text-emerald-100/90 font-mono">
          {customerSession?.user.phoneNumber || '+254 712 345 678'}
        </p>
      </div>
    </div>
  );
};

// ==============================================================================
// 6. PROFILE VIEW (Customer Account, Saved Addresses, Password Reset, Sign Out)
// ==============================================================================
export const ProfileView: React.FC<ViewProps> = ({
  onBackToHome,
  customerSession,
  onOpenAuthModal,
  onOpenHelp,
}) => {
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editFullName, setEditFullName] = useState(customerSession?.user.fullName || '');
  const [editPhone, setEditPhone] = useState(customerSession?.user.phoneNumber || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const [isAddAddressOpen, setIsAddAddressOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('Home');
  const [newStreet, setNewStreet] = useState('');
  const [newBuilding, setNewBuilding] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const loadAddresses = async () => {
    setIsLoadingAddresses(true);
    try {
      const list = await getCustomerSavedAddresses();
      setAddresses(list);
    } catch (e) {
      console.warn('[ProfileView] Addresses load error:', e);
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  useEffect(() => {
    if (customerSession) {
      setEditFullName(customerSession.user.fullName);
      setEditPhone(customerSession.user.phoneNumber);
      loadAddresses();
    }
  }, [customerSession]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileMessage(null);
    try {
      await updateCustomerProfile({
        fullName: editFullName,
        phoneNumber: editPhone,
      });
      setProfileMessage('Profile details updated successfully.');
      setTimeout(() => {
        setIsEditProfileOpen(false);
        setProfileMessage(null);
      }, 1000);
    } catch (err: any) {
      setProfileMessage(err.message || 'Failed to update profile.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAddress(true);
    try {
      await saveCustomerAddress({
        label: newLabel,
        streetAddress: newStreet,
        buildingName: newBuilding,
        houseOrFlatNumber: newUnit,
        deliveryNotes: newNotes,
        location: { lat: -1.2921, lng: 36.7856 },
        isDefault: addresses.length === 0,
      });
      setIsAddAddressOpen(false);
      setNewStreet('');
      setNewBuilding('');
      setNewUnit('');
      setNewNotes('');
      loadAddresses();
    } catch (err) {
      console.warn('[ProfileView] Save address error:', err);
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    await deleteCustomerAddress(id);
    loadAddresses();
  };

  const handleSetDefaultAddress = async (id: string) => {
    await setDefaultCustomerAddress(id);
    loadAddresses();
  };

  const handleTriggerPasswordReset = async () => {
    if (!customerSession?.user.email) return;
    setIsSendingReset(true);
    setResetMessage(null);
    try {
      const res = await resetCustomerPassword(customerSession.user.email);
      setResetMessage(res.message);
    } catch (e: any) {
      setResetMessage(e.message || 'Failed to send password reset email.');
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleSignOut = async () => {
    await signOutCustomer();
  };

  return (
    <div className="space-y-4 pb-24 text-left max-w-2xl mx-auto w-full animate-in fade-in duration-150">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#15191C] hover:text-[#226946] cursor-pointer min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back Home</span>
        </button>
        <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
          Customer Profile
        </span>
      </div>

      {!customerSession ? (
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 text-center space-y-3 shadow-2xs">
          <div className="w-14 h-14 rounded-full bg-[#EDF6F1] text-[#226946] mx-auto flex items-center justify-center">
            <User className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-[#15191C]">
              Welcome to Ooh Gas
            </h3>
            <p className="text-xs text-[#6B7280] max-w-sm mx-auto mt-0.5">
              Sign in or create an account to save delivery locations, track live orders, and manage gas refills.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-2 max-w-xs mx-auto">
            <button
              type="button"
              onClick={() => onOpenAuthModal?.('signin')}
              className="py-2.5 px-5 rounded-xl bg-[#226946] hover:bg-[#195136] text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => onOpenAuthModal?.('signup')}
              className="py-2.5 px-4 rounded-xl border border-neutral-200 bg-[#F6F7F8] hover:bg-neutral-100 text-[#15191C] text-xs font-bold transition-colors cursor-pointer"
            >
              Register
            </button>
          </div>

          <div className="pt-3 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => loginWithDemoAccount()}
              className="text-xs font-bold text-[#226946] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#226946]" />
              <span>Demo Sign In (Wangari Mwangi)</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          {/* Authenticated Profile Card */}
          <div className="rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-14 h-14 rounded-full bg-[#226946] text-white flex items-center justify-center font-bold text-lg shrink-0">
                  {customerSession.user.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-extrabold text-[#15191C] truncate">
                    {customerSession.user.fullName}
                  </h3>
                  <p className="text-xs text-[#6B7280] truncate mt-0.5 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-[#226946]" />
                    <span>{customerSession.user.phoneNumber}</span>
                  </p>
                  <p className="text-xs text-[#6B7280] truncate mt-0.5 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-neutral-400" />
                    <span>{customerSession.user.email}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditProfileOpen(true)}
                className="py-1.5 px-3 rounded-xl bg-[#F6F7F8] hover:bg-neutral-200 text-[#15191C] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-[#F6F7F8] text-xs flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">
                  Customer ID
                </span>
                <span className="font-mono text-[11px] text-[#15191C] font-semibold truncate block">
                  {customerSession.user.id}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(customerSession.user.id);
                  setCopiedId(true);
                  setTimeout(() => setCopiedId(false), 2000);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-white border border-neutral-200 text-[#15191C] text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
              >
                {copiedId ? (
                  <>
                    <Check className="w-3 h-3 text-[#226946]" />
                    <span className="text-[#226946]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-[#6B7280]" />
                    <span>Copy ID</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Edit Profile Modal */}
          {isEditProfileOpen && (
            <div className="p-4 rounded-3xl bg-white border border-[#226946]/30 shadow-sm space-y-3 animate-in fade-in">
              <h4 className="text-xs font-extrabold text-[#226946] uppercase tracking-wider">
                Edit Personal Information
              </h4>

              {profileMessage && (
                <div className="p-2.5 rounded-xl bg-[#EDF6F1] text-[#226946] text-xs font-semibold">
                  {profileMessage}
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#15191C] mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F7F8] text-sm text-[#15191C] focus:ring-2 focus:ring-[#226946] outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#15191C] mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F7F8] text-sm text-[#15191C] focus:ring-2 focus:ring-[#226946] outline-hidden"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="flex-1 py-2.5 rounded-xl bg-[#226946] hover:bg-[#195136] text-white text-xs font-bold cursor-pointer"
                  >
                    {isUpdatingProfile ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditProfileOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-neutral-200 text-[#6B7280] text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Saved Delivery Addresses */}
          <div className="rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm sm:text-base font-extrabold text-[#15191C]">
                  Saved Delivery Addresses
                </h4>
                <p className="text-xs text-[#6B7280]">Select saved places during checkout</p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddAddressOpen(!isAddAddressOpen)}
                className="py-1.5 px-3 rounded-xl bg-[#226946] hover:bg-[#195136] text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New</span>
              </button>
            </div>

            {isAddAddressOpen && (
              <form
                onSubmit={handleSaveAddress}
                className="p-3.5 rounded-2xl bg-[#F6F7F8] space-y-2.5 text-xs animate-in fade-in"
              >
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-[#15191C] mb-0.5">Label</label>
                    <input
                      type="text"
                      required
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder="Home, Work"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-200 text-xs text-[#15191C]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#15191C] mb-0.5">Street / Estate</label>
                    <input
                      type="text"
                      required
                      value={newStreet}
                      onChange={(e) => setNewStreet(e.target.value)}
                      placeholder="Argwings Kodhek Rd"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-200 text-xs text-[#15191C]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-[#15191C] mb-0.5">Building</label>
                    <input
                      type="text"
                      value={newBuilding}
                      onChange={(e) => setNewBuilding(e.target.value)}
                      placeholder="Silver Oak Court"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-200 text-xs text-[#15191C]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#15191C] mb-0.5">House / Apt</label>
                    <input
                      type="text"
                      value={newUnit}
                      onChange={(e) => setNewUnit(e.target.value)}
                      placeholder="Apt 4B"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-200 text-xs text-[#15191C]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#15191C] mb-0.5">
                    Delivery Instructions
                  </label>
                  <input
                    type="text"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Call at gate"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-200 text-xs text-[#15191C]"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={isSavingAddress}
                    className="flex-1 py-2 rounded-xl bg-[#226946] text-white font-bold cursor-pointer"
                  >
                    {isSavingAddress ? 'Saving...' : 'Save Address'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddAddressOpen(false)}
                    className="px-3 py-2 rounded-xl border border-neutral-300 text-[#6B7280] font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {isLoadingAddresses ? (
              <div className="py-4 text-center text-xs text-[#6B7280]">Loading addresses...</div>
            ) : addresses.length === 0 ? (
              <div className="p-3 text-center text-xs text-[#6B7280]">
                No saved addresses yet. Click &quot;Add New&quot; above to save your Home or Work gate.
              </div>
            ) : (
              <div className="space-y-2">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`p-3 rounded-2xl border text-xs flex items-start justify-between gap-2.5 ${
                      addr.isDefault
                        ? 'border-[#226946]/40 bg-[#EDF6F1]/70'
                        : 'border-neutral-200 bg-white'
                    }`}
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#226946]" />
                        <span className="font-extrabold text-[#15191C]">{addr.label}</span>
                        {addr.isDefault && (
                          <span className="text-[10px] font-bold text-[#226946]">· Default</span>
                        )}
                      </div>
                      <p className="text-[#6B7280] truncate">
                        {addr.buildingName ? `${addr.buildingName}, ` : ''}
                        {addr.houseOrFlatNumber ? `${addr.houseOrFlatNumber}, ` : ''}
                        {addr.streetAddress}
                      </p>
                      {addr.deliveryNotes && (
                        <p className="text-[11px] text-[#6B7280] italic">{addr.deliveryNotes}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {!addr.isDefault && (
                        <button
                          type="button"
                          onClick={() => handleSetDefaultAddress(addr.id)}
                          className="px-2 py-1 rounded-lg text-[10.5px] font-bold text-[#226946] hover:bg-[#EDF6F1] cursor-pointer"
                        >
                          Default
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 cursor-pointer"
                        aria-label="Delete address"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Account Security & Help Link */}
          <div className="rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-2xs space-y-3">
            <h4 className="text-xs font-extrabold text-[#15191C] uppercase tracking-wider">
              Security &amp; Support
            </h4>

            {resetMessage && (
              <div className="p-2.5 rounded-xl bg-[#EDF6F1] text-xs text-[#226946] font-medium">
                {resetMessage}
              </div>
            )}

            <div className="flex items-center justify-between text-xs py-1">
              <div>
                <span className="font-bold text-[#15191C] block">Reset Password</span>
                <span className="text-[11px] text-[#6B7280]">
                  Email link to {customerSession.user.email}
                </span>
              </div>
              <button
                type="button"
                onClick={handleTriggerPasswordReset}
                disabled={isSendingReset}
                className="py-1.5 px-3 rounded-xl border border-neutral-200 hover:bg-[#F6F7F8] text-[#15191C] font-bold cursor-pointer"
              >
                {isSendingReset ? 'Sending...' : 'Send Link'}
              </button>
            </div>

            {onOpenHelp && (
              <button
                type="button"
                onClick={onOpenHelp}
                className="w-full py-2.5 px-3 rounded-xl bg-[#F6F7F8] hover:bg-[#EDF6F1] text-[#15191C] text-xs font-bold flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-[#226946]" />
                  <span>Help &amp; Doorstep Safety Support</span>
                </span>
                <span>→</span>
              </button>
            )}
          </div>

          {/* Sign Out */}
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full py-3 px-4 rounded-2xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-rose-600" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
};
