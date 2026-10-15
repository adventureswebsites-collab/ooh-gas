import React, { useState, useEffect } from 'react';
import { Supplier, RiderInfo, CylinderSize, GasBrand, OnDemandOrderState } from '../../types';
import { connectToRealtimeStream } from '../../services/multiSupplierService';
import {
  Flame,
  ShieldCheck,
  CheckCircle2,
  X,
  Sparkles,
  Clock,
  Building2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
} from 'lucide-react';

interface MatchingModalProps {
  isOpen: boolean;
  selectedSize: CylinderSize;
  brandPreference: GasBrand;
  matchedSupplier: Supplier;
  assignedRider: RiderInfo;
  activeOrder?: OnDemandOrderState | null;
  onCancel: () => void;
  onMatchedComplete: (acceptedData?: any) => void;
  onRetryDifferentLocation?: () => void;
}

export const MatchingModal: React.FC<MatchingModalProps> = ({
  isOpen,
  selectedSize,
  brandPreference,
  matchedSupplier,
  assignedRider,
  activeOrder,
  onCancel,
  onMatchedComplete,
  onRetryDifferentLocation,
}) => {
  const [matchStep, setMatchStep] = useState<number>(1);
  const [currentStage, setCurrentStage] = useState<string>('MATCHING_SUPPLIER');
  const [offeredSupplier, setOfferedSupplier] = useState<{
    tradeName: string;
    rank: number;
    candidateCount: number;
    expiresAt: string;
    deliveryFee: number;
    estimatedDeliveryMin: string;
  } | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(45);
  const [isNoSupplierAvailable, setIsNoSupplierAvailable] = useState<boolean>(false);
  const [noSupplierMessage, setNoSupplierMessage] = useState<string>('');

  // 1. Connect to live Realtime SSE stream
  useEffect(() => {
    if (!isOpen) {
      setMatchStep(1);
      setCurrentStage('MATCHING_SUPPLIER');
      setOfferedSupplier(null);
      setIsNoSupplierAvailable(false);
      return;
    }

    const unsubscribe = connectToRealtimeStream((event, payload) => {
      // Filter for this order if orderId matches or is general
      if (activeOrder?.orderId && payload.orderId && payload.orderId !== activeOrder.orderId) {
        return;
      }

      if (event === 'order_status_changed') {
        setCurrentStage(payload.status);
        if (payload.status === 'NO_SUPPLIER_AVAILABLE') {
          setIsNoSupplierAvailable(true);
          setNoSupplierMessage('All suppliers in your area are currently busy or out of stock.');
        }
      }

      if (event === 'supplier_offered') {
        setCurrentStage('SUPPLIER_OFFERED');
        setMatchStep(2);
        setOfferedSupplier({
          tradeName: payload.tradeName,
          rank: payload.rank || 1,
          candidateCount: payload.candidateCount || 2,
          expiresAt: payload.expiresAt,
          deliveryFee: payload.deliveryFee,
          estimatedDeliveryMin: payload.estimatedDeliveryMin,
        });
        setCountdownSeconds(payload.timeoutSeconds || 45);
      }

      if (event === 'supplier_accepted') {
        setCurrentStage('SUPPLIER_ACCEPTED');
        setMatchStep(4);
        setTimeout(() => {
          onMatchedComplete(payload);
        }, 800);
      }

      if (event === 'no_supplier_available') {
        setIsNoSupplierAvailable(true);
        setCurrentStage('NO_SUPPLIER_AVAILABLE');
        setNoSupplierMessage(
          payload.message || 'No LPG suppliers currently have active delivery coverage or stock for this location.'
        );
      }
    });

    // Simulated fallback progression if running offline without backend
    const fallbackTimer = setTimeout(() => {
      if (!offeredSupplier && !isNoSupplierAvailable) {
        setOfferedSupplier({
          tradeName: matchedSupplier.name,
          rank: 1,
          candidateCount: 2,
          expiresAt: new Date(Date.now() + 45000).toISOString(),
          deliveryFee: matchedSupplier.deliveryFee || 0,
          estimatedDeliveryMin: matchedSupplier.deliveryTimeMin || '20–30 min',
        });
        setMatchStep(2);
      }
    }, 1500);

    return () => {
      unsubscribe();
      clearTimeout(fallbackTimer);
    };
  }, [isOpen, activeOrder?.orderId, matchedSupplier, onMatchedComplete, offeredSupplier, isNoSupplierAvailable]);

  // Countdown timer effect
  useEffect(() => {
    if (!isOpen || currentStage !== 'SUPPLIER_OFFERED') return;

    const timer = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          // Time expired, backend waterfall will advance
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, currentStage]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-md text-white transition-opacity select-none"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md bg-white text-slate-900 rounded-2xl border border-slate-200 overflow-hidden shadow-2xl p-5 sm:p-6 text-center space-y-5 animate-in zoom-in-95 duration-200">
        
        {/* Scenario A: No Supplier Available Screen */}
        {isNoSupplierAvailable ? (
          <div className="space-y-4 py-2 animate-in fade-in">
            <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>

            <div>
              <span className="text-[10.5px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Matching Exhausted
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mt-2">
                No Supplier Currently Available
              </h2>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                {noSupplierMessage ||
                  'All certified LPG depots in this zone are currently offline, out of stock for the selected cylinder, or outside their operating hours.'}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left text-xs space-y-1.5 text-slate-600">
              <p className="font-semibold text-slate-800">What happens next?</p>
              <ul className="list-disc pl-4 space-y-1 text-[11.5px]">
                <li>No payment was collected or authorized.</li>
                <li>You can adjust your pin location to a nearby town or estate.</li>
                <li>You can select an alternative cylinder size (e.g. 6kg or 13kg) or brand.</li>
              </ul>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  onCancel();
                  if (onRetryDifferentLocation) onRetryDifferentLocation();
                }}
                className="w-full py-3 bg-[#14532d] hover:bg-[#166534] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Try Another Location / Product</span>
              </button>

              <button
                type="button"
                onClick={onCancel}
                className="w-full py-2.5 text-slate-500 hover:text-slate-800 text-xs font-semibold cursor-pointer"
              >
                Cancel Request
              </button>
            </div>
          </div>
        ) : (
          /* Scenario B: Active Radar & Multi-Supplier Waterfall Matching */
          <>
            {/* Animated Radar Pulse Visual */}
            <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
              <span className="absolute w-28 h-28 rounded-full bg-[#166534]/15 animate-ping opacity-75" />
              <span className="absolute w-20 h-20 rounded-full bg-[#166534]/25 animate-pulse" />
              <span className="absolute w-14 h-14 rounded-full bg-[#14532d] shadow-md flex items-center justify-center text-white">
                <Flame className="w-7 h-7 text-[#bef264] fill-[#bef264] animate-bounce" />
              </span>
              <span className="absolute -top-1 right-2 w-6 h-6 rounded-full bg-[#84cc16] border-2 border-white shadow-xs flex items-center justify-center text-[10px] text-emerald-950 font-bold animate-pulse">
                🛵
              </span>
            </div>

            {/* Status Headline */}
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10.5px] font-bold uppercase tracking-wider mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                <span>
                  {currentStage === 'SUPPLIER_OFFERED'
                    ? 'Order Offered to Supplier'
                    : currentStage === 'SUPPLIER_ACCEPTED'
                    ? 'Supplier Accepted!'
                    : 'Real-Time Supplier Matching'}
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                {currentStage === 'SUPPLIER_OFFERED' && offeredSupplier
                  ? `Offer Dispatched to ${offeredSupplier.tradeName}`
                  : currentStage === 'SUPPLIER_ACCEPTED'
                  ? 'Depot Stock Confirmed!'
                  : 'Matching Your LPG Request...'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {currentStage === 'SUPPLIER_OFFERED' && offeredSupplier
                  ? `Ranked Candidate #${offeredSupplier.rank} · Awaiting acceptance window`
                  : 'Evaluating zone coverage, stock levels, delivery fees & distance'}
              </p>
            </div>

            {/* Live Offer Countdown Timer */}
            {currentStage === 'SUPPLIER_OFFERED' && offeredSupplier && (
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#166534] animate-spin" />
                  <div className="text-left">
                    <span className="font-bold text-slate-900 block">
                      Supplier Acceptance Window
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Auto-transfers to next ranked supplier if unaccepted
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono text-base font-extrabold text-[#14532d] bg-white px-2 py-0.5 rounded border border-emerald-200">
                    {countdownSeconds}s
                  </span>
                </div>
              </div>
            )}

            {/* Progressive Matching Steps */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left space-y-2.5 text-xs">
              {/* Step 1: Spatial Delivery Zone Check */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#166534] shrink-0" />
                  <span className="font-bold text-slate-900">
                    PostGIS Spatial Zone Containment
                  </span>
                </div>
                <span className="text-[10px] font-bold text-[#166534] bg-[#f0fdf4] px-1.5 py-0.5 rounded">
                  Covered ✓
                </span>
              </div>

              {/* Step 2: Multi-criteria Candidate Ranking */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {matchStep >= 2 ? (
                    <CheckCircle2 className="w-4 h-4 text-[#166534] shrink-0" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border-2 border-[#166534] border-t-transparent animate-spin shrink-0" />
                  )}
                  <span className={matchStep >= 2 ? 'font-bold text-slate-900' : 'text-slate-600'}>
                    Stock & Distance Weighted Ranking
                  </span>
                </div>
                {matchStep >= 2 && (
                  <span className="text-[10px] font-bold text-[#166534] bg-[#f0fdf4] px-1.5 py-0.5 rounded">
                    Ranked ✓
                  </span>
                )}
              </div>

              {/* Step 3: EPRA Safety and Tare Weight Check */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {matchStep >= 3 ? (
                    <CheckCircle2 className="w-4 h-4 text-[#166534] shrink-0" />
                  ) : matchStep === 2 ? (
                    <span className="w-4 h-4 rounded-full border-2 border-[#166534] border-t-transparent animate-spin shrink-0" />
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-slate-200 shrink-0" />
                  )}
                  <span className={matchStep >= 3 ? 'font-bold text-slate-900' : 'text-slate-500'}>
                    EPRA Safety Seal & Calibrated Tare
                  </span>
                </div>
                {matchStep >= 3 && (
                  <span className="text-[10px] font-bold text-[#166534] bg-[#f0fdf4] px-1.5 py-0.5 rounded">
                    Verified ✓
                  </span>
                )}
              </div>
            </div>

            {/* Cancel Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 font-semibold cursor-pointer min-h-[40px] px-3 py-1"
              >
                <X className="w-4 h-4" />
                <span>Cancel Search</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
