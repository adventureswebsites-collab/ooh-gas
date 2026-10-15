import React from 'react';
import { ArrowLeft, CheckCircle2, ChevronRight, MapPin, HelpCircle, ShieldCheck, Scale, KeyRound, Sparkles } from 'lucide-react';
import { SupplierLettermark } from './BrandIdentities';
import { OnDemandOrderState } from '../types';

interface ViewProps {
  onBackToHome: () => void;
  activeOrder?: OnDemandOrderState | null;
  onOpenTracker?: () => void;
}

export const OrdersView: React.FC<ViewProps> = ({ onBackToHome, activeOrder, onOpenTracker }) => {
  return (
    <div className="space-y-3 pb-24 text-left max-w-xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#14532d] hover:underline cursor-pointer min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Marketplace</span>
        </button>
        <span className="text-[10.5px] min-[360px]:text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Order Activity
        </span>
      </div>

      {/* Active On-Demand Order Banner (if in progress) */}
      {activeOrder && activeOrder.stage !== 'completed' && (
        <div className="rounded-2xl border-2 border-[#166534] bg-[#f0fdf4] p-3.5 sm:p-4 space-y-3 shadow-sm animate-in slide-in-from-top-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-[#166534] uppercase tracking-wider bg-white px-2 py-0.5 rounded-full border border-[#86efac]">
                <span className="w-2 h-2 rounded-full bg-[#166534] animate-ping" />
                <span>Active Delivery in Progress</span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 mt-1">
                {activeOrder.quantity}x {activeOrder.cylinderSize} ({activeOrder.purchaseType === 'refill' ? 'Refill' : 'New Set'})
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Courier: <strong>{activeOrder.assignedRider?.name || 'Juma Kiprono'}</strong> ({activeOrder.assignedRider?.plateNumber || 'KMD 824J'})
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-semibold uppercase block">Doorstep PIN</span>
              <span className="font-mono text-base font-black text-[#14532d] bg-white px-2 py-0.5 rounded border border-[#86efac]">
                {activeOrder.handoverPin}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#bbf7d0] text-xs">
            <span className="text-slate-600 font-medium">ETA: ~{activeOrder.etaMinutes} mins away</span>
            <button
              type="button"
              onClick={onOpenTracker}
              className="py-1.5 px-3 rounded-lg bg-[#14532d] hover:bg-[#166534] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              Open Live Tracker →
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-3 min-[360px]:p-3.5 sm:p-4 space-y-3 shadow-xs">
        <h2 className="text-sm sm:text-base font-bold text-slate-900">
          Recent Gas Orders
        </h2>

        {/* Order 1 */}
        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <SupplierLettermark brand="TotalEnergies" className="w-8 h-8 shrink-0" />
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900 truncate">TotalEnergies 13kg Refill</h4>
                <p className="text-[10px] min-[360px]:text-[11px] text-slate-500 truncate">Kilimani, Nairobi · 18 Oct 2026</p>
              </div>
            </div>
            <span className="text-[9.5px] min-[360px]:text-[10px] font-bold text-[#166534] bg-[#f0fdf4] border border-[#bbf7d0] px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
              <CheckCircle2 className="w-3 h-3" /> Delivered
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200 text-slate-600">
            <span>Scale verified: 27.2 kg</span>
            <span className="font-bold text-slate-900">KSh 2,920</span>
          </div>

          <button
            onClick={onBackToHome}
            className="w-full min-h-[40px] py-2 rounded-md bg-[#14532d] hover:bg-[#166534] text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Reorder Cylinder
          </button>
        </div>

        {/* Order 2 */}
        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <SupplierLettermark brand="K-Gas" className="w-8 h-8 shrink-0" />
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900 truncate">K-Gas 6kg Refill</h4>
                <p className="text-[10px] min-[360px]:text-[11px] text-slate-500 truncate">Westlands, Nairobi · 02 Sep 2026</p>
              </div>
            </div>
            <span className="text-[9.5px] min-[360px]:text-[10px] font-bold text-[#166534] bg-[#f0fdf4] border border-[#bbf7d0] px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
              <CheckCircle2 className="w-3 h-3" /> Delivered
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200 text-slate-600">
            <span>Scale verified: 13.0 kg</span>
            <span className="font-bold text-slate-900">KSh 1,300</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const WalletView: React.FC<ViewProps> = ({ onBackToHome }) => {
  return (
    <div className="space-y-3 pb-24 text-left max-w-xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#14532d] hover:underline cursor-pointer min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Marketplace</span>
        </button>
        <span className="text-[10.5px] min-[360px]:text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Ooh Gas Wallet
        </span>
      </div>

      {/* Wallet Card */}
      <div className="rounded-xl bg-[#14532d] p-3.5 sm:p-4 text-white border border-[#0f3d21]">
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] min-[360px]:text-[11px] font-semibold text-emerald-200">
            Available Balance
          </span>
          <span className="text-[9.5px] min-[360px]:text-[10px] bg-[#22c55e]/20 text-[#bef264] border border-[#bef264]/30 px-1.5 py-0.5 rounded font-bold">
            M-Pesa Linked
          </span>
        </div>
        <div className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight">
          KSh 3,250
        </div>
        <p className="mt-1 text-[10.5px] min-[360px]:text-[11px] text-emerald-200/90">
          Phone: +254 712 *** *78
        </p>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className="flex-1 py-1.5 px-3 min-h-[40px] rounded-lg bg-white text-[#14532d] text-xs font-bold hover:bg-emerald-50 transition-colors cursor-pointer"
          >
            Top Up via M-Pesa
          </button>
          <button
            type="button"
            className="flex-1 py-1.5 px-3 min-h-[40px] rounded-lg bg-[#0d341d] text-white text-xs font-bold hover:bg-[#092615] transition-colors cursor-pointer border border-emerald-800"
          >
            Statement
          </button>
        </div>
      </div>
    </div>
  );
};

export const ProfileView: React.FC<ViewProps> = ({ onBackToHome }) => {
  return (
    <div className="space-y-3 pb-24 text-left max-w-xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#14532d] hover:underline cursor-pointer min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Marketplace</span>
        </button>
        <span className="text-[10.5px] min-[360px]:text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Customer Account
        </span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 min-[360px]:p-3.5 sm:p-4 space-y-3 shadow-xs">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-12 h-12 rounded-full bg-[#14532d] text-white flex items-center justify-center font-bold text-base shrink-0">
            WM
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 truncate">Wangari Mwangi</h3>
            <p className="text-xs text-slate-500 truncate">+254 712 345 678</p>
            <p className="text-[10.5px] text-emerald-700 font-semibold mt-0.5">Kilimani, Nairobi</p>
          </div>
        </div>

        <div className="space-y-1 text-xs">
          <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
            <span className="text-slate-700">Saved Addresses</span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
            <span className="text-slate-700">Doorstep Scale Verification Guide</span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
            <span className="text-slate-700">Support & Gas Emergency Line</span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </div>
    </div>
  );
};
