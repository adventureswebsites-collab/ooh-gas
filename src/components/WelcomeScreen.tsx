import React, { useState } from 'react';
import { OohGasLogo } from './BrandIdentities';
import welcomeImg from '../assets/images/welcome_gas_delivery_1794924775609.jpg';
import { KenyaFlagBadge } from './auth/PhoneAuthFlow';
import {
  isValidKenyanPhone,
  OtpRequestResult,
  requestPhoneOtp,
} from '../services/customerAuthService';
import { ArrowRight, AlertCircle, Loader2, X } from 'lucide-react';

interface WelcomeScreenProps {
  onContinueWithOtp: (otpData: OtpRequestResult) => void;
  onBrowseAsGuest: () => void;
  onOpenEmailLogin: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onContinueWithOtp,
  onBrowseAsGuest,
  onOpenEmailLogin,
}) => {
  const [phoneInput, setPhoneInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [legalDialog, setLegalDialog] = useState<'terms' | 'privacy' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isValidKenyanPhone(phoneInput)) {
      setErrorMessage('Enter a valid Kenyan mobile number (e.g. 712 345 678).');
      return;
    }

    setIsLoading(true);
    try {
      const otpResult = await requestPhoneOtp(phoneInput);
      onContinueWithOtp(otpResult);
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not send verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#15191C] flex flex-col justify-between font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Clean Top Bar: Logo + Visitor Browse Link */}
      <header className="w-full max-w-5xl mx-auto px-5 pt-5 pb-2 flex items-center justify-between gap-4">
        <OohGasLogo showTagline={false} />
        <button
          type="button"
          onClick={onBrowseAsGuest}
          className="text-xs sm:text-sm font-bold text-[#226946] hover:text-[#195136] px-3 py-2 rounded-xl hover:bg-[#EDF6F1] transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          Browse shops
        </button>
      </header>

      {/* Main Content: Mobile-First Single Column -> Balanced 2-Col Split on Desktop */}
      <main className="w-full max-w-5xl mx-auto px-5 py-4 sm:py-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center">
        {/* Illustration Showcase */}
        <div className="lg:col-span-6 order-1 lg:order-2">
          <div className="rounded-3xl bg-[#F6F9F7] border border-neutral-200/70 p-3 sm:p-5 overflow-hidden">
            <img
              src={welcomeImg}
              alt="Ooh Gas delivery motorcycle with LPG gas cylinder arriving at doorstep"
              className="w-full aspect-[4/3] object-cover rounded-2xl"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        {/* Left Copy + +254 Phone Entry */}
        <div className="lg:col-span-6 order-2 lg:order-1 space-y-5 text-left">
          <div className="space-y-2.5">
            <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-[#15191C] tracking-tight leading-[1.12] [text-wrap:balance]">
              Gas delivered to your doorstep.
            </h1>
            <p className="text-sm sm:text-base text-[#6B7280] leading-relaxed max-w-md">
              Order your favourite gas brand and get it delivered wherever you are.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5 max-w-md animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 max-w-md">
            <div className="flex items-center rounded-2xl bg-[#F6F7F8] border border-neutral-200/70 focus-within:border-[#226946] focus-within:bg-white transition-all overflow-hidden">
              <div className="pl-4 pr-3 py-3.5 border-r border-neutral-200/80">
                <KenyaFlagBadge />
              </div>
              <input
                type="tel"
                inputMode="tel"
                required
                autoComplete="tel-national"
                aria-label="Kenyan phone number"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="712 345 678"
                className="w-full px-3.5 py-3.5 bg-transparent text-base font-semibold text-[#15191C] placeholder:text-[#9CA3AF] placeholder:font-normal outline-hidden tabular-nums"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[52px] py-3.5 px-6 rounded-2xl bg-[#226946] hover:bg-[#195136] active:scale-[0.99] text-white font-bold text-sm sm:text-base transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending code...</span>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Visitor browse path & returning email sign-in */}
          <div className="flex flex-wrap items-center justify-between gap-3 max-w-md pt-1">
            <button
              type="button"
              onClick={onBrowseAsGuest}
              className="text-xs sm:text-sm font-bold text-[#15191C] hover:text-[#226946] transition-colors cursor-pointer"
            >
              Browse gas shops first →
            </button>

            <button
              type="button"
              onClick={onOpenEmailLogin}
              className="text-xs font-semibold text-[#6B7280] hover:text-[#226946] transition-colors cursor-pointer"
            >
              Use email login
            </button>
          </div>
        </div>
      </main>

      {/* Quiet Terms & Privacy Footer */}
      <footer className="w-full max-w-5xl mx-auto px-5 py-4 text-center sm:text-left text-[11px] text-[#6B7280] flex flex-wrap items-center justify-center sm:justify-between gap-2 border-t border-neutral-100">
        <p>
          By continuing, you agree to Ooh Gas{' '}
          <button
            type="button"
            onClick={() => setLegalDialog('terms')}
            className="text-[#226946] font-semibold hover:underline cursor-pointer"
          >
            Terms of Service
          </button>{' '}
          and{' '}
          <button
            type="button"
            onClick={() => setLegalDialog('privacy')}
            className="text-[#226946] font-semibold hover:underline cursor-pointer"
          >
            Privacy Policy
          </button>
          .
        </p>
      </footer>

      {/* Compact Legal Summary Modal */}
      {legalDialog && (
        <div
          onClick={() => setLegalDialog(null)}
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          role="presentation"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 space-y-4 text-left shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label={legalDialog === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold text-[#15191C]">
                {legalDialog === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
              </h2>
              <button
                type="button"
                onClick={() => setLegalDialog(null)}
                className="w-9 h-9 rounded-full bg-[#F6F7F8] hover:bg-neutral-200 flex items-center justify-center cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-[#15191C]" />
              </button>
            </div>

            {legalDialog === 'terms' ? (
              <div className="text-xs sm:text-sm text-[#6B7280] space-y-2.5 leading-relaxed">
                <p>
                  Ooh Gas connects households and businesses in Kenya with EPRA-licensed LPG gas depots for on-demand doorstep refills and cylinder exchanges.
                </p>
                <p>
                  Riders verify cylinder seals and digital scale weight at delivery prior to order completion. Orders are linked securely to your verified phone number.
                </p>
              </div>
            ) : (
              <div className="text-xs sm:text-sm text-[#6B7280] space-y-2.5 leading-relaxed">
                <p>
                  Your phone number is used for one-time SMS verification, rider arrival calls, and M-Pesa STK payment prompts.
                </p>
                <p>
                  Your saved delivery locations and order history are protected by strict user-isolated access rules and are only shared with your assigned depot and rider during active delivery.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setLegalDialog(null)}
              className="w-full min-h-[46px] py-3 rounded-2xl bg-[#226946] hover:bg-[#195136] text-white font-bold text-sm cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
