import React, { useEffect, useState } from 'react';
import {
  Search,
  LocateFixed,
  Home as HomeIcon,
  Briefcase,
  Clock,
  ChevronRight,
  ShieldCheck,
  User as UserIcon,
  LogIn,
  MapPin,
  Flame,
} from 'lucide-react';
import { CustomerAuthSession, getCustomerSavedAddresses } from '../../services/customerAuthService';
import { CustomerAddress } from '../../types/multisupplier';
import { NairobiLocation, OnDemandOrderState } from '../../types';
import {
  RecentDeliveryLocation,
  getRecentDeliveryLocations,
  formatRelativeUsedAt,
} from '../../services/recentLocationsService';

interface DestinationHomeScreenProps {
  customerSession: CustomerAuthSession | null;
  activeOrder: OnDemandOrderState | null;
  onOpenMapSearch: (options?: { autoDetectGps?: boolean; initialQuery?: string }) => void;
  onSelectLocationForMapConfirm: (location: NairobiLocation) => void;
  onOpenProfile: () => void;
  onOpenAuth: (mode?: 'login' | 'signup') => void;
  onTrackActiveOrder: () => void;
}

export const DestinationHomeScreen: React.FC<DestinationHomeScreenProps> = ({
  customerSession,
  activeOrder,
  onOpenMapSearch,
  onSelectLocationForMapConfirm,
  onOpenProfile,
  onOpenAuth,
  onTrackActiveOrder,
}) => {
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [recentLocations, setRecentLocations] = useState<RecentDeliveryLocation[]>([]);

  useEffect(() => {
    setRecentLocations(getRecentDeliveryLocations(customerSession?.user.id));

    if (customerSession) {
      getCustomerSavedAddresses()
        .then((addrs) => setSavedAddresses(addrs || []))
        .catch(() => setSavedAddresses([]));
    } else {
      setSavedAddresses([]);
    }
  }, [customerSession]);

  const firstName = customerSession?.user.fullName?.trim().split(' ')[0] || '';
  const homeAddress = savedAddresses.find(
    (a) => a.label.toLowerCase().includes('home') || a.isDefault
  );
  const workAddress = savedAddresses.find(
    (a) =>
      a.label.toLowerCase().includes('work') || a.label.toLowerCase().includes('office')
  );

  const toNairobiLocation = (addr: CustomerAddress): NairobiLocation => ({
    id: addr.id,
    name: addr.buildingName
      ? `${addr.buildingName}, ${addr.streetAddress.split(',')[0]}`
      : addr.streetAddress,
    area: addr.streetAddress,
    details: [addr.houseOrFlatNumber, addr.deliveryNotes].filter(Boolean).join(' · '),
    coordinates: {
      lat: addr.location.lat,
      lng: addr.location.lng,
    },
  });

  return (
    <main className="w-full max-w-2xl mx-auto px-4 sm:px-6 pt-5 sm:pt-8 pb-28 md:pb-12">
      {/* Top Greeting & Profile / Auth Bar */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="min-w-0">
          {customerSession ? (
            <div className="inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0E8A45] shrink-0" />
              <p className="text-xs sm:text-sm font-bold text-[#0E8A45] truncate">
                Welcome back{firstName ? `, ${firstName}` : ''}
              </p>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#226946]">
              <Flame className="w-3.5 h-3.5" />
              <span>Ooh Gas · Nairobi LPG Delivery</span>
            </div>
          )}
        </div>

        {customerSession ? (
          <button
            type="button"
            onClick={onOpenProfile}
            className="inline-flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full bg-[#EDF6F1] hover:bg-[#DFEFE6] text-[#195136] text-xs font-bold transition-colors cursor-pointer shrink-0"
          >
            <span className="w-6 h-6 rounded-full bg-[#226946] text-white flex items-center justify-center text-[11px] font-extrabold">
              {firstName ? firstName.charAt(0).toUpperCase() : <UserIcon className="w-3.5 h-3.5" />}
            </span>
            <span>{firstName || 'Profile'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onOpenAuth('login')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F6F7F8] hover:bg-[#EDF6F1] text-[#15191C] hover:text-[#226946] text-xs font-bold transition-colors cursor-pointer shrink-0"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign in</span>
          </button>
        )}
      </div>

      {/* Active Order Banner (if customer currently has a live delivery) */}
      {activeOrder && activeOrder.stage !== 'completed' && (
        <div className="mb-6 bg-[#226946] text-white rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3 shadow-sm">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-extrabold truncate">
              Active order #{activeOrder.orderId}: {activeOrder.quantity}x{' '}
              {activeOrder.cylinderSize}
            </p>
            <p className="text-[11px] text-emerald-100 truncate">
              {activeOrder.matchedSupplier?.name || 'Verified Gas Shop'} · Rider{' '}
              {activeOrder.assignedRider?.name.split(' ')[0]} (~{activeOrder.etaMinutes} min)
            </p>
          </div>

          <button
            type="button"
            onClick={onTrackActiveOrder}
            className="py-2 px-3.5 rounded-xl bg-white text-[#226946] font-bold text-xs hover:bg-emerald-50 cursor-pointer shrink-0 transition-colors"
          >
            Track Order →
          </button>
        </div>
      )}

      {/* Main Heading */}
      <div className="mb-5 sm:mb-6">
        <h1 className="text-[28px] sm:text-[34px] font-extrabold tracking-tight text-[#15191C] leading-[1.15]">
          Where should we deliver?
        </h1>
        <p className="text-xs sm:text-sm text-[#6B7280] mt-2 leading-relaxed">
          Confirm your delivery pin first so we match stocked LPG depots that serve your exact gate.
        </p>
      </div>

      {/* Prominent Uber-Style Destination Search Input Trigger */}
      <div className="mb-6">
        <div
          onClick={() => onOpenMapSearch()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpenMapSearch();
            }
          }}
          className="group flex items-center gap-3 w-full bg-[#F6F7F8] hover:bg-[#EDF6F1]/60 border-2 border-neutral-200/90 hover:border-[#226946]/50 rounded-2xl px-4 py-3.5 sm:py-4 shadow-[0_6px_22px_rgba(15,23,42,0.05)] transition-all cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-[#226946] text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
            <Search className="w-4.5 h-4.5" />
          </div>
          <input
            type="text"
            readOnly
            value=""
            onFocus={() => onOpenMapSearch()}
            placeholder="Enter your delivery location..."
            aria-label="Enter your delivery location"
            className="w-full bg-transparent text-sm sm:text-base font-semibold text-[#15191C] placeholder-[#6B7280] focus:outline-none cursor-pointer"
          />
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-neutral-200 text-[11px] font-bold text-[#226946] shrink-0 shadow-2xs">
            <MapPin className="w-3 h-3" />
            Map
          </span>
        </div>
      </div>

      {/* Quick Destination Options Card: Current Location, Saved Home & Work */}
      <section
        aria-label="Quick delivery locations"
        className="bg-white rounded-3xl border border-neutral-200/90 shadow-[0_8px_28px_rgba(15,23,42,0.05)] divide-y divide-neutral-100 overflow-hidden mb-6"
      >
        {/* Option 1: Current GPS Location */}
        <button
          type="button"
          onClick={() => onOpenMapSearch({ autoDetectGps: true })}
          className="w-full flex items-center gap-3.5 px-4 sm:px-5 py-3.5 sm:py-4 text-left hover:bg-[#F6F7F8] active:bg-[#EDF6F1] transition-colors cursor-pointer"
        >
          <div className="w-10 h-10 rounded-full bg-[#EDF6F1] text-[#0E8A45] flex items-center justify-center shrink-0">
            <LocateFixed className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[#15191C]">Current location</p>
            <p className="text-xs text-[#6B7280] truncate">
              Use GPS to detect and confirm where you are right now
            </p>
          </div>
          <ChevronRight className="w-4.5 h-4.5 text-neutral-400 shrink-0" />
        </button>

        {/* Option 2: Saved Home Address */}
        {customerSession ? (
          <button
            type="button"
            onClick={() => {
              if (homeAddress) {
                onSelectLocationForMapConfirm(toNairobiLocation(homeAddress));
              } else {
                onOpenProfile();
              }
            }}
            className="w-full flex items-center gap-3.5 px-4 sm:px-5 py-3.5 sm:py-4 text-left hover:bg-[#F6F7F8] active:bg-[#EDF6F1] transition-colors cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-[#F6F7F8] text-[#15191C] flex items-center justify-center shrink-0">
              <HomeIcon className="w-4.5 h-4.5 text-[#226946]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-[#15191C]">Home</p>
                {homeAddress && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EDF6F1] text-[#226946]">
                    Saved
                  </span>
                )}
              </div>
              <p className="text-xs text-[#6B7280] truncate">
                {homeAddress
                  ? `${homeAddress.buildingName ? `${homeAddress.buildingName}, ` : ''}${homeAddress.streetAddress}`
                  : 'Add your saved Home delivery address'}
              </p>
            </div>
            <ChevronRight className="w-4.5 h-4.5 text-neutral-400 shrink-0" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onOpenAuth('login')}
            className="w-full flex items-center gap-3.5 px-4 sm:px-5 py-3.5 sm:py-4 text-left hover:bg-[#F6F7F8] transition-colors cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-[#F6F7F8] text-[#6B7280] flex items-center justify-center shrink-0">
              <HomeIcon className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[#15191C]">Saved Home address</p>
              <p className="text-xs text-[#6B7280] truncate">
                Sign in to access your saved Home & Work addresses
              </p>
            </div>
            <ChevronRight className="w-4.5 h-4.5 text-neutral-400 shrink-0" />
          </button>
        )}

        {/* Option 3: Saved Work Address */}
        {customerSession && (
          <button
            type="button"
            onClick={() => {
              if (workAddress) {
                onSelectLocationForMapConfirm(toNairobiLocation(workAddress));
              } else {
                onOpenProfile();
              }
            }}
            className="w-full flex items-center gap-3.5 px-4 sm:px-5 py-3.5 sm:py-4 text-left hover:bg-[#F6F7F8] active:bg-[#EDF6F1] transition-colors cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-[#F6F7F8] text-[#15191C] flex items-center justify-center shrink-0">
              <Briefcase className="w-4.5 h-4.5 text-[#226946]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-[#15191C]">Work</p>
                {workAddress && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EDF6F1] text-[#226946]">
                    Saved
                  </span>
                )}
              </div>
              <p className="text-xs text-[#6B7280] truncate">
                {workAddress
                  ? `${workAddress.buildingName ? `${workAddress.buildingName}, ` : ''}${workAddress.streetAddress}`
                  : 'Add your Work or Office delivery address'}
              </p>
            </div>
            <ChevronRight className="w-4.5 h-4.5 text-neutral-400 shrink-0" />
          </button>
        )}
      </section>

      {/* Recently Used Delivery Locations */}
      {recentLocations.length > 0 && (
        <section aria-label="Recently used delivery locations" className="mb-6">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#6B7280] px-1 mb-2.5">
            Recently used locations
          </h2>
          <div className="bg-white rounded-3xl border border-neutral-200/90 shadow-[0_4px_18px_rgba(15,23,42,0.03)] divide-y divide-neutral-100 overflow-hidden">
            {recentLocations.map((entry) => (
              <button
                key={`${entry.location.id}-${entry.usedAt}`}
                type="button"
                onClick={() => onSelectLocationForMapConfirm(entry.location)}
                className="w-full flex items-center gap-3.5 px-4 sm:px-5 py-3.5 text-left hover:bg-[#F6F7F8] active:bg-[#EDF6F1] transition-colors cursor-pointer"
              >
                <div className="w-9 h-9 rounded-full bg-[#F6F7F8] text-[#6B7280] flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-[#226946]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-[#15191C] truncate">
                      {entry.location.name}
                    </p>
                    <span className="text-[10px] font-medium text-[#6B7280] shrink-0">
                      {formatRelativeUsedAt(entry.usedAt)}
                    </span>
                  </div>
                  <p className="text-xs text-[#6B7280] truncate">{entry.location.area}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Compact Safety Guarantee Footer */}
      <div className="flex items-center justify-center gap-2 text-[11px] font-medium text-[#6B7280] pt-2">
        <ShieldCheck className="w-4 h-4 text-[#226946] shrink-0" />
        <span>EPRA-licensed depots · Digital scale verified at your doorstep</span>
      </div>
    </main>
  );
};
