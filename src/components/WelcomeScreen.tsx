import React from 'react';
import { OohGasLogo } from './BrandIdentities';
import welcomeImg from '../assets/images/welcome_gas_delivery_1794924775609.jpg';
import { ArrowRight, LogIn, UserPlus, Flame, ShieldCheck, Clock } from 'lucide-react';

interface WelcomeScreenProps {
  onGetStarted: () => void;
  onLogin: () => void;
  onRegister: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onGetStarted,
  onLogin,
  onRegister,
}) => {
  return (
    <div className="min-h-screen bg-white text-[#15191C] flex flex-col justify-between font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Subtle Top Bar */}
      <header className="w-full max-w-5xl mx-auto px-5 pt-6 pb-2 flex items-center justify-between">
        <OohGasLogo showTagline={false} />
        <button
          type="button"
          onClick={onLogin}
          className="text-xs sm:text-sm font-bold text-[#226946] hover:text-[#195136] px-3 py-2 rounded-xl hover:bg-[#EDF6F1] transition-colors cursor-pointer"
        >
          Login
        </button>
      </header>

      {/* Main Content: Responsive Split on Desktop, Vertical Mobile Card */}
      <main className="w-full max-w-5xl mx-auto px-5 py-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Visual Illustration Showcase */}
        <div className="lg:col-span-6 order-1 lg:order-2">
          <div className="relative rounded-3xl bg-[#F8FAF9] border border-neutral-200/80 p-4 sm:p-6 overflow-hidden shadow-xs">
            <img
              src={welcomeImg}
              alt="Ooh Gas courier delivering cooking gas cylinder to doorstep"
              className="w-full aspect-[4/3] object-cover rounded-2xl"
              referrerPolicy="no-referrer"
            />
            {/* Compact Bottom Overlay Strip inside frame */}
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="bg-white rounded-xl py-2.5 px-2 border border-neutral-200/70">
                <Flame className="w-4 h-4 text-[#226946] mx-auto mb-1" />
                <span className="text-[11px] font-bold text-[#15191C] block">6kg – 50kg</span>
                <span className="text-[10px] text-[#6B7280]">All LPG Sizes</span>
              </div>
              <div className="bg-white rounded-xl py-2.5 px-2 border border-neutral-200/70">
                <Clock className="w-4 h-4 text-[#226946] mx-auto mb-1" />
                <span className="text-[11px] font-bold text-[#15191C] block tabular-nums">15–25 min</span>
                <span className="text-[10px] text-[#6B7280]">Doorstep ETA</span>
              </div>
              <div className="bg-white rounded-xl py-2.5 px-2 border border-neutral-200/70">
                <ShieldCheck className="w-4 h-4 text-[#226946] mx-auto mb-1" />
                <span className="text-[11px] font-bold text-[#15191C] block">Scale Check</span>
                <span className="text-[10px] text-[#6B7280]">EPRA Verified</span>
              </div>
            </div>
          </div>
        </div>

        {/* Left Copy + CTAs */}
        <div className="lg:col-span-6 order-2 lg:order-1 space-y-6 text-left">
          <div className="space-y-3">
            <p className="text-xs font-extrabold uppercase tracking-wider text-[#226946]">
              On-Demand LPG Delivery
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#15191C] tracking-tight leading-[1.1]">
              Order cooking gas. Delivered to your door.
            </h1>
            <p className="text-sm sm:text-base text-[#6B7280] leading-relaxed max-w-md">
              Choose your cylinder size, compare nearby verified gas shops, pay safely with M-Pesa or Cash, and track your rider live on the map.
            </p>
          </div>

          <div className="space-y-3 max-w-sm">
            {/* Primary Green CTA matching Reference */}
            <button
              type="button"
              onClick={onGetStarted}
              className="w-full min-h-[52px] py-3.5 px-6 rounded-2xl bg-[#226946] hover:bg-[#195136] text-white font-bold text-sm sm:text-base transition-colors cursor-pointer flex items-center justify-between shadow-sm"
            >
              <span>Get Started</span>
              <span className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                <ArrowRight className="w-4 h-4" />
              </span>
            </button>

            {/* Login & Register Options */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onLogin}
                className="min-h-[46px] py-2.5 px-4 rounded-2xl bg-[#F6F7F8] hover:bg-[#EDF6F1] text-[#15191C] hover:text-[#226946] font-bold text-xs sm:text-sm border border-neutral-200/80 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <LogIn className="w-4 h-4" />
                <span>Login</span>
              </button>
              <button
                type="button"
                onClick={onRegister}
                className="min-h-[46px] py-2.5 px-4 rounded-2xl bg-white hover:bg-[#EDF6F1] text-[#226946] font-bold text-xs sm:text-sm border border-[#226946]/30 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>Register</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full max-w-5xl mx-auto px-5 py-4 text-center sm:text-left text-[11px] text-[#6B7280]">
        Verified Nairobi &amp; Kenya LPG Network · 6kg · 13kg · 22.5kg · 29kg · 50kg
      </footer>
    </div>
  );
};
