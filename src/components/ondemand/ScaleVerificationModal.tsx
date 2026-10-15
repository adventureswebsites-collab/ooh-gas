import React, { useState } from 'react';
import { OnDemandOrderState, CylinderSize } from '../../types';
import { MARKET_BENCHMARK_PRICES } from '../../data/mockData';
import { Scale, CheckCircle2, ShieldCheck, AlertCircle, X, KeyRound, Sparkles } from 'lucide-react';

interface ScaleVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OnDemandOrderState;
  onConfirmScaleSuccess: (reading: number) => void;
}

export const ScaleVerificationModal: React.FC<ScaleVerificationModalProps> = ({
  isOpen,
  onClose,
  order,
  onConfirmScaleSuccess,
}) => {
  const benchmark = MARKET_BENCHMARK_PRICES[order.cylinderSize];
  const expectedWeight = benchmark.expectedTotalWeight || 27.2;

  const [sealInspected, setSealInspected] = useState(true);
  const [oringInspected, setOringInspected] = useState(true);
  const [bubbleTestPassed, setBubbleTestPassed] = useState(true);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs transition-opacity"
      role="presentation"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xl p-4 sm:p-5 text-left space-y-4 animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0] flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
                Doorstep Weight Scale Verification
              </h3>
              <p className="text-[11px] text-slate-500">
                EPRA Kenya Certified Accuracy
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Digital Hanging Scale Simulated LCD Display */}
        <div className="rounded-xl bg-slate-950 p-3.5 border-2 border-emerald-900 shadow-inner text-center space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400">
            <span>DIGITAL CRANE SCALE · MODEL OCS-L</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>STABLE</span>
            </span>
          </div>

          {/* Big LCD Readout */}
          <div className="py-2">
            <div className="font-mono text-4xl sm:text-5xl font-black text-[#84cc16] tracking-widest drop-shadow-[0_0_8px_rgba(132,204,22,0.4)]">
              {expectedWeight.toFixed(2)} <span className="text-xl sm:text-2xl text-emerald-400">kg</span>
            </div>
            <div className="text-[11px] font-mono text-emerald-300/90 mt-1">
              Gross Weight (Gas + Steel Cylinder)
            </div>
          </div>

          <div className="pt-2 border-t border-emerald-950 flex items-center justify-around text-[10px] text-slate-400 font-mono">
            <span>Tare: ~{(expectedWeight - (order.cylinderSize === '6kg' ? 6 : order.cylinderSize === '13kg' ? 13 : 29)).toFixed(1)} kg</span>
            <span className="text-emerald-400 font-bold">Net Gas: {order.cylinderSize}</span>
            <span className="text-[#84cc16] font-bold">100% Full ✓</span>
          </div>
        </div>

        {/* Physical Safety Checklist */}
        <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
          <div className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">
            Mandatory Doorstep Checklist
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sealInspected}
              onChange={(e) => setSealInspected(e.target.checked)}
              className="w-4 h-4 accent-[#166534] rounded cursor-pointer"
            />
            <span className="text-slate-700">
              Unbroken factory tamper seal & safety cap present
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={oringInspected}
              onChange={(e) => setOringInspected(e.target.checked)}
              className="w-4 h-4 accent-[#166534] rounded cursor-pointer"
            />
            <span className="text-slate-700">
              Rubber O-ring gasket checked inside valve neck
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={bubbleTestPassed}
              onChange={(e) => setBubbleTestPassed(e.target.checked)}
              className="w-4 h-4 accent-[#166534] rounded cursor-pointer"
            />
            <span className="text-slate-700">
              Soap lather bubble leak test passed upon hookup
            </span>
          </label>
        </div>

        {/* 4-Digit Handover Security PIN */}
        <div className="rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] p-3 flex items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#14532d] flex items-center gap-1">
              <KeyRound className="w-3 h-3 text-[#166534]" />
              <span>Your Doorstep Handover PIN</span>
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5">
              Read this PIN to rider <strong>{order.assignedRider?.name.split(' ')[0]}</strong> to release order
            </div>
          </div>
          <div className="bg-white border-2 border-[#166534] px-3 py-1.5 rounded-lg text-lg sm:text-xl font-mono font-black text-[#14532d] tracking-widest shadow-2xs">
            {order.handoverPin}
          </div>
        </div>

        {/* Complete Order Button */}
        <button
          type="button"
          onClick={() => onConfirmScaleSuccess(expectedWeight)}
          className="w-full min-h-[46px] py-2.5 rounded-xl bg-[#14532d] hover:bg-[#166534] text-white font-extrabold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4 text-[#bef264]" />
          <span>Confirm Weight & Complete Delivery</span>
        </button>
      </div>
    </div>
  );
};
