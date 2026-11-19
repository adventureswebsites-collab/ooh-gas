import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { MULTI_SUPPLIER_BUSINESSES } from '../../data/multiSupplierData';
import { MOCK_RIDERS } from '../../data/mockData';
import {
  fetchDepotSnapshot,
  respondToSupplierOffer,
  updateSupplierOrderStage,
  assignOrderRider,
  updateDepotInventoryStock,
  toggleDepotStatus,
} from '../../services/multiSupplierService';
import {
  Building2,
  CheckCircle2,
  XCircle,
  Truck,
  Package,
  Search,
  Volume2,
  VolumeX,
  RefreshCw,
  Phone,
  MapPin,
  Clock,
  SlidersHorizontal,
  UserCheck,
  Power,
  AlertCircle,
  Plus,
  Minus,
} from 'lucide-react';

export interface DepotDashboardWorkspaceProps {
  variant?: 'beside' | 'full';
  initialSupplierId?: string;
  lockedSupplierId?: string;
  depotAccessKey?: string;
  privateLinkLabel?: string;
  onFocusOrderInCustomerApp?: (orderId: string) => void;
}

type DepotTab = 'incoming' | 'dispatches' | 'history' | 'stock';

const DECLINE_REASONS = [
  'Depot temporarily at capacity',
  'Requested cylinder size out of stock',
  'All riders currently out on routes',
];

function playIncomingOrderChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const notes = [587.33, 880.0]; // Clean D5 -> A5 dispatch chime
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.13);
      gain.gain.setValueAtTime(0.001, now + idx * 0.13);
      gain.gain.exponentialRampToValueAtTime(0.11, now + idx * 0.13 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.13 + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.13);
      osc.stop(now + idx * 0.13 + 0.3);
    });
  } catch {
    // Audio playback blocked before user interaction
  }
}

