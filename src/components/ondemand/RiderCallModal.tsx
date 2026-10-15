import React from 'react';
import { RiderInfo } from '../../types';
import { Phone, X, ShieldCheck, MapPin } from 'lucide-react';

interface RiderCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  rider: RiderInfo;
}

export const RiderCallModal: React.FC<RiderCallModalProps> = ({
  isOpen,
  onClose,
  rider,
}) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity"
      role="presentation"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xl p-5 text-center space-y-4 animate-in zoom-in-95 duration-150 text-left"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#f0fdf4] text-[#166534] flex items-center justify-center font-extrabold text-xs border border-[#bbf7d0]">
              {rider.photoInitial}
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
                Call Courier
              </h3>
              <p className="text-[11px] text-slate-500">
                Direct phone link
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

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 text-center">
          <div className="text-xs font-semibold text-slate-500">Rider Contact Number</div>
          <div className="text-xl font-black text-slate-900 tracking-wider">
            {rider.phone}
          </div>
          <div className="text-[11px] text-slate-600">
            {rider.name} · {rider.vehicleModel} ({rider.plateNumber})
          </div>
        </div>

        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-[11px] text-emerald-800 flex items-start gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#166534] shrink-0 mt-0.5" />
          <span>
            Calls are free and masked. Please inform rider about specific gate entry or intercom instructions.
          </span>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Close
          </button>
          <a
            href={`tel:${rider.phone.replace(/\s+/g, '')}`}
            className="flex-1 py-2 rounded-lg bg-[#14532d] hover:bg-[#166534] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs text-center"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Dial Now</span>
          </a>
        </div>
      </div>
    </div>
  );
};
