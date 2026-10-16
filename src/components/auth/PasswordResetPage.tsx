import React, { useState } from 'react';
import { resetCustomerPassword } from '../../services/customerAuthService';
import {
  Mail,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { OohGasLogo } from '../BrandIdentities';

interface PasswordResetPageProps {
  onBackToLogin: () => void;
  onBackToHome: () => void;
}

export const PasswordResetPage: React.FC<PasswordResetPageProps> = ({
  onBackToLogin,
  onBackToHome,
}) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await resetCustomerPassword(email);
      setSuccessMessage(res.message);
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Unable to send password reset email. Please verify the address and try again.'
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
          onClick={onBackToLogin}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#14532d] hover:underline cursor-pointer min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Sign In</span>
        </button>

        <span className="text-[10px] font-bold text-[#14532d] bg-[#f0fdf4] border border-[#bbf7d0] px-2.5 py-1 rounded-md tracking-wider uppercase">
          Password Recovery
        </span>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 sm:p-6 space-y-4">
        {/* Header */}
        <div className="text-center space-y-2 pb-2 border-b border-slate-100">
          <div className="flex justify-center">
            <OohGasLogo />
          </div>
          <div className="w-12 h-12 rounded-full bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0] flex items-center justify-center mx-auto">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Reset Your Password
          </h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Enter your registered email address and we'll send you a secure link to reset your Ooh Gas password.
          </p>
        </div>

        {/* Error Feedback */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5 animate-in shake">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block mb-0.5">Reset Request Failed</span>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Success Confirmation View */}
        {successMessage ? (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3 animate-in zoom-in-95">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <div>
              <h3 className="text-sm font-bold text-emerald-900">Reset Email Sent</h3>
              <p className="text-xs text-emerald-700 mt-1">{successMessage}</p>
              <p className="text-[11px] text-slate-500 mt-2">
                Please check your inbox and follow the secure instructions. Once updated, you can sign in with your new password.
              </p>
            </div>

            <button
              type="button"
              onClick={onBackToLogin}
              className="w-full py-2.5 px-4 rounded-xl bg-[#14532d] hover:bg-[#166534] text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Return to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Registered Email Address
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
                We will email you a password reset token from Supabase Auth
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[46px] py-3 px-4 rounded-xl bg-[#14532d] hover:bg-[#166534] active:bg-[#0f3d21] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-lime-300" />
                  <span>Sending Reset Link...</span>
                </>
              ) : (
                <>
                  <span>Send Password Reset Link</span>
                  <ArrowRight className="w-4 h-4 text-lime-300 stroke-[2.5]" />
                </>
              )}
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={onBackToLogin}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                ← Back to Sign In
              </button>
            </div>
          </form>
        )}

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-[#166534] shrink-0 mt-0.5" />
          <span>
            For security, password reset links expire after 1 hour and can only be used once.
          </span>
        </div>
      </div>
    </div>
  );
};
