import React from 'react';
import { X } from 'lucide-react';
import { DepotDashboardWorkspace } from './DepotDashboardWorkspace';

interface SupplierDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeOrderNumber?: string;
}

export const SupplierDashboardModal: React.FC<SupplierDashboardModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-slate-900/75 backdrop-blur-sm text-slate-900 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="Depot Operations Dashboard"
    >
      <div className="relative w-full max-w-6xl h-[92vh] bg-[#F8FAFC] rounded-2xl border border-neutral-200 shadow-2xl overflow-hidden flex flex-col">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Depot Dashboard"
          className="absolute top-3 right-3 z-20 w-8 h-8 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-100 text-slate-600 hover:text-slate-900 flex items-center justify-center cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col pr-0">
          <DepotDashboardWorkspace variant="beside" />
        </div>
      </div>
    </div>
  );
};
