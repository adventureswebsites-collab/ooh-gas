import React from 'react';
import { Home, ReceiptText, Wallet, User } from 'lucide-react';

export type NavTab = 'home' | 'orders' | 'wallet' | 'profile';

interface BottomNavProps {
  activeTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab }) => {
  const tabs = [
    { id: 'home' as NavTab, label: 'Home', icon: Home },
    { id: 'orders' as NavTab, label: 'Orders', icon: ReceiptText },
    { id: 'wallet' as NavTab, label: 'Wallet', icon: Wallet },
    { id: 'profile' as NavTab, label: 'Profile', icon: User },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/98 backdrop-blur-xs border-t border-slate-200"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.25rem)' }}
    >
      <div className="w-full max-w-md mx-auto px-2 min-[360px]:px-4 pt-1 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeTab(tab.id)}
              className={`flex flex-col items-center justify-center min-h-[44px] min-w-[56px] px-2 py-1 transition-colors cursor-pointer ${
                isActive ? 'text-[#14532d]' : 'text-slate-500 hover:text-slate-800'
              }`}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? 'stroke-[2.2] text-[#14532d]' : 'stroke-[1.75]'
                  }`}
                />
                {isActive && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-[#84cc16] rounded-full" />
                )}
              </div>
              <span
                className={`text-[10px] mt-0.5 tracking-tight ${
                  isActive ? 'font-bold text-[#14532d]' : 'font-medium text-slate-500'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
