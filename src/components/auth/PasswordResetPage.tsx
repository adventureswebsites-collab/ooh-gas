import React, { useState } from 'react';
import { resetCustomerPassword } from '../../services/customerAuthService';
import {
  Mail,
  Phone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from 'lucide-react';

interface PasswordResetPageProps {
  onBackToLogin: () => void;
  onBackToHome: () => void;
}

export const PasswordResetPage: React.FC<PasswordResetPageProps> = ({
  onBackToLogin,
}) => {
  const [channel, setChannel] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phoneHint, setPhoneHint] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const targetEmail =
        channel === 'email' ? email : email || `${phoneHint.replace(/\D/g, '')}@oohgas.ke`;
      const res = await resetCustomerPassword(targetEmail);
      setSuccessMessage(res.message);
    } catch (err: any) {
      setErrorMessage(
        err.message ||
          'Unable to send password reset email. Please verify the address and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto py-4 sm:py-8 px-1 sm:px-2 animate-in fade-in duration-150 text-left">
      <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-xs p-6 sm:p-8 space-y-6">
        <button
          type="button"
          onClick={onBackToLogin}
          className="w-10 h-10 rounded-full hover:bg-[#F6F7F8] text-[#15191C] flex items-center justify-center transition-colors cursor-pointer -ml-2"
          aria-label="Back to Sign In"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {successMessage ? (
          <div className="py-4 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-[#EDF6F1] text-[#226946] mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-2xl font-extrabold text-[#15191C]">Check Your Email</h1>
              <p className="text-sm text-[#6B7280]">{successMessage}</p>
            </div>
            <button
              type="button"
              onClick={onBackToLogin}
              className="w-full min-h-[48px] py-3.5 px-5 rounded-2xl bg-[#226946] hover:bg-[#195136] text-white text-sm font-bold transition-colors cursor-pointer"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <>
            {/* Heading matching Reference Row 2 Col 3 */}
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#15191C] tracking-tight">
                Forgot Password
              </h1>
              <p className="text-sm text-[#6B7280]">
                Select which contact details we should use to reset your password
              </p>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Reset Card Option (Matches Reference Row 2 Col 3) */}
              <div
                onClick={() => setChannel('email')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                  channel === 'email'
                    ? 'border-[#226946] bg-[#EDF6F1]/50'
                    : 'border-neutral-200 bg-[#F6F7F8]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      channel === 'email'
                        ? 'bg-white text-[#226946] shadow-2xs'
                        : 'bg-white text-[#6B7280]'
                    }`}
                  >
                    <Mail className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-[#15191C] block">Email</span>
                    <span className="text-xs text-[#6B7280]">Send reset link to your email</span>
                  </div>
                </div>

                {channel === 'email' && (
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="wangari.mwangi@gmail.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-200 focus:border-[#226946] text-sm text-[#15191C] outline-hidden"
                  />
                )}
              </div>

              {/* Phone Note Option */}
              <div
                onClick={() => setChannel('phone')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                  channel === 'phone'
                    ? 'border-[#226946] bg-[#EDF6F1]/50'
                    : 'border-neutral-200 bg-[#F6F7F8]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white text-[#226946] flex items-center justify-center shrink-0">
                    <Phone className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-[#15191C] block">Phone Number</span>
                    <span className="text-xs text-[#6B7280]">Send to your registered email via phone lookup</span>
                  </div>
                </div>

                {channel === 'phone' && (
                  <div className="space-y-2">
                    <input
                      type="tel"
                      value={phoneHint}
                      onChange={(e) => setPhoneHint(e.target.value)}
                      placeholder="0712 345 678"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-200 focus:border-[#226946] text-sm text-[#15191C] outline-hidden"
                    />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Confirm account email for Supabase link"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-200 focus:border-[#226946] text-sm text-[#15191C] outline-hidden"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full min-h-[48px] py-3.5 px-5 rounded-2xl bg-[#226946] hover:bg-[#195136] text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <span>Continue</span>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
