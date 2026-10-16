import React, { useState } from 'react';
import { CustomerOrderFlowState } from '../../types';
import { SupplierLettermark } from '../BrandIdentities';
import {
  MapPin,
  Clock,
  Phone,
  User,
  Scale,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Receipt,
  FileCheck,
  RotateCcw,
} from 'lucide-react';

import { CustomerAuthSession } from '../../services/customerAuthService';

interface StepOrderSummaryProps {
  orderState: CustomerOrderFlowState;
  onEditStep: (step: 'cylinder' | 'address' | 'timing') => void;
  onFinishFlow: () => void;
  customerSession?: CustomerAuthSession | null;
  onRequestLogin?: () => void;
}

export const StepOrderSummary: React.FC<StepOrderSummaryProps> = ({
  orderState,
  onEditStep,
  onFinishFlow,
  customerSession,
  onRequestLogin,
}) => {
  const [showCheckoutPreviewModal, setShowCheckoutPreviewModal] = useState(false);

  const { supplier, cylinderSize, purchaseType, quantity, address, timing } = orderState;

  const currentCylinder =
    supplier.cylinders.find((c) => c.size === cylinderSize) || supplier.cylinders[1];

  const unitPrice =
    purchaseType === 'refill' ? currentCylinder.refillPrice : currentCylinder.completePrice;

  const subtotal = unitPrice * quantity;
  const deliveryFee = supplier.deliveryFee;
  const grandTotal = subtotal + deliveryFee;

  const mockOrderNumber = `OG-${Math.floor(10000 + Math.random() * 90000)}`;

  return (
    <div className="space-y-4 text-left">
      {/* 1. Supplier & Product Overview */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 space-y-3 shadow-xs">
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <SupplierLettermark brand={supplier.brand} className="w-10 h-10 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Fulfilling Supplier Depot
              </span>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                {supplier.name}
              </h3>
              <p className="text-[11px] text-slate-500 truncate">
                {supplier.locationArea} · {supplier.distanceKm} km away
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onEditStep('cylinder')}
            className="text-xs font-semibold text-[#166534] hover:underline shrink-0 cursor-pointer pt-1"
          >
            Edit
          </button>
        </div>

        {/* Cylinder Item Row */}
        <div className="flex items-start justify-between gap-3 pt-1">
          <div>
            <div className="text-sm font-bold text-slate-900">
              {cylinderSize} LPG Gas ({purchaseType === 'refill' ? 'Refill Exchange' : 'New Complete Set'})
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Quantity: <strong className="text-slate-800">{quantity}</strong> × KSh {unitPrice.toLocaleString()} each
            </div>
          </div>

          <div className="text-right">
            <span className="text-sm sm:text-base font-extrabold text-slate-900 tabular-nums">
              KSh {subtotal.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Delivery Destination Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 space-y-2 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#166534]" />
            Delivery Address
          </span>
          <button
            type="button"
            onClick={() => onEditStep('address')}
            className="text-xs font-semibold text-[#166534] hover:underline cursor-pointer"
          >
            Edit
          </button>
        </div>

        <div className="text-xs space-y-1 text-slate-700 pt-0.5">
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>{address.fullName}</span>
            <span className="text-slate-400 font-normal">·</span>
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <span>{address.phoneNumber}</span>
          </div>
          <div className="text-slate-800 font-medium">
            {address.building}, {address.unitNumber}
          </div>
          <div className="text-slate-500">
            {address.estate}
          </div>
          {address.deliveryInstructions && (
            <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 mt-1.5">
              <strong>Instructions:</strong> {address.deliveryInstructions}
            </div>
          )}
        </div>
      </div>

      {/* 3. Delivery Timing Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 space-y-2 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#166534]" />
            Delivery Window
          </span>
          <button
            type="button"
            onClick={() => onEditStep('timing')}
            className="text-xs font-semibold text-[#166534] hover:underline cursor-pointer"
          >
            Edit
          </button>
        </div>

        <div className="text-xs text-slate-700 pt-0.5">
          {timing.type === 'asap' ? (
            <div className="flex items-center gap-2 font-bold text-[#14532d]">
              <span className="w-2 h-2 rounded-full bg-[#166534] animate-pulse" />
              <span>Deliver ASAP ({supplier.deliveryTimeMin})</span>
            </div>
          ) : (
            <div className="space-y-0.5">
              <div className="font-bold text-slate-900">
                Scheduled for {timing.scheduledDateFormatted}
              </div>
              <div className="text-slate-600">
                Window: {timing.scheduledSlotLabel}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Complete Itemized Cost Breakdown */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 space-y-2 shadow-xs text-xs">
        <span className="block font-bold text-slate-700 uppercase tracking-wider mb-2">
          Payment Breakdown
        </span>

        <div className="flex justify-between text-slate-600">
          <span>
            {cylinderSize} Gas ({purchaseType === 'refill' ? 'Refill' : 'New Set'}) × {quantity}
          </span>
          <span className="font-semibold text-slate-900 tabular-nums">
            KSh {subtotal.toLocaleString()}
          </span>
        </div>

        <div className="flex justify-between text-slate-600">
          <span>Doorstep Delivery Fee</span>
          <span className="font-semibold text-slate-900 tabular-nums">
            {deliveryFee === 0 ? 'FREE' : `KSh ${deliveryFee}`}
          </span>
        </div>

        <div className="flex justify-between text-emerald-800 font-medium">
          <span className="flex items-center gap-1">
            <Scale className="w-3.5 h-3.5 text-[#166534]" />
            Doorstep Digital Weight Test
          </span>
          <span>Included</span>
        </div>

        <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm sm:text-base font-extrabold text-slate-900">
          <span>Total Payable on Delivery</span>
          <span className="text-[#14532d] tabular-nums">
            KSh {grandTotal.toLocaleString()}
          </span>
        </div>
      </div>

      {/* 5. Reassurance Banner */}
      <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-[#14532d] flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
        <span>
          Pay upon delivery after your cylinder weight and tamper seal are verified at your doorstep.
        </span>
      </div>

      {/* 6. Checkout Preview Modal / Screen (Mock Confirmation Dialog) */}
      {showCheckoutPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-xl border border-slate-200 overflow-hidden shadow-2xl p-5 text-center space-y-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-14 h-14 rounded-full bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0] flex items-center justify-center mx-auto">
              <FileCheck className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[10px] font-bold text-[#14532d] bg-[#dcfce7] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Frontend Prototype Preview
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-2">
                Order Draft #{mockOrderNumber} Created
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Your order flow selections and accurate totals are ready for payment integration in the next stage.
              </p>
            </div>

            {/* Itemized Draft Receipt */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-left text-xs space-y-1.5 font-mono">
              <div className="flex justify-between text-slate-500 font-sans">
                <span>Supplier</span>
                <span className="font-bold text-slate-800">{supplier.name}</span>
              </div>
              <div className="flex justify-between text-slate-500 font-sans">
                <span>Product</span>
                <span className="font-bold text-slate-800">{quantity}x {cylinderSize} ({purchaseType === 'refill' ? 'Refill' : 'Complete'})</span>
              </div>
              <div className="flex justify-between text-slate-500 font-sans">
                <span>Destination</span>
                <span className="font-semibold text-slate-800 truncate max-w-[170px]">{address.building}, {address.estate}</span>
              </div>
              <div className="flex justify-between text-slate-500 font-sans">
                <span>Timing</span>
                <span className="font-semibold text-slate-800">{timing.type === 'asap' ? `ASAP (${supplier.deliveryTimeMin})` : timing.scheduledSlotLabel}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-slate-900 font-bold font-sans text-sm">
                <span>Total Amount</span>
                <span className="text-[#14532d]">KSh {grandTotal.toLocaleString()}</span>
              </div>
            </div>

            <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-900 text-left">
              <strong>Notice:</strong> Real payment gateways (M-Pesa Express, Card, PayHero) and rider dispatch backends are reserved for subsequent stages as per scope restrictions.
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={onFinishFlow}
                className="w-full py-3 bg-[#14532d] hover:bg-[#166534] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Return to Marketplace
              </button>
              <button
                type="button"
                onClick={() => setShowCheckoutPreviewModal(false)}
                className="w-full py-2 text-slate-600 hover:text-slate-900 text-xs font-semibold cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Button to Trigger Checkout Preview */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => {
            if (!customerSession) {
              onRequestLogin?.();
              return;
            }
            setShowCheckoutPreviewModal(true);
          }}
          className="w-full py-3 px-4 min-h-[46px] rounded-xl bg-[#14532d] hover:bg-[#166534] active:bg-[#0f3d21] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
        >
          <span>Continue to Checkout</span>
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
