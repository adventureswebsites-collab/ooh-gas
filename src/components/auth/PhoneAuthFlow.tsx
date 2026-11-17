import React, { useState, useEffect, useRef } from 'react';
import {
  CustomerAuthSession,
  OtpRequestResult,
  requestPhoneOtp,
  verifyPhoneOtp,
  completePhoneRegistration,
  signInCustomer,
  loginWithDemoAccount,
  saveCustomerAddress,
  isValidKenyanPhone,
  normalizeKenyanPhone,
} from '../../services/customerAuthService';
import { reverseGeocode } from '../../services/mapboxService';
import { checkDeliveryCoverage } from '../../services/deliveryZoneService';
import { MOCK_SUPPLIERS, NAIROBI_LOCATIONS } from '../../data/mockData';
import { CoverageCheckResult, NairobiLocation } from '../../types';
import { MapboxDeliveryMap } from '../map/MapboxDeliveryMap';
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LocateFixed,
  Mail,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';

export type PhoneAuthStep = 'phone' | 'otp' | 'register' | 'location' | 'email_password';

interface PhoneAuthFlowProps {
  initialStep?: PhoneAuthStep;
  initialOtpData?: OtpRequestResult | null;
  initialLocation?: NairobiLocation;
  redirectReason?: string | null;
  onBackToHome: () => void;
  onBrowseAsGuest?: () => void;
  onNavigateToSignUp?: () => void;
  onNavigateToPasswordReset?: () => void;
  onSuccess: (session: CustomerAuthSession, updatedLocation?: NairobiLocation) => void;
  compactModal?: boolean;
}

export const KenyaFlagBadge: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span
    className={`inline-flex items-center gap-1.5 font-bold text-[#15191C] select-none shrink-0 ${className}`}
  >
    <svg
      width="20"
      height="14"
      viewBox="0 0 24 16"
      fill="none"
      aria-hidden="true"
      className="rounded-[2px] border border-neutral-200 shrink-0"
    >
      <rect width="24" height="4.5" fill="#111111" />
      <rect y="4.5" width="24" height="1" fill="#FFFFFF" />
      <rect y="5.5" width="24" height="5" fill="#BB1E10" />
      <rect y="10.5" width="24" height="1" fill="#FFFFFF" />
      <rect y="11.5" width="24" height="4.5" fill="#186A3B" />
      <ellipse cx="12" cy="8" rx="2.3" ry="4" fill="#991B1B" stroke="#FFFFFF" strokeWidth="0.6" />
    </svg>
    <span className="text-sm tabular-nums">+254</span>
  </span>
);

