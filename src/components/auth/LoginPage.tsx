import React, { useState } from 'react';
import { OohGasLogo } from '../BrandIdentities';
import signupHeroImg from '../../assets/images/oohgas_signup_hero_1794927505943.jpg';
import {
  CustomerAuthSession,
  OtpRequestResult,
  getRememberedLoginPhone,
  isValidKenyanPhone,
  signInWithGoogleCustomer,
  signInWithPhonePassword,
} from '../../services/customerAuthService';
import { NairobiLocation } from '../../types';
import { KenyaFlagBadge, PhoneAuthFlow } from './PhoneAuthFlow';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ShieldCheck,
  X,
} from 'lucide-react';

interface LoginPageProps {
  onBackToHome: () => void;
  onNavigateToSignUp?: () => void;
  onNavigateToPasswordReset: () => void;
  redirectReason?: string | null;
  initialOtpData?: OtpRequestResult | null;
  initialLocation?: NairobiLocation;
  initialEmailMode?: boolean;
  onSuccess: (session: CustomerAuthSession, updatedLocation?: NairobiLocation) => void;
}

interface LoginFieldErrors {
  phoneNumber?: string;
  password?: string;
}

const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
    />
  </svg>
);

export const LoginPage: React.FC<LoginPageProps> = ({
  onBackToHome,
  onNavigateToSignUp,
  onNavigateToPasswordReset,
  redirectReason,
  initialOtpData = null,
  initialLocation,
  onSuccess,
}) => {
  // Preserve direct Phone OTP continuation when navigated from WelcomeScreen OTP button
  if (initialOtpData) {
    return (
      <PhoneAuthFlow
        initialStep="otp"
        initialOtpData={initialOtpData}
        initialLocation={initialLocation}
        redirectReason={redirectReason}
        onBackToHome={onBackToHome}
        onBrowseAsGuest={onBackToHome}
        onNavigateToSignUp={onNavigateToSignUp}
        onNavigateToPasswordReset={onNavigateToPasswordReset}
        onSuccess={onSuccess}
      />
    );
  }

  const [phoneNumber, setPhoneNumber] = useState(() => getRememberedLoginPhone());
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Interactive Google Account Picker Modal (when external OAuth redirect keys aren't configured)
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [googleFullName, setGoogleFullName] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleModalError, setGoogleModalError] = useState<string | null>(null);

  const validateFields = (): LoginFieldErrors => {
    const errors: LoginFieldErrors = {};
    if (!isValidKenyanPhone(phoneNumber)) {
      errors.phoneNumber = 'Enter a valid Kenyan phone number (e.g. 712 345 678).';
    }
    if (password.length < 6) {
      errors.password = 'Enter your password (at least 6 characters).';
    }
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const errors = validateFields();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const session = await signInWithPhonePassword({
        phoneNumber: phoneNumber.trim(),
        password,
        rememberMe,
      });
      onSuccess(session);
    } catch (err: any) {
      setFormError(err.message || 'Could not sign in. Please check your phone number and password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignInClick = async () => {
    setFormError(null);
    setGoogleModalError(null);
    setIsGoogleLoading(true);
    try {
      const result = await signInWithGoogleCustomer();
      if (result.session) {
        onSuccess(result.session);
        return;
      }
      if (result.requiresAccountSelection) {
        setIsGoogleModalOpen(true);
      }
    } catch (err: any) {
      setFormError(err.message || 'Could not start Google sign in. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleCompleteGoogleSignIn = async (profile: { fullName: string; email: string }) => {
    setGoogleModalError(null);
    setIsGoogleLoading(true);
    try {
      const result = await signInWithGoogleCustomer(profile);
      if (result.session) {
        setIsGoogleModalOpen(false);
        onSuccess(result.session);
      }
    } catch (err: any) {
      setGoogleModalError(err.message || 'Google authentication failed. Please check your email.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-gradient-to-b from-[#F4FBF6] via-[#EFF9F2] to-[#F7FCF8] text-[#15191C] font-['Plus_Jakarta_Sans',sans-serif] flex flex-col">
      {/* Soft Abstract Green & White Curved Background Shapes matching registration page */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <svg
          viewBox="0 0 600 600"
          className="absolute -top-24 -right-28 w-[420px] h-[420px] sm:w-[560px] sm:h-[560px] text-[#D7F0DF]/80"
          fill="currentColor"
        >
          <path d="M472.6,64.2C539.7,125.9,582.5,221.4,565.9,308.1C549.3,394.8,473.2,472.7,384.6,506.9C296,541.1,194.8,531.6,120.7,479.8C46.5,428,-0.6,333.9,14.8,247.3C30.2,160.7,108,81.6,198.4,42.3C288.9,3,405.5,2.5,472.6,64.2Z" />
        </svg>

        <div className="absolute -top-16 -left-24 w-72 h-72 rounded-full bg-white/75 blur-2xl" />

        <svg
          viewBox="0 0 400 400"
          className="absolute -bottom-24 -left-24 w-72 h-72 sm:w-96 sm:h-96 text-[#CBEAD5]/70"
          fill="currentColor"
        >
          <path d="M316.2,69.5C361.9,117.6,374.1,197.4,347.9,264.6C321.7,331.8,257.1,386.4,185.1,388.3C113.1,390.1,33.7,339.2,13.1,269.8C-7.6,200.4,30.6,112.5,91.1,64.8C151.7,17,270.5,21.4,316.2,69.5Z" />
        </svg>

        <svg
          viewBox="0 0 400 400"
          className="absolute -bottom-28 -right-20 w-80 h-80 sm:w-[420px] sm:h-[420px] text-[#C8E9D3]/75"
          fill="currentColor"
        >
          <path d="M337.1,88.9C386.4,145.6,389.6,238.1,346.6,301.2C303.6,364.2,214.4,397.8,136.4,377.7C58.4,357.6,-8.4,283.8,3.6,209.6C15.5,135.4,106.2,60.7,187.4,41.6C268.6,22.4,287.8,32.2,337.1,88.9Z" />
        </svg>
      </div>

      {/* Main Responsive Shell */}
      <div className="relative z-10 flex-1 w-full max-w-[460px] lg:max-w-5xl mx-auto px-4 sm:px-6 pt-5 pb-8 sm:py-8 flex flex-col justify-center">
        <div className="lg:grid lg:grid-cols-12 lg:gap-10 lg:items-center">
          {/* ============================================================== */}
          {/* HERO SECTION (Top on mobile overlapping card; Left on desktop) */}
          {/* ============================================================== */}
          <div className="lg:col-span-6 relative">
            {/* Top Bar: Ooh Gas Logo + Browse link */}
            <div className="flex items-center justify-between gap-3 mb-3 sm:mb-5 px-1">
              <button
                type="button"
                onClick={onBackToHome}
                className="cursor-pointer focus:outline-hidden"
                aria-label="Ooh Gas Home"
              >
                <OohGasLogo />
              </button>

              <button
                type="button"
                onClick={onBackToHome}
                className="text-xs font-bold text-[#0E8A45] hover:text-[#0B6F37] bg-white/80 hover:bg-white border border-[#0E8A45]/15 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
              >
                Browse gas shops
              </button>
            </div>

            {/* Mobile/Tablet Hero Banner (Welcome Back! left + Cylinder & Rider right) */}
            <div className="relative min-h-[200px] sm:min-h-[230px] lg:min-h-0 pb-10 sm:pb-12 lg:pb-0 flex items-center lg:block overflow-hidden lg:overflow-visible rounded-3xl lg:rounded-none">
              <div className="lg:hidden absolute inset-y-0 right-0 w-[68%] sm:w-[64%] pointer-events-none select-none">
                <img
                  src={signupHeroImg}
                  alt="Green Ooh Gas LPG cylinder and motorcycle delivery rider"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-right scale-[1.06]"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#F2FAF4] via-[#F2FAF4]/65 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#EFF9F2]/75 to-transparent" />
              </div>

              <div className="relative z-10 max-w-[58%] sm:max-w-[56%] lg:max-w-md pl-1 pt-2 lg:pt-0">
                <h1 className="text-[30px] sm:text-[36px] lg:text-[42px] font-extrabold text-[#15191C] tracking-tight leading-[1.06]">
                  Welcome
                  <br className="lg:hidden" /> Back!
                </h1>

                <p className="mt-2.5 text-[13.5px] sm:text-[15px] lg:text-base font-medium text-[#374151] leading-snug max-w-[230px] sm:max-w-xs">
                  Sign in to continue ordering your gas.
                </p>

                {/* Hand-drawn green curved underline accent */}
                <svg
                  viewBox="0 0 180 14"
                  className="w-32 sm:w-40 h-3 mt-1.5 text-[#34C759]"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M3 10.5C45 3.5 112 2.5 176 7.5"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              {/* Desktop Hero Visual Card */}
              <div className="hidden lg:block mt-6 rounded-[28px] overflow-hidden border border-white/80 shadow-[0_14px_40px_rgba(14,138,69,0.1)] bg-white/70">
                <img
                  src={signupHeroImg}
                  alt="Ooh Gas green LPG cylinder and motorcycle delivery courier"
                  referrerPolicy="no-referrer"
                  className="w-full h-[300px] object-cover object-center"
                />
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* OVERLAPPING WHITE ROUNDED LOGIN CARD                           */}
          {/* ============================================================== */}
          <div className="lg:col-span-6 -mt-9 sm:-mt-10 lg:mt-0 relative z-20">
            <div className="bg-white rounded-[32px] shadow-[0_14px_44px_rgba(15,23,42,0.08)] border border-neutral-100/90 px-5 py-6 sm:px-7 sm:py-7 space-y-4">
              {/* Optional Checkout Redirect Notice */}
              {redirectReason && (
                <div className="bg-[#EDF8F1] border border-[#0E8A45]/20 rounded-2xl px-3.5 py-2.5 flex items-start gap-2.5 text-xs text-[#14532D]">
                  <ShieldCheck className="w-4 h-4 text-[#0E8A45] shrink-0 mt-0.5" />
                  <span>{redirectReason}</span>
                </div>
              )}

              {/* Form / Backend Error */}
              {formError && (
                <div
                  role="alert"
                  className="bg-rose-50 border border-rose-200 rounded-2xl px-3.5 py-2.5 flex items-start gap-2.5 text-xs text-rose-700 animate-in fade-in duration-150"
                >
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Sign in with Google Button */}
              <button
                type="button"
                onClick={handleGoogleSignInClick}
                disabled={isGoogleLoading || isSubmitting}
                className="w-full min-h-[52px] px-5 rounded-full border border-neutral-200 bg-white hover:bg-neutral-50 active:scale-[0.99] transition-all flex items-center justify-center gap-3 text-[15px] font-bold text-[#15191C] shadow-2xs cursor-pointer disabled:opacity-60"
              >
                {isGoogleLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#0E8A45]" />
                    <span>Connecting to Google...</span>
                  </>
                ) : (
                  <>
                    <GoogleIcon className="w-5 h-5 shrink-0" />
                    <span>Sign in with Google</span>
                  </>
                )}
              </button>

              {/* Hairline "or" Divider */}
              <div className="flex items-center gap-3.5 py-0.5">
                <div className="h-px bg-neutral-200/80 flex-1" />
                <span className="text-xs font-semibold text-[#6B7280]">or</span>
                <div className="h-px bg-neutral-200/80 flex-1" />
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
                {/* Kenyan Phone Number (+254) */}
                <div>
                  <label
                    htmlFor="login-phone-number"
                    className="block text-[13px] font-bold text-[#15191C] mb-1.5 pl-1"
                  >
                    Phone Number
                  </label>
                  <div
                    className={`flex items-center rounded-full bg-[#F3F5F7] border transition-all overflow-hidden ${
                      fieldErrors.phoneNumber
                        ? 'border-rose-400 bg-rose-50/40'
                        : 'border-transparent focus-within:border-[#0E8A45] focus-within:bg-white'
                    }`}
                  >
                    <div className="pl-4 pr-3 py-3 border-r border-neutral-200/90 flex items-center shrink-0">
                      <KenyaFlagBadge className="tabular-nums" />
                    </div>
                    <input
                      id="login-phone-number"
                      type="tel"
                      name="phoneNumber"
                      inputMode="tel"
                      autoComplete="tel-national"
                      required
                      value={phoneNumber}
                      onChange={(e) => {
                        setPhoneNumber(e.target.value);
                        if (fieldErrors.phoneNumber) {
                          setFieldErrors((prev) => ({ ...prev, phoneNumber: undefined }));
                        }
                      }}
                      placeholder="Enter your phone number"
                      className="w-full min-h-[50px] px-3.5 bg-transparent text-[14.5px] font-medium text-[#15191C] placeholder:text-[#6B7280] outline-hidden tabular-nums"
                    />
                  </div>
                  {fieldErrors.phoneNumber && (
                    <p className="text-[11px] font-medium text-rose-600 mt-1 pl-4">
                      {fieldErrors.phoneNumber}
                    </p>
                  )}
                </div>

                {/* Password Pill with Show/Hide Password Button */}
                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-[13px] font-bold text-[#15191C] mb-1.5 pl-1"
                  >
                    Password
                  </label>
                  <div
                    className={`flex items-stretch rounded-full bg-[#F3F5F7] border transition-all overflow-hidden ${
                      fieldErrors.password
                        ? 'border-rose-400 bg-rose-50/40'
                        : 'border-transparent focus-within:border-[#0E8A45] focus-within:bg-white'
                    }`}
                  >
                    <div className="flex items-center flex-1 pl-4">
                      <Lock className="w-[18px] h-[18px] text-[#4B5563] shrink-0" />
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (fieldErrors.password) {
                            setFieldErrors((prev) => ({ ...prev, password: undefined }));
                          }
                        }}
                        placeholder="Enter your password"
                        className="w-full min-h-[50px] px-3 bg-transparent text-[14.5px] font-medium text-[#15191C] placeholder:text-[#6B7280] outline-hidden"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="min-w-[48px] min-h-[44px] pr-1 flex items-center justify-center text-[#374151] hover:text-[#15191C] transition-colors cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="w-[18px] h-[18px]" />
                      ) : (
                        <Eye className="w-[18px] h-[18px]" />
                      )}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="text-[11px] font-medium text-rose-600 mt-1 pl-4">
                      {fieldErrors.password}
                    </p>
                  )}
                </div>

                {/* Remember Me Checkbox + Forgot Password Link */}
                <div className="flex items-center justify-between gap-3 pt-0.5">
                  <label className="inline-flex items-center gap-2.5 min-h-[44px] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                        rememberMe
                          ? 'bg-[#0E8A45] border-[#0E8A45] text-white'
                          : 'bg-white border-neutral-300 text-transparent'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </span>
                    <span className="text-[13px] font-medium text-[#15191C]">Remember me</span>
                  </label>

                  <button
                    type="button"
                    onClick={onNavigateToPasswordReset}
                    className="min-h-[44px] px-1 text-[13px] font-semibold text-[#0E8A45] underline underline-offset-4 hover:text-[#0A6934] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Large Green Sign In CTA */}
                <div className="pt-0.5">
                  <button
                    type="submit"
                    disabled={isSubmitting || isGoogleLoading}
                    className="w-full min-h-[54px] px-6 rounded-full bg-gradient-to-r from-[#0E8A45] to-[#1BB954] hover:from-[#0C753B] hover:to-[#16A34A] active:scale-[0.99] text-white font-bold text-[15.5px] shadow-[0_8px_22px_rgba(14,138,69,0.28)] transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Footer Divider & Create Account Link */}
              <div className="border-t border-neutral-100 pt-4 text-center">
                <p className="text-[13px] text-[#4B5563]">
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => (onNavigateToSignUp ? onNavigateToSignUp() : onBackToHome())}
                    className="font-bold text-[#0E8A45] underline underline-offset-4 hover:text-[#0A6934] cursor-pointer ml-1"
                  >
                    Create account
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* INTERACTIVE GOOGLE ACCOUNT PICKER MODAL                            */}
      {/* ================================================================== */}
      {isGoogleModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="google-signin-title"
        >
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-neutral-200/80 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <GoogleIcon className="w-5 h-5" />
                <h2 id="google-signin-title" className="text-base font-extrabold text-[#15191C]">
                  Sign in with Google
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsGoogleModalOpen(false)}
                aria-label="Close Google sign in"
                className="w-9 h-9 rounded-full hover:bg-neutral-100 flex items-center justify-center text-[#6B7280] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#6B7280] leading-relaxed">
              Choose a Google account or enter your Google details to sign in to Ooh Gas.
            </p>

            {googleModalError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{googleModalError}</span>
              </div>
            )}

            <button
              type="button"
              disabled={isGoogleLoading}
              onClick={() =>
                handleCompleteGoogleSignIn({
                  fullName: 'Wangari Mwangi',
                  email: 'wangari.mwangi@gmail.com',
                })
              }
              className="w-full p-3 rounded-2xl border border-neutral-200 hover:border-[#0E8A45] hover:bg-[#F5FBF7] transition-all flex items-center justify-between gap-3 text-left cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-[#0E8A45] text-white font-bold text-sm flex items-center justify-center shrink-0">
                  W
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#15191C] truncate">Wangari Mwangi</p>
                  <p className="text-xs text-[#6B7280] truncate">wangari.mwangi@gmail.com</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#0E8A45] shrink-0" />
            </button>

            <div className="flex items-center gap-3 text-[11px] text-[#9CA3AF]">
              <div className="h-px bg-neutral-200 flex-1" />
              <span>or use another Google account</span>
              <div className="h-px bg-neutral-200 flex-1" />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCompleteGoogleSignIn({
                  fullName: googleFullName,
                  email: googleEmail,
                });
              }}
              className="space-y-3"
            >
              <input
                type="text"
                required
                value={googleFullName}
                onChange={(e) => setGoogleFullName(e.target.value)}
                placeholder="Full Name (e.g. Brian Kamau)"
                className="w-full px-4 py-3 rounded-full bg-[#F3F5F7] border border-transparent focus:border-[#0E8A45] focus:bg-white text-sm text-[#15191C] outline-hidden"
              />
              <input
                type="email"
                required
                value={googleEmail}
                onChange={(e) => setGoogleEmail(e.target.value)}
                placeholder="Google Email (e.g. brian@gmail.com)"
                className="w-full px-4 py-3 rounded-full bg-[#F3F5F7] border border-transparent focus:border-[#0E8A45] focus:bg-white text-sm text-[#15191C] outline-hidden"
              />
              <button
                type="submit"
                disabled={isGoogleLoading}
                className="w-full min-h-[46px] rounded-full bg-[#0E8A45] hover:bg-[#0B7138] text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isGoogleLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Continue with Google</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
