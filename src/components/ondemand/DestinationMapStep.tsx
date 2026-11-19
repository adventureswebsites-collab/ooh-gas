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
  Minus,
  Plus,
} from 'lucide-react';
import { MapboxDeliveryMap } from '../map/MapboxDeliveryMap';
import {
  CoverageCheckResult,
  CylinderSize,
  DeliveryZone,
  GasBrand,
  NairobiLocation,
  PurchaseType,
  RiderInfo,
  Supplier,
} from '../../types';
import { MARKET_BENCHMARK_PRICES, NAIROBI_LOCATIONS } from '../../data/mockData';
import { GeocodedPlace, reverseGeocode, searchPlaces } from '../../services/mapboxService';
import { checkDeliveryCoverage } from '../../services/deliveryZoneService';
import { recordRecentDeliveryLocation } from '../../services/recentLocationsService';
import {
  findNearestDeliveryDepots,
  NearbyDepotSearchResult,
} from '../../services/supplierMatchingService';

export interface DestinationGasSelection {
  cylinderSize: CylinderSize;
  brandPreference: GasBrand;
  quantity: number;
  purchaseType: PurchaseType;
  pinnedDepot: Supplier | null;
}

interface DestinationMapStepProps {
  initialLocation: NairobiLocation;
  initialSearchQuery?: string;
  autoDetectGpsOnMount?: boolean;
  autoSearchDepotsOnMount?: boolean;
  customerId?: string | null;
  suppliers: Supplier[];
  riders: RiderInfo[];
  zones: DeliveryZone[];
  initialSize?: CylinderSize;
  initialBrandPreference?: GasBrand;
  initialQuantity?: number;
  initialPurchaseType?: PurchaseType;
  onZonesUpdated: () => void;
  onBack: () => void;
  onConfirmLocation: (
    confirmedLocation: NairobiLocation,
    coverage: CoverageCheckResult | null,
    gasSelection: DestinationGasSelection
  ) => void;
}

const GAS_COMPANIES: Array<{ brand: 'K-Gas' | 'TotalEnergies' | 'Shell Gas'; label: string }> = [
  { brand: 'K-Gas', label: 'K-Gas' },
  { brand: 'TotalEnergies', label: 'TotalEnergies' },
  { brand: 'Shell Gas', label: 'Shell Gas' },
];

const QUICK_CYLINDER_SIZES: CylinderSize[] = ['6kg', '13kg', '22.5kg', '29kg'];

