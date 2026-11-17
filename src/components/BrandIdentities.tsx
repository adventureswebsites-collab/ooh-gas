import React from 'react';

interface OohGasLogoProps {
  className?: string;
  showTagline?: boolean;
  variant?: 'default' | 'inverted';
}

export const OohGasLogo: React.FC<OohGasLogoProps> = ({
  className = '',
  showTagline = false,
  variant = 'default',
}) => {
  const isInverted = variant === 'inverted';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Clean Forest Green Cylinder Mark matching the Light Mode reference icon style */}
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform hover:scale-105 ${
          isInverted ? 'bg-white text-[#226946]' : 'bg-[#226946] text-white'
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          className="w-4.5 h-4.5 fill-none stroke-current stroke-[2]"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 3h6M10 3v2.5h4V3" />
          <rect x="5.5" y="5.5" width="13" height="15" rx="2.5" />
          <path
            d="M12 9.5c-1 1.5-1.5 2.5-1.5 3.5 0 1.2 0.8 1.8 1.5 1.8s1.5-.6 1.5-1.8c0-1-.5-2-1.5-3.5z"
            className={isInverted ? 'fill-[#226946] stroke-[#226946]' : 'fill-emerald-300 stroke-emerald-300'}
          />
        </svg>
      </div>

      <div className="flex flex-col text-left leading-none">
        <span
          className={`text-lg font-extrabold tracking-tight whitespace-nowrap ${
            isInverted ? 'text-white' : 'text-[#15191C]'
          }`}
        >
          Ooh<span className={isInverted ? 'text-emerald-200 ml-0.5' : 'text-[#226946] ml-0.5'}>Gas</span>
        </span>
        {showTagline && (
          <span
            className={`text-[10.5px] font-medium tracking-tight mt-0.5 whitespace-nowrap ${
              isInverted ? 'text-emerald-100' : 'text-neutral-500'
            }`}
          >
            Your Gas, Delivered.
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
  className = 'w-10 h-10',
}) => {
  const getBrandDetails = () => {
    switch (brand) {
      case 'K-Gas':
        return {
          shortText: 'K-GAS',
          subText: 'RUBIS',
          bg: 'bg-red-50',
          border: 'border-red-200/80',
          text: 'text-red-700',
          bar: 'bg-red-600',
        };
      case 'TotalEnergies':
        return {
          shortText: 'TOTAL',
          subText: 'ENERGY',
          bg: 'bg-blue-50',
          border: 'border-blue-200/80',
          text: 'text-blue-800',
          bar: 'bg-blue-600',
        };
      case 'Shell Gas':
        return {
          shortText: 'SHELL',
          subText: 'AFRIGAS',
          bg: 'bg-amber-50',
          border: 'border-amber-200/80',
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
          bar: 'bg-[#226946]',
        };
    }
  };

  const details = getBrandDetails();

  return (
    <div
      className={`${className} rounded-xl ${details.bg} border ${details.border} flex flex-col items-center justify-center p-1 shrink-0 relative overflow-hidden`}
      title={`${brand} Supplier`}
    >
      <div className={`w-full h-1 absolute top-0 left-0 right-0 ${details.bar}`} />
      <span className={`text-[10px] font-black tracking-tight leading-none ${details.text}`}>
        {details.shortText}
      </span>
      <span className="text-[7.5px] font-semibold text-slate-500 uppercase tracking-widest mt-0.5 leading-none">
        {details.subText}
      </span>
    </div>
  );
};
