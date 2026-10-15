import React from 'react';
import { MapPin, ChevronDown, Bell } from 'lucide-react';
import { OohGasLogo } from './BrandIdentities';
import { NairobiLocation } from '../types';

interface HeaderProps {
  currentLocation: NairobiLocation;
  onOpenLocationModal: () => void;
  onOpenNotificationModal: () => void;
  unreadCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentLocation,
  onOpenLocationModal,
  onOpenNotificationModal,
  unreadCount = 2,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 transition-all">
      <div className="w-full max-w-4xl mx-auto px-2.5 min-[360px]:px-3.5 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-1.5 min-[360px]:gap-2 sm:gap-3">
        {/* Brand: Ooh Gas */}
        <div className="shrink-0">
          <OohGasLogo />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 min-[360px]:gap-2 sm:gap-3 shrink-0">
          {/* Nairobi Delivery Location Selector (Accessible min 44px touch target) */}
          <button
            onClick={onOpenLocationModal}
            className="flex items-center gap-1 min-[360px]:gap-1.5 px-2 min-[360px]:px-2.5 py-1.5 min-h-[42px] sm:min-h-[44px] rounded-lg bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 text-slate-800 transition-colors text-left cursor-pointer"
            aria-label="Change delivery location in Nairobi"
          >
            <MapPin className="w-3.5 h-3.5 text-[#166534] shrink-0" />
            <div className="flex flex-col text-left leading-tight max-w-[85px] min-[360px]:max-w-[115px] sm:max-w-[180px]">
              <span className="text-[9px] min-[360px]:text-[10px] font-semibold text-slate-500 uppercase tracking-wider hidden min-[360px]:block">
                Deliver to
              </span>
              <span className="text-xs font-bold text-slate-900 truncate">
                {currentLocation.name.split(',')[0]}
              </span>
            </div>
            <ChevronDown className="w-3 h-3 min-[360px]:w-3.5 min-[360px]:h-3.5 text-slate-500 ml-0.5 shrink-0" />
          </button>

          {/* Notifications Button (Accessible 44x44 touch target) */}
          <button
            onClick={onOpenNotificationModal}
            className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors flex items-center justify-center cursor-pointer shrink-0"
            aria-label="Notifications"
          >
            <Bell className="w-4.5 h-4.5" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#166534] border border-white" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
