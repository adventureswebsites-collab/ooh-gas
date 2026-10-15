import React from 'react';
import cylinderHeroImg from '../assets/images/gasigo_cylinders_hero_1791868130883.jpg';

interface HeroBannerProps {
  onLearnSafety?: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onLearnSafety }) => {
  return (
    <section className="rounded-xl bg-[#14532d] text-white border border-[#0f3d21] overflow-hidden shadow-xs">
      <div className="p-3 min-[360px]:p-3.5 sm:p-4 flex items-center justify-between gap-2.5 min-[360px]:gap-3 sm:gap-4">
        {/* Left Column: Value Proposition */}
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] min-[360px]:text-[11px] font-semibold text-[#bef264] tracking-wide mb-0.5 min-[360px]:mb-1">
            <span>Safe</span>
            <span aria-hidden="true">·</span>
            <span>Fast</span>
            <span aria-hidden="true">·</span>
            <span>Trusted</span>
          </div>

          <h1 className="text-[14px] min-[360px]:text-base sm:text-lg md:text-xl font-bold tracking-tight text-white leading-snug">
            Reliable LPG Delivery in Nairobi
          </h1>

          <p className="mt-1 text-xs text-emerald-100/90 leading-relaxed max-w-md hidden sm:block">
            Order genuine refills and new cylinders from nearby depots with digital scale weight verification at your doorstep.
          </p>

          <div className="mt-1.5 min-[360px]:mt-2 flex items-center flex-wrap gap-x-1.5 gap-y-0.5 text-[10px] min-[360px]:text-[11px] text-emerald-100/80">
            <span className="text-white font-medium">Digital scale check</span>
            <span aria-hidden="true">·</span>
            <span>20–40 min dispatch</span>
            {onLearnSafety && (
              <>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={onLearnSafety}
                  className="text-[#bef264] hover:underline font-semibold cursor-pointer py-0.5"
                >
                  Safety guide
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right Column: Gas Cylinder Thumbnail (Fluid & Aspect-Preserving) */}
        <div className="shrink-0">
          <div className="w-18 h-15 min-[360px]:w-22 min-[360px]:h-17 sm:w-30 sm:h-20 rounded-lg overflow-hidden border border-emerald-800/80 bg-[#0d341d] shadow-xs">
            <img
              src={cylinderHeroImg}
              alt="6kg, 13kg, and 29kg LPG cylinders"
              className="w-full h-full object-cover object-center"
              loading="eager"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
