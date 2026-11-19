import React, { useState, useEffect } from 'react';
import { OnDemandOrderState, Supplier, RiderInfo, NairobiLocation } from '../../types';
import { connectToRealtimeStream } from '../../services/multiSupplierService';
import {
  subscribeToDriverLocation,
  fetchLatestDriverLocation,
  DriverLocationRecord,
} from '../../services/driverTrackingService';
import { MapboxDeliveryMap } from '../map/MapboxDeliveryMap';
import { RiderCallModal } from './RiderCallModal';
import { RiderChatModal } from './RiderChatModal';
import { ScaleVerificationModal } from './ScaleVerificationModal';
import { RiderDeliveryPortalModal } from '../driver/RiderDeliveryPortalModal';
import {
  Phone,
  MessageSquare,
  Scale,
  KeyRound,
  CheckCircle2,
  Star,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  Navigation,
  Clock,
  Radio,
} from 'lucide-react';

interface LiveDeliveryTrackerProps {
  order: OnDemandOrderState;
  suppliers: Supplier[];
  riders: RiderInfo[];
  currentLocation: NairobiLocation;
  onUpdateStage: (stage: OnDemandOrderState['stage']) => void;
  onCloseTracker: () => void;
  onResetOrder: () => void;
  onOrderAgain?: (order: OnDemandOrderState) => void;
}