function formatTimeAgo(iso?: string): string {
  if (!iso) return 'Just now';
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

function formatStatusLabel(status?: string): string {
  switch (status) {
    case 'SUPPLIER_OFFERED':
    case 'offered':
      return 'Awaiting Acceptance';
    case 'SUPPLIER_ACCEPTED':
    case 'accepted':
      return 'Accepted';
    case 'PREPARING':
      return 'Preparing Cylinder';
    case 'OUT_FOR_DELIVERY':
      return 'Out for Delivery';
    case 'DELIVERED':
      return 'Delivered';
    case 'CANCELLED':
      return 'Cancelled';
    case 'NO_SUPPLIER_AVAILABLE':
      return 'Unassigned';
    case 'expired':
      return 'Expired';
    case 'rejected':
      return 'Declined';
    default:
      return status || 'Pending';
  }
}

export const DepotDashboardWorkspace: React.FC<DepotDashboardWorkspaceProps> = ({
  variant = 'full',
  initialSupplierId = 'all',
  lockedSupplierId,
  depotAccessKey,
  privateLinkLabel,
  onFocusOrderInCustomerApp,
}) => {
  const isLockedToDepot = Boolean(lockedSupplierId);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(
    lockedSupplierId || initialSupplierId
  );

  useEffect(() => {
    if (lockedSupplierId) {
      setSelectedSupplierId(lockedSupplierId);
    }
  }, [lockedSupplierId]);
  const [activeTab, setActiveTab] = useState<DepotTab>('incoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [streamStatus, setStreamStatus] = useState<'connected' | 'reconnecting'>('reconnecting');

  const [snapshot, setSnapshot] = useState<{
    offers: any[];
    orders: any[];
    inventory: any[];
    depotStatuses: Record<string, { isOnline: boolean; updatedAt: string }>;
    metrics: {
      pendingCount: number;
      activeDispatchCount: number;
      deliveredCount: number;
      totalOrdersCount: number;
      totalRevenueKsh: number;
    };
  }>({
    offers: [],
    orders: [],
    inventory: [],
    depotStatuses: {},
    metrics: {
      pendingCount: 0,
      activeDispatchCount: 0,
      deliveredCount: 0,
      totalOrdersCount: 0,
      totalRevenueKsh: 0,
    },
  });

  const [isLoading, setIsLoading] = useState(true);
  const [busyActionId, setBusyActionId] = useState<string | null>(null);
  const [declinePickerOfferId, setDeclinePickerOfferId] = useState<string | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  const selectedSupplierRef = useRef(selectedSupplierId);
  selectedSupplierRef.current = selectedSupplierId;

  const depotAccessKeyRef = useRef(depotAccessKey);
  depotAccessKeyRef.current = depotAccessKey;

  const loadSnapshot = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await fetchDepotSnapshot(
        lockedSupplierId || selectedSupplierRef.current,
        depotAccessKeyRef.current
      );
      setSnapshot({
        offers: Array.isArray(data.offers) ? data.offers : [],
        orders: Array.isArray(data.orders) ? data.orders : [],
        inventory: Array.isArray(data.inventory) ? data.inventory : [],
        depotStatuses: data.depotStatuses || {},
        metrics: data.metrics || {
          pendingCount: 0,
          activeDispatchCount: 0,
          deliveredCount: 0,
          totalOrdersCount: 0,
          totalRevenueKsh: 0,
        },
      });
    } catch (err) {
      console.warn('[DepotDashboard] Failed loading snapshot:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [lockedSupplierId]);

  // Load initial snapshot whenever selected depot changes
  useEffect(() => {
    loadSnapshot(false);
  }, [selectedSupplierId, loadSnapshot]);

  // Real-time SSE connection with automatic reconnect & live sound chime on incoming order offers
  useEffect(() => {
    let es: EventSource | null = null;
    let isMounted = true;

    const connect = () => {
      try {
        es = new EventSource('/api/realtime/stream');

        es.onopen = () => {
          if (isMounted) {
            setStreamStatus('connected');
            loadSnapshot(true);
          }
        };

        es.onmessage = (evt) => {
          if (!isMounted) return;
          try {
            const parsed = JSON.parse(evt.data);
            const eventName = parsed.event;
            const payload = parsed.payload;

            if (eventName === 'connected') {
              setStreamStatus('connected');
              return;
            }

            if (
              eventName === 'supplier_offered' ||
              eventName === 'order_created'
            ) {
              const targetMatch =
                selectedSupplierRef.current === 'all' ||
                !payload?.supplierId ||
                payload.supplierId === selectedSupplierRef.current;
              if (targetMatch && eventName === 'supplier_offered' && soundEnabledRef.current) {
                playIncomingOrderChime();
              }
              loadSnapshot(true);
            } else if (
              eventName === 'supplier_accepted' ||
              eventName === 'supplier_rejected' ||
              eventName === 'delivery_status_changed' ||
              eventName === 'rider_assigned' ||
              eventName === 'payment_status_changed' ||
              eventName === 'depot_inventory_updated' ||
              eventName === 'depot_status_changed' ||
              eventName === 'order_status_changed'
            ) {
              loadSnapshot(true);
            }
          } catch {
            // Ignore malformed SSE frame
          }
        };

        es.onerror = () => {
          if (isMounted) setStreamStatus('reconnecting');
        };
      } catch {
        if (isMounted) setStreamStatus('reconnecting');
      }
    };

    connect();

    // 1-second local countdown tick ONLY when there is an active offered countdown timer
    const tickInterval = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);

    return () => {
      isMounted = false;
      clearInterval(tickInterval);
      es?.close();
    };
  }, [loadSnapshot]);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setFeedbackNotice({ type, text });
    setTimeout(() => {
      setFeedbackNotice((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  const handleOfferDecision = async (
    offer: any,
    action: 'ACCEPT' | 'REJECT',
    reason?: string
  ) => {
    setBusyActionId(offer.id);
    setDeclinePickerOfferId(null);
    try {
      const res = await respondToSupplierOffer(
        offer.id,
        offer.supplierId,
        action,
        reason,
        depotAccessKeyRef.current
      );
      if (res.success) {
        if (action === 'ACCEPT') {
          showNotice(
            'success',
            `Order #${offer.order?.orderNumber || offer.orderId} accepted and stock reserved.`
          );
          setActiveTab('dispatches');
        } else {
          showNotice(
            'success',
            `Order #${offer.order?.orderNumber || offer.orderId} declined and routed to next depot.`
          );
        }
        await loadSnapshot(true);
      } else {
        showNotice('error', res.message || res.error || 'Could not process offer action.');
      }
    } catch (err: any) {
      showNotice('error', err.message || 'Network error updating offer.');
    } finally {
      setBusyActionId(null);
    }
  };

  const handleAssignRider = async (orderId: string, riderId: string) => {
    const rider = MOCK_RIDERS.find((r) => r.id === riderId) || MOCK_RIDERS[0];
    setBusyActionId(orderId);
    try {
      const res = await assignOrderRider(
        orderId,
        {
          id: rider.id,
          name: rider.name,
          phone: rider.phone,
          plateNumber: rider.plateNumber,
          vehicleModel: rider.vehicleModel,
        },
        'PREPARING',
        depotAccessKeyRef.current
      );
      if (res.success) {
        showNotice('success', `Assigned ${rider.name} (${rider.plateNumber}) to order.`);
        await loadSnapshot(true);
      } else {
        showNotice('error', res.error || 'Failed assigning rider.');
      }
    } catch (err: any) {
      showNotice('error', err.message || 'Failed assigning rider.');
    } finally {
      setBusyActionId(null);
    }
  };

  const handleStageUpdate = async (orderId: string, nextStatus: string, label: string) => {
    setBusyActionId(orderId);
    try {
      const res = await updateSupplierOrderStage(orderId, nextStatus, depotAccessKeyRef.current);
      if (res.success) {
        showNotice('success', `Order updated to ${label}.`);
        await loadSnapshot(true);
      } else {
        showNotice('error', res.error || 'Stage transition failed.');
      }
    } catch (err: any) {
      showNotice('error', err.message || 'Stage transition failed.');
    } finally {
      setBusyActionId(null);
    }
  };

  const handleStockAdjust = async (
    item: any,
    field: 'stockRefill' | 'stockComplete' | 'isAvailable',
    nextValue: number | boolean
  ) => {
    setBusyActionId(item.id);
    try {
      await updateDepotInventoryStock(
        item.id,
        { [field]: nextValue },
        depotAccessKeyRef.current
      );
      await loadSnapshot(true);
    } catch (err: any) {
      showNotice('error', err.message || 'Stock update failed.');
    } finally {
      setBusyActionId(null);
    }
  };

  const activeDepotStatus =
    selectedSupplierId === 'all'
      ? Object.values(snapshot.depotStatuses).some((s) => s.isOnline)
      : snapshot.depotStatuses[selectedSupplierId]?.isOnline ?? true;

  const handleToggleDepotStatus = async () => {
    const nextOnline = !activeDepotStatus;
    if (selectedSupplierId === 'all' && !isLockedToDepot) {
      await Promise.all(
        MULTI_SUPPLIER_BUSINESSES.map((b) =>
          toggleDepotStatus(b.id, nextOnline, depotAccessKeyRef.current)
        )
      );
    } else {
      await toggleDepotStatus(
        lockedSupplierId || selectedSupplierId,
        nextOnline,
        depotAccessKeyRef.current
      );
    }
    showNotice(
      'success',
      nextOnline ? 'Depot is now Online and receiving orders.' : 'Depot paused from new order offers.'
    );
    await loadSnapshot(true);
  };

  // Filtered datasets
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const incomingOffers = useMemo(() => {
    return snapshot.offers.filter((offer) => {
      if (offer.status !== 'offered') return false;
      if (!normalizedQuery) return true;
      const hay = `${offer.order?.orderNumber || ''} ${offer.order?.customerName || ''} ${
        offer.order?.deliveryAddress?.estate || ''
      } ${offer.supplierTradeName || ''}`.toLowerCase();
      return hay.includes(normalizedQuery);
    });
  }, [snapshot.offers, normalizedQuery]);

  const activeDispatchOrders = useMemo(() => {
    return snapshot.orders.filter((order) => {
      if (!['SUPPLIER_ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY'].includes(order.status)) {
        return false;
      }
      if (!normalizedQuery) return true;
      const hay = `${order.orderNumber} ${order.customerName} ${order.deliveryAddress?.estate || ''} ${
        order.assignedRider?.name || ''
      }`.toLowerCase();
      return hay.includes(normalizedQuery);
    });
  }, [snapshot.orders, normalizedQuery]);

  const historyOrders = useMemo(() => {
    return snapshot.orders.filter((order) => {
      if (!['DELIVERED', 'CANCELLED', 'NO_SUPPLIER_AVAILABLE', 'SUPPLIER_REJECTED'].includes(order.status)) {
        return false;
      }
      if (!normalizedQuery) return true;
      const hay = `${order.orderNumber} ${order.customerName} ${
        order.deliveryAddress?.estate || ''
      }`.toLowerCase();
      return hay.includes(normalizedQuery);
    });
  }, [snapshot.orders, normalizedQuery]);

  const filteredInventory = useMemo(() => {
    return snapshot.inventory.filter((item) => {
      if (!normalizedQuery) return true;
      const hay = `${item.brand} ${item.cylinderSize} ${item.supplierTradeName}`.toLowerCase();
      return hay.includes(normalizedQuery);
    });
  }, [snapshot.inventory, normalizedQuery]);

  const currentDepotBusiness = MULTI_SUPPLIER_BUSINESSES.find((b) => b.id === selectedSupplierId);
  const isBeside = variant === 'beside';

  return (
    <section
      aria-label="Depot Operations Dashboard"
      className={`flex flex-col bg-[#F8FAFC] text-[#0F172A] ${
        isBeside
          ? 'h-full min-h-[600px] lg:border-l border-neutral-200'
          : 'w-full max-w-7xl mx-auto rounded-2xl border border-neutral-200 overflow-hidden shadow-xs my-2'
      }`}
    >
      {/* Top Operational Bar */}
      <div className="bg-white border-b border-neutral-200 px-4 py-3 space-y-3 shrink-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#0F172A] text-white flex items-center justify-center shrink-0">
              <Building2 className="w-4.5 h-4.5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-700 whitespace-nowrap">
                  {isLockedToDepot
                    ? `Private Depot Portal${privateLinkLabel ? ` · ${privateLinkLabel}` : ''}`
                    : 'Depot Dispatch Console'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      streamStatus === 'connected'
                        ? 'bg-[#16A34A]'
                        : 'bg-[#D97706]'
                    }`}
                  />
                  <span
                    className={
                      streamStatus === 'connected' ? 'text-[#16A34A] font-semibold' : 'text-[#D97706] font-semibold'
                    }
                  >
                    {streamStatus === 'connected' ? 'Live Stream' : 'Reconnecting'}
                  </span>
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-extrabold text-[#0F172A] truncate">
                {selectedSupplierId === 'all' && !isLockedToDepot
                  ? 'All Nairobi & Regional Depots'
                  : currentDepotBusiness?.tradeName || 'Depot Station'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setSoundEnabled((s) => !s)}
              title={soundEnabled ? 'Mute incoming order chime' : 'Enable incoming order chime'}
              aria-label={soundEnabled ? 'Mute sound alerts' : 'Enable sound alerts'}
              className="w-9 h-9 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-[#0E8A45]" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
            </button>

            <button
              type="button"
              onClick={() => loadSnapshot(false)}
              title="Refresh depot feed"
              aria-label="Refresh depot feed"
              className="w-9 h-9 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#0E8A45]' : ''}`} />
            </button>

            <button
              type="button"
              onClick={handleToggleDepotStatus}
              className={`px-3 py-2 rounded-lg text-xs font-bold border inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                activeDepotStatus
                  ? 'bg-emerald-50 border-emerald-200 text-[#0E8A45] hover:bg-emerald-100'
                  : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{activeDepotStatus ? 'Online' : 'Paused'}</span>
            </button>
          </div>
        </div>

        {/* Depot Filter + Search Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {!isLockedToDepot && (
            <div className="flex items-center gap-1.5 flex-1 min-w-0 bg-[#F8FAFC] border border-neutral-200 rounded-lg px-2.5 py-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                aria-label="Select depot station"
                className="w-full bg-transparent text-xs font-bold text-[#0F172A] focus:outline-none cursor-pointer truncate"
              >
                <option value="all">All Active Depots (Unified Feed)</option>
                {MULTI_SUPPLIER_BUSINESSES.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.tradeName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2 flex-1 min-w-0 bg-[#F8FAFC] border border-neutral-200 rounded-lg px-2.5 py-1.5">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search #order, customer, estate..."
              className="w-full bg-transparent text-xs text-[#0F172A] placeholder:text-slate-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 4-Metric Operational Strip (Tabular Numerals) */}
      <div className="grid grid-cols-4 bg-white border-b border-neutral-200 divide-x divide-neutral-200 shrink-0">
        <div className="px-3 py-2.5">
          <span className="text-[11px] font-medium text-slate-500 block truncate">Incoming</span>
          <span
            className={`text-base sm:text-lg font-extrabold font-mono tabular-nums ${
              incomingOffers.length > 0 ? 'text-[#D97706]' : 'text-[#0F172A]'
            }`}
          >
            {snapshot.metrics.pendingCount}
          </span>
        </div>
        <div className="px-3 py-2.5">
          <span className="text-[11px] font-medium text-slate-500 block truncate">Dispatches</span>
          <span className="text-base sm:text-lg font-extrabold font-mono tabular-nums text-[#0E8A45]">
            {snapshot.metrics.activeDispatchCount}
          </span>
        </div>
        <div className="px-3 py-2.5">
          <span className="text-[11px] font-medium text-slate-500 block truncate">Delivered</span>
          <span className="text-base sm:text-lg font-extrabold font-mono tabular-nums text-[#0F172A]">
            {snapshot.metrics.deliveredCount}
          </span>
        </div>
        <div className="px-3 py-2.5">
          <span className="text-[11px] font-medium text-slate-500 block truncate">Revenue</span>
          <span className="text-sm sm:text-base font-extrabold font-mono tabular-nums text-[#0F172A] truncate block">
            KSh {snapshot.metrics.totalRevenueKsh.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Segmented Navigation Tabs */}
      <div className="bg-white border-b border-neutral-200 px-3 py-2 shrink-0">
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('incoming')}
            className={`px-2 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer whitespace-nowrap truncate flex items-center justify-center gap-1.5 ${
              activeTab === 'incoming'
                ? 'bg-white text-[#0F172A] shadow-2xs'
                : 'text-slate-600 hover:text-[#0F172A]'
            }`}
          >
            <span>Incoming</span>
            <span className="font-mono tabular-nums text-[11px] text-[#0E8A45]">
              ({incomingOffers.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dispatches')}
            className={`px-2 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer whitespace-nowrap truncate flex items-center justify-center gap-1.5 ${
              activeTab === 'dispatches'
                ? 'bg-white text-[#0F172A] shadow-2xs'
                : 'text-slate-600 hover:text-[#0F172A]'
            }`}
          >
            <span>Active</span>
            <span className="font-mono tabular-nums text-[11px] text-slate-500">
              ({activeDispatchOrders.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-2 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer whitespace-nowrap truncate flex items-center justify-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-white text-[#0F172A] shadow-2xs'
                : 'text-slate-600 hover:text-[#0F172A]'
            }`}
          >
            <span>History</span>
            <span className="font-mono tabular-nums text-[11px] text-slate-500">
              ({historyOrders.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className={`px-2 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer whitespace-nowrap truncate flex items-center justify-center gap-1.5 ${
              activeTab === 'stock'
                ? 'bg-white text-[#0F172A] shadow-2xs'
                : 'text-slate-600 hover:text-[#0F172A]'
            }`}
          >
            <span>Stock</span>
            <span className="font-mono tabular-nums text-[11px] text-slate-500">
              ({filteredInventory.length})
            </span>
          </button>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {feedbackNotice && (
        <div
          role="status"
          className={`mx-4 mt-3 px-3.5 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 shrink-0 ${
            feedbackNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {feedbackNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#0E8A45] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="truncate">{feedbackNotice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackNotice(null)}
            className="text-[11px] font-bold underline shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Scrollable Feed Viewport */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* TAB 1: INCOMING LIVE ORDER OFFERS */}
        {activeTab === 'incoming' && (
          <>
            {incomingOffers.length === 0 ? (
              <div className="bg-white border border-neutral-200 rounded-2xl p-8 text-center space-y-2.5">
                <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                  <Package className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#0F172A]">
                  Waiting for incoming gas orders
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  {isLockedToDepot
                    ? 'Customer orders matched to your depot coverage zone stream in here automatically in real time.'
                    : isBeside
                      ? 'Place a gas order in the Customer App beside this console. New requests stream in here immediately for 1-click acceptance.'
                      : 'Customer orders routed to your depot coverage zone appear here automatically in real time.'}
                </p>
              </div>
            ) : (
              <div className={isBeside ? 'space-y-3' : 'grid grid-cols-1 lg:grid-cols-2 gap-3'}>
                {incomingOffers.map((offer) => {
                  const order = offer.order || {};
                  const item = order.items?.[0];
                  const expiresAtMs = new Date(offer.expiresAt).getTime();
                  const remainingSec = Math.max(0, Math.round((expiresAtMs - nowTick) / 1000));
                  const timerRatio = Math.min(1, Math.max(0, remainingSec / 45));
                  const isUrgent = remainingSec <= 12;
                  const isBusy = busyActionId === offer.id;

                  return (
                    <article
                      key={offer.id}
                      className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-3"
                    >
                      {/* Title + Real Server Countdown */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                            <span className="font-mono font-bold text-[#0F172A]">
                              #{order.orderNumber || offer.orderId}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-medium text-slate-700 truncate">
                              {offer.supplierTradeName}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{formatTimeAgo(offer.offeredAt)}</span>
                          </div>
                          <h3 className="text-sm sm:text-base font-extrabold text-[#0F172A] mt-0.5 truncate">
                            {item
                              ? `${item.quantity}x ${item.brand} ${item.cylinderSize} ${
                                  item.purchaseType === 'refill' ? 'Refill' : 'New Set'
                                }`
                              : 'LPG Cylinder Order'}
                          </h3>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`font-mono tabular-nums text-sm font-extrabold block ${
                              isUrgent ? 'text-[#DC2626]' : 'text-[#D97706]'
                            }`}
                          >
                            {remainingSec}s
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            Rank #{offer.rank}
                          </span>
                        </div>
                      </div>

                      {/* Compositor-only countdown meter */}
                      <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full origin-left transition-transform duration-300 ${
                            isUrgent ? 'bg-[#DC2626]' : 'bg-[#0E8A45]'
                          }`}
                          style={{ transform: `scaleX(${timerRatio})` }}
                        />
                      </div>

                      {/* Customer & Destination Metadata */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 py-2 border-y border-neutral-100 text-xs">
                        <div className="min-w-0">
                          <span className="text-slate-400 text-[11px] block">Customer</span>
                          <span className="font-semibold text-[#0F172A] truncate block">
                            {order.customerName || 'Customer'}
                          </span>
                        </div>
                        <div className="min-w-0 text-right">
                          <span className="text-slate-400 text-[11px] block">Order Total</span>
                          <span className="font-mono tabular-nums font-extrabold text-[#0E8A45] block">
                            KSh {(order.totalAmount || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="col-span-2 min-w-0 flex items-start gap-1.5 text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="truncate">
                            {[
                              order.deliveryAddress?.building,
                              order.deliveryAddress?.unitNumber,
                              order.deliveryAddress?.estate || order.deliveryAddress?.street,
                            ]
                              .filter(Boolean)
                              .join(', ')}
                            {offer.distanceKm != null ? ` · ${offer.distanceKm} km away` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Payment + Contact line */}
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                        <span className="truncate">
                          {order.paymentMethod === 'cash_on_delivery'
                            ? 'Cash on Delivery'
                            : 'M-Pesa PayHero'}{' '}
                          ·{' '}
                          <span
                            className={
                              order.paymentStatus === 'completed'
                                ? 'text-[#16A34A] font-semibold'
                                : 'text-slate-700 font-medium'
                            }
                          >
                            {order.paymentStatus === 'completed' ? 'Paid' : 'Pending Payment'}
                          </span>
                        </span>

                        {order.phoneNumber && (
                          <a
                            href={`tel:${order.phoneNumber}`}
                            className="inline-flex items-center gap-1 font-mono tabular-nums font-semibold text-slate-700 hover:text-[#0E8A45] shrink-0"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{order.phoneNumber}</span>
                          </a>
                        )}
                      </div>

                      {/* Primary Operational Actions */}
                      <div className="flex items-center gap-2 pt-0.5">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleOfferDecision(offer, 'ACCEPT')}
                          className="flex-1 min-h-[42px] px-4 py-2 rounded-xl bg-[#0E8A45] hover:bg-[#0B7138] disabled:opacity-50 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{isBusy ? 'Confirming...' : 'Accept Order'}</span>
                        </button>

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() =>
                            setDeclinePickerOfferId((prev) => (prev === offer.id ? null : offer.id))
                          }
                          className="min-h-[42px] px-3.5 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 disabled:opacity-50 text-slate-700 text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Decline</span>
                        </button>
                      </div>

                      {/* Optional Decline Reason Picker */}
                      {declinePickerOfferId === offer.id && (
                        <div className="pt-2 border-t border-neutral-100 space-y-1.5">
                          <p className="text-[11px] font-semibold text-slate-500">
                            Select reason to forward to next ranked depot:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {DECLINE_REASONS.map((reason) => (
                              <button
                                key={reason}
                                type="button"
                                onClick={() => handleOfferDecision(offer, 'REJECT', reason)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-800 text-[11px] font-semibold cursor-pointer transition-colors"
                              >
                                {reason}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* TAB 2: ACTIVE DISPATCHES (ACCEPTED / PREPARING / OUT FOR DELIVERY) */}
        {activeTab === 'dispatches' && (
          <>
            {activeDispatchOrders.length === 0 ? (
              <div className="bg-white border border-neutral-200 rounded-2xl p-8 text-center space-y-2">
                <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                  <Truck className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#0F172A]">No active dispatches</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Accepted orders move here so you can assign a rider and update live delivery progress.
                </p>
              </div>
            ) : (
              <div className={isBeside ? 'space-y-3' : 'grid grid-cols-1 lg:grid-cols-2 gap-3'}>
                {activeDispatchOrders.map((order) => {
                  const item = order.items?.[0];
                  const isBusy = busyActionId === order.orderId;
                  const selectedRiderId = order.assignedRider?.id || MOCK_RIDERS[0].id;

                  return (
                    <article
                      key={order.orderId}
                      className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                            <span className="font-mono font-bold text-[#0F172A]">
                              #{order.orderNumber}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-[#0E8A45]">
                              {formatStatusLabel(order.status)}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{formatTimeAgo(order.updatedAt)}</span>
                          </div>
                          <h3 className="text-sm font-extrabold text-[#0F172A] mt-0.5 truncate">
                            {order.customerName} —{' '}
                            {item
                              ? `${item.quantity}x ${item.brand} ${item.cylinderSize}`
                              : 'LPG Delivery'}
                          </h3>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {order.deliveryAddress?.estate || order.deliveryAddress?.street}
                            {order.assignedSupplierName ? ` · ${order.assignedSupplierName}` : ''}
                          </p>
                        </div>

                        <span className="font-mono tabular-nums text-sm font-extrabold text-[#0F172A] shrink-0">
                          KSh {(order.totalAmount || 0).toLocaleString()}
                        </span>
                      </div>

                      {/* Rider Assignment Row */}
                      <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
                        <UserCheck className="w-4 h-4 text-slate-400 shrink-0" />
                        <select
                          aria-label={`Assign rider for order ${order.orderNumber}`}
                          value={selectedRiderId}
                          disabled={isBusy}
                          onChange={(e) => handleAssignRider(order.orderId, e.target.value)}
                          className="flex-1 min-w-0 bg-[#F8FAFC] border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#0F172A] focus:outline-none cursor-pointer"
                        >
                          {MOCK_RIDERS.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name} · {r.plateNumber} ({r.vehicleModel})
                            </option>
                          ))}
                        </select>
                        {!order.assignedRider && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleAssignRider(order.orderId, selectedRiderId)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold cursor-pointer whitespace-nowrap shrink-0"
                          >
                            Assign
                          </button>
                        )}
                      </div>

                      {/* Delivery Lifecycle Progression Buttons */}
                      <div className="grid grid-cols-3 gap-1.5 pt-1">
                        <button
                          type="button"
                          disabled={isBusy || order.status === 'PREPARING'}
                          onClick={() =>
                            handleStageUpdate(order.orderId, 'PREPARING', 'Preparing Cylinder')
                          }
                          className={`py-2 px-2 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer whitespace-nowrap truncate ${
                            order.status === 'PREPARING'
                              ? 'bg-amber-50 border-amber-300 text-amber-900'
                              : 'bg-white border-neutral-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          1. Preparing
                        </button>

                        <button
                          type="button"
                          disabled={isBusy || order.status === 'OUT_FOR_DELIVERY'}
                          onClick={() =>
                            handleStageUpdate(order.orderId, 'OUT_FOR_DELIVERY', 'Out for Delivery')
                          }
                          className={`py-2 px-2 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer whitespace-nowrap truncate ${
                            order.status === 'OUT_FOR_DELIVERY'
                              ? 'bg-sky-50 border-sky-300 text-sky-900'
                              : 'bg-white border-neutral-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          2. Dispatch Rider
                        </button>

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() =>
                            handleStageUpdate(order.orderId, 'DELIVERED', 'Delivered')
                          }
                          className="py-2 px-2 rounded-lg text-[11px] font-bold bg-[#0E8A45] hover:bg-[#0B7138] text-white transition-colors cursor-pointer whitespace-nowrap truncate"
                        >
                          3. Mark Delivered
                        </button>
                      </div>

                      {onFocusOrderInCustomerApp && (
                        <button
                          type="button"
                          onClick={() => onFocusOrderInCustomerApp(order.orderId)}
                          className="w-full py-1.5 text-[11px] font-semibold text-[#0E8A45] hover:underline text-center cursor-pointer"
                        >
                          View in Customer Live Tracker
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* TAB 3: COMPLETED & HISTORY */}
        {activeTab === 'history' && (
          <>
            {historyOrders.length === 0 ? (
              <div className="bg-white border border-neutral-200 rounded-2xl p-8 text-center space-y-2">
                <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#0F172A]">No completed orders yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Delivered and closed orders will be logged here with M-Pesa receipts and timestamps.
                </p>
              </div>
            ) : (
              <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-neutral-200 text-[11px] font-bold text-slate-500">
                      <tr>
                        <th className="py-2.5 px-3">Order</th>
                        <th className="py-2.5 px-3">Customer</th>
                        <th className="py-2.5 px-3">Item</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {historyOrders.map((order) => {
                        const item = order.items?.[0];
                        return (
                          <tr key={order.orderId} className="hover:bg-slate-50/70">
                            <td className="py-2.5 px-3 font-mono font-bold text-[#0F172A] whitespace-nowrap">
                              #{order.orderNumber}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700 truncate max-w-[140px]">
                              {order.customerName}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                              {item ? `${item.quantity}x ${item.cylinderSize}` : 'LPG'}
                            </td>
                            <td className="py-2.5 px-3 font-semibold whitespace-nowrap">
                              <span
                                className={
                                  order.status === 'DELIVERED'
                                    ? 'text-[#16A34A]'
                                    : 'text-slate-500'
                                }
                              >
                                {formatStatusLabel(order.status)}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-[#0F172A] whitespace-nowrap">
                              KSh {(order.totalAmount || 0).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB 4: DEPOT CYLINDER STOCK INVENTORY */}
        {activeTab === 'stock' && (
          <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-extrabold text-[#0F172A]">
                  Live Cylinder Stock Levels
                </h3>
                <p className="text-[11px] text-slate-500">
                  Inventory automatically decrements when orders are accepted
                </p>
              </div>
            </div>

            <div className="divide-y divide-neutral-100">
              {filteredInventory.map((sku) => {
                const isLow = sku.stockRefill <= sku.minStockAlert;
                const isBusy = busyActionId === sku.id;

                return (
                  <div
                    key={sku.id}
                    className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-[#0F172A] flex items-center gap-2">
                        <span>
                          {sku.brand} {sku.cylinderSize}
                        </span>
                        {isLow && (
                          <span className="text-[11px] font-semibold text-[#D97706]">
                            · Low Stock
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {sku.supplierTradeName} · Refill KSh {sku.refillPrice.toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-500">Refills</span>
                        <div className="inline-flex items-center border border-neutral-200 rounded-lg overflow-hidden bg-slate-50">
                          <button
                            type="button"
                            disabled={isBusy || sku.stockRefill <= 0}
                            onClick={() =>
                              handleStockAdjust(sku, 'stockRefill', Math.max(0, sku.stockRefill - 1))
                            }
                            aria-label={`Decrease ${sku.brand} ${sku.cylinderSize} refill stock`}
                            className="w-7 h-7 flex items-center justify-center hover:bg-neutral-200/70 disabled:opacity-40 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2.5 font-mono tabular-nums font-bold text-[#0F172A]">
                            {sku.stockRefill}
                          </span>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              handleStockAdjust(sku, 'stockRefill', sku.stockRefill + 5)
                            }
                            aria-label={`Restock 5 ${sku.brand} ${sku.cylinderSize} refills`}
                            className="w-7 h-7 flex items-center justify-center hover:bg-emerald-100 text-[#0E8A45] cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleStockAdjust(sku, 'isAvailable', !sku.isAvailable)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer transition-colors whitespace-nowrap ${
                          sku.isAvailable
                            ? 'bg-emerald-50 border-emerald-200 text-[#0E8A45]'
                            : 'bg-slate-100 border-neutral-200 text-slate-500'
                        }`}
                      >
                        {sku.isAvailable ? 'In Stock' : 'Paused'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
