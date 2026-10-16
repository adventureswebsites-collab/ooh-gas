import React, { useState } from 'react';
import {
  signUpCustomer,
  CustomerAuthSession,
} from '../../services/customerAuthService';
import {
  User,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  ArrowLeft,
  Sparkles,
  KeyRound,
  Check,
} from 'lucide-react';
import { OohGasLogo } from '../BrandIdentities';

interface SignUpPageProps {
  onBackToHome: () => void;
  onNavigateToSignIn: () => void;
  redirectReason?: string | null;
  onSuccess: (session: CustomerAuthSession) => void;
}

export const SignUpPage: React.FC<SignUpPageProps> = ({
  onBackToHome,
  onNavigateToSignIn,
  redirectReason,
  onSuccess,
}) => {
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Password validation indicators
  const hasMinLength = password.length >= 6;
  const hasLettersAndNumbers = /[a-zA-Z]/.test(password) && /[0-9]/.test(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    if (!agreeTerms) {
      setErrorMessage('Please accept the Ooh Gas Terms of Service and Privacy Policy to register.');
      return;
    }

    setIsLoading(true);

    try {
      const session = await signUpCustomer({
        fullName,
        phoneNumber,
        email,
        password,
      });

      setSuccessMessage(
        `Account created successfully! Welcome to Ooh Gas, ${session.user.fullName}.`
      );
      setTimeout(() => {
        onSuccess(session);
      }, 500);
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Failed to create your customer account. Please check your information and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto py-4 sm:py-6 px-3 min-[360px]:px-4 animate-in fade-in duration-200 text-left">
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#14532d] hover:underline cursor-pointer min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Marketplace</span>
        </button>

        <span className="text-[10px] font-bold text-[#14532d] bg-[#f0fdf4] border border-[#bbf7d0] px-2.5 py-1 rounded-md tracking-wider uppercase">
          New Customer
        </span>
      </div>

      {/* Main Registration Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 sm:p-6 space-y-4">
        {/* Brand Header */}
        <div className="text-center space-y-2 pb-2 border-b border-slate-100">
          <div className="flex justify-center">
            <OohGasLogo />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Create Your Account
          </h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Join thousands of Nairobi households ordering authentic, weighed LPG cylinders directly to their door.
          </p>
        </div>

        {/* Redirect Notice Banner (if redirected from checkout) */}
        {redirectReason && (
          <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-3 flex items-start gap-2.5 text-xs text-[#14532d] animate-in fade-in">
            <ShieldCheck className="w-4 h-4 text-[#166534] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Complete Your Order</p>
              <p className="text-[11px] text-[#166534] mt-0.5">{redirectReason}</p>
            </div>
          </div>
        )}

        {/* Error Feedback */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5 animate-in shake">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block mb-0.5">Registration Error</span>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Success Feedback */}
        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        {/* Sign Up Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Full Name
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Wangari Mwangi"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:border-[#166534] focus:ring-2 focus:ring-[#bbf7d0] text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 transition-all outline-hidden"
              />
            </div>
          </div>

          {/* Mobile Phone Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Kenyan Mobile Phone
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4" />
              </span>
              <input
                type="tel"
                required
                autoComplete="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. 0712 345 678"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:border-[#166534] focus:ring-2 focus:ring-[#bbf7d0] text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 transition-all outline-hidden"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Used for delivery rider arrival calls, M-Pesa STK prompts, and delivery OTP verification
            </p>
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. wangari.mwangi@gmail.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:border-[#166534] focus:ring-2 focus:ring-[#bbf7d0] text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 transition-all outline-hidden"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              For electronic invoices, delivery receipts, and secure password recovery
            </p>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Password (min. 6 characters)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 focus:border-[#166534] focus:ring-2 focus:ring-[#bbf7d0] text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 transition-all outline-hidden"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password quality cues */}
            {password.length > 0 && (
              <div className="flex items-center gap-3 mt-1.5 text-[10px]">
                <span className={`flex items-center gap-1 ${hasMinLength ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                  <Check className="w-3 h-3" /> 6+ characters
                </span>
                <span className={`flex items-center gap-1 ${hasLettersAndNumbers ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                  <Check className="w-3 h-3" /> Letters & numbers
                </span>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:border-[#166534] focus:ring-2 focus:ring-[#bbf7d0] text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 transition-all outline-hidden"
              />
            </div>
          </div>

          {/* Terms Agreement */}
          <div className="flex items-start gap-2 pt-1">
            <input
              type="checkbox"
              id="agree-terms"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-0.5 rounded-md border-slate-300 text-[#14532d] focus:ring-[#86efac] cursor-pointer"
            />
            <label htmlFor="agree-terms" className="text-[11px] text-slate-600 leading-tight">
              I agree to the Ooh Gas Terms of Service and acknowledge doorstep weight scale calibration and tamper-seal verification policies.
            </label>
          </div>

          {/* Unique Customer ID & RLS Explanation Card */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-[#166534] shrink-0 mt-0.5" />
            <span>
              Your registration creates a unique customer ID in Supabase Auth. Your orders, delivery addresses, and driver tracking updates are strictly isolated by Row-Level Security (RLS).
            </span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full min-h-[46px] py-3 px-4 rounded-xl bg-[#14532d] hover:bg-[#166534] active:bg-[#0f3d21] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-lime-300" />
                <span>Creating Your Account...</span>
              </>
            ) : (
              <>
                <span>Create Customer Account</span>
                <ArrowRight className="w-4 h-4 text-lime-300 stroke-[2.5]" />
              </>
            )}
          </button>
        </form>

        {/* Switch to Sign In */}
        <div className="pt-2 border-t border-slate-100 text-center text-xs text-slate-600">
          <span>Already have an Ooh Gas account? </span>
          <button
            type="button"
            onClick={onNavigateToSignIn}
            className="font-bold text-[#14532d] hover:underline cursor-pointer"
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
};
