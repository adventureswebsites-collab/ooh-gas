import React from 'react';
import { MapPin, ChevronDown, Bell, User, LogIn } from 'lucide-react';
import { OohGasLogo } from './BrandIdentities';
import { NairobiLocation } from '../types';
import { CustomerAuthSession } from '../services/customerAuthService';

interface HeaderProps {
  currentLocation: NairobiLocation;
  onOpenLocationModal: () => void;
  onOpenNotificationModal: () => void;
  unreadCount?: number;
  customerSession?: CustomerAuthSession | null;
  onOpenAuthModal?: (mode?: 'signin' | 'signup') => void;
  onOpenProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentLocation,
  onOpenLocationModal,
  onOpenNotificationModal,
  unreadCount = 2,
  customerSession,
  onOpenAuthModal,
  onOpenProfile,
}) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 transition-all">
      <div className="w-full max-w-4xl mx-auto px-2.5 min-[360px]:px-3.5 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-1.5 min-[360px]:gap-2 sm:gap-3">
        {/* Brand: Ooh Gas */}
        <div className="shrink-0">
          <OohGasLogo />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 min-[360px]:gap-2 sm:gap-2.5 shrink-0">
          {/* Nairobi Delivery Location Selector (Accessible min 44px touch target) */}
          <button
            onClick={onOpenLocationModal}
            className="flex items-center gap-1 min-[360px]:gap-1.5 px-2 min-[360px]:px-2.5 py-1.5 min-h-[42px] sm:min-h-[44px] rounded-lg bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 text-slate-800 transition-colors text-left cursor-pointer"
            aria-label="Change delivery location in Nairobi"
          >
            <MapPin className="w-3.5 h-3.5 text-[#166534] shrink-0" />
            <div className="flex flex-col text-left leading-tight max-w-[80px] min-[360px]:max-w-[105px] sm:max-w-[150px]">
              <span className="text-[9px] min-[360px]:text-[10px] font-semibold text-slate-500 uppercase tracking-wider hidden min-[360px]:block">
                Deliver to
              </span>
              <span className="text-xs font-bold text-slate-900 truncate">
                {currentLocation.name.split(',')[0]}
              </span>
            </div>
            <ChevronDown className="w-3 h-3 min-[360px]:w-3.5 min-[360px]:h-3.5 text-slate-500 ml-0.5 shrink-0" />
          </button>

          {/* Customer Authentication State Button */}
          {customerSession ? (
            <button
              type="button"
              onClick={onOpenProfile}
              className="flex items-center gap-1.5 px-2 py-1 min-h-[42px] sm:min-h-[44px] rounded-lg bg-[#f0fdf4] hover:bg-[#dcfce7] border border-[#bbf7d0] text-[#14532d] transition-colors cursor-pointer"
              title={`Signed in as ${customerSession.user.fullName}`}
              aria-label="Open customer profile"
            >
              <div className="w-7 h-7 rounded-full bg-[#14532d] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                {getInitials(customerSession.user.fullName)}
              </div>
              <div className="flex flex-col text-left leading-none max-w-[80px] sm:max-w-[110px] hidden min-[400px]:flex">
                <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider">Account</span>
                <span className="text-xs font-bold text-slate-900 truncate mt-0.5">
                  {customerSession.user.fullName.split(' ')[0]}
                </span>
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpenAuthModal?.('signin')}
              className="flex items-center gap-1.5 px-2.5 min-[360px]:px-3 py-1.5 min-h-[42px] sm:min-h-[44px] rounded-lg bg-[#14532d] hover:bg-[#166534] active:bg-[#0f3d21] text-white font-bold text-xs transition-colors cursor-pointer shadow-2xs"
              aria-label="Sign in or register"
            >
              <LogIn className="w-3.5 h-3.5 text-lime-300" />
              <span>Sign In</span>
            </button>
          )}

          {/* Notifications Button */}
          <button
            onClick={onOpenNotificationModal}
            className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors flex items-center justify-center cursor-pointer shrink-0"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#166534] border border-white" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
