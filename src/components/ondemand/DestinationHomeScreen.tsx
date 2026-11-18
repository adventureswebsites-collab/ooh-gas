import React, { useEffect, useState } from 'react';
import {
  Search,
  LocateFixed,
  Clock,
  ChevronRight,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { CustomerAuthSession } from '../../services/customerAuthService';
import { NairobiLocation, OnDemandOrderState } from '../../types';
import { NAIROBI_LOCATIONS } from '../../data/mockData';
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
  onTrackActiveOrder: () => void;
}

const CityDeliveryPinIllustration: React.FC = () => (
  <svg
    viewBox="0 0 420 176"
    className="w-full max-w-[330px] sm:max-w-[380px] h-auto mx-auto select-none"
    fill="none"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="pinBodyGrad" x1="210" y1="12" x2="210" y2="122" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#1DB954" />
        <stop offset="55%" stopColor="#00893C" />
        <stop offset="100%" stopColor="#00662C" />
      </linearGradient>
      <linearGradient id="mapLeftGrad" x1="125" y1="104" x2="180" y2="146" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#F5FFF9" />
        <stop offset="100%" stopColor="#D7F5E3" />
      </linearGradient>
      <linearGradient id="mapMidGrad" x1="180" y1="104" x2="240" y2="146" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#E4FAED" />
        <stop offset="100%" stopColor="#B8ECCE" />
      </linearGradient>
      <linearGradient id="mapRightGrad" x1="240" y1="104" x2="295" y2="146" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#F4FFF8" />
        <stop offset="100%" stopColor="#CEEFE0" />
      </linearGradient>
      <linearGradient id="skylineGrad" x1="210" y1="30" x2="210" y2="132" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#A6E6C0" />
        <stop offset="100%" stopColor="#DDF7E8" />
      </linearGradient>
      <linearGradient id="groundRibbonGrad" x1="80" y1="148" x2="340" y2="152" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#28B463" />
        <stop offset="50%" stopColor="#007A33" />
        <stop offset="100%" stopColor="#28B463" />
      </linearGradient>
      <radialGradient id="groundGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#8DE2B0" stopOpacity="0.45" />
        <stop offset="100%" stopColor="#8DE2B0" stopOpacity="0" />
      </radialGradient>
    </defs>

    {/* Soft Ground Ambient Glow */}
    <ellipse cx="210" cy="136" rx="190" ry="28" fill="url(#groundGlow)" />

    {/* Clouds */}
    <path
      d="M84 52h46a10 10 0 0 0 0-20 14 14 0 0 0-27-3 11 11 0 0 0-19 7 8 8 0 0 0 0 16Z"
      fill="#EAF9F0"
    />
    <path
      d="M286 48h48a9 9 0 0 0 0-18 13 13 0 0 0-25-2 10 10 0 0 0-23 6 7 7 0 0 0 0 14Z"
      fill="#EAF9F0"
    />

    {/* City Skyline Silhouette */}
    <g fill="url(#skylineGrad)">
      <rect x="92" y="74" width="24" height="58" rx="3" />
      <rect x="122" y="54" width="32" height="78" rx="3" />
      <rect x="160" y="70" width="22" height="62" rx="3" />
      <rect x="236" y="64" width="24" height="68" rx="3" />
      <rect x="266" y="48" width="32" height="84" rx="3" />
      <rect x="304" y="74" width="22" height="58" rx="3" />
    </g>

    {/* Crisp White Building Windows */}
    <g fill="#FFFFFF" fillOpacity="0.82">
      <rect x="98" y="82" width="4" height="5" rx="1" />
      <rect x="106" y="82" width="4" height="5" rx="1" />
      <rect x="98" y="92" width="4" height="5" rx="1" />
      <rect x="106" y="92" width="4" height="5" rx="1" />

      <rect x="129" y="63" width="5" height="6" rx="1" />
      <rect x="139" y="63" width="5" height="6" rx="1" />
      <rect x="129" y="75" width="5" height="6" rx="1" />
      <rect x="139" y="75" width="5" height="6" rx="1" />
      <rect x="129" y="87" width="5" height="6" rx="1" />
      <rect x="139" y="87" width="5" height="6" rx="1" />

      <rect x="242" y="72" width="4" height="5" rx="1" />
      <rect x="250" y="72" width="4" height="5" rx="1" />
      <rect x="242" y="83" width="4" height="5" rx="1" />
      <rect x="250" y="83" width="4" height="5" rx="1" />

      <rect x="273" y="57" width="5" height="6" rx="1" />
      <rect x="283" y="57" width="5" height="6" rx="1" />
      <rect x="273" y="69" width="5" height="6" rx="1" />
      <rect x="283" y="69" width="5" height="6" rx="1" />
      <rect x="273" y="81" width="5" height="6" rx="1" />
      <rect x="283" y="81" width="5" height="6" rx="1" />
    </g>

    {/* Trees */}
    <g>
      <rect x="52" y="108" width="4" height="22" rx="2" fill="#8CD6AA" />
      <circle cx="54" cy="98" r="14" fill="#B5EBCB" />
      <circle cx="44" cy="104" r="9" fill="#C8F2D9" />
      <circle cx="64" cy="104" r="9" fill="#A6E3BF" />

      <rect x="358" y="108" width="4" height="22" rx="2" fill="#8CD6AA" />
      <circle cx="360" cy="98" r="14" fill="#B5EBCB" />
      <circle cx="350" cy="104" r="9" fill="#C8F2D9" />
      <circle cx="370" cy="104" r="9" fill="#A6E3BF" />
    </g>

    {/* Soft Curved Horizon Mound */}
    <path
      d="M28 138c52-20 118-26 182-26s130 6 182 26H28Z"
      fill="#DBF7E7"
    />

    {/* Folded Isometric Map */}
    <g>
      <polygon points="104,136 146,108 184,116 148,146" fill="url(#mapLeftGrad)" stroke="#9BDFB8" strokeWidth="1" />
      <polygon points="146,108 210,104 210,138 148,146" fill="url(#mapMidGrad)" stroke="#9BDFB8" strokeWidth="1" />
      <polygon points="210,104 274,108 272,146 210,138" fill="url(#mapLeftGrad)" stroke="#9BDFB8" strokeWidth="1" />
      <polygon points="274,108 316,136 272,146" fill="url(#mapRightGrad)" stroke="#9BDFB8" strokeWidth="1" />
      <path d="M126 130l46-12 36 11 46-12 40 13" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.9" />
      <path d="M168 111l14 28M244 109l-10 31" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.8" />
    </g>

    {/* Pin Ground Shadow */}
    <ellipse cx="210" cy="123" rx="18" ry="5" fill="#005B26" fillOpacity="0.24" />

    {/* 3D Green Location Pin */}
    <g>
      <path
        d="M210 14c-23.5 0-42.5 18.8-42.5 42 0 27.2 31.8 56.2 39.3 62.6a4.9 4.9 0 0 0 6.4 0c7.5-6.4 39.3-35.4 39.3-62.6 0-23.2-19-42-42.5-42Z"
        fill="url(#pinBodyGrad)"
      />
      <path
        d="M210 17c-21.5 0-39 17.2-39 38.5 0 5.5 1.2 11.4 3.4 17.2-1.8-5.4-2.4-10.5-2.4-15.2 0-20 16.5-36.2 38-36.2 12.6 0 24.4 5.5 31.5 14.2C235.1 24.2 223.4 17 210 17Z"
        fill="#FFFFFF"
        fillOpacity="0.22"
      />
      <circle cx="210" cy="54" r="15.5" fill="#FFFFFF" />
      <circle cx="210" cy="54" r="15.5" stroke="#006B2E" strokeOpacity="0.16" strokeWidth="1.5" />
    </g>

    {/* Flowing Green Ground Ribbon */}
    <path
      d="M72 149c48 16 92 22 138 7 46-15 92-12 138 6-46-6-92-12-138 4-46 16-90 7-138-17Z"
      fill="url(#groundRibbonGrad)"
    />
  </svg>
);

