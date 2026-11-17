import React, { useEffect, useState, useRef } from 'react';
import {
  ArrowLeft,
  Search,
  MapPin,
  LocateFixed,
  Loader2,
  X,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { MapboxDeliveryMap } from '../map/MapboxDeliveryMap';
import {
  CoverageCheckResult,
  DeliveryZone,
  NairobiLocation,
  RiderInfo,
  Supplier,
} from '../../types';
import { NAIROBI_LOCATIONS } from '../../data/mockData';
import { GeocodedPlace, reverseGeocode, searchPlaces } from '../../services/mapboxService';
import { checkDeliveryCoverage } from '../../services/deliveryZoneService';
import { recordRecentDeliveryLocation } from '../../services/recentLocationsService';

interface DestinationMapStepProps {
  initialLocation: NairobiLocation;
  autoDetectGpsOnMount?: boolean;
  customerId?: string | null;
  suppliers: Supplier[];
  riders: RiderInfo[];
  zones: DeliveryZone[];
  onZonesUpdated: () => void;
  onBack: () => void;
  onConfirmLocation: (confirmedLocation: NairobiLocation, coverage: CoverageCheckResult | null) => void;
}

export const DestinationMapStep: React.FC<DestinationMapStepProps> = ({
  initialLocation,
  autoDetectGpsOnMount = false,
  customerId,
  suppliers,
  riders,
  zones,
  onZonesUpdated,
  onBack,
  onConfirmLocation,
}) => {
  const [selectedLocation, setSelectedLocation] = useState<NairobiLocation>(initialLocation);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodedPlace[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [coverage, setCoverage] = useState<CoverageCheckResult | null>(null);
  const [isCheckingCoverage, setIsCheckingCoverage] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelectedLocation(initialLocation);
  }, [initialLocation]);

  // Verify zone coverage whenever pinned coordinates change
  useEffect(() => {
    let active = true;
    setIsCheckingCoverage(true);
    checkDeliveryCoverage(
      selectedLocation.coordinates.lat,
      selectedLocation.coordinates.lng,
      zones
    )
      .then((res) => {
        if (active) setCoverage(res);
      })
      .finally(() => {
        if (active) setIsCheckingCoverage(false);
      });
    return () => {
      active = false;
    };
  }, [selectedLocation.coordinates.lat, selectedLocation.coordinates.lng, zones]);

  // Trigger device GPS location if customer tapped "Current location" on Step 1
  const handleUseCurrentGps = () => {
    setGpsError(null);
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsError('GPS is unavailable in this browser. Search or drag the pin on the map.');
      return;
    }

    setIsLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        try {
          const geo = await reverseGeocode(lng, lat);
          setSelectedLocation({
            id: `gps-${Date.now()}`,
            name: geo.name,
            area: geo.area,
            details: geo.details,
            coordinates: { lat, lng },
          });
          setSearchQuery('');
          setIsDropdownOpen(false);
        } catch {
          setSelectedLocation({
            id: `gps-${Date.now()}`,
            name: `Current GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
            area: 'Detected Device Location',
            details: 'Current GPS Pin',
            coordinates: { lat, lng },
          });
        } finally {
          setIsLocatingGps(false);
        }
      },
      () => {
        setIsLocatingGps(false);
        setGpsError('Location permission denied or unavailable. Search an address or move the pin.');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 15000 }
    );
  };

  useEffect(() => {
    if (autoDetectGpsOnMount) {
      handleUseCurrentGps();
    } else {
      const t = setTimeout(() => searchInputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [autoDetectGpsOnMount]);

  // Autocomplete search (local Nairobi areas + geocoding service)
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      // Show popular Nairobi spots when search bar is focused without typing yet
      setSuggestions(
        NAIROBI_LOCATIONS.map((loc) => ({
          id: loc.id,
          name: loc.name,
          area: loc.area,
          fullAddress: `${loc.name} · ${loc.area}`,
          coordinates: {
            lat: loc.coordinates.lat,
            lng: loc.coordinates.lng,
          },
        }))
      );
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    const timer = setTimeout(async () => {
      const q = trimmed.toLowerCase();
      const presetHits: GeocodedPlace[] = NAIROBI_LOCATIONS.filter(
        (loc) =>
          loc.name.toLowerCase().includes(q) ||
          loc.area.toLowerCase().includes(q) ||
          loc.details.toLowerCase().includes(q)
      ).map((loc) => ({
        id: loc.id,
        name: loc.name,
        area: loc.area,
        fullAddress: `${loc.name} · ${loc.area}`,
        coordinates: {
          lat: loc.coordinates.lat,
          lng: loc.coordinates.lng,
        },
      }));

      const geocodedHits = await searchPlaces(trimmed, {
        lat: selectedLocation.coordinates.lat,
        lng: selectedLocation.coordinates.lng,
      });

      if (cancelled) return;
      const seen = new Set(presetHits.map((h) => h.name.toLowerCase()));
      const merged = [
        ...presetHits,
        ...geocodedHits.filter((g) => !seen.has(g.name.toLowerCase())),
      ];
      setSuggestions(merged.slice(0, 7));
      setIsSearching(false);
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, selectedLocation.coordinates.lat, selectedLocation.coordinates.lng]);

  const handleSelectSuggestion = (place: GeocodedPlace) => {
    setSelectedLocation({
      id: place.id,
      name: place.name,
      area: place.area,
      details: place.fullAddress,
      coordinates: {
        lat: place.coordinates.lat,
        lng: place.coordinates.lng,
      },
    });
    setSearchQuery(place.name);
    setIsDropdownOpen(false);
    setGpsError(null);
  };

  const handleConfirm = () => {
    recordRecentDeliveryLocation(selectedLocation, customerId);
    onConfirmLocation(selectedLocation, coverage);
  };

  const isCovered = coverage ? coverage.isCovered : true;

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col min-h-[calc(100dvh-64px)] bg-white">
      {/* Top Search Header */}
      <div className="px-3 sm:px-5 pt-3 pb-3 border-b border-neutral-200/80 bg-white z-30">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#F6F7F8] hover:bg-[#EDF6F1] text-xs font-bold text-[#15191C] hover:text-[#226946] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <p className="text-xs sm:text-sm font-extrabold text-[#15191C] truncate">
            Set Delivery Destination
          </p>

          <button
            type="button"
            onClick={handleUseCurrentGps}
            disabled={isLocatingGps}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EDF6F1] hover:bg-[#DFEFE6] text-xs font-bold text-[#226946] transition-colors cursor-pointer disabled:opacity-60"
          >
            {isLocatingGps ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LocateFixed className="w-3.5 h-3.5" />
            )}
            <span>GPS</span>
          </button>
        </div>

        {/* Autocomplete Address Input */}
        <div className="relative">
          <div className="flex items-center gap-2.5 bg-[#F6F7F8] rounded-2xl border-2 border-neutral-200/90 focus-within:border-[#226946] focus-within:bg-white px-3.5 py-2.5 transition-all">
            <Search className="w-4 h-4 text-[#226946] shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onFocus={() => setIsDropdownOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              placeholder="Enter your delivery location..."
              aria-label="Search delivery address or area"
              className="w-full bg-transparent text-sm font-semibold text-[#15191C] placeholder-neutral-400 focus:outline-none"
            />
            {isSearching ? (
              <Loader2 className="w-4 h-4 text-[#226946] animate-spin shrink-0" />
            ) : searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                aria-label="Clear search"
                className="p-0.5 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            ) : null}
          </div>

          {/* Autocomplete Dropdown */}
          {isDropdownOpen && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-neutral-200 shadow-2xl max-h-60 overflow-y-auto z-40">
              <div className="px-3.5 py-2 bg-[#F6F7F8] border-b border-neutral-100 flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#6B7280]">
                  {searchQuery.trim() ? 'Matching locations' : 'Popular Nairobi areas'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(false)}
                  className="text-[11px] font-bold text-[#226946] cursor-pointer"
                >
                  Done
                </button>
              </div>
              {suggestions.map((place) => (
                <button
                  key={place.id}
                  type="button"
                  onClick={() => handleSelectSuggestion(place)}
                  className="w-full flex items-start gap-2.5 px-3.5 py-2.5 text-left hover:bg-[#EDF6F1] border-b border-neutral-100 last:border-0 transition-colors cursor-pointer"
                >
                  <MapPin className="w-4 h-4 text-[#226946] shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-bold text-[#15191C] truncate">
                      {place.name}
                    </p>
                    <p className="text-[11px] text-[#6B7280] truncate">{place.area}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {gpsError && (
          <p className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 mt-2">
            {gpsError}
          </p>
        )}
      </div>

      {/* Interactive Real Map (Mapbox / Leaflet) */}
      <div className="relative flex-1 min-h-[340px] sm:min-h-[420px]">
        <MapboxDeliveryMap
          isHomeHero={true}
          hideSearchOverlay={true}
          currentLocation={selectedLocation}
          suppliers={suppliers}
          riders={riders}
          activeOrder={null}
          coverageResult={coverage}
          isCoverageLoading={isCheckingCoverage}
          zones={zones}
          onZonesUpdated={onZonesUpdated}
          onOpenLocationModal={() => setIsDropdownOpen(true)}
          onSelectLocation={(newLoc) => {
            setSelectedLocation(newLoc);
            setIsDropdownOpen(false);
          }}
          heightClassName="h-full min-h-[340px] sm:min-h-[420px]"
        />

        {/* Subtle Floating Instruction Pill */}
        <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-10 max-w-[90%]">
          <div className="bg-neutral-900/85 backdrop-blur-md text-white text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-md whitespace-nowrap truncate">
            Tap anywhere or drag the green pin to your exact gate
          </div>
        </div>
      </div>

      {/* Bottom Selected Destination Confirmation Card */}
      <div className="bg-white border-t border-neutral-200/90 rounded-t-3xl shadow-[0_-8px_30px_rgba(15,23,42,0.08)] px-4 sm:px-6 py-4 z-20 space-y-3">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              isCovered ? 'bg-[#EDF6F1] text-[#0E8A45]' : 'bg-rose-50 text-rose-600'
            }`}
          >
            <MapPin className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
                Selected Delivery Point
              </p>
              {isCheckingCoverage ? (
                <span className="text-[11px] font-semibold text-[#6B7280] inline-flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Checking zone...
                </span>
              ) : isCovered ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0E8A45]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {coverage?.eligibleSuppliers.length || 0} depots serve here
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Outside delivery zone
                </span>
              )}
            </div>
            <p className="text-sm sm:text-base font-extrabold text-[#15191C] truncate mt-0.5">
              {selectedLocation.name}
            </p>
            <p className="text-xs text-[#6B7280] truncate">{selectedLocation.area}</p>
          </div>
        </div>

        {!isCovered && coverage && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl px-3.5 py-2 text-xs font-medium text-rose-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>
              {coverage.message} Move the pin inside a shaded green Nairobi delivery zone or pick
              Kilimani / Westlands / Lavington above.
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={handleConfirm}
          className={`w-full min-h-[50px] rounded-2xl font-extrabold text-sm sm:text-base shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
            isCovered
              ? 'bg-[#0E8A45] hover:bg-[#0B7138] active:scale-[0.99] text-white'
              : 'bg-neutral-900 hover:bg-neutral-800 text-white'
          }`}
        >
          <span>Confirm Delivery Location</span>
          <ArrowRight className="w-4.5 h-4.5" />
        </button>
      </div>
    </div>
  );
};
