import React, { useState } from 'react';
import {
  signInCustomer,
  signUpCustomer,
  resetCustomerPassword,
  loginWithDemoAccount,
  CustomerAuthSession,
} from '../../services/customerAuthService';
import {
  X,
  Mail,
  Lock,
  User,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ShieldCheck,
  Flame,
} from 'lucide-react';
import { OohGasLogo } from '../BrandIdentities';

export type AuthMode = 'signin' | 'signup' | 'forgot_password';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
  redirectReason?: string | null;
  onSuccess?: (session: CustomerAuthSession) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin',
  redirectReason,
  onSuccess,
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Sign up fields
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');

  // Password reset email
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  // Feedback state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync mode with prop changes when opened
  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMessage(null);
      setSuccessMessage(null);
      setResetSuccessMessage(null);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
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
        onSuccess?.(session);
        onClose();
      }, 400);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid email/phone or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
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

      setSuccessMessage(`Account created! Welcome to Ooh Gas, ${session.user.fullName}.`);
      setTimeout(() => {
        onSuccess?.(session);
        onClose();
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create account. Please check your details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await resetCustomerPassword(resetEmail);
      setResetSuccessMessage(res.message);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to send password reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = () => {
    setIsLoading(true);
    setErrorMessage(null);
    setTimeout(() => {
      const session = loginWithDemoAccount();
      setSuccessMessage('Logged in with Demo Account (Wangari Mwangi)!');
      setTimeout(() => {
        setIsLoading(false);
        onSuccess?.(session);
        onClose();
      }, 400);
    }, 300);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      role="presentation"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 text-left"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        {/* Mobile Swipe / Grab Notch */}
        <div className="w-12 h-1.5 rounded-full bg-slate-200 mx-auto mt-2.5 sm:hidden shrink-0" />

        {/* Modal Top Bar */}
        <div className="px-5 pt-3.5 pb-2.5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2">
            <OohGasLogo />
            <span className="text-[10px] font-bold text-[#14532d] bg-[#f0fdf4] border border-[#bbf7d0] px-2 py-0.5 rounded-md tracking-wider uppercase">
              Customer Portal
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Redirect Notice Banner (if prompted from checkout) */}
        {redirectReason && (
          <div className="bg-[#f0fdf4] border-b border-[#bbf7d0] px-4 py-2 flex items-center gap-2 text-xs text-[#14532d] font-medium shrink-0">
            <ShieldCheck className="w-4 h-4 text-[#166534] shrink-0" />
            <span className="truncate">{redirectReason}</span>
          </div>
        )}

        {/* Mode Selector Tabs (Sign In vs Sign Up) */}
        {mode !== 'forgot_password' && (
          <div className="px-5 pt-3 pb-1 shrink-0">
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-bold text-slate-600">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  mode === 'signin'
                    ? 'bg-white text-[#14532d] shadow-xs'
                    : 'hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-white text-[#14532d] shadow-xs'
                    : 'hover:text-slate-900'
                }`}
              >
                Create Account
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Form Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="font-semibold">{successMessage}</span>
            </div>
          )}

          {/* ============================================================ */}
          {/* 1. SIGN IN FORM */}
          {/* ============================================================ */}
          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email or Mobile Phone
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. wangari@gmail.com or 0712 345 678"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:border-[#166534] focus:ring-2 focus:ring-[#bbf7d0] text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 transition-all outline-hidden"
                  />
                </div>
                <p className="text-[10.5px] text-slate-400 mt-1">
                  Sign in using either your registered email address or Kenyan phone number
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot_password');
                      setResetEmail(identifier.includes('@') ? identifier : '');
                    }}
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

              <button
                type="submit"
                disabled={isLoading}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-[#14532d] hover:bg-[#166534] active:bg-[#0f3d21] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-lime-300" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Ooh Gas</span>
                    <ArrowRight className="w-4 h-4 text-lime-300" />
                  </>
                )}
              </button>

              {/* 1-Tap Quick Demo Sign-in for immediate evaluation */}
              <div className="pt-2 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={handleQuickDemoLogin}
                  disabled={isLoading}
                  className="w-full py-2 px-3 rounded-xl border border-dashed border-[#86efac] bg-[#f0fdf4] hover:bg-[#dcfce7] text-[#14532d] text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#166534]" />
                  <span>1-Tap Demo Login (Wangari Mwangi)</span>
                </button>
                <p className="text-[10px] text-slate-400 mt-1">
                  Pre-configured customer with saved Kilimani addresses and active tracking history
                </p>
              </div>
            </form>
          )}

          {/* ============================================================ */}
          {/* 2. REGISTRATION / SIGN UP FORM */}
          {/* ============================================================ */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-3">
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
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Wangari Mwangi"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:border-[#166534] focus:ring-2 focus:ring-[#bbf7d0] text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 transition-all outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mobile Phone Number
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </span>
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="e.g. 0712 345 678"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:border-[#166534] focus:ring-2 focus:ring-[#bbf7d0] text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 transition-all outline-hidden"
                  />
                </div>
                <p className="text-[10.5px] text-slate-400 mt-1">
                  Used by couriers for doorstep delivery arrival calls and Lipa Na M-Pesa prompts
                </p>
              </div>

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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. wangari@gmail.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:border-[#166534] focus:ring-2 focus:ring-[#bbf7d0] text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 transition-all outline-hidden"
                  />
                </div>
              </div>

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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a secure password"
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

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#166534] shrink-0 mt-0.5" />
                <span>
                  Your account creates a unique user identity protected by Supabase RLS. Only you can view your delivery addresses and gas order history.
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-[#14532d] hover:bg-[#166534] active:bg-[#0f3d21] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-lime-300" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Customer Account</span>
                    <ArrowRight className="w-4 h-4 text-lime-300" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ============================================================ */}
          {/* 3. FORGOT PASSWORD FORM */}
          {/* ============================================================ */}
          {mode === 'forgot_password' && (
            <div className="space-y-3.5">
              <div className="text-center sm:text-left">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                  Reset Your Password
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter your registered email address and we'll send you a secure link to reset your password.
                </p>
              </div>

              {resetSuccessMessage ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-900">Reset Email Dispatched</h4>
                    <p className="text-[11px] text-emerald-700 mt-1">{resetSuccessMessage}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setResetSuccessMessage(null);
                    }}
                    className="w-full py-2 rounded-xl bg-[#14532d] text-white text-xs font-bold hover:bg-[#166534] cursor-pointer"
                  >
                    Return to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-3">
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
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="e.g. wangari@gmail.com"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:border-[#166534] focus:ring-2 focus:ring-[#bbf7d0] text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 transition-all outline-hidden"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-[#14532d] hover:bg-[#166534] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-lime-300" />
                        <span>Sending Link...</span>
                      </>
                    ) : (
                      <span>Send Password Reset Instructions</span>
                    )}
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setMode('signin')}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      ← Back to Sign In
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
