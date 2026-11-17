import React from 'react';
import { Home, ReceiptText, Bell, User } from 'lucide-react';

export type NavTab =
  | 'home'
  | 'orders'
  | 'notifications'
  | 'profile'
  | 'favorites'
  | 'help'
  | 'menu'
  | 'cart';

interface BottomNavProps {
  activeTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
  unreadNotifications?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  unreadNotifications = 0,
}) => {
  const tabs = [
    { id: 'home' as NavTab, label: 'Home', icon: Home },
    { id: 'orders' as NavTab, label: 'Orders', icon: ReceiptText },
    {
      id: 'notifications' as NavTab,
      label: 'Notifications',
      icon: Bell,
      badge: unreadNotifications,
    },
    { id: 'profile' as NavTab, label: 'Profile', icon: User },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200/90 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.25rem)' }}
      aria-label="Primary mobile navigation"
    >
      <div className="w-full max-w-md mx-auto px-2 pt-1 grid grid-cols-4 items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex flex-col items-center justify-center min-h-[50px] py-1 transition-colors cursor-pointer ${
                isActive ? 'text-[#226946]' : 'text-neutral-500 hover:text-neutral-800'
              }`}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'stroke-[2.25] text-[#226946]' : 'stroke-[1.75]'
                  }`}
                />
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white" />
                ) : null}
              </div>
              <span
                className={`text-[10.5px] mt-1 tracking-tight whitespace-nowrap ${
                  isActive ? 'font-bold text-[#226946]' : 'font-medium text-neutral-500'
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <span className="w-10 h-0.5 rounded-full bg-[#226946] mt-0.5" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
