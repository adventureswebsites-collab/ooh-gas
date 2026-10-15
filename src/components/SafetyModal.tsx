import React from 'react';
import { X, Scale } from 'lucide-react';
import { DOORSTEP_SAFETY_POINTS } from '../data/mockData';

interface SafetyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SafetyModal: React.FC<SafetyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 transition-opacity backdrop-blur-xs"
      role="presentation"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-xl border border-slate-200 overflow-hidden max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-4 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="safety-modal-title"
      >
        {/* Mobile Drag Notch Handle */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300 mx-auto mt-2 mb-0.5 sm:hidden shrink-0" />

        {/* Header */}
        <div className="px-4 py-2.5 sm:py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Scale className="w-4 h-4 text-[#166534] shrink-0" />
            <div className="min-w-0">
              <h2 id="safety-modal-title" className="text-xs min-[360px]:text-sm font-bold text-slate-900 leading-tight">
                Doorstep Safety & Weight Verification
              </h2>
              <p className="text-[10px] min-[360px]:text-[11px] text-slate-500">
                Ooh Gas standard delivery protocol
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors flex items-center justify-center cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-3.5 sm:p-4 space-y-3 flex-1 text-left">
          <div className="p-3 bg-[#f0fdf4] rounded-lg border border-[#bbf7d0] text-xs text-[#14532d] leading-relaxed">
            <strong>Weight Guarantee:</strong> Every delivery rider carries a calibrated digital hanging scale. The cylinder is weighed in front of you before payment so you confirm full gas quantity.
          </div>

          <div className="space-y-2.5">
            {DOORSTEP_SAFETY_POINTS.map((pt) => (
              <div key={pt.num} className="p-2.5 sm:p-3 rounded-lg border border-slate-200 bg-white">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#14532d] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    {pt.num}
                  </span>
                  <h4 className="text-xs font-bold text-slate-900">{pt.title}</h4>
                </div>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed pl-7">
                  {pt.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          className="p-3 bg-slate-50 border-t border-slate-200 text-center shrink-0"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
        >
          <button
            onClick={onClose}
            className="w-full min-h-[44px] py-2 bg-[#14532d] hover:bg-[#166534] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