export const DestinationHomeScreen: React.FC<DestinationHomeScreenProps> = ({
  customerSession,
  activeOrder,
  onOpenMapSearch,
  onSelectLocationForMapConfirm,
  onTrackActiveOrder,
}) => {
  const [recentLocations, setRecentLocations] = useState<RecentDeliveryLocation[]>([]);

  useEffect(() => {
    setRecentLocations(getRecentDeliveryLocations(customerSession?.user.id));
  }, [customerSession]);

  const displayRecentEntries: Array<{
    key: string;
    location: NairobiLocation;
    timeLabel: string;
  }> =
    recentLocations.length > 0
      ? recentLocations.map((entry) => ({
          key: `${entry.location.id}-${entry.usedAt}`,
          location: entry.location,
          timeLabel: formatRelativeUsedAt(entry.usedAt),
        }))
      : [
          {
            key: `popular-${NAIROBI_LOCATIONS[0].id}`,
            location: NAIROBI_LOCATIONS[0],
            timeLabel: 'Popular',
          },
        ];

  return (
    <main className="relative w-full min-h-[100dvh] -mt-14 sm:-mt-16 pt-14 sm:pt-16 bg-white overflow-hidden flex flex-col justify-between pb-24 md:pb-24">
      {/* Top Abstract Soft Mint & Green Organic Wave Backdrop spanning fully into the header */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-60 sm:h-64 overflow-hidden z-0">
        <svg
          viewBox="0 0 1440 260"
          preserveAspectRatio="none"
          className="w-full h-full"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="topWaveLeft" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#009440" stopOpacity="0.28" />
              <stop offset="60%" stopColor="#6EE7A6" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="topWaveRight" x1="100%" y1="0%" x2="20%" y2="100%">
              <stop offset="0%" stopColor="#00893C" stopOpacity="0.42" />
              <stop offset="55%" stopColor="#5BE096" stopOpacity="0.26" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0,0 L1440,0 L1440,128 C1210,218 910,170 640,95 C410,30 175,92 0,54 Z"
            fill="url(#topWaveLeft)"
          />
          <path
            d="M440,0 L1440,0 L1440,205 C1230,250 1005,188 865,108 C735,34 590,20 440,0 Z"
            fill="url(#topWaveRight)"
          />
        </svg>

        {/* Subtle Top-Right Flame Motif inside header wave */}
        <svg
          viewBox="0 0 80 100"
          className="absolute top-2 right-3 sm:right-10 w-16 h-20 sm:w-20 sm:h-24 text-[#009440]/22"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M43 4c2 14-6 23-13 31-8 9-14 17-14 30 0 18 13 31 30 31 18 0 30-13 30-31 0-17-11-29-18-39-4-6-9-13-15-22Zm-1 51c5 5 8 11 8 17 0 8-6 14-13 14s-13-6-13-14c0-7 4-13 10-19 2-2 5-1 8 2Z" />
        </svg>
      </div>

      {/* Bottom Flowing Soft Mint Wave Backdrop */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-44 overflow-hidden z-0">
        <svg
          viewBox="0 0 1440 220"
          preserveAspectRatio="none"
          className="w-full h-full"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="bottomWaveGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#94E8B8" stopOpacity="0.55" />
              <stop offset="50%" stopColor="#C9F5DC" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#72DF9E" stopOpacity="0.5" />
            </linearGradient>
          </defs>
          <path
            d="M0,145 C260,65 510,175 790,120 C1050,68 1240,38 1440,10 L1440,220 L0,220 Z"
            fill="url(#bottomWaveGrad)"
          />
        </svg>
      </div>

      {/* Centered Foreground Content */}
      <div className="relative z-10 w-full max-w-2xl mx-auto px-4 sm:px-6 pt-1 sm:pt-3">
        {/* Active Order Live Banner (only when an order is actively en route) */}
        {activeOrder && activeOrder.stage !== 'completed' && (
          <div className="mb-4 bg-[#00893C] text-white rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3 shadow-md">
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
              className="py-2 px-3.5 rounded-xl bg-white text-[#00893C] font-bold text-xs hover:bg-emerald-50 cursor-pointer shrink-0 whitespace-nowrap transition-colors"
            >
              Track Order →
            </button>
          </div>
        )}

        {/* City Map + Green Pin Hero Illustration */}
        <div className="mb-3 sm:mb-4">
          <CityDeliveryPinIllustration />
        </div>

        {/* Main Centered Headline & Subtitle */}
        <div className="text-center max-w-lg mx-auto mb-5 sm:mb-6">
          <h1 className="text-[26px] sm:text-[34px] font-extrabold tracking-tight text-[#111827] leading-[1.14] [text-wrap:balance]">
            Where should we deliver?
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-2 leading-relaxed">
            Confirm your delivery pin first so we match stocked LPG depots that serve your exact
            area.
          </p>
        </div>

        {/* Prominent White Pill Destination Search Card matching Reference */}
        <div className="mb-6">
          <div className="flex items-center gap-2.5 w-full bg-white rounded-2xl border border-neutral-100 hover:border-[#00893C]/35 px-3 py-2.5 shadow-[0_12px_32px_rgba(15,23,42,0.08)] transition-all">
            <button
              type="button"
              onClick={() => onOpenMapSearch()}
              aria-label="Search delivery location"
              className="w-11 h-11 rounded-xl bg-[#00893C] hover:bg-[#007433] text-white flex items-center justify-center shrink-0 shadow-sm transition-transform hover:scale-[1.03] cursor-pointer"
            >
              <Search className="w-5 h-5" />
            </button>

            <input
              type="text"
              readOnly
              value=""
              onClick={() => onOpenMapSearch()}
              onFocus={() => onOpenMapSearch()}
              placeholder="Enter your delivery location..."
              aria-label="Enter your delivery location"
              className="w-full min-w-0 bg-transparent text-sm sm:text-base font-medium text-[#111827] placeholder-[#6B7280] focus:outline-none cursor-pointer"
            />

            <span className="h-7 w-px bg-neutral-200 shrink-0" aria-hidden="true" />

            <button
              type="button"
              onClick={() => onOpenMapSearch({ autoDetectGps: true })}
              title="Use current GPS location"
              aria-label="Detect current GPS location"
              className="w-9 h-9 rounded-full bg-[#E6F7ED] hover:bg-[#D2F2DF] text-[#00893C] flex items-center justify-center shrink-0 transition-colors cursor-pointer"
            >
              <LocateFixed className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onOpenMapSearch()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-full bg-white border border-neutral-200/90 hover:border-[#00893C]/40 hover:bg-[#EDF6F1] text-xs font-bold text-[#00893C] shrink-0 whitespace-nowrap transition-colors cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Map</span>
            </button>
          </div>
        </div>

        {/* Recently Used Locations Section */}
        <section aria-label="Recently used locations" className="mb-5">
          <div className="flex items-center gap-3 mb-3">
            <span className="w-7 h-7 rounded-full border-2 border-[#00893C] text-[#00893C] flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </span>
            <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-[#111827] whitespace-nowrap">
              Recently used locations
            </h2>
            <span className="h-[1.5px] flex-1 bg-[#00893C]/55 rounded-full" aria-hidden="true" />
          </div>

          <div className="space-y-2.5">
            {displayRecentEntries.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelectLocationForMapConfirm(item.location)}
                className="w-full flex items-center gap-3.5 px-4 py-3.5 min-h-[64px] rounded-2xl bg-white hover:bg-[#F7FCF9] border border-neutral-100 shadow-[0_8px_24px_rgba(15,23,42,0.05)] text-left transition-all cursor-pointer"
              >
                <span className="w-10 h-10 rounded-full bg-[#E6F7ED] text-[#00893C] flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm sm:text-base font-bold text-[#111827] truncate">
                    {item.location.name}
                  </p>
                  <p className="text-xs text-[#6B7280] truncate mt-0.5">{item.location.area}</p>
                </div>

                <span className="text-xs font-medium text-[#6B7280] tabular-nums shrink-0 whitespace-nowrap">
                  {item.timeLabel}
                </span>

                <ChevronRight className="w-4.5 h-4.5 text-[#6B7280] shrink-0" />
              </button>
            ))}
          </div>
        </section>

        {/* Quiet Safety Footer */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-[#6B7280] pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-[#00893C] shrink-0" />
          <span>EPRA-licensed depots · Digital scale verified at delivery</span>
        </div>
      </div>
    </main>
  );
};
