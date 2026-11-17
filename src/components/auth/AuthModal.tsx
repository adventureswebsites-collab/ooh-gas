import React from 'react';
import { CustomerAuthSession } from '../../services/customerAuthService';
import { NairobiLocation } from '../../types';
import { X } from 'lucide-react';
import { OohGasLogo } from '../BrandIdentities';
import { PhoneAuthFlow } from './PhoneAuthFlow';

export type AuthMode = 'signin' | 'signup' | 'forgot_password';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
  redirectReason?: string | null;
  initialLocation?: NairobiLocation;
  onNavigateToPasswordReset?: () => void;
  onSuccess?: (session: CustomerAuthSession, updatedLocation?: NairobiLocation) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  redirectReason,
  initialLocation,
  onNavigateToPasswordReset,
  onSuccess,
}) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
      role="presentation"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl border border-neutral-200/80 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 text-left"
        role="dialog"
        aria-modal="true"
        aria-label="Sign in or register with phone"
      >
        <div className="w-11 h-1.5 rounded-full bg-neutral-300 mx-auto mt-2.5 sm:hidden shrink-0" />

        <div className="px-5 pt-3 pb-2.5 border-b border-neutral-100 flex items-center justify-between bg-white shrink-0">
          <OohGasLogo showTagline={false} />
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#F6F7F8] hover:bg-neutral-200 text-[#15191C] flex items-center justify-center cursor-pointer transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto">
          <PhoneAuthFlow
            compactModal={true}
            initialStep="phone"
            initialLocation={initialLocation}
            redirectReason={redirectReason}
            onBackToHome={onClose}
            onNavigateToPasswordReset={() => {
              onClose();
              onNavigateToPasswordReset?.();
            }}
            onSuccess={(session, updatedLocation) => {
              onSuccess?.(session, updatedLocation);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
};
