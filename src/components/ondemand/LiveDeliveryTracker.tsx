import React, { useState } from 'react';
import { OnDemandOrderState, Supplier, RiderInfo, NairobiLocation } from '../../types';
import { connectToRealtimeStream } from '../../services/multiSupplierService';
import { MapboxDeliveryMap } from '../map/MapboxDeliveryMap';
import { RiderCallModal } from './RiderCallModal';
import { RiderChatModal } from './RiderChatModal';
import { ScaleVerificationModal } from './ScaleVerificationModal';
import {
  Phone,
  MessageSquare,
  ShieldCheck,
  Scale,
  MapPin,
  Clock,
  KeyRound,
  CheckCircle2,
  ChevronRight,
  Star,
  RotateCcw,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';

interface LiveDeliveryTrackerProps {
  order: OnDemandOrderState;
  suppliers: Supplier[];
  riders: RiderInfo[];
  currentLocation: NairobiLocation;
  onUpdateStage: (stage: OnDemandOrderState['stage']) => void;
  onCloseTracker: () => void;
  onResetOrder: () => void;
}

export const LiveDeliveryTracker: React.FC<LiveDeliveryTrackerProps> = ({
  order,
  suppliers,
  riders,
  currentLocation,
  onUpdateStage,
  onCloseTracker,
  onResetOrder,
}) => {
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [isScaleModalOpen, setIsScaleModalOpen] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [selectedTags, setSelectedTags] = useState<string[]>(['Accurate Weight', 'Punctual']);

  const rider = order.assignedRider || riders[0];
  const supplier = order.matchedSupplier || suppliers[0];

  // Subscribe to real-time order and delivery updates from the backend
  React.useEffect(() => {
    const unsubscribe = connectToRealtimeStream((event: string, payload: any) => {
      if (payload?.orderId && payload.orderId !== order.orderId) return;

      if (event === 'delivery_status_changed' || event === 'order_status_changed') {
        const nextStatus = payload.status || payload.orderStatus;
        if (nextStatus === 'PREPARING') {
          onUpdateStage('rider_assigned');
        } else if (nextStatus === 'OUT_FOR_DELIVERY') {
          onUpdateStage('in_transit');
        } else if (nextStatus === 'DELIVERED') {
          onUpdateStage('completed');
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [order.orderId, onUpdateStage]);

  // Derive progress percentage for map animation
  let riderProgress = 35;
  if (order.stage === 'supplier_accepted') riderProgress = 10;
  if (order.stage === 'rider_assigned') riderProgress = 25;
  if (order.stage === 'in_transit') riderProgress = 65;
  if (order.stage === 'arrived_at_gate') riderProgress = 95;
  if (order.stage === 'scale_verification' || order.stage === 'completed') riderProgress = 100;

  const handleNextSimulationStep = () => {
    if (order.stage === 'supplier_accepted') onUpdateStage('rider_assigned');
    else if (order.stage === 'rider_assigned') onUpdateStage('in_transit');
    else if (order.stage === 'in_transit') onUpdateStage('arrived_at_gate');
    else if (order.stage === 'arrived_at_gate') setIsScaleModalOpen(true);
    else if (order.stage === 'scale_verification') onUpdateStage('completed');
  };

  const complimentOptions = [
    'Accurate Weight',
    'Punctual Delivery',
    'Friendly Boda Courier',
    'Helpful Hookup',
    'Intact Tamper Seal',
  ];

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-3.5 pb-24 text-left animate-in fade-in-50 duration-200">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onCloseTracker}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#14532d] hover:underline cursor-pointer min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
            Order #{order.orderId}
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </div>

      {/* Main ETA Status Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-xs space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10.5px] min-[360px]:text-[11px] font-bold text-[#166534] uppercase tracking-wider mb-0.5">
              <span className="w-2 h-2 rounded-full bg-[#84cc16] animate-ping" />
              <span>
                {order.stage === 'completed'
                  ? 'Delivery Completed'
                  : order.stage === 'arrived_at_gate'
                  ? 'Courier at Security Gate'
                  : 'Courier On The Way'}
              </span>
            </div>

            <h1 className="text-lg min-[360px]:text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {order.stage === 'completed'
                ? 'Gas Delivered & Weight Verified'
                : order.stage === 'arrived_at_gate'
                ? 'Doorstep Handover & Weight Check'
                : `Arriving in ~${order.etaMinutes} mins`}
            </h1>

            <p className="text-xs text-slate-500 mt-0.5">
              Delivering {order.quantity}x {order.cylinderSize} ({order.purchaseType === 'refill' ? 'Refill' : 'New Set'}) to{' '}
              <strong className="text-slate-800">{order.destination.building || 'Silver Oak Court'}</strong>
            </p>
          </div>

          {/* Handover PIN Display */}
          <div className="text-right shrink-0">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-end gap-1">
              <KeyRound className="w-3 h-3 text-[#166534]" />
              <span>Delivery PIN</span>
            </div>
            <div className="text-lg sm:text-xl font-mono font-black text-[#14532d] bg-[#f0fdf4] border border-[#bbf7d0] px-2.5 py-0.5 rounded-lg mt-0.5 shadow-2xs">
              {order.handoverPin}
            </div>
          </div>
        </div>

        {/* Linear Progress Stepper */}
        <div className="space-y-1.5 pt-1">
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-[#166534] transition-all duration-500 rounded-full"
              style={{ width: `${riderProgress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] min-[360px]:text-[11px] text-slate-500">
            <span className={riderProgress >= 20 ? 'font-bold text-[#166534]' : ''}>
              1. Depot Verified
            </span>
            <span className={riderProgress >= 60 ? 'font-bold text-[#166534]' : ''}>
              2. In Transit
            </span>
            <span className={riderProgress >= 90 ? 'font-bold text-[#166534]' : ''}>
              3. At Gate
            </span>
            <span className={riderProgress >= 100 ? 'font-bold text-[#166534]' : ''}>
              4. Weight Checked
            </span>
          </div>
        </div>
      </div>

      {/* Live Interactive Map with Moving Rider */}
      <MapboxDeliveryMap
        currentLocation={currentLocation}
        suppliers={suppliers}
        riders={riders}
        activeOrder={order}
        riderProgressPercent={riderProgress}
        isExpanded={true}
      />

      {/* Delivery Courier Card (Uber-Style) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Courier Avatar */}
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-[#14532d] text-white flex items-center justify-center font-black text-base shadow-xs shrink-0">
                {rider.photoInitial}
              </div>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#84cc16] border-2 border-white flex items-center justify-center text-[9px] text-emerald-950 font-bold">
                🛵
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                  {rider.name}
                </h3>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 shrink-0">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                  <span>{rider.rating}</span>
                </span>
              </div>

              <p className="text-xs text-slate-600 truncate mt-0.5">
                {rider.vehicleModel} · <strong className="text-slate-900">{rider.plateNumber}</strong>
              </p>

              <p className="text-[11px] text-emerald-700 font-medium truncate mt-0.5">
                EPRA Certified Courier · Digital Scale equipped
              </p>
            </div>
          </div>

          {/* Quick Contact Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsChatModalOpen(true)}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 flex items-center justify-center cursor-pointer transition-colors"
              title="Chat with courier"
              aria-label="Message rider"
            >
              <MessageSquare className="w-4.5 h-4.5 text-[#166534]" />
            </button>

            <button
              type="button"
              onClick={() => setIsCallModalOpen(true)}
              className="w-10 h-10 rounded-xl bg-[#14532d] hover:bg-[#166534] active:bg-[#0f3d21] text-white flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
              title="Call courier"
              aria-label="Call rider"
            >
              <Phone className="w-4.5 h-4.5 text-[#bef264]" />
            </button>
          </div>
        </div>
      </div>

      {/* Doorstep Weight Scale Action Card */}
      <div className="bg-[#f0fdf4] rounded-2xl border border-[#bbf7d0] p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white border border-[#86efac] text-[#166534] flex items-center justify-center shrink-0 shadow-2xs">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-extrabold text-[#14532d]">
              Digital Hanging Scale Verification
            </h4>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Verify tare + gas gross weight (~27.2 kg) before payment handover.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsScaleModalOpen(true)}
          className="py-2 px-3.5 rounded-xl bg-[#14532d] hover:bg-[#166534] text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs shrink-0 min-h-[40px]"
        >
          <Scale className="w-3.5 h-3.5 text-[#bef264]" />
          <span>Launch Digital Scale Test</span>
        </button>
      </div>

      {/* Order Summary & PayHero Payment */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-xs space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Order Summary & Payment
          </h4>
          <span className="text-[10px] font-bold text-[#14532d] bg-[#f0fdf4] px-2 py-0.5 rounded border border-[#bbf7d0]">
            Backend Verified Fee
          </span>
        </div>

        <div className="space-y-1.5 divide-y divide-slate-100">
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-600">Supplying Depot</span>
            <div className="text-right">
              <span className="font-bold text-slate-900 block">{supplier.name}</span>
              <span className="text-[11px] text-slate-500">{supplier.locationArea}</span>
            </div>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-slate-600">LPG Product</span>
            <span className="font-bold text-slate-900">
              {order.quantity}x {order.cylinderSize} ({order.purchaseType === 'refill' ? 'Refill' : 'New Set'})
            </span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-slate-600">Subtotal</span>
            <span className="font-bold text-slate-900">KSh {order.subtotal.toLocaleString()}</span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-slate-600">Zone Delivery Fee</span>
            <span className="font-bold text-[#166534]">
              {order.deliveryFee === 0 ? 'Free (Depot Home Zone)' : `KSh ${order.deliveryFee.toLocaleString()}`}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2 text-sm font-extrabold text-slate-900">
            <span>Total Payable</span>
            <span className="text-base text-[#14532d]">
              KSh {order.totalPrice.toLocaleString()}
            </span>
          </div>
        </div>

        {/* PayHero Lipa Na M-Pesa Action Section */}
        <div className="mt-3 pt-3 border-t border-slate-100">
          {order.payheroStatus === 'completed' ? (
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                <div>
                  <span className="font-bold block">PayHero M-Pesa Verified ✓</span>
                  <span className="text-[11px] text-emerald-700 font-mono">
                    Receipt: {order.payheroReceipt || 'MPESA-VERIFIED'}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded">
                PAID
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Payment Method: <strong>Lipa Na M-Pesa (PayHero)</strong></span>
                <span>Phone: <strong>{order.destination.phoneNumber}</strong></span>
              </div>

              <button
                type="button"
                onClick={async () => {
                  try {
                    const { initiatePayHeroMpesa } = await import('../../services/multiSupplierService');
                    const res = await initiatePayHeroMpesa(order.orderId, order.destination.phoneNumber);
                    if (res.success) {
                      onUpdateStage(order.stage); // Refresh state
                    }
                  } catch (e) {
                    console.warn('PayHero initiation error:', e);
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-[#14532d] hover:bg-[#166534] active:bg-[#0f3d21] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <span>Pay KSh {order.totalPrice.toLocaleString()} via Lipa Na M-Pesa</span>
              </button>
              <p className="text-[10px] text-slate-400 text-center">
                Server-side verified transaction · No secrets exposed to client · Safe doorstep release
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Simulation Playground Controls for Demo / Testing */}
      <aside className="rounded-xl bg-slate-900 text-slate-200 p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs shadow-md">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-lime-400" />
          <span className="font-semibold text-white">
            Demo Stepper:
          </span>
          <span className="text-slate-400">
            Current stage: <strong className="text-lime-300">{order.stage}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {order.stage !== 'completed' ? (
            <button
              type="button"
              onClick={handleNextSimulationStep}
              className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-[#166534] hover:bg-[#14532d] text-white font-bold text-xs cursor-pointer transition-colors text-center"
            >
              Advance Delivery Stage →
            </button>
          ) : (
            <button
              type="button"
              onClick={onResetOrder}
              className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer transition-colors flex items-center justify-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Demo Order</span>
            </button>
          )}
        </div>
      </aside>

      {/* Completed State Rating & Receipt Card */}
      {order.stage === 'completed' && (
        <div className="rounded-2xl bg-white border border-[#bbf7d0] p-4 sm:p-5 shadow-lg space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-[#f0fdf4] text-[#166534] mx-auto flex items-center justify-center border border-[#bbf7d0]">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900">
              How was your gas delivery with {rider.name}?
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Your feedback maintains top safety standards for Nairobi riders
            </p>
          </div>

          {/* Star Rating */}
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setRating(s)}
                className="p-1 cursor-pointer hover:scale-110 transition-transform"
              >
                <Star
                  className={`w-7 h-7 ${
                    s <= rating
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-300'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Compliment Tags */}
          <div className="flex items-center justify-center flex-wrap gap-1.5 pt-1">
            {complimentOptions.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
                  selectedTags.includes(tag)
                    ? 'bg-[#14532d] text-white border-[#14532d]'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onCloseTracker}
            className="w-full max-w-xs mx-auto py-2.5 rounded-xl bg-[#14532d] hover:bg-[#166534] text-white text-xs sm:text-sm font-bold cursor-pointer"
          >
            Submit Feedback & Return Home
          </button>
        </div>
      )}

      {/* Modals */}
      <RiderCallModal
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
        rider={rider}
      />

      <RiderChatModal
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        rider={rider}
      />

      <ScaleVerificationModal
        isOpen={isScaleModalOpen}
        onClose={() => setIsScaleModalOpen(false)}
        order={order}
        onConfirmScaleSuccess={(weight) => {
          setIsScaleModalOpen(false);
          onUpdateStage('completed');
        }}
      />
    </div>
  );
};
