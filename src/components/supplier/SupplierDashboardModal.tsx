import React, { useState, useEffect } from 'react';
import {
  MULTI_SUPPLIER_BUSINESSES,
} from '../../data/multiSupplierData';
import {
  fetchSupplierOffers,
  respondToSupplierOffer,
  updateSupplierOrderStage,
  connectToRealtimeStream,
} from '../../services/multiSupplierService';
import { SupplierBusiness, SupplierOrderOffer } from '../../types/multisupplier';
import {
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  Package,
  MapPin,
  TrendingUp,
  AlertCircle,
  Truck,
  RotateCcw,
  Volume2,
  Bell,
  X,
} from 'lucide-react';

interface SupplierDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeOrderNumber?: string;
}

export const SupplierDashboardModal: React.FC<SupplierDashboardModalProps> = ({
  isOpen,
  onClose,
  activeOrderNumber,
}) => {
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(
    MULTI_SUPPLIER_BUSINESSES[0]?.id || 'sup-kgas-kilimani'
  );
  const [offers, setOffers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const currentSupplier =
    MULTI_SUPPLIER_BUSINESSES.find((s) => s.id === selectedSupplierId) ||
    MULTI_SUPPLIER_BUSINESSES[0];

  const loadOffers = async () => {
    setIsLoading(true);
    try {
      const data = await fetchSupplierOffers(selectedSupplierId);
      setOffers(data);
    } catch (e) {
      console.warn('Failed loading offers:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    loadOffers();

    // Listen to real-time events to auto-refresh incoming offers
    const unsubscribe = connectToRealtimeStream((event, payload) => {
      if (
        event === 'supplier_offered' ||
        event === 'supplier_accepted' ||
        event === 'supplier_rejected' ||
        event === 'delivery_status_changed'
      ) {
        loadOffers();
      }
    });

    const interval = setInterval(loadOffers, 4000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [isOpen, selectedSupplierId]);

  if (!isOpen) return null;

  const handleRespond = async (offerId: string, action: 'ACCEPT' | 'REJECT', reason?: string) => {
    setActionMessage(null);
    try {
      const res = await respondToSupplierOffer(offerId, selectedSupplierId, action, reason);
      if (res.success) {
        setActionMessage(
          action === 'ACCEPT'
            ? '✓ Order Accepted! Inventory reserved and customer notified.'
            : '✓ Order Declined. System automatically offering to next ranked supplier.'
        );
        loadOffers();
      } else {
        setActionMessage(`Notice: ${res.message || 'Action could not be completed.'}`);
      }
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    }
  };

  const handleUpdateStage = async (orderId: string, newStage: string) => {
    try {
      await updateSupplierOrderStage(orderId, newStage);
      setActionMessage(`Order marked as: ${newStage}`);
      loadOffers();
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/80 backdrop-blur-md text-slate-900 select-none animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-emerald-950 text-white flex items-center justify-between border-b border-emerald-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-800 flex items-center justify-center text-lime-400 shadow-xs">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-lime-400 uppercase tracking-wider bg-emerald-900/80 px-2 py-0.5 rounded">
                  Supplier Operations Portal
                </span>
                <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
                {currentSupplier.tradeName}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-emerald-900 hover:bg-emerald-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Supplier Selector Bar (Allows testing from any supplier's perspective) */}
        <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between gap-3 text-xs flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-slate-600 shrink-0">Viewing As:</span>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              {MULTI_SUPPLIER_BUSINESSES.map((sup) => (
                <option key={sup.id} value={sup.id}>
                  {sup.tradeName} ({sup.primaryTownId.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>EPRA License: <strong className="text-slate-700">{currentSupplier.epraLicenseNumber}</strong></span>
            <span>·</span>
            <span>Rating: <strong className="text-emerald-700 font-bold">{currentSupplier.rating} ★</strong></span>
          </div>
        </div>

        {/* Action / Notification Banner */}
        {actionMessage && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between gap-2">
            <span>{actionMessage}</span>
            <button
              onClick={() => setActionMessage(null)}
              className="text-emerald-700 hover:underline font-bold text-[11px] cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-emerald-700" />
              <span>Incoming Order Offers & Active Dispatches ({offers.length})</span>
            </h3>

            <button
              onClick={loadOffers}
              className="text-[11px] font-bold text-[#14532d] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
          </div>

          {offers.length === 0 ? (
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-2">
              <Package className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No active offers pending for this depot</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                When a customer in your delivery zone requests LPG gas, the server matching algorithm will rank your depot and dispatch an offer with countdown here!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {offers.map((offer) => {
                const isOffered = offer.status === 'offered';
                const isAccepted = offer.status === 'accepted';
                const isExpired = offer.status === 'expired';
                const isRejected = offer.status === 'rejected';

                const expiresTimestamp = new Date(offer.expiresAt).getTime();
                const nowTimestamp = Date.now();
                const remainingSeconds = Math.max(0, Math.round((expiresTimestamp - nowTimestamp) / 1000));

                return (
                  <div
                    key={offer.id}
                    className={`rounded-2xl border p-4 transition-all shadow-xs space-y-3 ${
                      isOffered
                        ? 'border-emerald-400 bg-emerald-50/40 ring-2 ring-emerald-500/20'
                        : isAccepted
                        ? 'border-slate-200 bg-white'
                        : 'border-slate-200 bg-slate-50 opacity-75'
                    }`}
                  >
                    {/* Top Row */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-extrabold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                            Order #{offer.order?.orderNumber || 'Pending'}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              isOffered
                                ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                                : isAccepted
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : isExpired
                                ? 'bg-slate-200 text-slate-700'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {offer.status.toUpperCase()}
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-slate-700 mt-1">
                          Customer: <strong className="text-slate-900">{offer.order?.customerName || 'Customer'}</strong> · Destination: {offer.order?.deliveryAddress?.estate || 'Kilimani'}
                        </p>
                      </div>

                      {/* Remaining Timer Countdown */}
                      {isOffered && (
                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-slate-500 uppercase font-bold block">
                            Acceptance Window
                          </span>
                          <span className="font-mono text-base font-black text-rose-600 bg-white px-2 py-0.5 rounded border border-rose-200 shadow-2xs">
                            {remainingSeconds}s left
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Order Details & Pricing */}
                    <div className="bg-white rounded-xl p-3 border border-slate-200 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <span className="text-slate-400 text-[10.5px] block">Items</span>
                        <span className="font-bold text-slate-800">
                          {offer.order?.items?.[0]
                            ? `${offer.order.items[0].quantity}x ${offer.order.items[0].cylinderSize} ${offer.order.items[0].purchaseType}`
                            : '1x 13kg Refill'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10.5px] block">Subtotal</span>
                        <span className="font-bold text-slate-800">
                          KSh {offer.order?.subtotal?.toLocaleString() || '1,300'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10.5px] block">Your Zone Delivery Fee</span>
                        <span className="font-bold text-emerald-700">
                          KSh {offer.scoreBreakdown?.coverage === 1 ? '0 (Included)' : '150'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10.5px] block">Matching Rank</span>
                        <span className="font-bold text-slate-800">
                          Candidate #{offer.rank} (Top Ranked)
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons for Active Offer */}
                    {isOffered && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleRespond(offer.id, 'ACCEPT')}
                          className="flex-1 py-2.5 px-4 bg-[#14532d] hover:bg-[#166534] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4 text-lime-400" />
                          <span>ACCEPT ORDER</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRespond(offer.id, 'REJECT', 'Depot temporarily at capacity')}
                          className="py-2.5 px-4 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Decline (Try Next)</span>
                        </button>
                      </div>
                    )}

                    {/* Stage management if accepted */}
                    {isAccepted && (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[11px] text-slate-500 font-medium">
                          Status: <strong className="text-emerald-800 font-bold">{offer.order?.status || 'SUPPLIER_ACCEPTED'}</strong>
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateStage(offer.orderId, 'PREPARING')}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-[11px] font-bold cursor-pointer"
                          >
                            Mark Preparing
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStage(offer.orderId, 'OUT_FOR_DELIVERY')}
                            className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 rounded-lg text-[11px] font-bold cursor-pointer"
                          >
                            Dispatch Courier
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStage(offer.orderId, 'DELIVERED')}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-lg text-[11px] font-bold cursor-pointer"
                          >
                            Mark Delivered
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500">
          Supplier actions execute with transactional row locks to prevent race conditions.
        </div>
      </div>
    </div>
  );
};
