import React from 'react';
import { CustomerAuthSession, OtpRequestResult } from '../../services/customerAuthService';
import { NairobiLocation } from '../../types';
import { PhoneAuthFlow } from './PhoneAuthFlow';

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

export const LoginPage: React.FC<LoginPageProps> = ({
  onBackToHome,
  onNavigateToSignUp,
  onNavigateToPasswordReset,
  redirectReason,
  initialOtpData = null,
  initialLocation,
  initialEmailMode = false,
  onSuccess,
}) => {
  return (
    <PhoneAuthFlow
      initialStep={initialOtpData ? 'otp' : initialEmailMode ? 'email_password' : 'phone'}
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
};
