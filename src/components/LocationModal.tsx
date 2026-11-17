import React, { useState, useEffect, useRef } from 'react';
import { NairobiLocation } from '../types';
import { NAIROBI_LOCATIONS } from '../data/mockData';
import {
  ArrowLeft,
  MapPin,
  Search,
  Check,
  Navigation,
  Loader2,
  Bookmark,
} from 'lucide-react';
import { reverseGeocode, searchPlaces, GeocodedPlace } from '../services/mapboxService';
import {
  getCurrentCustomerSession,
  getCustomerSavedAddresses,
  saveCustomerAddress,
} from '../services/customerAuthService';
import { CustomerAddress } from '../types/multisupplier';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: NairobiLocation;
  onSelectLocation: (location: NairobiLocation) => void;
}

export const LocationModal: React.FC<LocationModalProps> = ({
  isOpen,
  onClose,
  currentLocation,
  onSelectLocation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);
  const [mapboxResults, setMapboxResults] = useState<GeocodedPlace[]>([]);
  const [isSearchingMapbox, setIsSearchingMapbox] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<NairobiLocation>(currentLocation);
  const [saveLabel, setSaveLabel] = useState<'Home' | 'Office' | 'Other'>('Home');
  const [saveToProfile, setSaveToProfile] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);
  const searchTimeoutRef = useRef<any>(null);

  const session = getCurrentCustomerSession();

  useEffect(() => {
    if (isOpen) {
      setPendingLocation(currentLocation);
      setGpsMessage(null);
      if (session) {
        getCustomerSavedAddresses().then(setSavedAddresses);
      }
    }
  }, [isOpen, currentLocation, session]);

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setMapboxResults([]);
      setIsSearchingMapbox(false);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    setIsSearchingMapbox(true);

    searchTimeoutRef.current = setTimeout(async () => {
      const results = await searchPlaces(searchQuery, {
        lng: pendingLocation.coordinates.lng,
        lat: pendingLocation.coordinates.lat,
      });
      setMapboxResults(results);
      setIsSearchingMapbox(false);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, pendingLocation.coordinates.lat, pendingLocation.coordinates.lng]);

  if (!isOpen) return null;

  const handleUseCurrentLocation = () => {
    setIsLocating(true);
    setGpsMessage(null);

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          setIsLocating(false);
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          const geo = await reverseGeocode(lng, lat);
          const detectedLoc: NairobiLocation = {
            id: `gps-${lat.toFixed(4)}-${lng.toFixed(4)}`,
            name: geo.name || 'Current GPS Location, Nairobi',
            area: geo.area || 'Current Device Location',
            details: `GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
            coordinates: {
              lat,
              lng,
              x: 50,
              y: 56,
            },
          };
          setPendingLocation(detectedLoc);
          setGpsMessage('Live GPS coordinates locked.');
        },
        () => {
          setIsLocating(false);
          setGpsMessage('GPS unavailable. Selected Kilimani Depot fallback.');
          setPendingLocation(NAIROBI_LOCATIONS[0]);
        },
        { timeout: 7000, enableHighAccuracy: true }
      );
    } else {
      setIsLocating(false);
      setPendingLocation(NAIROBI_LOCATIONS[0]);
    }
  };

  const handleConfirmLocation = async () => {
    setIsConfirming(true);
    try {
      if (session && saveToProfile) {
        await saveCustomerAddress({
          label: saveLabel,
          streetAddress: pendingLocation.name,
          buildingName: pendingLocation.area,
          deliveryNotes: pendingLocation.details,
          location: {
            lat: pendingLocation.coordinates.lat,
            lng: pendingLocation.coordinates.lng,
          },
          isDefault: savedAddresses.length === 0,
        });
      }
    } catch (_) {
      // Non-blocking save
    } finally {
      setIsConfirming(false);
      onSelectLocation(pendingLocation);
      onClose();
    }
  };

  const filteredLocations = NAIROBI_LOCATIONS.filter(
    (loc) =>
      loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.details.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 transition-opacity backdrop-blur-xs"
      role="presentation"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-neutral-200 overflow-hidden max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-4 duration-200 text-left"
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-modal-title"
      >
        {/* Top Bar matching Reference Row 4 Col 3 ("<-  Location  [GPS]") */}
        <div className="px-4 py-3.5 border-b border-neutral-100 flex items-center justify-between bg-white shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-[#F6F7F8] text-[#15191C] flex items-center justify-center cursor-pointer transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <h2 id="location-modal-title" className="text-base font-extrabold text-[#15191C]">
            Location
          </h2>

          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            className="w-10 h-10 rounded-full bg-[#EDF6F1] hover:bg-[#DFEFE6] text-[#226946] flex items-center justify-center cursor-pointer transition-colors"
            aria-label="Use Current GPS Location"
            title="Use Current Device GPS"
          >
            {isLocating ? (
              <Loader2 className="w-4.5 h-4.5 animate-spin" />
            ) : (
              <Navigation className="w-4.5 h-4.5" />
            )}
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-4 space-y-4 flex-1">
          {/* Detail Address Summary Card (Matches Reference Row 4 Col 3) */}
          <div className="rounded-2xl bg-[#F6F7F8] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#15191C]">Detail Address</span>
              {gpsMessage && (
                <span className="text-[11px] font-semibold text-[#226946]">{gpsMessage}</span>
              )}
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-[#EDF6F1] text-[#226946] flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#15191C] truncate">
                  {pendingLocation.name}
                </p>
                <p className="text-xs text-[#6B7280] mt-0.5 truncate">
                  {pendingLocation.area} · {pendingLocation.coordinates.lat.toFixed(4)},{' '}
                  {pendingLocation.coordinates.lng.toFixed(4)}
                </p>
              </div>
            </div>

            {/* Quick GPS Pill Button */}
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-100 border border-neutral-200/80 text-xs font-bold text-[#226946] transition-colors cursor-pointer"
            >
              {isLocating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Navigation className="w-3.5 h-3.5" />
              )}
              <span>{isLocating ? 'Locating GPS...' : 'Detect My GPS Location'}</span>
            </button>
          </div>

          {/* Search Address Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Nairobi estate or street (Kilimani, Westlands...)"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F6F7F8] border border-transparent focus:border-[#226946] focus:bg-white text-sm text-[#15191C] placeholder:text-[#6B7280] focus:outline-hidden transition-all"
            />
            {isSearchingMapbox && (
              <Loader2 className="w-4 h-4 animate-spin text-[#226946] absolute right-3.5 top-1/2 -translate-y-1/2" />
            )}
          </div>

          {/* Saved Customer Addresses (if signed in) */}
          {savedAddresses.length > 0 && !searchQuery.trim() && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider px-1 block">
                Your Saved Addresses
              </span>
              <div className="space-y-1.5">
                {savedAddresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() =>
                      setPendingLocation({
                        id: addr.id,
                        name: addr.streetAddress,
                        area: addr.buildingName || addr.label,
                        details: addr.deliveryNotes || addr.houseOrFlatNumber || '',
                        coordinates: {
                          lat: addr.location.lat,
                          lng: addr.location.lng,
                          x: 50,
                          y: 50,
                        },
                      })
                    }
                    className="w-full text-left p-2.5 rounded-xl bg-[#EDF6F1]/60 hover:bg-[#EDF6F1] border border-[#226946]/20 flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-extrabold text-[#226946] block">
                        {addr.label}
                      </span>
                      <span className="text-xs text-[#15191C] truncate block">
                        {addr.streetAddress}
                      </span>
                    </div>
                    <Bookmark className="w-3.5 h-3.5 text-[#226946] shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mapbox Verified Results */}
          {mapboxResults.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-[#226946] uppercase tracking-wider px-1">
                Verified Addresses (Kenya)
              </div>
              {mapboxResults.map((place) => {
                const isSelected = pendingLocation.id === place.id;
                return (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() =>
                      setPendingLocation({
                        id: place.id,
                        name: place.name,
                        area: place.area,
                        details: place.fullAddress,
                        coordinates: {
                          lat: place.coordinates.lat,
                          lng: place.coordinates.lng,
                          x: 50,
                          y: 50,
                        },
                      })
                    }
                    className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-[#226946] bg-[#EDF6F1]'
                        : 'border-neutral-200/80 bg-white hover:bg-[#F6F7F8]'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <MapPin className="w-4 h-4 mt-0.5 text-[#226946] shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#15191C] truncate">{place.name}</div>
                        <div className="text-[11px] text-[#6B7280] truncate">{place.area}</div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#226946] shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Nairobi Hubs List */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider px-1 block">
              Nairobi Service Areas
            </span>
            {filteredLocations.map((loc) => {
              const isSelected = loc.id === pendingLocation.id;
              return (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => setPendingLocation(loc)}
                  className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-[#226946] bg-[#EDF6F1]'
                      : 'border-neutral-100 bg-white hover:bg-[#F6F7F8]'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <MapPin
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        isSelected ? 'text-[#226946]' : 'text-neutral-400'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#15191C] truncate">{loc.name}</div>
                      <div className="text-[11px] text-[#6B7280] truncate">{loc.area}</div>
                    </div>
                  </div>

                  {isSelected && <Check className="w-4 h-4 text-[#226946] stroke-[2.5] shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Save Address As Chips (Matches Reference Row 4 Col 3: Home / Office / Other) */}
          <div className="pt-1 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#15191C]">Save Address As</span>
              {session && (
                <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#6B7280] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveToProfile}
                    onChange={(e) => setSaveToProfile(e.target.checked)}
                    className="rounded border-neutral-300 text-[#226946] focus:ring-[#226946]"
                  />
                  <span>Save to my account</span>
                </label>
              )}
            </div>

            <div className="flex items-center gap-2">
              {(['Home', 'Office', 'Other'] as const).map((label) => {
                const active = saveLabel === label;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      setSaveLabel(label);
                      if (session) setSaveToProfile(true);
                    }}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#EDF6F1] text-[#226946] border border-[#226946]/30'
                        : 'bg-[#F6F7F8] text-[#6B7280] hover:text-[#15191C]'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sticky Forest Green Confirmation CTA (Matches Reference Row 4 Col 3) */}
        <div
          className="p-4 border-t border-neutral-100 bg-white shrink-0"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
        >
          <button
            type="button"
            onClick={handleConfirmLocation}
            disabled={isConfirming}
            className="w-full min-h-[48px] py-3.5 px-5 rounded-2xl bg-[#226946] hover:bg-[#195136] text-white font-bold text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            {isConfirming ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Confirming...</span>
              </>
            ) : (
              <span>Confirmation</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
