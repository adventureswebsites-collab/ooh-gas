import React from 'react';
import { Bell, LogIn, Menu, MapPin } from 'lucide-react';
import { OohGasLogo } from './BrandIdentities';
import { NairobiLocation } from '../types';
import { CustomerAuthSession } from '../services/customerAuthService';

interface HeaderProps {
  currentLocation: NairobiLocation;
  onOpenLocationModal: () => void;
  onOpenNotificationModal: () => void;
  onOpenDrawer?: () => void;
  unreadCount?: number;
  customerSession?: CustomerAuthSession | null;
  onOpenAuthModal?: (mode?: 'signin' | 'signup') => void;
  onOpenProfile?: () => void;
  onOpenOrders?: () => void;
  onOpenNotificationsTab?: () => void;
  onOpenFavorites?: () => void;
  onNavigateHome?: () => void;
  activeTab?: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentLocation,
  onOpenLocationModal,
  onOpenNotificationModal,
  onOpenDrawer,
  unreadCount = 0,
  customerSession,
  onOpenAuthModal,
  onOpenProfile,
  onOpenOrders,
  onOpenNotificationsTab,
  onOpenFavorites,
  onNavigateHome,
  activeTab = 'home',
}) => {
  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200/80">
      <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
        {/* Zone 1: Menu Drawer Trigger + Brand + Location Selector */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onOpenDrawer && (
            <button
              type="button"
              onClick={onOpenDrawer}
              className="w-10 h-10 rounded-xl bg-[#F6F7F8] hover:bg-[#EDF6F1] text-[#15191C] hover:text-[#226946] flex items-center justify-center transition-colors cursor-pointer shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <button
            type="button"
            onClick={onNavigateHome}
            className="text-left cursor-pointer focus:outline-none whitespace-nowrap shrink-0"
            aria-label="Ooh Gas Home"
          >
            <OohGasLogo showTagline={false} />
          </button>

          <button
            type="button"
            onClick={onOpenLocationModal}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F6F7F8] hover:bg-[#EDF6F1] text-xs font-semibold text-[#15191C] hover:text-[#226946] transition-colors cursor-pointer max-w-[190px] truncate"
            title="Change delivery location"
          >
            <MapPin className="w-3.5 h-3.5 text-[#226946] shrink-0" />
            <span className="truncate">{currentLocation.name.split(',')[0]}</span>
          </button>
        </div>

        {/* Zone 2: Clean Desktop Navigation Links (Home, Orders, Notifications, Profile, Favourites) */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-600">
          <button
            type="button"
            onClick={onNavigateHome}
            className={`py-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'home'
                ? 'border-[#226946] text-[#226946] font-bold'
                : 'border-transparent hover:text-[#15191C]'
            }`}
          >
            Home
          </button>
          <button
            type="button"
            onClick={onOpenOrders}
            className={`py-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'orders'
                ? 'border-[#226946] text-[#226946] font-bold'
                : 'border-transparent hover:text-[#15191C]'
            }`}
          >
            Orders
          </button>
          <button
            type="button"
            onClick={onOpenNotificationsTab || onOpenNotificationModal}
            className={`py-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'notifications'
                ? 'border-[#226946] text-[#226946] font-bold'
                : 'border-transparent hover:text-[#15191C]'
            }`}
          >
            Notifications
          </button>
          {onOpenFavorites && (
            <button
              type="button"
              onClick={onOpenFavorites}
              className={`py-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer border-b-2 ${
                activeTab === 'favorites'
                  ? 'border-[#226946] text-[#226946] font-bold'
                  : 'border-transparent hover:text-[#15191C]'
              }`}
            >
              Favourites
            </button>
          )}
          <button
            type="button"
            onClick={onOpenProfile}
            className={`py-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'profile'
                ? 'border-[#226946] text-[#226946] font-bold'
                : 'border-transparent hover:text-[#15191C]'
            }`}
          >
            Profile
          </button>
        </nav>

        {/* Zone 3: Notification Bell & Account Action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenNotificationsTab || onOpenNotificationModal}
            className="relative w-10 h-10 rounded-xl bg-[#F6F7F8] hover:bg-[#EDF6F1] text-[#15191C] hover:text-[#226946] transition-colors flex items-center justify-center cursor-pointer shrink-0"
            aria-label="Notifications"
          >
            <Bell className="w-4.5 h-4.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-[#226946] text-white text-[9.5px] font-bold flex items-center justify-center tabular-nums">
                {unreadCount}
              </span>
            )}
          </button>

          {customerSession ? (
            <button
              type="button"
              onClick={onOpenProfile}
              className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 min-h-[40px] rounded-xl bg-[#EDF6F1] hover:bg-[#DFEFE6] text-[#15191C] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title={`Signed in as ${customerSession.user.fullName}`}
              aria-label="Open customer account"
            >
              <div className="w-6 h-6 rounded-lg bg-[#226946] text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                {getInitials(customerSession.user.fullName)}
              </div>
              <span className="text-xs font-bold text-[#195136] hidden sm:inline max-w-[100px] truncate">
                {customerSession.user.fullName.split(' ')[0]}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpenAuthModal?.('signin')}
              className="flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl bg-[#226946] hover:bg-[#195136] text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
              aria-label="Sign in"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

