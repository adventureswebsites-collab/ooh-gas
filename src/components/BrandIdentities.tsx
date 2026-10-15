import React from 'react';

interface OohGasLogoProps {
  className?: string;
  showTagline?: boolean;
}

export const OohGasLogo: React.FC<OohGasLogoProps> = ({ className = '', showTagline = true }) => {
  return (
    <div className={`flex items-center gap-2 min-[360px]:gap-2.5 ${className}`}>
      {/* Clean, minimalist gas cylinder & flame icon with forest-green & subtle lime accent */}
      <div className="w-7.5 h-7.5 min-[360px]:w-8 min-[360px]:h-8 rounded-lg bg-[#14532d] flex items-center justify-center text-white shrink-0 shadow-xs relative">
        <svg
          viewBox="0 0 24 24"
          className="w-4 h-4 min-[360px]:w-4.5 min-[360px]:h-4.5 fill-none stroke-current stroke-[2] stroke-linecap-round stroke-linejoin-round"
          aria-hidden="true"
        >
          {/* Cylinder Top Valve Handle */}
          <path d="M9 3h6M10 3v2.5h4V3" />
          {/* Cylinder Body */}
          <rect x="5.5" y="5.5" width="13" height="15" rx="2.5" />
          {/* Minimal Flame Core with lime fill */}
          <path
            d="M12 9.5c-1 1.5-1.5 2.5-1.5 3.5 0 1.2 0.8 1.8 1.5 1.8s1.5-.6 1.5-1.8c0-1-.5-2-1.5-3.5z"
            className="fill-[#a3e635] stroke-[#a3e635]"
          />
        </svg>
        {/* Subtle lime accent dot */}
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#84cc16] border border-white" />
      </div>

      <div className="flex flex-col text-left leading-none">
        <div className="flex items-baseline gap-1">
          <span className="text-base min-[360px]:text-lg font-extrabold tracking-tight text-[#14532d]">
            Ooh <span className="text-[#166534]">Gas</span>
          </span>
          <span className="text-[9px] min-[360px]:text-[10px] font-bold text-[#4d7c0f] uppercase tracking-wider bg-[#ecfccb] px-1 py-0.5 rounded">
            LPG
          </span>
        </div>
        {showTagline && (
          <span className="text-[10px] min-[360px]:text-[11px] font-medium text-slate-500 tracking-tight mt-0.5 hidden min-[390px]:block">
            Gas Delivery. Made Easy.
          </span>
        )}
      </div>
    </div>
  );
};

interface SupplierLettermarkProps {
  brand: 'K-Gas' | 'TotalEnergies' | 'Shell Gas';
  className?: string;
}

export const SupplierLettermark: React.FC<SupplierLettermarkProps> = ({
  brand,
  className = 'w-9 h-9 min-[360px]:w-10 min-[360px]:h-10',
}) => {
  const getBrandDetails = () => {
    switch (brand) {
      case 'K-Gas':
        return {
          shortText: 'K-GAS',
          subText: 'RUBIS',
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-700',
          bar: 'bg-red-600',
        };
      case 'TotalEnergies':
        return {
          shortText: 'TOTAL',
          subText: 'ENERGY',
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          bar: 'bg-blue-600',
        };
      case 'Shell Gas':
        return {
          shortText: 'SHELL',
          subText: 'AFRIGAS',
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-800',
          bar: 'bg-amber-500',
        };
      default:
        return {
          shortText: 'GAS',
          subText: 'LPG',
          bg: 'bg-slate-50',
          border: 'border-slate-200',
          text: 'text-slate-800',
          bar: 'bg-slate-600',
        };
    }
  };

  const details = getBrandDetails();

  return (
    <div
      className={`${className} rounded-md ${details.bg} border ${details.border} flex flex-col items-center justify-center p-0.5 min-[360px]:p-1 shrink-0 relative overflow-hidden`}
      title={`${brand} Supplier`}
    >
      <div className={`w-full h-1 absolute top-0 left-0 right-0 ${details.bar}`} />
      <span className={`text-[9.5px] min-[360px]:text-[10px] font-black tracking-tight leading-none ${details.text}`}>
        {details.shortText}
      </span>
      <span className="text-[7px] min-[360px]:text-[7.5px] font-semibold text-slate-500 uppercase tracking-widest mt-0.5 leading-none">
        {details.subText}
      </span>
    </div>
  );
};
