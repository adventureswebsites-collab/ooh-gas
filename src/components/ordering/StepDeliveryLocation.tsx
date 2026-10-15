import React, { useState } from 'react';
import { DeliveryAddressForm, SavedAddress } from '../../types';
import { MOCK_SAVED_ADDRESSES, NAIROBI_LOCATIONS } from '../../data/mockData';
import {
  MapPin,
  Crosshair,
  Bookmark,
  Check,
  AlertCircle,
  Move,
  Info,
} from 'lucide-react';

interface StepDeliveryLocationProps {
  formData: DeliveryAddressForm;
  onChangeFormData: (data: DeliveryAddressForm) => void;
  validationErrors: Record<string, string>;
}

export const StepDeliveryLocation: React.FC<StepDeliveryLocationProps> = ({
  formData,
  onChangeFormData,
  validationErrors,
}) => {
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsFeedback, setGpsFeedback] = useState<string | null>(null);
  const [pinAdjustmentMode, setPinAdjustmentMode] = useState(false);

  // Quick apply saved address
  const handleApplySavedAddress = (saved: SavedAddress) => {
    onChangeFormData({
      ...formData,
      fullName: saved.fullName,
      phoneNumber: saved.phoneNumber,
      estate: saved.estate,
      building: saved.building,
      unitNumber: saved.unitNumber,
      deliveryInstructions: saved.deliveryInstructions,
      pinLocation: {
        ...formData.pinLocation,
        areaName: saved.estate,
      },
    });
  };

  // Device location handler with real navigator permission check
  const handleRequestDeviceLocation = () => {
    setGpsLoading(true);
    setGpsFeedback(null);

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsLoading(false);
          const detectedEstate = formData.estate || 'Kilimani, Nairobi';
          onChangeFormData({
            ...formData,
            pinLocation: {
              lat: Number(position.coords.latitude.toFixed(5)),
              lng: Number(position.coords.longitude.toFixed(5)),
              areaName: detectedEstate,
              isCustomPinned: true,
            },
          });
          setGpsFeedback(`Location accessed: ${detectedEstate} (GPS Accuracy ±${Math.round(position.coords.accuracy || 15)}m)`);
        },
        (error) => {
          setGpsLoading(false);
          // Graceful fallback for permission denial or mock environment
          onChangeFormData({
            ...formData,
            pinLocation: {
              lat: -1.2921,
              lng: 36.7856,
              areaName: formData.estate || 'Kilimani, Nairobi',
              isCustomPinned: true,
            },
          });
          setGpsFeedback('Simulated GPS pin placed at Kilimani Sector, Nairobi.');
        },
        { timeout: 7000 }
      );
    } else {
      setGpsLoading(false);
      setGpsFeedback('Geolocation not supported by device browser. Manual pin applied.');
    }
  };

  const handleAdjustPin = (deltaLat: number, deltaLng: number) => {
    onChangeFormData({
      ...formData,
      pinLocation: {
        ...formData.pinLocation,
        lat: Number((formData.pinLocation.lat + deltaLat).toFixed(5)),
        lng: Number((formData.pinLocation.lng + deltaLng).toFixed(5)),
        isCustomPinned: true,
      },
    });
  };

  return (
    <div className="space-y-4 text-left">
      {/* 1. Saved Addresses Quick Picker */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Bookmark className="w-3.5 h-3.5 text-[#166534]" />
            Saved Addresses
          </span>
          <span className="text-[11px] text-slate-400">Tap to auto-fill</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {MOCK_SAVED_ADDRESSES.map((saved) => {
            const isMatch = formData.building === saved.building && formData.estate === saved.estate;
            return (
              <button
                key={saved.id}
                type="button"
                onClick={() => handleApplySavedAddress(saved)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[58px] ${
                  isMatch
                    ? 'border-[#14532d] bg-[#f0fdf4] ring-1 ring-[#14532d]'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                    {saved.label}
                  </span>
                  {isMatch && <Check className="w-3.5 h-3.5 text-[#166534] stroke-[3]" />}
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                  {saved.building}, {saved.estate.split(',')[0]}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Customer Contact Details */}
      <div className="space-y-2.5 pt-1">
        <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Recipient & Contact Details
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Full Name */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Recipient Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => onChangeFormData({ ...formData, fullName: e.target.value })}
              placeholder="e.g. Wangari Mwangi"
              className={`w-full px-3 py-2 rounded-lg border text-base sm:text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                validationErrors.fullName
                  ? 'border-red-400 bg-red-50/40 focus:ring-red-500'
                  : 'border-slate-200 bg-white focus:ring-[#166534]'
              }`}
            />
            {validationErrors.fullName && (
              <p className="text-[10.5px] text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                {validationErrors.fullName}
              </p>
            )}
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              M-Pesa / Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => onChangeFormData({ ...formData, phoneNumber: e.target.value })}
              placeholder="e.g. 0712 345 678"
              className={`w-full px-3 py-2 rounded-lg border text-base sm:text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                validationErrors.phoneNumber
                  ? 'border-red-400 bg-red-50/40 focus:ring-red-500'
                  : 'border-slate-200 bg-white focus:ring-[#166534]'
              }`}
            />
            {validationErrors.phoneNumber && (
              <p className="text-[10.5px] text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                {validationErrors.phoneNumber}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 3. Building, Apartment, and Estate */}
      <div className="space-y-2.5 pt-1">
        <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Address & Building Details
        </span>

        {/* Estate Selection */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
            Nairobi Estate / Area <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.estate}
            onChange={(e) => onChangeFormData({ ...formData, estate: e.target.value })}
            className={`w-full px-3 py-2 rounded-lg border text-base sm:text-xs text-slate-900 bg-white focus:outline-none focus:ring-1 ${
              validationErrors.estate
                ? 'border-red-400 bg-red-50/40 focus:ring-red-500'
                : 'border-slate-200 focus:ring-[#166534]'
            }`}
          >
            {NAIROBI_LOCATIONS.map((loc) => (
              <option key={loc.id} value={loc.name}>
                {loc.name} ({loc.area})
              </option>
            ))}
          </select>
          {validationErrors.estate && (
            <p className="text-[10.5px] text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              {validationErrors.estate}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Building or Court Name */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Building / Estate Court <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.building}
              onChange={(e) => onChangeFormData({ ...formData, building: e.target.value })}
              placeholder="e.g. Silver Oak Residency"
              className={`w-full px-3 py-2 rounded-lg border text-base sm:text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                validationErrors.building
                  ? 'border-red-400 bg-red-50/40 focus:ring-red-500'
                  : 'border-slate-200 bg-white focus:ring-[#166534]'
              }`}
            />
            {validationErrors.building && (
              <p className="text-[10.5px] text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                {validationErrors.building}
              </p>
            )}
          </div>

          {/* Unit / Floor / House */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              House / Apt / Floor <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.unitNumber}
              onChange={(e) => onChangeFormData({ ...formData, unitNumber: e.target.value })}
              placeholder="e.g. Block B, Apt 4B, 2nd Floor"
              className={`w-full px-3 py-2 rounded-lg border text-base sm:text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                validationErrors.unitNumber
                  ? 'border-red-400 bg-red-50/40 focus:ring-red-500'
                  : 'border-slate-200 bg-white focus:ring-[#166534]'
              }`}
            />
            {validationErrors.unitNumber && (
              <p className="text-[10.5px] text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                {validationErrors.unitNumber}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 4. Clearly Labelled Map Placeholder with Delivery Pin */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#166534]" />
            Delivery Pin Location
          </span>
          <span className="text-[10.5px] text-slate-500 font-medium bg-slate-100 px-1.5 py-0.5 rounded">
            Interactive Map Preview
          </span>
        </div>

        {/* Map Canvas Placeholder (Clean Grid & Pin Overlay) */}
        <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-100 h-40 sm:h-44 flex flex-col justify-between p-3 select-none">
          {/* Subtle Map Grid Graphic */}
          <div className="absolute inset-0 opacity-15 pointer-events-none">
            <svg width="100%" height="100%">
              <defs>
                <pattern id="mapGrid" width="24" height="24" patternUnits="userSpaceOnUse">
                  <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#064e3b" strokeWidth="0.8" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#mapGrid)" />
              {/* Simulated Nairobi Roads */}
              <path d="M0,60 Q120,40 240,80 T400,60" fill="none" stroke="#65a30d" strokeWidth="3" />
              <path d="M80,0 Q100,100 120,200" fill="none" stroke="#047857" strokeWidth="2.5" />
            </svg>
          </div>

          {/* Top Map Status Badge */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-md text-[11px] font-bold text-slate-800 shadow-xs border border-slate-200/80 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#166534] animate-pulse" />
              <span>{formData.estate || 'Kilimani, Nairobi'}</span>
            </div>

            <div className="bg-slate-900/80 text-white px-2 py-0.5 rounded text-[10px] font-mono">
              {formData.pinLocation.lat}, {formData.pinLocation.lng}
            </div>
          </div>

          {/* Center Pin Marker */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full z-20 flex flex-col items-center pointer-events-none">
            <div className="bg-[#14532d] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-md whitespace-nowrap mb-0.5">
              Drop-off Point
            </div>
            <div className="w-8 h-8 rounded-full bg-[#14532d] text-white flex items-center justify-center shadow-lg border-2 border-white">
              <MapPin className="w-4 h-4 text-white fill-[#bef264]" />
            </div>
            <div className="w-2 h-1 bg-black/30 rounded-full blur-xs mt-0.5" />
          </div>

          {/* Bottom Action Bar inside Map */}
          <div className="relative z-10 flex items-center justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={() => setPinAdjustmentMode(!pinAdjustmentMode)}
              className="px-2.5 py-1.5 rounded-lg bg-white/95 hover:bg-white text-slate-800 text-xs font-semibold shadow-xs border border-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              <Move className="w-3.5 h-3.5 text-[#166534]" />
              <span>{pinAdjustmentMode ? 'Done Adjusting' : 'Adjust Pin'}</span>
            </button>

            {/* Quick Nudge Controls when in Pin Adjustment Mode */}
            {pinAdjustmentMode && (
              <div className="flex items-center gap-1 bg-white/95 px-2 py-1 rounded-lg border border-slate-200 shadow-xs text-xs">
                <button
                  type="button"
                  onClick={() => handleAdjustPin(-0.0005, 0)}
                  className="px-2 py-0.5 font-bold hover:bg-slate-100 rounded cursor-pointer"
                  title="Nudge North"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustPin(0.0005, 0)}
                  className="px-2 py-0.5 font-bold hover:bg-slate-100 rounded cursor-pointer"
                  title="Nudge South"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustPin(0, -0.0005)}
                  className="px-2 py-0.5 font-bold hover:bg-slate-100 rounded cursor-pointer"
                  title="Nudge West"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustPin(0, 0.0005)}
                  className="px-2 py-0.5 font-bold hover:bg-slate-100 rounded cursor-pointer"
                  title="Nudge East"
                >
                  →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Button: Use Device Current Location with Permission Handler */}
        <div className="pt-0.5">
          <button
            type="button"
            onClick={handleRequestDeviceLocation}
            disabled={gpsLoading}
            className="w-full py-2.5 px-3 min-h-[44px] rounded-xl border border-slate-300 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Crosshair className={`w-4 h-4 text-[#166534] ${gpsLoading ? 'animate-spin' : ''}`} />
            <span>{gpsLoading ? 'Accessing device location...' : 'Use My Current Device Location'}</span>
          </button>

          {gpsFeedback && (
            <p className="text-[11px] text-[#14532d] font-medium mt-1.5 flex items-center gap-1 bg-[#f0fdf4] p-1.5 rounded border border-[#bbf7d0]">
              <Check className="w-3.5 h-3.5 text-[#166534] shrink-0" />
              <span>{gpsFeedback}</span>
            </p>
          )}
        </div>
      </div>

      {/* 5. Special Delivery Instructions */}
      <div className="space-y-1 pt-1">
        <label className="block text-[11px] font-semibold text-slate-700">
          Delivery Instructions for Rider (Optional)
        </label>
        <textarea
          rows={2}
          value={formData.deliveryInstructions}
          onChange={(e) => onChangeFormData({ ...formData, deliveryInstructions: e.target.value })}
          placeholder="e.g. Leave with security guard at gate, call when arriving, rider to bring digital scale"
          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-base sm:text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#166534]"
        />
        <p className="text-[10px] text-slate-400">
          Rider brings calibrated scale and performs a soapy water leak test on cylinder hookup.
        </p>
      </div>
    </div>
  );
};