export const PhoneAuthFlow: React.FC<PhoneAuthFlowProps> = ({
  initialStep = 'phone',
  initialOtpData = null,
  initialLocation = NAIROBI_LOCATIONS[0],
  redirectReason,
  onBackToHome,
  onBrowseAsGuest,
  onNavigateToSignUp,
  onNavigateToPasswordReset,
  onSuccess,
  compactModal = false,
}) => {
  const [step, setStep] = useState<PhoneAuthStep>(initialOtpData ? 'otp' : initialStep);

  // Step 1: Phone Input
  const [phoneInput, setPhoneInput] = useState(() =>
    initialOtpData ? initialOtpData.normalizedPhone.replace(/^\+254\s*/, '') : ''
  );

  // Step 2: OTP State
  const [otpMeta, setOtpMeta] = useState<OtpRequestResult | null>(initialOtpData);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resendSeconds, setResendSeconds] = useState<number>(
    initialOtpData ? initialOtpData.resendCooldownSeconds : 0
  );
  const [otpResentNotice, setOtpResentNotice] = useState(false);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Step 3: Registration State
  const [verificationToken, setVerificationToken] = useState<string>('');
  const [verifiedPhone, setVerifiedPhone] = useState<string>(
    initialOtpData?.normalizedPhone || ''
  );
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [registeredSession, setRegisteredSession] = useState<CustomerAuthSession | null>(null);

  // Step 4: Post-Registration Delivery Location State
  const [chosenLocation, setChosenLocation] = useState<NairobiLocation>(initialLocation);
  const [coverageResult, setCoverageResult] = useState<CoverageCheckResult | null>(null);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [addressLabel, setAddressLabel] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [streetAddress, setStreetAddress] = useState(initialLocation.name);
  const [buildingName, setBuildingName] = useState('');
  const [unitNumber, setUnitNumber] = useState('');

  // Email/Password Fallback State (for returning email users)
  const [emailIdentifier, setEmailIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // General UI Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialOtpData) {
      setOtpMeta(initialOtpData);
      setPhoneInput(initialOtpData.normalizedPhone.replace(/^\+254\s*/, ''));
      setVerifiedPhone(initialOtpData.normalizedPhone);
      setResendSeconds(initialOtpData.resendCooldownSeconds);
      setStep('otp');
    }
  }, [initialOtpData]);

  // Countdown timer for Resend OTP
  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = setInterval(() => {
      setResendSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendSeconds]);

  // Live zone coverage check whenever post-registration location changes
  useEffect(() => {
    if (step !== 'location') return;
    let active = true;
    checkDeliveryCoverage(chosenLocation.coordinates.lat, chosenLocation.coordinates.lng)
      .then((res) => {
        if (active) setCoverageResult(res);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [step, chosenLocation.coordinates.lat, chosenLocation.coordinates.lng]);

  // Auto-focus first OTP box on entering OTP screen
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => otpRefs.current[0]?.focus(), 120);
    }
  }, [step]);

  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setOtpResentNotice(false);

    if (!isValidKenyanPhone(phoneInput)) {
      setErrorMessage('Enter a valid Kenyan mobile number (e.g. 712 345 678).');
      return;
    }

    setIsLoading(true);
    try {
      const result = await requestPhoneOtp(phoneInput);
      setOtpMeta(result);
      setVerifiedPhone(result.normalizedPhone);
      setResendSeconds(result.resendCooldownSeconds);
      setOtpDigits(['', '', '', '', '', '']);
      setStep('otp');
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not send verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendSeconds > 0 || isLoading) return;
    setErrorMessage(null);
    setOtpResentNotice(false);
    setIsLoading(true);
    try {
      const targetPhone = otpMeta?.normalizedPhone || phoneInput;
      const result = await requestPhoneOtp(targetPhone);
      setOtpMeta(result);
      setResendSeconds(result.resendCooldownSeconds);
      setOtpDigits(['', '', '', '', '', '']);
      setOtpResentNotice(true);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setErrorMessage(err.message || 'Please wait a moment before requesting a new code.');
    } finally {
      setIsLoading(false);
    }
  };

  const submitOtpCode = async (code: string) => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const targetPhone = otpMeta?.normalizedPhone || normalizeKenyanPhone(phoneInput);
      const verifyRes = await verifyPhoneOtp({
        phoneNumber: targetPhone,
        otpCode: code,
        channel: otpMeta?.channel || 'server_otp',
      });

      if (verifyRes.isReturningCustomer && verifyRes.session) {
        onSuccess(verifyRes.session);
        return;
      }

      // New customer: automatically advance to Account Registration
      setVerifiedPhone(verifyRes.normalizedPhone);
      setVerificationToken(verifyRes.verificationToken || '');
      setStep('register');
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid verification code. Please check and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpDigitChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '');
    if (!clean) {
      const updated = [...otpDigits];
      updated[index] = '';
      setOtpDigits(updated);
      return;
    }

    // Handle paste / SMS autofill across boxes
    if (clean.length > 1) {
      const chars = clean.slice(0, 6).split('');
      const nextDigits = ['', '', '', '', '', ''];
      chars.forEach((c, i) => {
        nextDigits[i] = c;
      });
      setOtpDigits(nextDigits);
      const nextFocus = Math.min(chars.length, 5);
      otpRefs.current[nextFocus]?.focus();
      if (chars.length === 6) {
        submitOtpCode(nextDigits.join(''));
      }
      return;
    }

    const updated = [...otpDigits];
    updated[index] = clean[0];
    setOtpDigits(updated);
    if (index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    const joined = updated.join('');
    if (joined.length === 6 && !updated.includes('')) {
      submitOtpCode(joined);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const session = await completePhoneRegistration({
        phoneNumber: verifiedPhone || phoneInput,
        verificationToken,
        fullName,
        email,
      });
      setRegisteredSession(session);
      setStep('location');
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not complete registration. Please check your details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDetectGps = () => {
    setErrorMessage(null);
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setErrorMessage('GPS is not supported on this device. Tap the map to drop your pin.');
      return;
    }

    setIsDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        let resolvedName = 'My Pinned Location';
        let resolvedArea = 'Nairobi';
        let resolvedDetails = 'GPS detected location';
        try {
          const geo = await reverseGeocode(lat, lng);
          if (geo) {
            resolvedName = geo.name || resolvedName;
            resolvedArea = geo.area || geo.fullAddress || resolvedArea;
            resolvedDetails = geo.details || resolvedDetails;
          }
        } catch (_) {}

        const newLoc: NairobiLocation = {
          id: `gps-${Date.now()}`,
          name: resolvedName,
          area: resolvedArea,
          details: resolvedDetails,
          coordinates: { lat, lng, x: 50, y: 50 },
        };
        setChosenLocation(newLoc);
        setStreetAddress(resolvedName);
        setIsDetectingGps(false);
      },
      () => {
        setIsDetectingGps(false);
        setErrorMessage('Could not access GPS permission. Search or tap the map to select your location.');
      },
      { enableHighAccuracy: true, timeout: 9000 }
    );
  };

  const handleSaveDeliveryLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registeredSession) return;
    setErrorMessage(null);
    setIsLoading(true);

    const finalStreet = streetAddress.trim() || chosenLocation.name;
    const finalLocation: NairobiLocation = {
      ...chosenLocation,
      name: finalStreet,
      details: buildingName.trim() || chosenLocation.details,
    };

    try {
      await saveCustomerAddress({
        label: addressLabel,
        streetAddress: finalStreet,
        buildingName: buildingName.trim() || undefined,
        houseOrFlatNumber: unitNumber.trim() || undefined,
        location: finalLocation.coordinates,
        isDefault: true,
      });
    } catch (err) {
      console.warn('[PhoneAuthFlow] Address save warning:', err);
    } finally {
      setIsLoading(false);
    }

    onSuccess(registeredSession, finalLocation);
  };

  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const session = await signInCustomer({ identifier: emailIdentifier, password });
      onSuccess(session);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid credentials. Please check your email and password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = () => {
    setErrorMessage(null);
    setIsLoading(true);
    setTimeout(() => {
      const session = loginWithDemoAccount();
      setIsLoading(false);
      onSuccess(session);
    }, 220);
  };

  const containerWidth = step === 'location' ? 'max-w-2xl' : 'max-w-md';

  return (
    <div
      className={`w-full ${containerWidth} mx-auto ${
        compactModal ? '' : 'py-3 sm:py-8 px-1 sm:px-2'
      } animate-in fade-in duration-200 text-left`}
    >
      <div
        className={`${
          compactModal
            ? 'space-y-4'
            : 'bg-white rounded-3xl border border-neutral-200/80 shadow-xs p-5 sm:p-8 space-y-5'
        }`}
      >
        {/* Top Row: Back Navigation */}
        {!compactModal && step !== 'location' && (
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                if (step === 'otp') setStep('phone');
                else if (step === 'register') setStep('otp');
                else if (step === 'email_password') setStep('phone');
                else onBackToHome();
              }}
              className="w-10 h-10 rounded-full hover:bg-[#F6F7F8] text-[#15191C] flex items-center justify-center transition-colors cursor-pointer -ml-2"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {onBrowseAsGuest && (
              <button
                type="button"
                onClick={onBrowseAsGuest}
                className="text-xs font-bold text-[#226946] hover:underline cursor-pointer"
              >
                Browse gas shops
              </button>
            )}
          </div>
        )}

        {/* Checkout / Guard Reason Notice */}
        {redirectReason && step !== 'location' && (
          <div className="bg-[#EDF6F1] border border-[#226946]/20 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-[#195136]">
            <ShieldCheck className="w-4 h-4 text-[#226946] shrink-0 mt-0.5" />
            <span>{redirectReason}</span>
          </div>
        )}

        {/* Error Banner */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ================================================================ */}
        {/* STEP 1: KENYA (+254) PHONE INPUT                                 */}
        {/* ================================================================ */}
        {step === 'phone' && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#15191C] tracking-tight">
                Enter your mobile number
              </h1>
              <p className="text-sm text-[#6B7280]">
                We&apos;ll send a 6-digit SMS verification code to sign you in or create your account.
              </p>
            </div>

            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#15191C]">Phone Number</label>
                <div className="flex items-center rounded-2xl bg-[#F6F7F8] border border-transparent focus-within:border-[#226946] focus-within:bg-white transition-all overflow-hidden">
                  <div className="pl-4 pr-3 py-3.5 border-r border-neutral-200/80">
                    <KenyaFlagBadge />
                  </div>
                  <input
                    type="tel"
                    inputMode="tel"
                    required
                    autoComplete="tel-national"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="712 345 678"
                    className="w-full px-3.5 py-3.5 bg-transparent text-base font-semibold text-[#15191C] placeholder:text-[#9CA3AF] placeholder:font-normal outline-hidden tabular-nums"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full min-h-[52px] py-3.5 px-5 rounded-2xl bg-[#226946] hover:bg-[#195136] text-white font-bold text-sm sm:text-base transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow-xs"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Code...</span>
                  </>
                ) : (
                  <>
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Clean Alternative Options */}
            <div className="pt-1 space-y-2.5">
              <div className="flex items-center gap-3 text-[11px] text-[#9CA3AF]">
                <div className="h-px bg-neutral-200 flex-1" />
                <span>Or</span>
                <div className="h-px bg-neutral-200 flex-1" />
              </div>

              <button
                type="button"
                onClick={handleQuickDemo}
                disabled={isLoading}
                className="w-full min-h-[46px] py-2.5 px-4 rounded-2xl border border-neutral-200 bg-white hover:bg-[#F6F7F8] text-[#15191C] text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-[#226946]" />
                <span>Quick Demo Account (Wangari · 0712 345 678)</span>
              </button>

              <div className="text-center space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setStep('email_password');
                  }}
                  className="text-xs font-semibold text-[#6B7280] hover:text-[#226946] cursor-pointer py-1 block w-full"
                >
                  Sign in with email &amp; password instead
                </button>
                {onNavigateToSignUp && (
                  <button
                    type="button"
                    onClick={onNavigateToSignUp}
                    className="text-xs font-bold text-[#226946] hover:underline cursor-pointer py-1"
                  >
                    New to Ooh Gas? Create an account
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* STEP 2: 6-DIGIT OTP VERIFICATION                                 */}
        {/* ================================================================ */}
        {step === 'otp' && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-200">
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#15191C] tracking-tight">
                Enter verification code
              </h1>
              <p className="text-sm text-[#6B7280] leading-relaxed">
                {otpMeta?.isReturningCustomer && otpMeta.customerFirstName
                  ? `Welcome back, ${otpMeta.customerFirstName}. Enter the 6-digit code sent to `
                  : 'Enter the 6-digit SMS code sent to '}
                <strong className="text-[#15191C] tabular-nums">
                  {otpMeta?.normalizedPhone || normalizeKenyanPhone(phoneInput)}
                </strong>
                .{' '}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setStep('phone');
                  }}
                  className="font-bold text-[#226946] hover:underline cursor-pointer"
                >
                  Change phone number
                </button>
              </p>
            </div>

            {otpResentNotice && (
              <div className="p-3 rounded-2xl bg-[#EDF6F1] text-[#195136] text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#226946] shrink-0" />
                <span>A fresh 6-digit verification code has been sent.</span>
              </div>
            )}

            {/* Sandbox SMS Preview Notice (only displayed when no external SMS gateway is configured) */}
            {otpMeta?.verificationPreviewCode && (
              <div className="p-3.5 rounded-2xl bg-[#F6F7F8] border border-neutral-200/80 flex items-center justify-between gap-3">
                <div className="text-xs">
                  <span className="text-[#6B7280] block">SMS Verification Code</span>
                  <span className="font-extrabold text-[#15191C] text-base tracking-widest tabular-nums">
                    {otpMeta.verificationPreviewCode}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const code = otpMeta.verificationPreviewCode!;
                    setOtpDigits(code.split(''));
                    submitOtpCode(code);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-white border border-neutral-200 hover:border-[#226946] text-xs font-bold text-[#226946] cursor-pointer transition-colors shrink-0"
                >
                  Fill &amp; Verify
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitOtpCode(otpDigits.join(''));
              }}
              className="space-y-4"
            >
              {/* 6 Digit Boxes */}
              <div className="grid grid-cols-6 gap-2 sm:gap-2.5" aria-label="6-digit OTP code">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    aria-label={`Digit ${idx + 1}`}
                    className={`w-full h-13 sm:h-14 text-center text-lg sm:text-xl font-extrabold rounded-2xl border-2 transition-all outline-hidden tabular-nums ${
                      digit
                        ? 'bg-white border-[#226946] text-[#15191C]'
                        : 'bg-[#F6F7F8] border-transparent focus:border-[#226946] focus:bg-white text-[#15191C]'
                    }`}
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={isLoading || otpDigits.join('').length < 6}
                className="w-full min-h-[52px] py-3.5 px-5 rounded-2xl bg-[#226946] hover:bg-[#195136] text-white font-bold text-sm sm:text-base transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>Verify &amp; Continue</span>
                )}
              </button>
            </form>

            {/* Resend OTP Controls */}
            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendSeconds > 0 || isLoading}
                className={`inline-flex items-center gap-1.5 font-bold transition-colors ${
                  resendSeconds > 0
                    ? 'text-[#9CA3AF] cursor-not-allowed'
                    : 'text-[#226946] hover:underline cursor-pointer'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>
                  {resendSeconds > 0 ? `Resend OTP in ${resendSeconds}s` : 'Resend OTP'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setStep('phone');
                }}
                className="font-semibold text-[#6B7280] hover:text-[#15191C] cursor-pointer"
              >
                Use different number
              </button>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* STEP 3: NEW CUSTOMER ACCOUNT REGISTRATION (AUTO AFTER OTP)       */}
        {/* ================================================================ */}
        {step === 'register' && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-200">
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-[#226946] flex items-center gap-1.5 tabular-nums">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Phone verified · {verifiedPhone}</span>
              </p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#15191C] tracking-tight">
                Create your account
              </h1>
              <p className="text-sm text-[#6B7280]">
                Tell us your name so riders can verify your handover when arriving.
              </p>
            </div>

            <form onSubmit={handleCompleteRegistration} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#15191C]">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#9CA3AF] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    autoFocus
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Amina Wanjiku"
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-[#F6F7F8] border border-transparent focus:border-[#226946] focus:bg-white text-sm font-semibold text-[#15191C] placeholder:text-[#9CA3AF] placeholder:font-normal outline-hidden transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#15191C]">
                  Email Address <span className="font-normal text-[#6B7280]">(optional, for receipts)</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#9CA3AF] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="amina@example.com"
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-[#F6F7F8] border border-transparent focus:border-[#226946] focus:bg-white text-sm text-[#15191C] placeholder:text-[#9CA3AF] outline-hidden transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || fullName.trim().length < 2}
                className="w-full min-h-[52px] py-3.5 px-5 rounded-2xl bg-[#226946] hover:bg-[#195136] text-white font-bold text-sm sm:text-base transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Account...</span>
                  </>
                ) : (
                  <>
                    <span>Continue to Delivery Location</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ================================================================ */}
        {/* STEP 4: POST-REGISTRATION DELIVERY LOCATION SETUP                */}
        {/* ================================================================ */}
        {step === 'location' && registeredSession && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-3 duration-200">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-bold text-[#226946]">
                  Welcome, {registeredSession.user.fullName.split(' ')[0]}
                </p>
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#15191C] tracking-tight">
                  Set your delivery location
                </h1>
                <p className="text-xs sm:text-sm text-[#6B7280]">
                  Detect with GPS or tap anywhere on the map to save your delivery address.
                </p>
              </div>
            </div>

            {/* 1-Tap GPS Detect Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDetectGps}
                disabled={isDetectingGps}
                className="flex-1 min-h-[44px] py-2.5 px-4 rounded-2xl bg-[#EDF6F1] hover:bg-[#DFEFE6] text-[#195136] font-bold text-xs sm:text-sm border border-[#226946]/20 transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isDetectingGps ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#226946]" />
                    <span>Detecting GPS Location...</span>
                  </>
                ) : (
                  <>
                    <LocateFixed className="w-4 h-4 text-[#226946]" />
                    <span>Detect My Current GPS Location</span>
                  </>
                )}
              </button>
            </div>

            {/* Interactive Map Pin Selector */}
            <div className="rounded-2xl overflow-hidden border border-neutral-200/80">
              <MapboxDeliveryMap
                currentLocation={chosenLocation}
                suppliers={MOCK_SUPPLIERS}
                coverageResult={coverageResult}
                onSelectLocation={(loc) => {
                  setChosenLocation(loc);
                  setStreetAddress(loc.name);
                }}
                heightClassName="h-[220px] sm:h-[260px]"
              />
            </div>

            {/* Live Zone Feedback Line */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-[#15191C] min-w-0 truncate">
                <MapPin className="w-4 h-4 text-[#226946] shrink-0" />
                <span className="truncate">
                  {coverageResult?.isCovered && coverageResult.primaryZone
                    ? `${coverageResult.primaryZone.name} · Doorstep delivery active`
                    : `${chosenLocation.name} (${chosenLocation.area})`}
                </span>
              </span>
              <span className="text-[11px] font-mono text-[#6B7280] tabular-nums shrink-0">
                {chosenLocation.coordinates.lat.toFixed(4)}, {chosenLocation.coordinates.lng.toFixed(4)}
              </span>
            </div>

            {/* Save Delivery Address Form */}
            <form onSubmit={handleSaveDeliveryLocation} className="space-y-3 pt-1">
              <div className="flex items-center gap-1.5">
                {(['Home', 'Work', 'Other'] as const).map((lbl) => (
                  <button
                    key={lbl}
                    type="button"
                    onClick={() => setAddressLabel(lbl)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                      addressLabel === lbl
                        ? 'bg-[#226946] text-white'
                        : 'bg-[#F6F7F8] text-[#6B7280] hover:text-[#15191C]'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#15191C]">Area / Street Address</label>
                <input
                  type="text"
                  required
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="e.g. Argwings Kodhek Rd, Kilimani"
                  className="w-full px-4 py-3 rounded-2xl bg-[#F6F7F8] border border-transparent focus:border-[#226946] focus:bg-white text-sm text-[#15191C] outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  value={buildingName}
                  onChange={(e) => setBuildingName(e.target.value)}
                  placeholder="Building / Estate (optional)"
                  className="w-full px-4 py-3 rounded-2xl bg-[#F6F7F8] border border-transparent focus:border-[#226946] focus:bg-white text-sm text-[#15191C] outline-hidden"
                />
                <input
                  type="text"
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(e.target.value)}
                  placeholder="House / Gate # (optional)"
                  className="w-full px-4 py-3 rounded-2xl bg-[#F6F7F8] border border-transparent focus:border-[#226946] focus:bg-white text-sm text-[#15191C] outline-hidden"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full min-h-[52px] py-3.5 px-5 rounded-2xl bg-[#226946] hover:bg-[#195136] text-white font-bold text-sm sm:text-base transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Address...</span>
                  </>
                ) : (
                  <>
                    <span>Save Address &amp; Go to Home Map</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => onSuccess(registeredSession, chosenLocation)}
                  className="text-xs font-semibold text-[#6B7280] hover:text-[#15191C] cursor-pointer py-1"
                >
                  Skip for now
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ================================================================ */}
        {/* OPTIONAL FALLBACK: EMAIL & PASSWORD SIGN IN                      */}
        {/* ================================================================ */}
        {step === 'email_password' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="space-y-1">
              <h1 className="text-2xl font-extrabold text-[#15191C] tracking-tight">
                Sign in with email
              </h1>
              <p className="text-sm text-[#6B7280]">
                Prefer password login? Enter your registered email or phone number.
              </p>
            </div>

            <form onSubmit={handleEmailPasswordLogin} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#15191C]">Email or Phone</label>
                <input
                  type="text"
                  required
                  value={emailIdentifier}
                  onChange={(e) => setEmailIdentifier(e.target.value)}
                  placeholder="wangari.mwangi@gmail.com"
                  className="w-full px-4 py-3.5 rounded-2xl bg-[#F6F7F8] border border-transparent focus:border-[#226946] focus:bg-white text-sm text-[#15191C] outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#15191C]">Password</label>
                  {onNavigateToPasswordReset && (
                    <button
                      type="button"
                      onClick={onNavigateToPasswordReset}
                      className="text-xs font-bold text-[#226946] hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    className="w-full px-4 py-3.5 pr-11 rounded-2xl bg-[#F6F7F8] border border-transparent focus:border-[#226946] focus:bg-white text-sm text-[#15191C] outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#6B7280] cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full min-h-[50px] py-3.5 px-5 rounded-2xl bg-[#226946] hover:bg-[#195136] text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>

            <div className="text-center space-y-1.5">
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setStep('phone');
                }}
                className="text-xs font-bold text-[#226946] hover:underline cursor-pointer block w-full"
              >
                Use mobile number &amp; OTP instead
              </button>
              {onNavigateToSignUp && (
                <button
                  type="button"
                  onClick={onNavigateToSignUp}
                  className="text-xs font-semibold text-[#6B7280] hover:text-[#226946] cursor-pointer"
                >
                  Don&apos;t have an account? <span className="font-bold text-[#226946] underline">Create an account</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
