import React from 'react';
import {
  X,
  ReceiptText,
  CalendarClock,
  Heart,
  MapPin,
  Bell,
  HelpCircle,
  LogOut,
  LogIn,
  ChevronRight,
  Bike,
  Store,
  Shield,
  Settings,
} from 'lucide-react';
import { CustomerAuthSession, signOutCustomer } from '../services/customerAuthService';
import { OohGasLogo } from './BrandIdentities';

export type DrawerDestination =
  | 'profile_settings'
  | 'order_history'
  | 'scheduled_orders'
  | 'favorites'
  | 'saved_addresses'
  | 'notifications'
  | 'help_support';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  customerSession: CustomerAuthSession | null;
  unreadCount: number;
  favoriteCount: number;
  scheduledCount: number;
  onSelectDestination: (dest: DrawerDestination) => void;
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onOpenRiderPortal: () => void;
  onOpenSupplierPortal: () => void;
  onOpenAdminMonitor: () => void;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  customerSession,
  unreadCount,
  favoriteCount,
  scheduledCount,
  onSelectDestination,
  onOpenAuth,
  onOpenRiderPortal,
  onOpenSupplierPortal,
  onOpenAdminMonitor,
}) => {
  if (!isOpen) return null;

  const initials = customerSession?.user.fullName
    ? customerSession.user.fullName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'OG';

  const menuItems: Array<{
    id: DrawerDestination;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
  }> = [
    { id: 'profile_settings', label: 'Profile Settings', icon: Settings },
    { id: 'order_history', label: 'Order History', icon: ReceiptText },
    {
      id: 'scheduled_orders',
      label: 'Scheduled Orders',
      icon: CalendarClock,
      badge: scheduledCount > 0 ? scheduledCount : undefined,
    },
    {
      id: 'favorites',
      label: 'Favourite Gas Shops',
      icon: Heart,
      badge: favoriteCount > 0 ? favoriteCount : undefined,
    },
    { id: 'saved_addresses', label: 'Saved Addresses', icon: MapPin },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    { id: 'help_support', label: 'Help & Support', icon: HelpCircle },
  ];

  const handleNav = (dest: DrawerDestination) => {
    onClose();
    onSelectDestination(dest);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="Ooh Gas Menu"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-xs"
        onClick={onClose}
        role="presentation"
      />

      {/* Slide-out Panel */}
      <aside className="relative z-10 w-[84vw] max-w-[320px] bg-white h-full flex flex-col justify-between shadow-2xl border-r border-neutral-200 text-left animate-in slide-in-from-left duration-200">
        {/* Top Profile Section */}
        <div className="p-5 border-b border-neutral-100 space-y-4">
          <div className="flex items-center justify-between">
            <OohGasLogo showTagline={false} />
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full hover:bg-[#F6F7F8] text-[#15191C] flex items-center justify-center cursor-pointer transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {customerSession ? (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#EDF6F1]">
              <div className="w-11 h-11 rounded-full bg-[#226946] text-white font-extrabold text-sm flex items-center justify-center shrink-0">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold text-[#15191C] truncate">
                  {customerSession.user.fullName}
                </p>
                <p className="text-xs text-[#226946] font-medium truncate">
                  {customerSession.user.phoneNumber}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-[#F6F7F8] space-y-2.5">
              <p className="text-xs text-[#6B7280]">
                Sign in to manage orders, saved addresses &amp; favourites.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuth('login');
                  }}
                  className="py-2 px-3 rounded-xl bg-[#226946] hover:bg-[#195136] text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-1"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Login</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuth('signup');
                  }}
                  className="py-2 px-3 rounded-xl bg-white border border-neutral-200 text-[#15191C] text-xs font-bold cursor-pointer"
                >
                  Register
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Main Navigation Items (Reference Row 4 Col 1 layout) */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                className="w-full px-3 py-3 rounded-xl hover:bg-[#F6F7F8] active:bg-[#EDF6F1] flex items-center justify-between text-sm font-semibold text-[#15191C] transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-3">
                  <Icon className="w-4.5 h-4.5 text-[#226946]" />
                  <span>{item.label}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  {item.badge !== undefined && (
                    <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#226946] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </span>
              </button>
            );
          })}

          <div className="pt-3 mt-3 border-t border-neutral-100 space-y-1">
            <p className="px-3 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider pb-1">
              Partner &amp; Operations
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenRiderPortal();
              }}
              className="w-full px-3 py-2.5 rounded-xl hover:bg-[#F6F7F8] flex items-center gap-3 text-xs font-semibold text-[#15191C] cursor-pointer"
            >
              <Bike className="w-4 h-4 text-[#226946]" />
              <span>Rider GPS App</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSupplierPortal();
              }}
              className="w-full px-3 py-2.5 rounded-xl hover:bg-[#F6F7F8] flex items-center gap-3 text-xs font-semibold text-[#15191C] cursor-pointer"
            >
              <Store className="w-4 h-4 text-[#226946]" />
              <span>Gas Shop Supplier Portal</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAdminMonitor();
              }}
              className="w-full px-3 py-2.5 rounded-xl hover:bg-[#F6F7F8] flex items-center gap-3 text-xs font-semibold text-[#6B7280] cursor-pointer"
            >
              <Shield className="w-4 h-4 text-[#6B7280]" />
              <span>Admin Dispatch Monitor</span>
            </button>
          </div>
        </div>

        {/* Bottom Footer Action */}
        <div className="p-4 border-t border-neutral-100 space-y-2.5">
          {customerSession && (
            <button
              type="button"
              onClick={async () => {
                await signOutCustomer();
                onClose();
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          )}
          <div className="w-full py-2 px-3 rounded-xl bg-[#226946] text-white text-center text-xs font-bold">
            Customer Mode · Ooh Gas Kenya
          </div>
        </div>
      </aside>
    </div>
  );
};
