import React from 'react';
import { Supplier, RiderInfo, NairobiLocation, OnDemandOrderState } from '../../types';
import { MapPin } from 'lucide-react';

interface UberDeliveryMapProps {
  currentLocation: NairobiLocation;
  suppliers: Supplier[];
  riders?: RiderInfo[];
  activeOrder?: OnDemandOrderState | null;
  riderProgressPercent?: number; // 0 to 100 (used on dedicated tracking screen)
  isExpanded?: boolean;
  onOpenLocationModal?: () => void;
}

export const UberDeliveryMap: React.FC<UberDeliveryMapProps> = ({
  currentLocation,
  suppliers,
  activeOrder,
  riderProgressPercent = 35,
  isExpanded = false,
  onOpenLocationModal,
}) => {
  // Customer position
  const customerX = currentLocation.coordinates?.x ?? 50;
  const customerY = currentLocation.coordinates?.y ?? 54;

  const isDedicatedTracking = Boolean(activeOrder && activeOrder.stage !== 'idle');
  const matchedSupplier = activeOrder?.matchedSupplier || suppliers[0];
  const depotX = matchedSupplier?.coordinates?.x ?? 44;
  const depotY = matchedSupplier?.coordinates?.y ?? 50;

  // Midpoint interpolation for live tracking route
  const midX = (depotX + customerX) / 2 + 2;
  const midY = (depotY + customerY) / 2 - 2;

  const t = (riderProgressPercent || 0) / 100;
  let activeRiderX = depotX;
  let activeRiderY = depotY;
  if (t <= 0.5) {
    const localT = t * 2;
    activeRiderX = depotX + (midX - depotX) * localT;
    activeRiderY = depotY + (midY - depotY) * localT;
  } else {
    const localT = (t - 0.5) * 2;
    activeRiderX = midX + (customerX - midX) * localT;
    activeRiderY = midY + (customerY - midY) * localT;
  }

  // If this is the homepage map (not dedicated tracking), render a quiet, compact, clean card
  if (!isDedicatedTracking) {
    return (
      <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200/90 bg-[#edf3ef] shadow-2xs select-none h-[115px] min-[360px]:h-[125px] sm:h-[135px] transition-all">
        {/* Simplified Vector Map Canvas */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid slice"
          className="w-full h-full"
        >
          {/* Soft background grid */}
          <rect width="100" height="100" fill="#EDF3EF" />

          {/* Minimal green park/natural zones */}
          <path
            d="M 12 18 Q 24 14 30 24 Q 32 30 26 36 Q 16 34 12 18 Z"
            fill="#dbece2"
            opacity="0.8"
          />
          <path
            d="M 72 38 Q 84 34 88 44 Q 85 52 76 50 Q 70 46 72 38 Z"
            fill="#dbece2"
            opacity="0.7"
          />

          {/* Clean Nairobi Arteries */}
          {/* Ngong Rd */}
          <path
            d="M 5 76 Q 35 68 55 58 T 95 48"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <path
            d="M 5 76 Q 35 68 55 58 T 95 48"
            fill="none"
            stroke="#CBD5E1"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* Argwings Kodhek Rd */}
          <path
            d="M 8 57 Q 38 54 60 50 T 95 38"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <path
            d="M 8 57 Q 38 54 60 50 T 95 38"
            fill="none"
            stroke="#CBD5E1"
            strokeWidth="1.6"
            strokeLinecap="round"
          />

          {/* Ring Road */}
          <path
            d="M 40 12 Q 46 40 52 74 T 58 95"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <path
            d="M 40 12 Q 46 40 52 74 T 58 95"
            fill="none"
            stroke="#CBD5E1"
            strokeWidth="1.4"
            strokeLinecap="round"
          />

          {/* Subtle nearby supplier indicators (tiny discreet dots) */}
          {suppliers.slice(0, 3).map((s, idx) => {
            const sX = s.coordinates?.x ?? (idx === 0 ? 42 : idx === 1 ? 62 : 55);
            const sY = s.coordinates?.y ?? (idx === 0 ? 48 : idx === 1 ? 46 : 65);
            return (
              <g key={s.id} opacity="0.8">
                <circle cx={sX} cy={sY} r="1.6" fill="#FFFFFF" />
                <circle
                  cx={sX}
                  cy={sY}
                  r="1.0"
                  fill={s.brand === 'K-Gas' ? '#DC2626' : s.brand === 'TotalEnergies' ? '#0F4B9B' : '#D97706'}
                />
              </g>
            );
          })}

          {/* Customer Location Pin (Clean, confident emerald indicator with soft pulse) */}
          <g transform={`translate(${customerX}, ${customerY})`}>
            <circle cx="0" cy="0" r="4.2" fill="#166534" opacity="0.16" />
            <circle cx="0" cy="0" r="2.2" fill="#14532d" stroke="#FFFFFF" strokeWidth="0.8" />
            <circle cx="0" cy="0" r="0.8" fill="#84cc16" />
          </g>
        </svg>

        {/* Clean, Non-intrusive Floating Location Bar on Map */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onOpenLocationModal}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/95 backdrop-blur-xs border border-slate-200 shadow-2xs text-left cursor-pointer hover:bg-white transition-colors"
          >
            <div className="w-2 h-2 rounded-full bg-[#166534] shrink-0" />
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-slate-900 truncate block leading-tight">
                {currentLocation.name.split(',')[0]}
              </span>
              <span className="text-[9.5px] text-slate-500 block leading-none">
                Tap to change address
              </span>
            </div>
          </button>

          <span className="text-[10px] text-slate-600 bg-white/90 backdrop-blur-xs px-2 py-1 rounded-md border border-slate-200/80 font-medium hidden min-[360px]:inline-block">
            Coverage active
          </span>
        </div>
      </div>
    );
  }

  // Dedicated Tracking Screen Map (Detailed route & courier tracking)
  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border border-slate-200/90 bg-[#F1F5F2] shadow-xs select-none transition-all duration-300 ${
        isExpanded ? 'h-[300px] sm:h-[360px]' : 'h-[220px] sm:h-[260px]'
      }`}
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full"
      >
        <rect width="100" height="100" fill="#EDF3EF" />

        {/* Roads */}
        <path
          d="M 5 76 Q 35 68 55 58 T 95 48"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M 5 76 Q 35 68 55 58 T 95 48"
          fill="none"
          stroke="#CBD5E1"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        <path
          d="M 8 57 Q 38 54 60 50 T 95 38"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <path
          d="M 8 57 Q 38 54 60 50 T 95 38"
          fill="none"
          stroke="#CBD5E1"
          strokeWidth="1.6"
          strokeLinecap="round"
        />

        <path
          d="M 40 12 Q 46 40 52 74 T 58 95"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path
          d="M 40 12 Q 46 40 52 74 T 58 95"
          fill="none"
          stroke="#CBD5E1"
          strokeWidth="1.4"
          strokeLinecap="round"
        />

        {/* Delivery Route Polyline */}
        <path
          d={`M ${depotX} ${depotY} Q ${midX} ${midY} ${customerX} ${customerY}`}
          fill="none"
          stroke="#166534"
          strokeWidth="2.4"
          strokeLinecap="round"
          opacity="0.25"
        />
        <path
          d={`M ${depotX} ${depotY} Q ${midX} ${midY} ${customerX} ${customerY}`}
          fill="none"
          stroke="#166534"
          strokeWidth="1.3"
          strokeDasharray="2.5, 1.5"
          strokeLinecap="round"
          className="animate-pulse"
        />

        {/* Depot Pin */}
        <g transform={`translate(${depotX}, ${depotY})`}>
          <circle cx="0" cy="0" r="3" fill="#0F172A" stroke="#FFFFFF" strokeWidth="0.8" />
          <text x="0" y="0.8" fontSize="1.8" fill="#FFFFFF" fontWeight="800" textAnchor="middle">
            {matchedSupplier.brandLettermark}
          </text>
        </g>

        {/* Courier Pin */}
        <g transform={`translate(${activeRiderX}, ${activeRiderY})`} className="transition-all duration-300">
          <circle cx="0" cy="0" r="4.2" fill="#166534" opacity="0.25" className="animate-ping" />
          <circle cx="0" cy="0" r="3" fill="#14532d" stroke="#FFFFFF" strokeWidth="0.8" />
          <text x="0" y="1" fontSize="2" fill="#bef264" textAnchor="middle">
            🛵
          </text>
        </g>

        {/* Customer Location Pin */}
        <g transform={`translate(${customerX}, ${customerY})`}>
          <circle cx="0" cy="0" r="4" fill="#166534" opacity="0.2" />
          <circle cx="0" cy="0" r="2.4" fill="#166534" stroke="#FFFFFF" strokeWidth="0.8" />
          <circle cx="0" cy="0" r="1" fill="#84cc16" />
        </g>
      </svg>

      {/* Floating Status Card */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5 pointer-events-none">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/95 backdrop-blur-xs border border-slate-200 shadow-2xs pointer-events-auto text-xs font-semibold text-slate-800">
          <span className="w-2 h-2 rounded-full bg-[#166534] animate-pulse" />
          <span>Courier en route · {activeOrder?.etaMinutes || 15} mins away</span>
        </div>
      </div>
    </div>
  );
};
