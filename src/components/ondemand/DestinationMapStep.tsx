import React, { useEffect, useState, useRef, useMemo } from 'react';
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
  Flame,
  Star,
  Clock,
  Navigation,
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
import {
  findNearestDeliveryDepots,
  NearbyDepotSearchResult,
} from '../../services/supplierMatchingService';

interface DestinationMapStepProps {
  initialLocation: NairobiLocation;
  initialSearchQuery?: string;
  autoDetectGpsOnMount?: boolean;
  autoSearchDepotsOnMount?: boolean;
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
  initialSearchQuery = '',
  autoDetectGpsOnMount = false,
  autoSearchDepotsOnMount = true,
  customerId,
  suppliers,
  riders,
  zones,
  onZonesUpdated,
  onBack,
  onConfirmLocation,
}) => {
  const [selectedLocation, setSelectedLocation] = useState<NairobiLocation>(initialLocation);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [suggestions, setSuggestions] = useState<GeocodedPlace[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [coverage, setCoverage] = useState<CoverageCheckResult | null>(null);
  const [isCheckingCoverage, setIsCheckingCoverage] = useState(false);

  // Nearby gas station search & direct map pinning state
  const [isSearchingDepots, setIsSearchingDepots] = useState<boolean>(autoSearchDepotsOnMount);
  const [pinnedDepotId, setPinnedDepotId] = useState<string | null>(null);
  const [depotSearchTrigger, setDepotSearchTrigger] = useState<number>(
    autoSearchDepotsOnMount ? 1 : 0
  );

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelectedLocation(initialLocation);
  }, [initialLocation]);

  useEffect(() => {
    if (initialSearchQuery) {
      setSearchQuery(initialSearchQuery);
    }
  }, [initialSearchQuery]);

  // Verify zone coverage & search nearby gas stations whenever location coordinates change
  useEffect(() => {
    let active = true;
    const minScanMs = depotSearchTrigger > 0 ? 680 : 250;
    const startedAt = Date.now();

    setIsCheckingCoverage(true);
    setIsSearchingDepots(true);

    checkDeliveryCoverage(
      selectedLocation.coordinates.lat,
      selectedLocation.coordinates.lng,
      zones
    )
      .then((res) => {
        const elapsed = Date.now() - startedAt;
        const remaining = Math.max(0, minScanMs - elapsed);

        return new Promise<CoverageCheckResult>((resolve) => {
          setTimeout(() => resolve(res), remaining);
        });
      })
      .then((res) => {
        if (!active) return;
        setCoverage(res);
      })
      .finally(() => {
        if (!active) return;
        setIsCheckingCoverage(false);
        setIsSearchingDepots(false);
      });

    return () => {
      active = false;
    };
  }, [
    selectedLocation.coordinates.lat,
    selectedLocation.coordinates.lng,
    zones,
    depotSearchTrigger,
  ]);

  // Rank & match nearby gas stations for the current location
  const depotSearchResult: NearbyDepotSearchResult = useMemo(
    () =>
      findNearestDeliveryDepots({
        destination: selectedLocation,
        coverageResult: coverage,
        suppliers,
      }),
    [selectedLocation, coverage, suppliers]
  );

  // Automatically pin the nearest found delivery depot directly onto the map
  useEffect(() => {
    if (isSearchingDepots || isCheckingCoverage) return;
    if (depotSearchResult.found && depotSearchResult.primaryDepot) {
      setPinnedDepotId((prev) => {
        const stillExists = depotSearchResult.nearbyDepots.some((d) => d.id === prev);
        return stillExists && prev ? prev : depotSearchResult.primaryDepot!.id;
      });
    } else {
      setPinnedDepotId(null);
    }
  }, [isSearchingDepots, isCheckingCoverage, depotSearchResult]);

  // Merge live calculated distances into suppliers passed to the map so map pins show exact km
  const suppliersWithLiveDistance: Supplier[] = useMemo(() => {
    if (depotSearchResult.nearbyDepots.length === 0) return suppliers;
    const byId = new Map(depotSearchResult.nearbyDepots.map((d) => [d.id, d]));
    return suppliers.map((s) => byId.get(s.id) || s);
  }, [suppliers, depotSearchResult.nearbyDepots]);

  const activePinnedDepot = useMemo(() => {
    if (!depotSearchResult.found) return null;
    return (
      depotSearchResult.nearbyDepots.find((d) => d.id === pinnedDepotId) ||
      depotSearchResult.primaryDepot
    );
  }, [depotSearchResult, pinnedDepotId]);

  // Trigger device GPS location if customer tapped "Current location"
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
          setPinnedDepotId(null);
          setDepotSearchTrigger((n) => n + 1);
        } catch {
          setSelectedLocation({
            id: `gps-${Date.now()}`,
            name: `Current GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
            area: 'Detected Device Location',
            details: 'Current GPS Pin',
            coordinates: { lat, lng },
          });
          setPinnedDepotId(null);
          setDepotSearchTrigger((n) => n + 1);
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
    } else if (!initialSearchQuery) {
      const t = setTimeout(() => searchInputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [autoDetectGpsOnMount]);

  // Autocomplete search (local Nairobi areas + geocoding service)
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
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
    setPinnedDepotId(null);
    setDepotSearchTrigger((n) => n + 1);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (suggestions.length > 0) {
      handleSelectSuggestion(suggestions[0]);
    }
  };

  const handleConfirm = () => {
    recordRecentDeliveryLocation(selectedLocation, customerId);
    onConfirmLocation(selectedLocation, coverage);
  };

  const isCovered = coverage ? coverage.isCovered : true;

  return (
    <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col min-h-[calc(100dvh-64px)] bg-white">
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
        <form onSubmit={handleFormSubmit} className="relative">
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
                  className="w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 text-left hover:bg-[#EDF6F1] border-b border-neutral-100 last:border-0 transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <MapPin className="w-4 h-4 text-[#226946] shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-bold text-[#15191C] truncate">
                        {place.name}
                      </p>
                      <p className="text-[11px] text-[#6B7280] truncate">{place.area}</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-[#0E8A45] shrink-0 whitespace-nowrap">
                    Find depot →
                  </span>
                </button>
              ))}
            </div>
          )}
        </form>

        {gpsError && (
          <p className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 mt-2">
            {gpsError}
          </p>
        )}
      </div>

      {/* Interactive Real Map (Mapbox / Leaflet) */}
      <div className="relative flex-1 flex flex-col min-h-[380px] sm:min-h-[460px]">
        <MapboxDeliveryMap
          isHomeHero={true}
          hideSearchOverlay={true}
          currentLocation={selectedLocation}
          suppliers={suppliersWithLiveDistance}
          riders={riders}
          activeOrder={null}
          coverageResult={coverage}
          isCoverageLoading={isCheckingCoverage}
          zones={zones}
          onZonesUpdated={onZonesUpdated}
          highlightedSupplierId={isSearchingDepots ? null : pinnedDepotId}
          showPreviewConnection={!isSearchingDepots && Boolean(activePinnedDepot)}
          onSelectSupplierPin={(sup) => {
            setPinnedDepotId(sup.id);
          }}
          onOpenLocationModal={() => setIsDropdownOpen(true)}
          onSelectLocation={(newLoc) => {
            setSelectedLocation(newLoc);
            setIsDropdownOpen(false);
            setPinnedDepotId(null);
            setDepotSearchTrigger((n) => n + 1);
          }}
          heightClassName="flex-1 h-[48dvh] min-h-[380px] sm:h-[54dvh] sm:min-h-[460px]"
        />

        {/* Searching Nearby Gas Stations Live Screen Overlay */}
        {isSearchingDepots ? (
          <div
            role="status"
            aria-live="polite"
            className="absolute inset-x-4 top-4 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-md z-20 bg-white/95 backdrop-blur-md rounded-2xl border border-[#0E8A45]/25 shadow-2xl p-4 flex items-center gap-3.5 animate-in fade-in duration-150"
          >
            <div className="relative w-11 h-11 rounded-2xl bg-[#E6F7ED] text-[#0E8A45] flex items-center justify-center shrink-0">
              <span className="absolute inset-0 rounded-2xl bg-[#0E8A45]/20 animate-ping" />
              <Flame className="w-5 h-5 relative z-10" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-extrabold text-[#15191C] flex items-center gap-2">
                <span>Searching nearby gas stations...</span>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0E8A45] shrink-0" />
              </p>
              <p className="text-[11px] text-[#6B7280] truncate mt-0.5">
                Locating open LPG depots serving {selectedLocation.name}
              </p>
            </div>
          </div>
        ) : activePinnedDepot ? (
          <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-10 max-w-[92%]">
            <div className="bg-[#0E8A45] text-white text-[11px] font-bold px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 whitespace-nowrap truncate">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                Depot found &amp; pinned: {activePinnedDepot.name} ({activePinnedDepot.calculatedDistanceKm} km)
              </span>
            </div>
          </div>
        ) : (
          <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-10 max-w-[90%]">
            <div className="bg-neutral-900/85 backdrop-blur-md text-white text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-md whitespace-nowrap truncate">
              Tap anywhere or drag the pin inside a green zone
            </div>
          </div>
        )}
      </div>

      {/* Bottom Selected Destination & Found Delivery Depot Card */}
      <div className="bg-white border-t border-neutral-200/90 rounded-t-3xl shadow-[0_-8px_30px_rgba(15,23,42,0.08)] px-4 sm:px-6 py-4 z-20 space-y-3">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              isSearchingDepots
                ? 'bg-[#E6F7ED] text-[#0E8A45]'
                : isCovered
                  ? 'bg-[#EDF6F1] text-[#0E8A45]'
                  : 'bg-rose-50 text-rose-600'
            }`}
          >
            {isSearchingDepots ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <MapPin className="w-5 h-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
                Delivery Location
              </p>
              {isSearchingDepots || isCheckingCoverage ? (
                <span className="text-[11px] font-bold text-[#0E8A45] inline-flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Searching depots...
                </span>
              ) : isCovered && activePinnedDepot ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0E8A45]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {depotSearchResult.nearbyDepots.length} nearby{' '}
                  {depotSearchResult.nearbyDepots.length === 1 ? 'depot' : 'depots'} pinned
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

        {/* Found Delivery Depot Summary Card (pinned directly on map) */}
        {!isSearchingDepots && activePinnedDepot && (
          <div className="rounded-2xl bg-[#F4FBF7] border border-[#0E8A45]/25 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#0E8A45] text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                  {activePinnedDepot.brandLettermark}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-extrabold text-[#15191C] truncate">
                      {activePinnedDepot.name}
                    </span>
                    <span className="text-[10px] font-bold text-[#0E8A45] bg-white border border-[#0E8A45]/25 px-1.5 py-0.5 rounded-md shrink-0">
                      Pinned on Map
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[#6B7280] mt-0.5 flex-wrap">
                    <span className="inline-flex items-center gap-0.5 font-bold text-[#15191C]">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {activePinnedDepot.rating.toFixed(1)}
                    </span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-[#0E8A45] tabular-nums">
                      <Navigation className="w-3 h-3" />
                      {activePinnedDepot.calculatedDistanceKm} km
                    </span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {activePinnedDepot.deliveryTimeMin}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] text-[#6B7280] block">From</span>
                <span className="text-xs font-extrabold text-[#0E8A45] tabular-nums">
                  KSh {activePinnedDepot.lowestRefillPrice.toLocaleString()}
                </span>
              </div>
            </div>

            {depotSearchResult.nearbyDepots.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1 border-t border-[#0E8A45]/10">
                <span className="text-[10px] font-bold text-[#6B7280] shrink-0">Nearby:</span>
                {depotSearchResult.nearbyDepots.map((depot) => {
                  const isSelected = depot.id === activePinnedDepot.id;
                  return (
                    <button
                      key={depot.id}
                      type="button"
                      onClick={() => setPinnedDepotId(depot.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                        isSelected
                          ? 'bg-[#0E8A45] text-white'
                          : 'bg-white border border-neutral-200 text-[#15191C] hover:border-[#0E8A45]/40'
                      }`}
                    >
                      {depot.brand} · {depot.calculatedDistanceKm} km
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {!isSearchingDepots && !isCovered && coverage && (
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
          disabled={isSearchingDepots}
          className={`w-full min-h-[50px] rounded-2xl font-extrabold text-sm sm:text-base shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-70 ${
            isCovered
              ? 'bg-[#0E8A45] hover:bg-[#0B7138] active:scale-[0.99] text-white'
              : 'bg-neutral-900 hover:bg-neutral-800 text-white'
          }`}
        >
          <span>
            {isSearchingDepots
              ? 'Searching Nearby Gas Stations...'
              : 'Confirm Delivery Location & Depot'}
          </span>
          <ArrowRight className="w-4.5 h-4.5" />
        </button>
      </div>
    </div>
  );
};
