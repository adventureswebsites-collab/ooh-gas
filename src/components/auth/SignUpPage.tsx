import React, { useState } from 'react';
import {
  signUpCustomer,
  CustomerAuthSession,
} from '../../services/customerAuthService';
import {
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ShieldCheck,
  ArrowLeft,
  Check,
  CheckCircle2,
} from 'lucide-react';

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
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdSession, setCreatedSession] = useState<CustomerAuthSession | null>(null);

  const hasMinLength = password.length >= 6;
  const hasLettersAndNumbers = /[a-zA-Z]/.test(password) && /[0-9]/.test(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const session = await signUpCustomer({
        fullName,
        phoneNumber,
        email,
        password,
      });
      setCreatedSession(session);
    } catch (err: any) {
      setErrorMessage(
        err.message ||
          'Failed to create your customer account. Please check your information and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Congratulation! confirmation state (Matches Reference Row 2 Col 4)
  if (createdSession) {
    return (
      <div className="w-full max-w-md mx-auto py-8 px-2 animate-in fade-in duration-150">
        <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-xs p-8 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-[#EDF6F1] text-[#226946] mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-[#15191C]">Congratulation!</h1>
            <p className="text-sm text-[#6B7280] max-w-xs mx-auto">
              Your Ooh Gas account is complete, {createdSession.user.fullName.split(' ')[0]}. Enjoy fast LPG delivery across Nairobi.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onSuccess(createdSession)}
            className="w-full min-h-[48px] py-3.5 px-5 rounded-2xl bg-[#226946] hover:bg-[#195136] text-white font-bold text-sm transition-colors cursor-pointer"
          >
            Get Started
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto py-4 sm:py-8 px-1 sm:px-2 animate-in fade-in duration-150 text-left">
      <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-xs p-6 sm:p-8 space-y-5">
        {/* Back Button (Matches Reference Row 2 Col 1) */}
        <button
          type="button"
          onClick={onBackToHome}
          className="w-10 h-10 rounded-full hover:bg-[#F6F7F8] text-[#15191C] flex items-center justify-center transition-colors cursor-pointer -ml-2"
          aria-label="Back to Home"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#15191C] tracking-tight">
            Sign Up
          </h1>
          <p className="text-sm text-[#6B7280]">
            Create account and order cooking gas in minutes
          </p>
        </div>

        {redirectReason && (
          <div className="bg-[#EDF6F1] border border-[#226946]/20 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-[#195136]">
            <ShieldCheck className="w-4 h-4 text-[#226946] shrink-0 mt-0.5" />
            <span>{redirectReason}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#15191C]">Name</label>
            <input
              type="text"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-3.5 rounded-xl bg-[#F6F7F8] border border-transparent focus:border-[#226946] focus:bg-white text-sm text-[#15191C] placeholder:text-[#9CA3AF] transition-all outline-hidden"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#15191C]">Phone Number</label>
            <input
              type="tel"
              required
              autoComplete="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="0712 345 678"
              className="w-full px-4 py-3.5 rounded-xl bg-[#F6F7F8] border border-transparent focus:border-[#226946] focus:bg-white text-sm text-[#15191C] placeholder:text-[#9CA3AF] transition-all outline-hidden"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#15191C]">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email"
              className="w-full px-4 py-3.5 rounded-xl bg-[#F6F7F8] border border-transparent focus:border-[#226946] focus:bg-white text-sm text-[#15191C] placeholder:text-[#9CA3AF] transition-all outline-hidden"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#15191C]">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className="w-full px-4 py-3.5 pr-11 rounded-xl bg-[#F6F7F8] border border-transparent focus:border-[#226946] focus:bg-white text-sm text-[#15191C] placeholder:text-[#9CA3AF] transition-all outline-hidden"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#6B7280] hover:text-[#15191C] cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {password.length > 0 && (
              <div className="flex items-center gap-3 pt-1 text-[11px]">
                <span
                  className={`flex items-center gap-1 ${
                    hasMinLength ? 'text-[#226946] font-bold' : 'text-[#9CA3AF]'
                  }`}
                >
                  <Check className="w-3 h-3" /> 6+ characters
                </span>
                <span
                  className={`flex items-center gap-1 ${
                    hasLettersAndNumbers ? 'text-[#226946] font-bold' : 'text-[#9CA3AF]'
                  }`}
                >
                  <Check className="w-3 h-3" /> Letters & numbers
                </span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full min-h-[48px] py-3.5 px-5 rounded-2xl bg-[#226946] hover:bg-[#195136] text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Registering...</span>
              </>
            ) : (
              <span>Register</span>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-[#6B7280]">
          <span>Have an account? </span>
          <button
            type="button"
            onClick={onNavigateToSignIn}
            className="font-bold text-[#226946] hover:underline cursor-pointer"
          >
            Sign In
          </button>
        </div>

        <p className="text-[11px] text-center text-[#9CA3AF] leading-relaxed pt-2">
          By clicking Register, you agree to our{' '}
          <span className="text-[#226946] font-medium">Terms and Data Policy</span>. Protected by
          Supabase Auth &amp; RLS.
        </p>
      </div>
    </div>
  );
};