export const DestinationMapStep: React.FC<DestinationMapStepProps> = ({
  initialLocation,
  initialSearchQuery = '',
  autoDetectGpsOnMount = false,
  autoSearchDepotsOnMount = true,
  customerId,
  suppliers,
  riders,
  zones,
  initialSize = '13kg',
  initialBrandPreference = 'Any',
  initialQuantity = 1,
  initialPurchaseType = 'refill',
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
  const [roadRouteInfo, setRoadRouteInfo] = useState<{
    supplierId: string;
    distanceKm: number;
    durationMin: number;
    source?: 'mapbox' | 'osrm' | 'fallback';
  } | null>(null);

  // Choose Your Gas (Gas Company, Cylinder kg, Amount / Quantity) state in bottom panel
  const [selectedSize, setSelectedSize] = useState<CylinderSize>(initialSize);
  const [selectedBrand, setSelectedBrand] = useState<GasBrand>(initialBrandPreference);
  const [quantity, setQuantity] = useState<number>(Math.max(1, initialQuantity));
  const [purchaseType, setPurchaseType] = useState<PurchaseType>(initialPurchaseType);

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
  // Respect chosen gas company if a matching nearby depot exists
  useEffect(() => {
    if (isSearchingDepots || isCheckingCoverage) return;
    if (depotSearchResult.found && depotSearchResult.primaryDepot) {
      const brandMatch =
        selectedBrand !== 'Any'
          ? depotSearchResult.nearbyDepots.find((d) => d.brand === selectedBrand)
          : undefined;
      setPinnedDepotId((prev) => {
        if (brandMatch) return brandMatch.id;
        const stillExists = depotSearchResult.nearbyDepots.some((d) => d.id === prev);
        return stillExists && prev ? prev : depotSearchResult.primaryDepot!.id;
      });
    } else {
      setPinnedDepotId(null);
    }
  }, [isSearchingDepots, isCheckingCoverage, depotSearchResult, selectedBrand]);

  // Merge live calculated (and actual road-routed) distances into suppliers passed to the map
  const suppliersWithLiveDistance: Supplier[] = useMemo(() => {
    if (depotSearchResult.nearbyDepots.length === 0) return suppliers;
    const byId = new Map(depotSearchResult.nearbyDepots.map((d) => [d.id, d]));
    return suppliers.map((s) => {
      const matched = byId.get(s.id);
      if (!matched) return s;
      if (roadRouteInfo && roadRouteInfo.supplierId === matched.id) {
        return { ...matched, distanceKm: roadRouteInfo.distanceKm };
      }
      return matched;
    });
  }, [suppliers, depotSearchResult.nearbyDepots, roadRouteInfo]);

  const activePinnedDepot = useMemo(() => {
    if (!depotSearchResult.found) return null;
    return (
      depotSearchResult.nearbyDepots.find((d) => d.id === pinnedDepotId) ||
      depotSearchResult.primaryDepot
    );
  }, [depotSearchResult, pinnedDepotId]);

  const activeRouteMetrics = useMemo(() => {
    if (!activePinnedDepot) return null;
    if (roadRouteInfo && roadRouteInfo.supplierId === activePinnedDepot.id) {
      return {
        distanceKm: roadRouteInfo.distanceKm,
        durationMin: roadRouteInfo.durationMin,
      };
    }
    const estRoadKm = Math.max(
      0.2,
      Math.round(activePinnedDepot.calculatedDistanceKm * 1.32 * 10) / 10
    );
    const estMinutes = Math.max(3, Math.round((estRoadKm / 22) * 60));
    return { distanceKm: estRoadKm, durationMin: estMinutes };
  }, [activePinnedDepot, roadRouteInfo]);

  const effectiveBrandForPrice: 'K-Gas' | 'TotalEnergies' | 'Shell Gas' | null = useMemo(() => {
    if (selectedBrand !== 'Any') return selectedBrand;
    return activePinnedDepot?.brand || null;
  }, [selectedBrand, activePinnedDepot]);

  const pricingSupplier = useMemo(() => {
    if (selectedBrand !== 'Any') {
      return (
        depotSearchResult.nearbyDepots.find((d) => d.brand === selectedBrand) ||
        suppliers.find((s) => s.brand === selectedBrand) ||
        activePinnedDepot
      );
    }
    return activePinnedDepot || suppliers[0] || null;
  }, [selectedBrand, depotSearchResult.nearbyDepots, suppliers, activePinnedDepot]);

  const getSizePricing = (size: CylinderSize): { unitPrice: number; inStock: boolean } => {
    const supCyl = pricingSupplier?.cylinders.find((c) => c.size === size);
    if (supCyl) {
      return {
        unitPrice: purchaseType === 'refill' ? supCyl.refillPrice : supCyl.completePrice,
        inStock: supCyl.inStock !== false,
      };
    }
    const bench = MARKET_BENCHMARK_PRICES[size];
    return {
      unitPrice: purchaseType === 'refill' ? bench.refillPrice : bench.completePrice,
      inStock: true,
    };
  };

  const selectedSizePricing = getSizePricing(selectedSize);
  const gasSubtotal = selectedSizePricing.unitPrice * quantity;

  // Ensure selectedSize stays on an in-stock cylinder when switching gas companies
  useEffect(() => {
    if (!selectedSizePricing.inStock) {
      const firstInStock = QUICK_CYLINDER_SIZES.find((sz) => getSizePricing(sz).inStock);
      if (firstInStock) {
        setSelectedSize(firstInStock);
      }
    }
  }, [pricingSupplier, selectedSizePricing.inStock]);

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
    onConfirmLocation(selectedLocation, coverage, {
      cylinderSize: selectedSize,
      brandPreference: selectedBrand,
      quantity,
      purchaseType,
      pinnedDepot: pricingSupplier || activePinnedDepot || null,
    });
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
      <div className="relative flex-1 flex flex-col min-h-[290px] sm:min-h-[360px]">
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
          onPreviewRouteUpdated={setRoadRouteInfo}
          onSelectSupplierPin={(sup) => {
            setPinnedDepotId(sup.id);
            setSelectedBrand(sup.brand);
          }}
          onOpenLocationModal={() => setIsDropdownOpen(true)}
          onSelectLocation={(newLoc) => {
            setSelectedLocation(newLoc);
            setIsDropdownOpen(false);
            setPinnedDepotId(null);
            setDepotSearchTrigger((n) => n + 1);
          }}
          heightClassName="flex-1 h-[38dvh] min-h-[290px] sm:h-[44dvh] sm:min-h-[360px]"
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
                {activePinnedDepot.name} ·{' '}
                {activeRouteMetrics
                  ? `${activeRouteMetrics.distanceKm} km · ~${activeRouteMetrics.durationMin} min`
                  : `${activePinnedDepot.calculatedDistanceKm} km`}
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

      {/* Bottom "Choose your gas" Sheet with Amount, Gas Company & Cylinder kg */}
      <div className="bg-white border-t border-neutral-200/90 rounded-t-3xl shadow-[0_-8px_30px_rgba(15,23,42,0.08)] px-4 sm:px-6 py-4 z-20 space-y-3.5">
        {/* Title Row: "Choose your gas" + Live KSh Amount */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-extrabold text-[#15191C] tracking-tight leading-tight">
              Choose your gas
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-[#6B7280] mt-0.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-[#0E8A45] shrink-0" />
              <span className="font-semibold text-[#15191C] truncate">{selectedLocation.name}</span>
              {!isSearchingDepots && activePinnedDepot && (
                <span className="truncate text-[#0E8A45] font-semibold shrink-0">
                  · {activePinnedDepot.name} (
                  {activeRouteMetrics
                    ? `${activeRouteMetrics.distanceKm} km · ~${activeRouteMetrics.durationMin} min`
                    : `${activePinnedDepot.calculatedDistanceKm} km`}
                  )
                </span>
              )}
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] block">
              Amount
            </span>
            <span className="text-base sm:text-lg font-extrabold text-[#0E8A45] tabular-nums">
              KSh {gasSubtotal.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Gas Company Selection */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-[#6B7280]">Gas company</span>
            <span className="font-semibold text-[#15191C]">
              {effectiveBrandForPrice || 'Any verified depot'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {GAS_COMPANIES.map(({ brand, label }) => {
              const matchedDepot = depotSearchResult.nearbyDepots.find((d) => d.brand === brand);
              const isSelected = selectedBrand === brand;
              const isRoutedMatch =
                Boolean(matchedDepot && roadRouteInfo && roadRouteInfo.supplierId === matchedDepot.id);
              const displayKm = matchedDepot
                ? isRoutedMatch && roadRouteInfo
                  ? roadRouteInfo.distanceKm
                  : matchedDepot.calculatedDistanceKm
                : null;
              const displayMin =
                isRoutedMatch && roadRouteInfo
                  ? roadRouteInfo.durationMin
                  : matchedDepot
                  ? Math.max(3, Math.round(((matchedDepot.calculatedDistanceKm * 1.32) / 22) * 60))
                  : null;
              return (
                <button
                  key={brand}
                  type="button"
                  onClick={() => {
                    setSelectedBrand(brand);
                    if (matchedDepot) setPinnedDepotId(matchedDepot.id);
                  }}
                  className={`min-h-[44px] px-2.5 py-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-center ${
                    isSelected
                      ? 'bg-[#EDF6F1] border-[#0E8A45] text-[#0E8A45] ring-1 ring-[#0E8A45]/30'
                      : 'bg-white border-neutral-200 text-[#15191C] hover:border-[#0E8A45]/45'
                  }`}
                >
                  <span className="text-xs font-extrabold truncate block">{label}</span>
                  <span className="text-[10px] font-semibold text-[#6B7280] tabular-nums truncate block">
                    {displayKm !== null && displayMin !== null
                      ? `${displayKm} km · ~${displayMin}m`
                      : 'Available'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cylinder Weight (kg) + Refill/New + Quantity Stepper */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-[#6B7280]">Cylinder size (kg)</span>
            <div className="inline-flex items-center rounded-lg bg-[#F6F7F8] p-0.5 border border-neutral-200/80">
              <button
                type="button"
                onClick={() => setPurchaseType('refill')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                  purchaseType === 'refill'
                    ? 'bg-white text-[#15191C] shadow-xs'
                    : 'text-[#6B7280] hover:text-[#15191C]'
                }`}
              >
                Refill
              </button>
              <button
                type="button"
                onClick={() => setPurchaseType('complete')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                  purchaseType === 'complete'
                    ? 'bg-white text-[#15191C] shadow-xs'
                    : 'text-[#6B7280] hover:text-[#15191C]'
                }`}
              >
                New + Gas
              </button>
            </div>
          </div>

          <div className="flex items-stretch gap-2">
            <div className="grid grid-cols-4 gap-1.5 flex-1">
              {QUICK_CYLINDER_SIZES.map((sz) => {
                const { unitPrice, inStock } = getSizePricing(sz);
                const isSelected = selectedSize === sz;
                return (
                  <button
                    key={sz}
                    type="button"
                    disabled={!inStock}
                    onClick={() => setSelectedSize(sz)}
                    className={`min-h-[48px] px-1.5 py-1.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center disabled:opacity-45 disabled:cursor-not-allowed ${
                      isSelected
                        ? 'bg-[#0E8A45] border-[#0E8A45] text-white shadow-xs'
                        : 'bg-white border-neutral-200 text-[#15191C] hover:border-[#0E8A45]/50'
                    }`}
                  >
                    <span className="text-xs font-extrabold leading-tight whitespace-nowrap">
                      {sz}
                    </span>
                    <span
                      className={`text-[10px] font-semibold tabular-nums whitespace-nowrap mt-0.5 ${
                        isSelected ? 'text-emerald-100' : 'text-[#6B7280]'
                      }`}
                    >
                      {inStock ? `KSh ${unitPrice.toLocaleString()}` : 'Out'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Cylinder Quantity Stepper */}
            <div className="flex items-center gap-1 rounded-xl border border-neutral-200 bg-[#F6F7F8] px-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Decrease cylinder quantity"
                className="w-8 h-9 flex items-center justify-center rounded-lg hover:bg-white text-[#15191C] cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-5 text-center text-xs font-extrabold text-[#15191C] tabular-nums">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(5, q + 1))}
                aria-label="Increase cylinder quantity"
                className="w-8 h-9 flex items-center justify-center rounded-lg hover:bg-white text-[#15191C] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

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
          <span className="truncate">
            {isSearchingDepots
              ? 'Searching Nearby Gas Stations...'
              : `Confirm ${quantity}× ${selectedSize} ${
                  effectiveBrandForPrice || 'Gas'
                } · KSh ${gasSubtotal.toLocaleString()}`}
          </span>
          <ArrowRight className="w-4.5 h-4.5 shrink-0" />
        </button>
      </div>
    </div>
  );
};