export const LiveDeliveryTracker: React.FC<LiveDeliveryTrackerProps> = ({
  order,
  suppliers,
  riders,
  currentLocation,
  onUpdateStage,
  onCloseTracker,
  onResetOrder,
  onOrderAgain,
}) => {
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [isScaleModalOpen, setIsScaleModalOpen] = useState(false);
  const [isDriverConsoleOpen, setIsDriverConsoleOpen] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [selectedTags, setSelectedTags] = useState<string[]>(['Accurate Weight', 'Punctual Delivery']);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('Just now');
  const [liveDriverLocation, setLiveDriverLocation] = useState<DriverLocationRecord | null>(null);
  const [roadTelemetry, setRoadTelemetry] = useState<{
    distanceRemainingKm: number;
    etaMinutes: number;
  } | null>(null);

  const rider = order.assignedRider || riders[0];
  const supplier = order.matchedSupplier || suppliers[0];

  const onUpdateStageRef = React.useRef(onUpdateStage);
  onUpdateStageRef.current = onUpdateStage;

  // Subscribe to real-time order and delivery updates from the backend
  useEffect(() => {
    const unsubscribe = connectToRealtimeStream((event: string, payload: any) => {
      if (payload?.orderId && payload.orderId !== order.orderId) return;

      if (
        event === 'supplier_accepted' ||
        event === 'rider_assigned' ||
        event === 'delivery_status_changed' ||
        event === 'order_status_changed'
      ) {
        const nextStatus =
          event === 'supplier_accepted'
            ? 'SUPPLIER_ACCEPTED'
            : payload.status || payload.orderStatus;
        if (nextStatus === 'SUPPLIER_ACCEPTED') {
          onUpdateStageRef.current('supplier_accepted');
        } else if (nextStatus === 'PREPARING') {
          onUpdateStageRef.current('rider_assigned');
        } else if (nextStatus === 'OUT_FOR_DELIVERY') {
          onUpdateStageRef.current('in_transit');
        } else if (nextStatus === 'DELIVERED') {
          onUpdateStageRef.current('completed');
        }
        setLastUpdatedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    });

    fetchLatestDriverLocation(order.orderId).then((loc) => {
      if (loc) {
        setLiveDriverLocation(loc);
        setLastUpdatedTime(
          new Date(loc.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        );
      }
    });

    const unsubscribeLocation = subscribeToDriverLocation(order.orderId, (update) => {
      setLiveDriverLocation(update);
      setLastUpdatedTime(
        new Date(update.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    });

    return () => {
      unsubscribe();
      unsubscribeLocation();
    };
  }, [order.orderId]);

  // 6-step order tracking stage mapping
  const sixStages = [
    { key: 'order_received', label: 'Order received' },
    { key: 'supplier_accepted', label: 'Shop accepted order' },
    { key: 'rider_assigned', label: 'Rider assigned' },
    { key: 'picked_up', label: 'Rider picked up gas' },
    { key: 'in_transit', label: 'Rider on the way' },
    { key: 'completed', label: 'Gas delivered' },
  ];

  let activeStepIndex = 0;
  let riderProgress = 12;
  if (order.stage === 'order_received' || order.stage === 'searching_supplier') {
    activeStepIndex = 0;
    riderProgress = 12;
  } else if (order.stage === 'supplier_accepted') {
    activeStepIndex = 1;
    riderProgress = 28;
  } else if (order.stage === 'rider_assigned' || order.stage === 'preparing') {
    activeStepIndex = 2;
    riderProgress = 46;
  } else if (order.stage === 'picked_up') {
    activeStepIndex = 3;
    riderProgress = 64;
  } else if (order.stage === 'in_transit' || order.stage === 'arrived_at_gate') {
    activeStepIndex = 4;
    riderProgress = order.stage === 'arrived_at_gate' ? 92 : 78;
  } else if (order.stage === 'scale_verification') {
    activeStepIndex = 4;
    riderProgress = 96;
  } else if (order.stage === 'completed') {
    activeStepIndex = 5;
    riderProgress = 100;
  }

  const handleNextSimulationStep = () => {
    if (order.stage === 'order_received' || order.stage === 'searching_supplier') {
      onUpdateStage('supplier_accepted');
    } else if (order.stage === 'supplier_accepted') {
      onUpdateStage('rider_assigned');
    } else if (order.stage === 'rider_assigned' || order.stage === 'preparing') {
      onUpdateStage('picked_up');
    } else if (order.stage === 'picked_up') {
      onUpdateStage('in_transit');
    } else if (order.stage === 'in_transit') {
      onUpdateStage('arrived_at_gate');
    } else if (order.stage === 'arrived_at_gate') {
      setIsScaleModalOpen(true);
    } else if (order.stage === 'scale_verification') {
      onUpdateStage('completed');
    }
    setLastUpdatedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  };

  const complimentOptions = [
    'Accurate Weight',
    'Punctual Delivery',
    'Friendly Rider',
    'Helpful Hookup',
    'Intact Tamper Seal',
  ];

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const currentEtaMin = roadTelemetry?.etaMinutes ?? order.etaMinutes ?? 18;
  const currentDistKm = roadTelemetry?.distanceRemainingKm ?? 1.8;

  const etaText =
    order.stage === 'completed'
      ? 'Gas Delivered & Verified'
      : order.stage === 'arrived_at_gate'
      ? 'Rider has arrived at your gate'
      : `Arriving in ~${currentEtaMin} min`;

  // ========================================================
  // SCREEN 11: ORDER COMPLETED VIEW (Receipt, Rating, Order Again)
  // ========================================================
  if (order.stage === 'completed') {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-4 pb-24 text-left animate-in fade-in duration-200">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onCloseTracker}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#15191C] hover:text-[#226946] cursor-pointer min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back Home</span>
          </button>
          <span className="text-[11px] font-mono font-bold text-[#226946]">
            #{order.orderId} · COMPLETED
          </span>
        </div>

        <div className="rounded-3xl bg-white border border-neutral-200 p-6 sm:p-7 shadow-sm space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-[#226946] text-white mx-auto flex items-center justify-center shadow-md">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-[#226946]">
              Gas Delivered
            </p>
            <h1 className="text-2xl font-extrabold text-[#15191C]">
              Thank you for ordering with Ooh Gas
            </h1>
            <p className="text-xs text-[#6B7280]">
              Delivered by {rider.name} from {supplier.name}
            </p>
          </div>

          {/* Itemized Delivery Receipt */}
          <div className="rounded-2xl bg-[#F6F7F8] p-4 text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Cylinder Ordered</span>
              <span className="font-bold text-[#15191C]">
                {order.quantity}x {order.cylinderSize} ({order.purchaseType === 'refill' ? 'Refill' : 'Exchange'})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Gas Shop</span>
              <span className="font-bold text-[#15191C]">{supplier.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Delivered To</span>
              <span className="font-bold text-[#15191C]">{order.destination.estate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Payment</span>
              <span className="font-bold text-[#226946]">
                {order.paymentMethod === 'cash_on_delivery' ? 'Cash on Delivery' : 'M-Pesa Verified'}
              </span>
            </div>
            <div className="pt-2 border-t border-neutral-200 flex justify-between text-sm font-extrabold text-[#15191C]">
              <span>Total Paid</span>
              <span className="text-[#226946] tabular-nums">KSh {order.totalPrice.toLocaleString()}</span>
            </div>
          </div>

          {/* Rider Star Rating */}
          <div className="space-y-3 pt-1">
            <h3 className="text-sm font-extrabold text-[#15191C]">
              Rate your rider ({rider.name})
            </h3>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  className="p-1 cursor-pointer hover:scale-110 transition-transform"
                  aria-label={`Rate ${s} stars`}
                >
                  <Star
                    className={`w-7 h-7 ${
                      s <= rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-300'
                    }`}
                  />
                </button>
              ))}
            </div>

            <div className="flex items-center justify-center flex-wrap gap-1.5">
              {complimentOptions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors cursor-pointer ${
                    selectedTags.includes(tag)
                      ? 'bg-[#226946] text-white border-[#226946]'
                      : 'bg-[#F6F7F8] text-[#6B7280] border-neutral-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            {feedbackSubmitted && (
              <p className="text-xs font-bold text-[#226946]">
                Thank you! Your {rating}-star review has been saved.
              </p>
            )}
          </div>

          {/* Primary Actions: Order Again + Submit Feedback */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
            {!feedbackSubmitted ? (
              <button
                type="button"
                onClick={() => setFeedbackSubmitted(true)}
                className="min-h-[48px] py-3 px-4 rounded-2xl bg-[#F6F7F8] hover:bg-neutral-200 text-[#15191C] font-bold text-xs sm:text-sm cursor-pointer transition-colors"
              >
                Submit Feedback
              </button>
            ) : (
              <button
                type="button"
                onClick={onResetOrder}
                className="min-h-[48px] py-3 px-4 rounded-2xl bg-[#F6F7F8] hover:bg-neutral-200 text-[#15191C] font-bold text-xs sm:text-sm cursor-pointer transition-colors"
              >
                Back Home
              </button>
            )}

            <button
              type="button"
              onClick={() => (onOrderAgain ? onOrderAgain(order) : onResetOrder())}
              className="min-h-[48px] py-3 px-4 rounded-2xl bg-[#226946] hover:bg-[#195136] text-white font-bold text-xs sm:text-sm cursor-pointer transition-colors flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Order Again</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-3.5 pb-24 text-left animate-in fade-in-50 duration-200">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onCloseTracker}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#15191C] hover:text-[#226946] cursor-pointer min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back Home</span>
        </button>

        <span className="text-[11px] font-mono font-bold text-neutral-500 uppercase tracking-wider">
          Order #{order.orderId}
        </span>
      </div>

      {/* Main ETA & 6-Step Progress Card */}
      <div className="bg-white rounded-2xl border border-neutral-200/90 p-4 sm:p-5 shadow-sm space-y-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#226946] uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-[#226946]" />
              <span>{sixStages[activeStepIndex]?.label || 'Order received'}</span>
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#15191C] tracking-tight leading-tight">
              {etaText}
            </h1>

            <div className="flex items-center gap-3 text-xs text-[#6B7280] pt-0.5 flex-wrap">
              <span className="flex items-center gap-1">
                <Navigation className="w-3.5 h-3.5 text-[#226946]" />
                <strong className="text-[#15191C] tabular-nums">{currentDistKm} km</strong> remaining
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-neutral-400" />
                Updated {lastUpdatedTime}
              </span>
              {liveDriverLocation && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#226946] tabular-nums">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    GPS ±{Math.round(liveDriverLocation.accuracy)}m
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Handover PIN Display */}
          <div className="text-right shrink-0">
            <div className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider flex items-center justify-end gap-1">
              <KeyRound className="w-3 h-3 text-[#226946]" />
              <span>Delivery PIN</span>
            </div>
            <div className="text-lg sm:text-xl font-mono font-extrabold text-[#15191C] bg-[#F6F7F8] border border-neutral-200 px-3 py-1 rounded-xl mt-0.5 tabular-nums">
              {order.handoverPin}
            </div>
          </div>
        </div>

        {/* Smooth Progress Bar + Explicit 6-Step Progress Checklist */}
        <div className="space-y-3 pt-1">
          <div className="w-full h-1.5 bg-[#F6F7F8] rounded-full overflow-hidden flex">
            <div
              className="h-full bg-[#226946] transition-all duration-500 rounded-full"
              style={{ width: `${riderProgress}%` }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-[11px]">
            {sixStages.map((st, idx) => {
              const isDone = idx <= activeStepIndex;
              const isCurrent = idx === activeStepIndex;
              return (
                <div
                  key={st.key}
                  className={`flex items-center gap-1.5 p-2 rounded-xl border transition-colors ${
                    isCurrent
                      ? 'bg-[#EDF6F1] border-[#226946] text-[#226946] font-extrabold'
                      : isDone
                      ? 'bg-white border-neutral-200 text-[#15191C] font-semibold'
                      : 'bg-[#F6F7F8] border-transparent text-[#6B7280]'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full text-[9.5px] font-bold flex items-center justify-center shrink-0 ${
                      isDone ? 'bg-[#226946] text-white' : 'bg-neutral-300 text-white'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="truncate">{st.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Live Interactive Mapbox Road Tracking Map */}
      <MapboxDeliveryMap
        currentLocation={currentLocation}
        suppliers={suppliers}
        riders={riders}
        activeOrder={order}
        riderProgressPercent={riderProgress}
        isExpanded={true}
        liveDriverLocation={liveDriverLocation}
        onDriverTelemetryUpdated={(tel) => setRoadTelemetry(tel)}
      />

      {/* Delivery Rider Card (Reference Track Rider style) */}
      <div className="bg-white rounded-2xl border border-neutral-200/90 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-[#226946] text-white flex items-center justify-center font-black text-base shadow-xs shrink-0">
                {rider.photoInitial}
              </div>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white border border-neutral-300 flex items-center justify-center text-[10px] shadow-2xs">
                🛵
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm sm:text-base font-extrabold text-black truncate">
                  {rider.name}
                </h3>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-neutral-800 bg-neutral-100 px-1.5 py-0.2 rounded shrink-0">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span>{rider.rating}</span>
                </span>
              </div>

              <p className="text-xs text-neutral-600 truncate mt-0.5">
                {rider.vehicleModel} · <strong className="text-black font-bold">{rider.plateNumber}</strong>
              </p>

              <p className="text-[11px] text-[#226946] font-medium truncate mt-0.5">
                EPRA Certified · Digital Scale Equipped
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsDriverConsoleOpen(true)}
              className="h-9 px-3 rounded-full bg-[#EDF6F1] hover:bg-[#DFEFE6] text-[#226946] font-bold text-[11px] flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Open real phone GPS delivery console for rider"
            >
              <Radio className="w-3.5 h-3.5 text-[#226946]" />
              <span className="hidden sm:inline">Rider GPS App</span>
            </button>

            <button
              type="button"
              onClick={() => setIsChatModalOpen(true)}
              className="w-9 h-9 rounded-full bg-[#F6F7F8] hover:bg-neutral-200 text-[#15191C] flex items-center justify-center cursor-pointer transition-colors"
              title="Chat with rider"
              aria-label="Message rider"
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsCallModalOpen(true)}
              className="w-9 h-9 rounded-full bg-[#226946] hover:bg-[#195136] text-white flex items-center justify-center cursor-pointer transition-colors shadow-xs"
              title="Call rider"
              aria-label="Call rider"
            >
              <Phone className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Doorstep Weight Scale Verification Action Card */}
      <div className="bg-[#F6F7F8] rounded-2xl border border-neutral-200/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-neutral-200 text-[#226946] flex items-center justify-center shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-[#15191C]">
              Doorstep Weight Scale Verification
            </h4>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Verify tare + gas gross weight before payment handover.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsScaleModalOpen(true)}
          className="py-2.5 px-4 rounded-xl bg-[#226946] hover:bg-[#195136] text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs shrink-0"
        >
          <Scale className="w-3.5 h-3.5" />
          <span>Check Digital Scale</span>
        </button>
      </div>

      {/* Order Summary & PayHero Payment */}
      <div className="bg-white rounded-2xl border border-neutral-200/90 p-4 shadow-sm space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-black uppercase tracking-wider">Order Summary</h4>
          <span className="text-[10px] font-bold text-[#226946] bg-[#EDF6F1] px-2 py-0.5 rounded">
            Doorstep Verified
          </span>
        </div>

        <div className="space-y-1.5 divide-y divide-neutral-100">
          <div className="flex items-center justify-between py-1">
            <span className="text-neutral-500">Supplying Depot</span>
            <div className="text-right">
              <span className="font-bold text-black block">{supplier.name}</span>
              <span className="text-[11px] text-neutral-400">{supplier.locationArea}</span>
            </div>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-neutral-500">LPG Product</span>
            <span className="font-bold text-black">
              {order.quantity}x {order.cylinderSize} ({order.purchaseType === 'refill' ? 'Refill' : 'New Set'})
            </span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-neutral-500">Subtotal</span>
            <span className="font-bold text-black tabular-nums">KSh {order.subtotal.toLocaleString()}</span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-neutral-500">Delivery Fee</span>
            <span className="font-bold text-black tabular-nums">
              {order.deliveryFee === 0 ? 'Free' : `KSh ${order.deliveryFee.toLocaleString()}`}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2 text-sm font-black text-black">
            <span>Total Payable</span>
            <span className="text-base text-black tabular-nums">
              KSh {order.totalPrice.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-neutral-100">
          {order.payheroStatus === 'completed' ? (
            <div className="p-3 bg-neutral-100 rounded-xl border border-neutral-200 text-xs text-black flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#226946] shrink-0" />
                <div>
                  <span className="font-bold block">PayHero M-Pesa Verified ✓</span>
                  <span className="text-[11px] text-neutral-600 font-mono">
                    Receipt: {order.payheroReceipt || 'MPESA-VERIFIED'}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-white bg-[#226946] px-2 py-0.5 rounded">
                PAID
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-neutral-500">
                <span>
                  Payment: <strong>{order.paymentMethod === 'cash_on_delivery' ? 'Cash on Delivery' : 'Lipa Na M-Pesa'}</strong>
                </span>
                <span>
                  Phone: <strong>{order.destination.phoneNumber}</strong>
                </span>
              </div>

              {order.paymentMethod !== 'cash_on_delivery' && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const { initiatePayHeroMpesa } = await import('../../services/multiSupplierService');
                      const res = await initiatePayHeroMpesa(order.orderId, order.destination.phoneNumber);
                      if (res.success) {
                        onUpdateStage(order.stage);
                      }
                    } catch (e) {
                      console.warn('PayHero initiation error:', e);
                    }
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-[#226946] hover:bg-[#195136] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer tabular-nums"
                >
                  <span>Pay KSh {order.totalPrice.toLocaleString()} via M-Pesa</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Simulation Playground Controls for Demo / Testing */}
      <aside className="rounded-xl bg-neutral-950 text-neutral-300 p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs shadow-md">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-white">Delivery Progress Controls:</span>
          <span className="text-neutral-400">
            Step <strong className="text-emerald-400">{activeStepIndex + 1}/6</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleNextSimulationStep}
            className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg bg-[#226946] hover:bg-[#195136] text-white font-bold text-xs cursor-pointer transition-colors text-center"
          >
            Advance Delivery Stage →
          </button>
        </div>
      </aside>

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
        onConfirmScaleSuccess={() => {
          setIsScaleModalOpen(false);
          onUpdateStage('completed');
        }}
      />

      <RiderDeliveryPortalModal
        isOpen={isDriverConsoleOpen}
        onClose={() => setIsDriverConsoleOpen(false)}
        activeOrder={order}
        riders={riders}
        suppliers={suppliers}
        currentLocation={currentLocation}
      />
    </div>
  );
};
