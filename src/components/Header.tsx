import React from 'react';
import { OohGasLogo } from './BrandIdentities';

interface HeaderProps {
  onNavigateHome?: () => void;
  transparentOverlay?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onNavigateHome,
  transparentOverlay = false,
}) => {
  return (
    <header
      className={
        transparentOverlay
          ? 'relative z-30 bg-transparent'
          : 'sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200/80'
      }
    >
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onNavigateHome}
          className="text-left cursor-pointer focus:outline-none whitespace-nowrap shrink-0"
          aria-label="Ooh Gas Home"
        >
          <OohGasLogo showTagline={false} />
        </button>
      </div>
    </header>
  );
};

