import React, { useState, useEffect, useRef } from 'react';
import { NairobiLocation } from '../types';
import { NAIROBI_LOCATIONS } from '../data/mockData';
import { X, MapPin, Search, Check, Navigation, Loader2 } from 'lucide-react';
import { reverseGeocode, searchPlaces, GeocodedPlace } from '../services/mapboxService';

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
  const searchTimeoutRef = useRef<any>(null);

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
        lng: currentLocation.coordinates.lng,
        lat: currentLocation.coordinates.lat,
      });
      setMapboxResults(results);
      setIsSearchingMapbox(false);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, currentLocation]);

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

          // Attempt reverse geocoding
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
          onSelectLocation(detectedLoc);
          onClose();
        },
        (error) => {
          setIsLocating(false);
          setGpsMessage('GPS denied or unavailable. Selected nearest hub (Kilimani Depot)');
          setTimeout(() => {
            onSelectLocation(NAIROBI_LOCATIONS[0]);
            onClose();
          }, 800);
        },
        { timeout: 7000, enableHighAccuracy: true }
      );
    } else {
      setIsLocating(false);
      onSelectLocation(NAIROBI_LOCATIONS[0]);
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 transition-opacity backdrop-blur-xs"
      role="presentation"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 overflow-hidden max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-4 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-modal-title"
      >
        {/* Mobile Drag Notch Handle */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300 mx-auto mt-2 mb-0.5 sm:hidden shrink-0" />

        {/* Header */}
        <div className="px-4 py-2.5 sm:py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div>
            <h2 id="location-modal-title" className="text-xs min-[360px]:text-sm font-bold text-slate-900 leading-tight">
              Select Delivery Location
            </h2>
            <p className="text-[10px] min-[360px]:text-[11px] text-slate-500">
              Nairobi County estates & neighborhoods
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors flex items-center justify-center cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Use Current Device GPS Location Button (Uber-style) */}
        <div className="p-3 border-b border-slate-200 bg-white shrink-0">
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            className="w-full py-2.5 px-3 rounded-xl bg-[#f0fdf4] hover:bg-[#dcfce7] active:bg-[#bbf7d0] border border-[#86efac] text-[#14532d] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs"
          >
            {isLocating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#166534]" />
                <span>Acquiring GPS location...</span>
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4 text-[#166534] fill-[#166534]" />
                <span>Use Current Device Location (GPS)</span>
              </>
            )}
          </button>
          {gpsMessage && (
            <p className="text-[10px] text-emerald-800 text-center mt-1 font-medium">
              {gpsMessage}
            </p>
          )}
        </div>

        {/* Search Input - text-base prevents iOS zoom on focus */}
        <div className="px-3 py-2 border-b border-slate-200 bg-white shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search area (e.g. Kilimani, Westlands, Karen)"
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-base sm:text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#166534]"
            />
          </div>
        </div>

        {/* Locations List with Accessible Touch Targets */}
        <div className="overflow-y-auto p-2.5 sm:p-3 space-y-1.5 flex-1 text-left">
          {/* Mapbox Geocoded Results */}
          {mapboxResults.length > 0 && (
            <div className="mb-2.5 space-y-1.5">
              <div className="text-[10.5px] font-bold text-emerald-800 uppercase tracking-wider px-1">
                Verified Addresses (Kenya)
              </div>
              {mapboxResults.map((place) => (
                <button
                  key={place.id}
                  type="button"
                  onClick={() => {
                    onSelectLocation({
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
                    });
                    onClose();
                  }}
                  className="w-full text-left p-2.5 min-h-[48px] rounded-lg border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/70 flex items-start gap-2.5 transition-colors cursor-pointer"
                >
                  <MapPin className="w-4 h-4 mt-0.5 text-[#166534] shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">{place.name}</div>
                    <div className="text-[10.5px] text-slate-600 truncate mt-0.5">{place.area}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {filteredLocations.map((loc) => {
            const isSelected = loc.id === currentLocation.id;
            return (
              <button
                key={loc.id}
                type="button"
                onClick={() => {
                  onSelectLocation(loc);
                  onClose();
                }}
                className={`w-full text-left p-2.5 min-h-[48px] rounded-lg border flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                  isSelected
                    ? 'border-[#166534] bg-[#f0fdf4]'
                    : 'border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-200'
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <MapPin
                    className={`w-4 h-4 mt-0.5 shrink-0 ${
                      isSelected ? 'text-[#166534]' : 'text-slate-400'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {loc.name}
                    </div>
                    <div className="text-[10.5px] min-[360px]:text-[11px] text-slate-500 truncate mt-0.5">
                      {loc.area}
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <Check className="w-4 h-4 text-[#166534] stroke-[2.5] shrink-0" />
                )}
              </button>
            );
          })}

          {filteredLocations.length === 0 && (
            <div className="p-4 text-center text-xs text-slate-500">
              No matching location found.
            </div>
          )}
        </div>

        <div
          className="p-2.5 bg-slate-50 border-t border-slate-200 text-center text-[10.5px] min-[360px]:text-[11px] text-slate-500 shrink-0"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.625rem)' }}
        >
          Delivery available across all Nairobi neighborhoods.
        </div>
      </div>
    </div>
  );
};
