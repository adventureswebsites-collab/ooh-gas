import React, { useState } from 'react';
import {
  signInCustomer,
  loginWithDemoAccount,
  CustomerAuthSession,
} from '../../services/customerAuthService';
import {
  Mail,
  Lock,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ShieldCheck,
  ArrowLeft,
  KeyRound,
  UserCheck,
} from 'lucide-react';
import { OohGasLogo } from '../BrandIdentities';

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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const session = await signInCustomer({
        identifier,
        password,
      });

      setSuccessMessage(`Welcome back, ${session.user.fullName}!`);
      setTimeout(() => {
        onSuccess(session);
      }, 400);
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
      setSuccessMessage('Signed in with Demo Account (Wangari Mwangi)!');
      setTimeout(() => {
        setIsLoading(false);
        onSuccess(session);
      }, 400);
    }, 300);
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
          Customer Portal
        </span>
      </div>

      {/* Main Login Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 sm:p-6 space-y-4">
        {/* Brand Header */}
        <div className="text-center space-y-2 pb-2 border-b border-slate-100">
          <div className="flex justify-center">
            <OohGasLogo />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Sign In to Your Account
          </h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Access your active gas deliveries, saved Nairobi estates, and verified cylinder history.
          </p>
        </div>

        {/* Redirect Notice Banner (if redirected from checkout or cart) */}
        {redirectReason && (
          <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-3 flex items-start gap-2.5 text-xs text-[#14532d] animate-in fade-in">
            <ShieldCheck className="w-4 h-4 text-[#166534] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Authentication Required</p>
              <p className="text-[11px] text-[#166534] mt-0.5">{redirectReason}</p>
            </div>
          </div>
        )}

        {/* Error Feedback */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5 animate-in shake">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block mb-0.5">Sign In Failed</span>
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

        {/* Sign In Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Email Address or Phone Number
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. wangari.mwangi@gmail.com or 0712 345 678"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:border-[#166534] focus:ring-2 focus:ring-[#bbf7d0] text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 transition-all outline-hidden"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Enter your registered email address or Kenyan mobile number (07... or +254...)
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Password
              </label>
              <button
                type="button"
                onClick={onNavigateToPasswordReset}
                className="text-[11px] font-semibold text-[#166534] hover:underline cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
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
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span>Sign In to Ooh Gas</span>
                <ArrowRight className="w-4 h-4 text-lime-300 stroke-[2.5]" />
              </>
            )}
          </button>
        </form>

        {/* 1-Tap Quick Demo Login */}
        <div className="pt-2 border-t border-slate-100 text-center space-y-1.5">
          <button
            type="button"
            onClick={handleQuickDemoLogin}
            disabled={isLoading}
            className="w-full py-2.5 px-3 rounded-xl border border-dashed border-[#86efac] bg-[#f0fdf4] hover:bg-[#dcfce7] text-[#14532d] text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#166534]" />
            <span>1-Tap Demo Login (Wangari Mwangi)</span>
          </button>
          <p className="text-[10px] text-slate-400">
            Instantly loads verified Kilimani customer profile and orders
          </p>
        </div>

        {/* Security & RLS Notice */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-[#166534] shrink-0 mt-0.5" />
          <span>
            Protected by Supabase Auth with Row-Level Security (RLS). Passwords are cryptographically salted and hashed.
          </span>
        </div>

        {/* Switch to Sign Up */}
        <div className="pt-2 text-center text-xs text-slate-600">
          <span>Don't have an Ooh Gas account? </span>
          <button
            type="button"
            onClick={onNavigateToSignUp}
            className="font-bold text-[#14532d] hover:underline cursor-pointer"
          >
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
};
