import React, { useEffect, useRef, useState } from 'react';

interface AppIntroSplashProps {
  onComplete: () => void;
  durationMs?: number;
}

export const AppIntroSplash: React.FC<AppIntroSplashProps> = ({
  onComplete,
  durationMs = 2800,
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const totalMs = prefersReducedMotion ? 1100 : durationMs;
    const fadeStartMs = Math.max(400, totalMs - 320);

    const fadeTimer = window.setTimeout(() => {
      setIsExiting(true);
    }, fadeStartMs);

    const doneTimer = window.setTimeout(() => {
      onCompleteRef.current();
    }, totalMs);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
    };
  }, [durationMs]);

  return (
    <div
      role="region"
      aria-label="Ooh Gas App Intro"
      className={`fixed inset-0 z-50 bg-gradient-to-b from-[#EDF9F2] via-[#F7FCF9] to-white text-[#15191C] flex flex-col justify-between overflow-hidden transition-opacity duration-300 font-['Plus_Jakarta_Sans',sans-serif] ${
        isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Center Hero Headline */}
      <div className="relative z-20 w-full max-w-2xl mx-auto px-5 text-center pt-14 sm:pt-20">
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#15191C] leading-[1.1] [text-wrap:balance]">
          Cooking gas on the move.
        </h1>
        <p className="text-sm sm:text-base text-[#526069] mt-2.5 sm:mt-3 max-w-md mx-auto leading-relaxed">
          Fast doorstep LPG cylinder delivery from verified Nairobi depots straight to your gate.
        </p>
      </div>

      {/* Animated Road Scene with Moving Gas Delivery Motorbike & LPG Cylinder */}
      <div className="relative w-full flex-1 min-h-[260px] sm:min-h-[340px] flex flex-col justify-end overflow-hidden select-none">
        {/* Soft Green Sunlit Glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 w-[340px] sm:w-[540px] h-[180px] rounded-full bg-[#34D399]/18 blur-3xl"
        />

        {/* Scrolling Distant City Skyline & Trees Parallax Strip */}
        <div className="relative w-full h-36 sm:h-48 overflow-hidden pointer-events-none">
          <div className="intro-parallax-track flex w-[200%] h-full">
            {[0, 1].map((dupIdx) => (
              <svg
                key={dupIdx}
                viewBox="0 0 1200 220"
                preserveAspectRatio="none"
                className="w-1/2 h-full shrink-0"
                aria-hidden="true"
              >
                {/* Soft Rolling Hills */}
                <path
                  d="M0 170 Q200 115 440 155 T880 148 T1200 165 L1200 220 L0 220 Z"
                  fill="#DDF5E7"
                />
                {/* Nairobi Skyline Buildings */}
                <g fill="#C6ECD6">
                  <rect x="70" y="96" width="46" height="86" rx="4" />
                  <rect x="128" y="64" width="60" height="118" rx="4" />
                  <rect x="200" y="108" width="40" height="74" rx="4" />
                  <rect x="470" y="82" width="54" height="100" rx="4" />
                  <rect x="536" y="52" width="64" height="130" rx="4" />
                  <rect x="614" y="96" width="48" height="86" rx="4" />
                  <rect x="890" y="76" width="58" height="106" rx="4" />
                  <rect x="960" y="102" width="44" height="80" rx="4" />
                </g>
                {/* Subtle Windows */}
                <g fill="#FFFFFF" fillOpacity="0.65">
                  <rect x="140" y="78" width="8" height="10" rx="1.5" />
                  <rect x="156" y="78" width="8" height="10" rx="1.5" />
                  <rect x="140" y="96" width="8" height="10" rx="1.5" />
                  <rect x="156" y="96" width="8" height="10" rx="1.5" />
                  <rect x="550" y="68" width="9" height="11" rx="1.5" />
                  <rect x="568" y="68" width="9" height="11" rx="1.5" />
                  <rect x="550" y="88" width="9" height="11" rx="1.5" />
                  <rect x="568" y="88" width="9" height="11" rx="1.5" />
                  <rect x="904" y="92" width="8" height="10" rx="1.5" />
                  <rect x="920" y="92" width="8" height="10" rx="1.5" />
                </g>
                {/* Roadside Green Trees */}
                {[310, 380, 740, 810, 1090].map((tx) => (
                  <g key={tx}>
                    <rect x={tx - 3} y="146" width="6" height="38" rx="2" fill="#77B992" />
                    <circle cx={tx} cy="134" r="22" fill="#95DCB3" />
                    <circle cx={tx - 14} cy="142" r="14" fill="#B2E8C8" />
                    <circle cx={tx + 14} cy="142" r="14" fill="#7FD1A2" />
                  </g>
                ))}
              </svg>
            ))}
          </div>
        </div>

        {/* Paved Asphalt Road + Animated Scrolling Lane Markings + Moving Gas Bike */}
        <div className="relative w-full h-36 sm:h-44">
          {/* Green Roadside Curb Grass */}
          <div className="h-3 w-full bg-[#389E63]" />
          {/* Light Concrete Curb */}
          <div className="h-2 w-full bg-[#D7E3DC]" />

          {/* Dark Asphalt Highway */}
          <div className="relative h-full w-full bg-[#242C32] overflow-hidden">
            {/* Subtle Upper & Lower Road Edge Lines */}
            <div className="absolute top-2.5 left-0 right-0 h-[2px] bg-white/35" />
            <div className="absolute bottom-8 left-0 right-0 h-[2px] bg-white/25" />

            {/* Continuously Scrolling Center Dashed Road Stripes */}
            <div className="absolute top-[42%] left-0 w-[200%] h-2 flex items-center intro-road-dashes">
              {Array.from({ length: 24 }).map((_, idx) => (
                <div
                  key={idx}
                  className="w-12 sm:w-16 h-1.5 rounded-full bg-amber-300/90 mr-10 sm:mr-14 shrink-0"
                />
              ))}
            </div>
          </div>

          {/* Moving Delivery Motorbike Carrying Ooh Gas LPG Cylinder */}
          <div className="absolute -top-[88px] sm:-top-[108px] inset-x-0 flex justify-center pointer-events-none">
            <div className="intro-bike-drive">
              <div className="intro-bike-bounce relative w-[235px] sm:w-[295px] h-auto">
              {/* Animated Speed Lines & Exhaust Wisps */}
              <div
                aria-hidden="true"
                className="intro-exhaust-puff absolute left-1 sm:left-2 bottom-[36px] sm:bottom-[44px] w-6 h-3 rounded-full bg-emerald-200/65 blur-[2px]"
              />
              <div
                aria-hidden="true"
                className="intro-exhaust-puff intro-exhaust-puff-delayed absolute -left-3 bottom-[44px] sm:bottom-[54px] w-8 h-3 rounded-full bg-white/75 blur-[2px]"
              />

              {/* Headlight Beam Cone Ahead of Bike */}
              <div
                aria-hidden="true"
                className="absolute -right-14 sm:-right-20 top-[54px] sm:top-[68px] w-24 sm:w-32 h-14 bg-gradient-to-r from-amber-200/45 via-amber-100/15 to-transparent [clip-path:polygon(0%_35%,100%_0%,100%_100%,0%_65%)]"
              />

              {/* Detailed Side-Profile Delivery Motorcycle + Green Gas Cylinder */}
              <svg
                viewBox="0 0 320 180"
                className="w-full h-auto drop-shadow-[0_12px_14px_rgba(0,0,0,0.3)]"
                fill="none"
                aria-label="Ooh Gas delivery motorcycle carrying a green LPG cylinder driving on the road"
              >
                {/* Ground Shadow */}
                <ellipse cx="164" cy="166" rx="112" ry="9" fill="#0F172A" fillOpacity="0.34" />

                {/* Rear Steel Cargo Carrier Frame */}
                <path
                  d="M42 96 L112 96 L122 114 L54 114 Z"
                  fill="#334155"
                  stroke="#1E293B"
                  strokeWidth="2"
                />
                <path d="M48 96 L48 64 L96 64 L96 96" stroke="#475569" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

                {/* Ooh Gas Green LPG Cylinder Strapped upright on Rear Rack */}
                <g transform="translate(52, 26)">
                  {/* Cylinder Top Collar Ring */}
                  <rect x="9" y="0" width="24" height="10" rx="4" fill="#146C3B" stroke="#0F512C" strokeWidth="1.5" />
                  <rect x="14" y="3" width="14" height="5" rx="2" fill="#E2E8F0" />
                  {/* Brass Valve */}
                  <rect x="18" y="6" width="6" height="6" rx="1" fill="#D97706" />
                  {/* Cylinder Body */}
                  <rect x="2" y="9" width="38" height="54" rx="12" fill="#16A34A" stroke="#0F6B33" strokeWidth="2" />
                  {/* Specular Highlight */}
                  <rect x="7" y="14" width="6" height="42" rx="3" fill="#4ADE80" fillOpacity="0.45" />
                  {/* Cylinder Flame Logo Mark */}
                  <path
                    d="M21 24 C17 30 15 33.5 15 37.5 C15 41.2 17.7 44 21 44 C24.3 44 27 41.2 27 37.5 C27 33.5 25 30 21 24 Z"
                    fill="#FFFFFF"
                  />
                  <path
                    d="M21 32 C19.5 34.5 18.8 36 18.8 37.8 C18.8 39.2 19.8 40.3 21 40.3 C22.2 40.3 23.2 39.2 23.2 37.8 C23.2 36 22.5 34.5 21 32 Z"
                    fill="#16A34A"
                  />
                  {/* Cylinder Base Foot Ring */}
                  <rect x="5" y="61" width="32" height="7" rx="3" fill="#0F512C" />
                  {/* Securing Cargo Straps */}
                  <rect x="0" y="25" width="42" height="4" rx="2" fill="#0F172A" />
                  <rect x="0" y="49" width="42" height="4" rx="2" fill="#0F172A" />
                </g>

                {/* Exhaust Pipe */}
                <path
                  d="M64 134 L138 134 L152 124"
                  stroke="#94A3B8"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <rect x="54" y="129" width="38" height="10" rx="5" fill="#CBD5E1" stroke="#64748B" strokeWidth="1.5" />

                {/* Rear Mudguard & Swingarm */}
                <path
                  d="M44 126 C46 102 74 92 98 104"
                  stroke="#1E293B"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <path d="M80 134 L136 122" stroke="#475569" strokeWidth="6" strokeLinecap="round" />

                {/* Engine Block */}
                <rect x="136" y="102" width="46" height="32" rx="7" fill="#334155" stroke="#1E293B" strokeWidth="2" />
                <line x1="143" y1="112" x2="175" y2="112" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="143" y1="119" x2="175" y2="119" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="164" cy="127" r="7" fill="#475569" stroke="#94A3B8" strokeWidth="1.5" />

                {/* Front Suspension Fork & Fender */}
                <path d="M206 54 L244 134" stroke="#CBD5E1" strokeWidth="7" strokeLinecap="round" />
                <path d="M210 56 L246 132" stroke="#16A34A" strokeWidth="4" strokeLinecap="round" />
                <path
                  d="M218 112 C232 102 254 104 266 118"
                  stroke="#16A34A"
                  strokeWidth="7"
                  strokeLinecap="round"
                />

                {/* Motorcycle Chassis, Seat & Green Fuel Tank */}
                <path
                  d="M104 94 C118 98 136 98 154 90 L198 76 C214 78 220 92 204 104 L152 108 L112 106 Z"
                  fill="#15803D"
                  stroke="#0F512C"
                  strokeWidth="2"
                />
                {/* Cushioned Seat */}
                <path
                  d="M104 88 C122 86 144 88 158 82 C163 87 160 95 148 97 L106 96 Z"
                  fill="#1E293B"
                />
                {/* Tank Flame Emblem */}
                <circle cx="184" cy="88" r="6" fill="#FFFFFF" fillOpacity="0.92" />
                <path d="M184 84 C182 86.5 181.5 88 181.5 89.5 C181.5 90.8 182.6 91.8 184 91.8 C185.4 91.8 186.5 90.8 186.5 89.5 C186.5 88 185.8 86.5 184 84 Z" fill="#16A34A" />

                {/* Headlight & Front Fairing */}
                <rect x="210" y="64" width="22" height="16" rx="6" fill="#1E293B" />
                <path d="M229 66 C237 66 238 78 229 78 Z" fill="#FEF08A" />
                {/* Handlebars */}
                <path d="M204 56 L192 50" stroke="#0F172A" strokeWidth="5" strokeLinecap="round" />

                {/* Delivery Rider in Green Jacket & Helmet */}
                <g>
                  {/* Rider Leg & Boot */}
                  <path d="M134 89 L154 114 L148 132" stroke="#1E293B" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="139" y="128" width="20" height="9" rx="4" fill="#0F172A" />
                  {/* Rider Torso in Branded Green Jacket */}
                  <path
                    d="M126 84 C130 56 148 44 166 52 L176 74 L146 88 Z"
                    fill="#16A34A"
                    stroke="#0F512C"
                    strokeWidth="2"
                  />
                  {/* White Reflective Jacket Stripe */}
                  <path d="M138 76 L166 64" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeOpacity="0.85" />
                  {/* Rider Arm Reaching Handlebar */}
                  <path d="M158 56 L180 68 L196 52" stroke="#15803D" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="195" cy="52" r="5.5" fill="#1E293B" />
                  {/* Rider Helmet & Visor */}
                  <circle cx="164" cy="34" r="16" fill="#22C55E" stroke="#0F512C" strokeWidth="2" />
                  <path d="M167 27 L180 31 C181 36 177 41 168 41 Z" fill="#0F172A" />
                  <path d="M170 29 L177 31" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6" />
                </g>

                {/* Rear Wheel (Spinning) */}
                <g transform="translate(80, 134)">
                  <g className="intro-wheel-spin">
                    <circle cx="0" cy="0" r="28" fill="#111827" />
                    <circle cx="0" cy="0" r="18" fill="#E2E8F0" stroke="#475569" strokeWidth="2" />
                    <circle cx="0" cy="0" r="6" fill="#1E293B" />
                    <line x1="-17" y1="0" x2="17" y2="0" stroke="#475569" strokeWidth="2.5" />
                    <line x1="0" y1="-17" x2="0" y2="17" stroke="#475569" strokeWidth="2.5" />
                    <line x1="-12" y1="-12" x2="12" y2="12" stroke="#475569" strokeWidth="2" />
                    <line x1="12" y1="-12" x2="-12" y2="12" stroke="#475569" strokeWidth="2" />
                  </g>
                </g>

                {/* Front Wheel (Spinning) */}
                <g transform="translate(244, 134)">
                  <g className="intro-wheel-spin">
                    <circle cx="0" cy="0" r="28" fill="#111827" />
                    <circle cx="0" cy="0" r="18" fill="#E2E8F0" stroke="#475569" strokeWidth="2" />
                    <circle cx="0" cy="0" r="6" fill="#1E293B" />
                    <line x1="-17" y1="0" x2="17" y2="0" stroke="#475569" strokeWidth="2.5" />
                    <line x1="0" y1="-17" x2="0" y2="17" stroke="#475569" strokeWidth="2.5" />
                    <line x1="-12" y1="-12" x2="12" y2="12" stroke="#475569" strokeWidth="2" />
                    <line x1="12" y1="-12" x2="-12" y2="12" stroke="#475569" strokeWidth="2" />
                  </g>
                </g>
              </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Progress Bar */}
      <footer className="relative z-20 bg-[#242C32] text-white px-5 sm:px-8 pb-6 pt-4">
        <div className="max-w-md mx-auto">
          <div className="w-full h-1.5 rounded-full bg-white/15 overflow-hidden">
            <div
              className="intro-progress-fill h-full w-full rounded-full bg-[#22C55E]"
              style={{ animationDuration: `${durationMs}ms` }}
            />
          </div>
        </div>
      </footer>
    </div>
  );
};
