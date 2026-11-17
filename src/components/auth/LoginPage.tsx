import React, { useState } from 'react';
import {
  signInCustomer,
  loginWithDemoAccount,
  CustomerAuthSession,
} from '../../services/customerAuthService';
import {
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Sparkles,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';

interface LoginPageProps {
  onBackToHome: () => void;
  onNavigateToSignUp: () => void;
  onNavigateToPasswordReset: () => void;
  redirectReason?: string | null;
  onSuccess: (session: CustomerAuthSession) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onBackToHome,
  onNavigateToSignUp,
  onNavigateToPasswordReset,
  redirectReason,
  onSuccess,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const session = await signInCustomer({ identifier, password });
      onSuccess(session);
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Invalid email or password. Please verify your credentials and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = () => {
    setIsLoading(true);
    setErrorMessage(null);
    setTimeout(() => {
      const session = loginWithDemoAccount();
      setIsLoading(false);
      onSuccess(session);
    }, 250);
  };

  return (
    <div className="w-full max-w-md mx-auto py-4 sm:py-8 px-1 sm:px-2 animate-in fade-in duration-150 text-left">
      <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-xs p-6 sm:p-8 space-y-6">
        {/* Clean Back Button (Matches Reference Row 1 Col 4) */}
        <button
          type="button"
          onClick={onBackToHome}
          className="w-10 h-10 rounded-full hover:bg-[#F6F7F8] text-[#15191C] flex items-center justify-center transition-colors cursor-pointer -ml-2"
          aria-label="Back to Home"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Heading (Left-aligned per Reference) */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#15191C] tracking-tight">
            Welcome Back 👋
          </h1>
          <p className="text-sm text-[#6B7280]">Sign in to your Ooh Gas account</p>
        </div>

        {/* Redirect Notice Banner */}
        {redirectReason && (
          <div className="bg-[#EDF6F1] border border-[#226946]/20 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-[#195136]">
            <ShieldCheck className="w-4 h-4 text-[#226946] shrink-0 mt-0.5" />
            <span>{redirectReason}</span>
          </div>
        )}

        {/* Error Feedback */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Sign In Form (#F6F7F8 inputs + #226946 button) */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#15191C]">
              Email or Phone Number
            </label>
            <input
              type="text"
              required
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Your email or 0712 345 678"
              className="w-full px-4 py-3.5 rounded-xl bg-[#F6F7F8] border border-transparent focus:border-[#226946] focus:bg-white text-sm text-[#15191C] placeholder:text-[#9CA3AF] transition-all outline-hidden"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#15191C]">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
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

            <div className="pt-1">
              <button
                type="button"
                onClick={onNavigateToPasswordReset}
                className="text-xs font-bold text-[#226946] hover:underline cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full min-h-[48px] py-3.5 px-5 rounded-2xl bg-[#226946] hover:bg-[#195136] text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <span>Login</span>
            )}
          </button>
        </form>

        {/* Sign Up Link */}
        <div className="text-center text-xs text-[#6B7280]">
          <span>Don&apos;t have an account? </span>
          <button
            type="button"
            onClick={onNavigateToSignUp}
            className="font-bold text-[#226946] hover:underline cursor-pointer"
          >
            Sign Up
          </button>
        </div>

        {/* Clean Divider + Quick Demo Login */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center gap-3 text-[11px] text-[#9CA3AF]">
            <div className="h-px bg-neutral-200 flex-1" />
            <span>Or with</span>
            <div className="h-px bg-neutral-200 flex-1" />
          </div>

          <button
            type="button"
            onClick={handleQuickDemoLogin}
            disabled={isLoading}
            className="w-full min-h-[46px] py-3 px-4 rounded-2xl border border-neutral-200 bg-white hover:bg-[#F6F7F8] text-[#15191C] text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-[#226946]" />
            <span>1-Tap Demo Customer (Wangari Mwangi)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
