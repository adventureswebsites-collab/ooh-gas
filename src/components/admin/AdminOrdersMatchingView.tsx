import React, { useState, useEffect } from 'react';
import { fetchAdminOrders } from '../../services/multiSupplierService';
import {
  ShieldAlert,
  RotateCcw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  Banknote,
  Search,
  Filter,
  Eye,
  X,
  Layers,
} from 'lucide-react';

interface AdminOrdersMatchingViewProps {
  isOpen: boolean;
  onClose: () => void;
  adminToken?: string;
}

export const AdminOrdersMatchingView: React.FC<AdminOrdersMatchingViewProps> = ({
  isOpen,
  onClose,
  adminToken = 'admin_session_oohgas_2026_verified',
}) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadAdminOrders = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAdminOrders(adminToken);
      setOrders(data.orders || []);
      if (selectedOrder) {
        const refreshed = (data.orders || []).find((o: any) => o.orderId === selectedOrder.orderId);
        if (refreshed) setSelectedOrder(refreshed);
      }
    } catch (err) {
      console.warn('Failed loading admin orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    loadAdminOrders();
    const interval = setInterval(loadAdminOrders, 5000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredOrders = orders.filter((order) => {
    if (filterStatus !== 'all' && order.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        order.orderNumber?.toLowerCase().includes(q) ||
        order.customerName?.toLowerCase().includes(q) ||
        order.deliveryAddress?.estate?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/80 backdrop-blur-md text-slate-900 select-none animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-5xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-lime-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-lime-400 uppercase tracking-wider bg-slate-800 px-2 py-0.5 rounded">
                  Admin Platform Control
                </span>
                <span className="text-xs text-slate-400 font-medium">Real-Time Dispatch & Matching Monitor</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
                Multi-Supplier Order & Matching Engine
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadAdminOrders}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3 text-xs flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by order #, customer, estate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {[
              { id: 'all', label: `All (${orders.length})` },
              { id: 'SUPPLIER_OFFERED', label: 'Offered' },
              { id: 'SUPPLIER_ACCEPTED', label: 'Accepted' },
              { id: 'PREPARING', label: 'Preparing' },
              { id: 'OUT_FOR_DELIVERY', label: 'In Transit' },
              { id: 'DELIVERED', label: 'Delivered' },
              { id: 'NO_SUPPLIER_AVAILABLE', label: 'Exhausted' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterStatus(f.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors shrink-0 ${
                  filterStatus === f.id
                    ? 'bg-[#14532d] text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Split Layout: Orders List & Matching Session Inspector */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-200">
          {/* Orders Table (7 cols on desktop) */}
          <div className="md:col-span-7 overflow-y-auto p-4 space-y-2.5">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No orders match current filter.
              </div>
            ) : (
              filteredOrders.map((order) => {
                const isSelected = selectedOrder?.orderId === order.orderId;
                const session = order.matchingSession;

                return (
                  <div
                    key={order.orderId}
                    onClick={() => setSelectedOrder(order)}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900">
                            #{order.orderNumber}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.2 rounded-full uppercase tracking-wider ${
                              order.status === 'SUPPLIER_ACCEPTED' || order.status === 'DELIVERED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : order.status === 'SUPPLIER_OFFERED'
                                ? 'bg-amber-100 text-amber-800 animate-pulse'
                                : order.status === 'NO_SUPPLIER_AVAILABLE'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 mt-1">
                          <strong>{order.customerName}</strong> ({order.phoneNumber}) · {order.deliveryAddress?.estate}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-bold text-xs text-slate-900">
                          KSh {order.totalAmount?.toLocaleString()}
                        </span>
                        <span
                          className={`text-[10px] font-bold block ${
                            order.paymentStatus === 'completed'
                              ? 'text-emerald-700'
                              : 'text-amber-700'
                          }`}
                        >
                          Payment: {order.paymentStatus.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span>
                        Fulfilling Supplier:{' '}
                        <strong className="text-slate-800">
                          {order.assignedSupplier?.tradeName || (order.status === 'NO_SUPPLIER_AVAILABLE' ? 'None (Exhausted)' : 'Matching in progress...')}
                        </strong>
                      </span>
                      <span>
                        Candidates: <strong>{session?.candidateCount || 0} evaluated</strong>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Inspector: Deep Matching Audit & Candidate Ranking (5 cols on desktop) */}
          <div className="md:col-span-5 bg-slate-50/60 overflow-y-auto p-4 space-y-4">
            {selectedOrder ? (
              <div className="space-y-4 text-left">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Matching Session Audit
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">
                      Order #{selectedOrder.orderNumber}
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                    Status: {selectedOrder.status}
                  </span>
                </div>

                {/* Delivery & Coordinates Snapshot */}
                <div className="bg-white rounded-xl p-3 border border-slate-200 text-xs space-y-1.5">
                  <div className="font-bold text-slate-700">Delivery Snapshot</div>
                  <div className="text-slate-500">
                    Coordinates:{' '}
                    <span className="font-mono text-slate-800">
                      {selectedOrder.deliveryPoint?.lat?.toFixed(5)}, {selectedOrder.deliveryPoint?.lng?.toFixed(5)}
                    </span>
                  </div>
                  <div className="text-slate-500">
                    Destination: <span className="text-slate-800">{selectedOrder.deliveryAddress?.estate}, {selectedOrder.deliveryAddress?.street}</span>
                  </div>
                  <div className="text-slate-500">
                    Delivery Fee (Locked): <strong className="text-emerald-700 font-bold">KSh {selectedOrder.deliveryFee}</strong>
                  </div>
                </div>

                {/* Candidate Suppliers Ranking Evaluation */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Considered Suppliers ({selectedOrder.matchingSession?.candidateCount || 0})</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">Ranked by Composite Score</span>
                  </div>

                  {(!selectedOrder.matchingSession?.candidatesEvaluated ||
                    selectedOrder.matchingSession.candidatesEvaluated.length === 0) ? (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                      No suppliers met spatial zone containment and stock requirements for this coordinate.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedOrder.matchingSession.candidatesEvaluated.map((cand: any) => {
                        const isSelectedSupplier = selectedOrder.assignedSupplierId === cand.supplierId;

                        return (
                          <div
                            key={cand.supplierId}
                            className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                              isSelectedSupplier
                                ? 'bg-emerald-50 border-emerald-400 shadow-xs'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="font-bold text-slate-900 block">
                                  #{cand.rank} {cand.tradeName}
                                </span>
                                <span className="text-[10.5px] text-slate-500">
                                  Distance: {cand.distanceKm} km · Zone: {cand.zoneName}
                                </span>
                              </div>

                              <div className="text-right">
                                <span className="font-mono font-black text-xs text-emerald-800">
                                  Score: {cand.compositeScore}
                                </span>
                                {isSelectedSupplier && (
                                  <span className="block text-[9px] font-bold text-emerald-700 bg-emerald-200 px-1.5 rounded mt-0.5">
                                    SELECTED ✓
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Sub-scores breakdown */}
                            <div className="grid grid-cols-5 gap-1 pt-1 border-t border-slate-100 text-[9.5px] text-center font-mono text-slate-500">
                              <div>
                                <span className="block text-slate-400">Coverage</span>
                                <span className="font-bold text-slate-700">{cand.scoreBreakdown?.coverage}</span>
                              </div>
                              <div>
                                <span className="block text-slate-400">Stock</span>
                                <span className="font-bold text-slate-700">{cand.scoreBreakdown?.stock}</span>
                              </div>
                              <div>
                                <span className="block text-slate-400">Distance</span>
                                <span className="font-bold text-slate-700">{cand.scoreBreakdown?.distance}</span>
                              </div>
                              <div>
                                <span className="block text-slate-400">ETA</span>
                                <span className="font-bold text-slate-700">{cand.scoreBreakdown?.eta}</span>
                              </div>
                              <div>
                                <span className="block text-slate-400">Rating</span>
                                <span className="font-bold text-slate-700">{cand.scoreBreakdown?.rating}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* PayHero Payment Details */}
                <div className="bg-white rounded-xl p-3 border border-slate-200 text-xs space-y-1">
                  <div className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Banknote className="w-3.5 h-3.5 text-[#14532d]" />
                    <span>PayHero Payment Verification</span>
                  </div>
                  <div className="text-slate-500">
                    Method: <span className="font-semibold text-slate-800">{selectedOrder.paymentMethod}</span>
                  </div>
                  <div className="text-slate-500">
                    Status: <strong className={selectedOrder.paymentStatus === 'completed' ? 'text-emerald-700' : 'text-amber-700'}>{selectedOrder.paymentStatus.toUpperCase()}</strong>
                  </div>
                  {selectedOrder.payheroReceipt && (
                    <div className="text-slate-500 font-mono">
                      M-Pesa Receipt: <strong className="text-slate-900">{selectedOrder.payheroReceipt}</strong>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-slate-400 text-xs space-y-2">
                <Layers className="w-8 h-8 mx-auto opacity-50" />
                <p>Select an order on the left to inspect its real-time matching session, candidate scoring breakdown, and offer audit log.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
