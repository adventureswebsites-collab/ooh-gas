import React, { useState } from 'react';
import { X, Key, ShieldCheck, CheckCircle2, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';
import { saveMapboxToken, removeMapboxToken, validateMapboxToken } from '../../services/mapboxService';

interface MapboxTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentToken: string;
  onTokenSaved: (token: string) => void;
}

export const MapboxTokenModal: React.FC<MapboxTokenModalProps> = ({
  isOpen,
  onClose,
  currentToken,
  onTokenSaved,
}) => {
  const [tokenInput, setTokenInput] = useState(currentToken);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSuccessMessage(null);

    const trimmed = tokenInput.trim();
    if (!trimmed) {
      setValidationError('Please enter a Mapbox public access token.');
      return;
    }

    setIsValidating(true);
    const result = await validateMapboxToken(trimmed);
    setIsValidating(false);

    if (!result.valid) {
      setValidationError(result.error || 'Token validation failed.');
      return;
    }

    saveMapboxToken(trimmed);
    setSuccessMessage('Mapbox token verified and activated! Loading real interactive map...');
    setTimeout(() => {
      onTokenSaved(trimmed);
      onClose();
    }, 700);
  };

  const handleClear = () => {
    removeMapboxToken();
    setTokenInput('');
    setValidationError(null);
    setSuccessMessage('Token removed.');
    onTokenSaved('');
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity"
      role="presentation"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 text-left"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mapbox-modal-title"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-emerald-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-800/80 flex items-center justify-center border border-emerald-700/50">
              <Key className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <h2 id="mapbox-modal-title" className="text-sm sm:text-base font-bold text-white">
                Configure Mapbox Access Token
              </h2>
              <p className="text-[11px] text-emerald-200">
                Powers real-time Nairobi streets, search & courier tracking
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-800 flex items-center justify-center cursor-pointer transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleTestAndSave} className="p-5 space-y-4">
          <div className="text-xs text-slate-600 leading-relaxed space-y-2">
            <p>
              To render real Kenya roads and address search, Mapbox requires a <strong>Public Access Token</strong> (starts with <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono text-[11px]">pk.</code>).
            </p>
          </div>

          {/* Quick Guide Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <span>How to obtain your free public token:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1">
              <li>
                Sign in to your free account at{' '}
                <a
                  href="https://account.mapbox.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-700 font-semibold underline inline-flex items-center gap-0.5"
                >
                  account.mapbox.com <ExternalLink className="w-3 h-3 inline" />
                </a>
              </li>
              <li>Under <strong>Access tokens</strong>, copy your <strong>Default public token</strong>.</li>
              <li>Paste it into the field below and tap <strong>Verify & Save</strong>.</li>
            </ol>
            <div className="pt-1 text-[11px] text-slate-500">
              Free plan includes <strong>50,000 free map loads</strong> each month.
            </div>
          </div>

          {/* Input Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Mapbox Public Access Token (starts with pk.)
            </label>
            <div className="relative">
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => {
                  setTokenInput(e.target.value);
                  setValidationError(null);
                }}
                placeholder="pk.eyJ1IjoiZXhhbXBsZSI..."
                className="w-full text-xs font-mono px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#14532d] focus:border-transparent bg-white text-slate-900"
              />
            </div>
            <p className="text-[10.5px] text-slate-500 mt-1">
              Permanent deployment: You can also set <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">VITE_MAPBOX_ACCESS_TOKEN</code> in your environment or <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">.env</code>.
            </p>
          </div>

          {/* Security & Restrictions Tip */}
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-start gap-2.5 text-xs text-emerald-900">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>Security Best Practice:</strong> Public tokens are designed for client-side maps. In your Mapbox dashboard, you can restrict this token to your specific domain URL to prevent unauthorized use. Never use secret tokens (<code className="font-mono">sk.*</code>) in client applications.
            </div>
          </div>

          {/* Error Message */}
          {validationError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-between gap-2 border-t border-slate-200">
            {currentToken ? (
              <button
                type="button"
                onClick={handleClear}
                className="w-full sm:w-auto text-xs text-rose-600 hover:text-rose-700 hover:underline px-2 py-2"
              >
                Clear Saved Token
              </button>
            ) : <div />}

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isValidating || !tokenInput.trim()}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#14532d] hover:bg-[#166534] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>Verify & Activate Map</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
