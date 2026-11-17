import React, { useState, useEffect } from 'react';
import {
  OnDemandOrderState,
  NairobiLocation,
  RiderInfo,
  Supplier,
} from '../../types';
import {
  startLiveGpsTracking,
  stopLiveGpsTracking,
  subscribeToDriverGpsState,
  DriverGpsState,
  DriverLocationRecord,
  sendDriverLocationUpdate,
} from '../../services/driverTrackingService';
import { MapboxDeliveryMap } from '../map/MapboxDeliveryMap';
import {
  X,
  Navigation,
  MapPin,
  Play,
  Square,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Phone,
  Package,
  Compass,
  Gauge,
  RotateCw,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface RiderDeliveryPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeOrder: OnDemandOrderState | null;
  riders: RiderInfo[];
  suppliers: Supplier[];
  currentLocation: NairobiLocation;
  onUpdateOrderStatus?: (status: string) => void;
}

export type RiderDeliveryStatus =
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_HEADING_TO_SUPPLIER'
  | 'ORDER_PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DRIVER_NEARBY'
  | 'DRIVER_ARRIVED'
  | 'DELIVERED';

export const RiderDeliveryPortalModal: React.FC<RiderDeliveryPortalModalProps> = ({
  isOpen,
  onClose,
  activeOrder,
  riders,
  suppliers,
  currentLocation,
  onUpdateOrderStatus,
}) => {
  const [gpsState, setGpsState] = useState<DriverGpsState>({
    isTracking: false,
    orderId: null,
    driverId: null,
    currentLocation: null,
    lastReliableLocation: null,
    permissionStatus: 'prompt',
    error: null,
    updatesCount: 0,
    lastUpdatedTime: null,
  });

  const [deliveryStatus, setDeliveryStatus] = useState<RiderDeliveryStatus>('DRIVER_ASSIGNED');
  const [selectedRider, setSelectedRider] = useState<RiderInfo>(riders[0]);
  const [isSimulatingGpsRoute, setIsSimulatingGpsRoute] = useState(false);
  const [simulationIndex, setSimulationIndex] = useState(0);

  // Sync with activeOrder if available
  useEffect(() => {
    if (activeOrder) {
      if (activeOrder.assignedRider) {
        setSelectedRider(activeOrder.assignedRider);
      }
      if (activeOrder.stage === 'idle') setDeliveryStatus('DRIVER_ASSIGNED');
      else if (activeOrder.stage === 'supplier_accepted') setDeliveryStatus('DRIVER_HEADING_TO_SUPPLIER');
      else if (activeOrder.stage === 'rider_assigned') setDeliveryStatus('ORDER_PICKED_UP');
      else if (activeOrder.stage === 'in_transit') setDeliveryStatus('OUT_FOR_DELIVERY');
      else if (activeOrder.stage === 'arrived_at_gate') setDeliveryStatus('DRIVER_ARRIVED');
      else if (activeOrder.stage === 'completed') setDeliveryStatus('DELIVERED');
    }
  }, [activeOrder?.stage]);

  // Subscribe to driverTrackingService state changes
  useEffect(() => {
    const unsubscribe = subscribeToDriverGpsState((state) => {
      setGpsState(state);
    });
    return unsubscribe;
  }, []);

  if (!isOpen) return null;

  const orderId = activeOrder?.orderId || 'ORD-DEMO-2026';
  const customerName = activeOrder?.destination.fullName || 'Sarah Wangari';
  const customerPhone = activeOrder?.destination.phoneNumber || '+254 712 345 678';
  const deliveryAddress =
    activeOrder?.destination.building || activeOrder?.destination.estate || 'Silver Oak Court, Kilimani';
  const cylinderDetails = `${activeOrder?.quantity || 1}x ${activeOrder?.cylinderSize || '13kg'} (${
    activeOrder?.purchaseType === 'refill' ? 'Refill' : 'Complete Cylinder'
  })`;
  const matchedSupplier = activeOrder?.matchedSupplier || suppliers[0];

  const handleStartTracking = () => {
    const started = startLiveGpsTracking(
      orderId,
      selectedRider.id,
      (loc) => {
        // Location update success
      },
      (err) => {
        console.warn('[RiderPortal] Tracking error:', err.message);
      }
    );

    if (started) {
      if (deliveryStatus === 'DRIVER_ASSIGNED') {
        handleStatusTransition('DRIVER_HEADING_TO_SUPPLIER');
      }
    }
  };

  const handleStopTracking = () => {
    stopLiveGpsTracking();
    setIsSimulatingGpsRoute(false);
  };

  const handleStatusTransition = async (nextStatus: RiderDeliveryStatus) => {
    setDeliveryStatus(nextStatus);

    // Stop tracking when delivered
    if (nextStatus === 'DELIVERED') {
      stopLiveGpsTracking();
      setIsSimulatingGpsRoute(false);
    }

    try {
      await fetch(`/api/driver/orders/${encodeURIComponent(orderId)}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
    } catch (e) {
      console.warn('[RiderPortal] Status update notification:', e);
    }

    if (onUpdateOrderStatus) {
      onUpdateOrderStatus(nextStatus);
    }
  };

  // Pre-calculated Nairobi road coordinates for optional GPS fallback when testing indoors
  const nairobiRoadWaypoints: [number, number][] = [
    [36.7865, -1.2785], // Depot at Westlands/Kilimani
    [36.7868, -1.2805],
    [36.7874, -1.2828],
    [36.7881, -1.2852],
    [36.7869, -1.2878],
    [36.7858, -1.2902],
    [36.7856, -1.2921], // Customer Destination at Kilimani
  ];

  // Optional manual step advance along real road path
  const handleAdvanceRoadGpsStep = () => {
    const nextIdx = (simulationIndex + 1) % nairobiRoadWaypoints.length;
    setSimulationIndex(nextIdx);

    const [lng, lat] = nairobiRoadWaypoints[nextIdx];
    const prevPoint = nairobiRoadWaypoints[simulationIndex] || nairobiRoadWaypoints[0];

    // Compute heading between the two road points
    const heading = Math.round(
      ((Math.atan2(lng - prevPoint[0], lat - prevPoint[1]) * 180) / Math.PI + 360) % 360
    );

    const manualUpdate: DriverLocationRecord = {
      driverId: selectedRider.id,
      orderId,
      latitude: lat,
      longitude: lng,
      accuracy: 6.5,
      heading,
      speed: 28.5,
      recordedAt: new Date().toISOString(),
    };

    sendDriverLocationUpdate(manualUpdate);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-neutral-200 max-w-xl w-full overflow-hidden shadow-2xl flex flex-col my-auto text-left max-h-[92vh]">
        {/* Top Header */}
        <div className="bg-black text-white px-4 py-3.5 flex items-center justify-between shrink-0 border-b border-neutral-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm border border-emerald-500/40 shrink-0">
              🛵
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold truncate">
                  Rider Delivery Console
                </h2>
                <span className="text-[10px] font-bold bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded uppercase">
                  EPRA Driver
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 truncate">
                {selectedRider.name} · {selectedRider.plateNumber} ({selectedRider.vehicleModel})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
            aria-label="Close rider console"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Active Order Card */}
          <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-3.5 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold text-neutral-500 uppercase tracking-wider">
                Order #{orderId}
              </span>
              <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px]">
                {deliveryStatus}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-neutral-200">
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase">Destination</span>
                <strong className="text-black text-xs block truncate mt-0.5">
                  {deliveryAddress}
                </strong>
                <span className="text-[11px] text-neutral-600 block truncate">
                  {customerName} · {customerPhone}
                </span>
              </div>

              <div>
                <span className="text-neutral-500 block text-[10px] uppercase">Gas Product</span>
                <strong className="text-black text-xs block truncate mt-0.5">
                  {cylinderDetails}
                </strong>
                <span className="text-[11px] text-neutral-600 block truncate">
                  Depot: {matchedSupplier.name}
                </span>
              </div>
            </div>
          </div>

          {/* Real Device GPS Tracking Control */}
          <div className="rounded-xl border border-neutral-200 p-4 space-y-3 bg-white shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio
                  className={`w-4 h-4 ${
                    gpsState.isTracking
                      ? 'text-emerald-500 animate-pulse'
                      : 'text-neutral-400'
                  }`}
                />
                <span className="text-xs font-black text-black uppercase tracking-wider">
                  Live Device GPS Broadcast
                </span>
              </div>

              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  gpsState.isTracking
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-neutral-100 text-neutral-600'
                }`}
              >
                {gpsState.isTracking ? 'Active Broadcasting' : 'Tracking Stopped'}
              </span>
            </div>

            <p className="text-[11px] text-neutral-500">
              Transmits actual browser/device GPS coordinates to the customer map via Supabase Realtime every few seconds.
            </p>

            {/* Error Banner */}
            {gpsState.error && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 text-[11px] leading-relaxed">
                  <strong>Location Notice:</strong> {gpsState.error}
                </div>
              </div>
            )}

            {/* Telemetry Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
              <div className="bg-neutral-50 p-2 rounded-lg border border-neutral-200">
                <span className="text-[10px] text-neutral-400 block uppercase">Latitude</span>
                <span className="font-mono font-bold text-black text-xs truncate block">
                  {gpsState.currentLocation?.latitude.toFixed(5) || '-1.28520'}
                </span>
              </div>

              <div className="bg-neutral-50 p-2 rounded-lg border border-neutral-200">
                <span className="text-[10px] text-neutral-400 block uppercase">Longitude</span>
                <span className="font-mono font-bold text-black text-xs truncate block">
                  {gpsState.currentLocation?.longitude.toFixed(5) || '36.78650'}
                </span>
              </div>

              <div className="bg-neutral-50 p-2 rounded-lg border border-neutral-200">
                <span className="text-[10px] text-neutral-400 block uppercase">Accuracy</span>
                <span className="font-mono font-bold text-black text-xs truncate block">
                  {gpsState.currentLocation?.accuracy
                    ? `±${gpsState.currentLocation.accuracy}m`
                    : '±4.2m'}
                </span>
              </div>

              <div className="bg-neutral-50 p-2 rounded-lg border border-neutral-200">
                <span className="text-[10px] text-neutral-400 block uppercase">Speed / Head</span>
                <span className="font-mono font-bold text-black text-xs truncate block">
                  {gpsState.currentLocation?.speed
                    ? `${gpsState.currentLocation.speed} km/h`
                    : '28 km/h'}
                </span>
              </div>
            </div>

            {/* Tracking Start / Stop Actions */}
            <div className="flex items-center gap-2 pt-1">
              {!gpsState.isTracking ? (
                <button
                  type="button"
                  onClick={handleStartTracking}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-black hover:bg-neutral-800 active:bg-neutral-900 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
                >
                  <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                  <span>Start Live GPS Delivery Tracking</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStopTracking}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
                >
                  <Square className="w-3.5 h-3.5 fill-white" />
                  <span>Stop GPS Tracking</span>
                </button>
              )}

              {/* Step advance for indoor testing / developer verification */}
              <button
                type="button"
                onClick={handleAdvanceRoadGpsStep}
                title="Send next verified road coordinate update (simulating driver moving along street)"
                className="py-2.5 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold cursor-pointer transition-colors border border-neutral-200 flex items-center gap-1 shrink-0"
              >
                <RotateCw className="w-3.5 h-3.5 text-black" />
                <span className="hidden sm:inline">Advance Road Step</span>
              </button>
            </div>
          </div>

          {/* Delivery Lifecycle Progression Buttons */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider block">
              Delivery Milestones
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleStatusTransition('DRIVER_HEADING_TO_SUPPLIER')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer text-xs ${
                  deliveryStatus === 'DRIVER_HEADING_TO_SUPPLIER'
                    ? 'border-black bg-neutral-100 font-bold text-black ring-1 ring-black'
                    : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                }`}
              >
                <div className="font-bold">1. Heading to Depot</div>
                <div className="text-[10px] text-neutral-500">Pick up cylinder</div>
              </button>

              <button
                type="button"
                onClick={() => handleStatusTransition('ORDER_PICKED_UP')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer text-xs ${
                  deliveryStatus === 'ORDER_PICKED_UP'
                    ? 'border-black bg-neutral-100 font-bold text-black ring-1 ring-black'
                    : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                }`}
              >
                <div className="font-bold">2. Cylinder Picked Up</div>
                <div className="text-[10px] text-neutral-500">Tamper seal verified</div>
              </button>

              <button
                type="button"
                onClick={() => handleStatusTransition('OUT_FOR_DELIVERY')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer text-xs ${
                  deliveryStatus === 'OUT_FOR_DELIVERY'
                    ? 'border-black bg-neutral-100 font-bold text-black ring-1 ring-black'
                    : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                }`}
              >
                <div className="font-bold">3. Out for Delivery</div>
                <div className="text-[10px] text-neutral-500">En route to gate</div>
              </button>

              <button
                type="button"
                onClick={() => handleStatusTransition('DRIVER_NEARBY')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer text-xs ${
                  deliveryStatus === 'DRIVER_NEARBY'
                    ? 'border-black bg-neutral-100 font-bold text-black ring-1 ring-black'
                    : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                }`}
              >
                <div className="font-bold">4. Driver Nearby</div>
                <div className="text-[10px] text-neutral-500">&lt; 300 meters away</div>
              </button>

              <button
                type="button"
                onClick={() => handleStatusTransition('DRIVER_ARRIVED')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer text-xs ${
                  deliveryStatus === 'DRIVER_ARRIVED'
                    ? 'border-black bg-neutral-100 font-bold text-black ring-1 ring-black'
                    : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                }`}
              >
                <div className="font-bold">5. Arrived at Gate</div>
                <div className="text-[10px] text-neutral-500">Call customer for PIN</div>
              </button>

              <button
                type="button"
                onClick={() => handleStatusTransition('DELIVERED')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer text-xs ${
                  deliveryStatus === 'DELIVERED'
                    ? 'border-emerald-600 bg-emerald-50 font-bold text-emerald-900 ring-1 ring-emerald-600'
                    : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                }`}
              >
                <div className="font-bold text-emerald-800">6. Mark Delivered ✓</div>
                <div className="text-[10px] text-emerald-700">Weight verified</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-neutral-50 px-4 py-3 border-t border-neutral-200 flex items-center justify-between text-xs shrink-0">
          <span className="text-neutral-500 text-[11px]">
            {gpsState.updatesCount > 0
              ? `${gpsState.updatesCount} GPS telemetry points broadcast`
              : 'Standby for delivery trigger'}
          </span>

          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-4 rounded-lg bg-black hover:bg-neutral-800 text-white font-bold cursor-pointer transition-colors"
          >
            Close Console
          </button>
        </div>
      </div>
    </div>
  );
};
