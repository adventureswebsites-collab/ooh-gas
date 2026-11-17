import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import L from 'leaflet';
import 'mapbox-gl/dist/mapbox-gl.css';
import 'leaflet/dist/leaflet.css';
import {
  Supplier,
  RiderInfo,
  NairobiLocation,
  OnDemandOrderState,
  DeliveryZone,
  CoverageCheckResult,
  PolygonCoordinate,
} from '../../types';
import {
  getMapboxToken,
  searchPlaces,
  reverseGeocode,
  getDirectionsRoute,
  isWebGLAvailable,
  GeocodedPlace,
} from '../../services/mapboxService';
import { adminSaveZone, getStoredAdminToken } from '../../services/deliveryZoneService';
import { NAIROBI_LOCATIONS } from '../../data/mockData';
import { MapboxTokenModal } from './MapboxTokenModal';
import { AdminZoneModal } from './AdminZoneModal';
import {
  MapPin,
  Navigation,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Key,
  Layers,
  Loader2,
  Compass,
  X,
  Shield,
  Check,
  AlertTriangle,
  Save,
  LocateFixed,
} from 'lucide-react';

interface MapboxDeliveryMapProps {
  currentLocation: NairobiLocation;
  suppliers: Supplier[];
  riders?: RiderInfo[];
  activeOrder?: OnDemandOrderState | null;
  riderProgressPercent?: number;
  isExpanded?: boolean;
  coverageResult?: CoverageCheckResult | null;
  isCoverageLoading?: boolean;
  zones?: DeliveryZone[];
  onZonesUpdated?: () => void;
  onOpenLocationModal?: () => void;
  onSelectLocation?: (location: NairobiLocation) => void;
  onSelectSupplierPin?: (supplier: Supplier) => void;
  onSelectRiderPin?: (rider: RiderInfo) => void;
  searchValue?: string;
  onSearchValueChange?: (value: string) => void;
  isHomeHero?: boolean;
  liveDriverLocation?: {
    latitude: number;
    longitude: number;
    heading: number | null;
    speed: number | null;
    accuracy: number;
    recordedAt?: string;
  } | null;
  onDriverTelemetryUpdated?: (telemetry: { distanceRemainingKm: number; etaMinutes: number }) => void;
  heightClassName?: string;
  hideSearchOverlay?: boolean;
}

// ==========================================
// Uber-Style Realistic Motorbike Vehicle Marker
// Features top-down motorcycle, rider with helmet, cargo box,
// dynamic headlight beam projection, and smooth heading rotation
// ==========================================
function createRealisticMotorbikeMarkerElement(
  heading: number = 0,
  speed: number | null = 28,
  isLiveGps: boolean = false,
  statusLabelText?: string
): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'uber-live-driver-marker-container';
  container.style.cssText =
    'position: relative; width: 58px; height: 58px; display: flex; align-items: center; justify-content: center; cursor: pointer; user-select: none;';

  const pulseAura = `<div style="position: absolute; inset: 4px; border-radius: 9999px; background: rgba(34, 105, 70, 0.16); animation: ping 2.6s cubic-bezier(0, 0, 0.2, 1) infinite; pointer-events: none;"></div>`;

  const topPill = statusLabelText
    ? `<div style="position: absolute; top: -22px; left: 50%; transform: translateX(-18%); background: #ffffff; color: #16A34A; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 10px; font-weight: 800; padding: 3px 9px; border-radius: 9999px; border: 1px solid rgba(0,0,0,0.06); box-shadow: 0 3px 10px rgba(0,0,0,0.14); white-space: nowrap; display: flex; align-items: center; gap: 5px; pointer-events: none;">
        <span style="width: 6px; height: 6px; border-radius: 9999px; background: #16A34A;"></span>
        <span style="text-decoration: underline; text-decoration-color: rgba(22,163,74,0.45); text-underline-offset: 2px;">${statusLabelText}</span>
      </div>`
    : speed !== null
    ? `<div class="uber-speed-badge" style="position: absolute; bottom: -8px; background: #15191C; color: #ffffff; font-size: 8.5px; font-weight: 800; padding: 1.5px 6px; border-radius: 9999px; border: 1.5px solid #22C55E; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.28); display: flex; align-items: center; gap: 3.5px;">
        <span style="width: 5px; height: 5px; border-radius: 9999px; background: ${isLiveGps ? '#22C55E' : '#86EFAC'};"></span>
        <span>${speed > 0 ? `${Math.round(speed)} km/h` : 'En Route'}</span>
      </div>`
    : '';

  container.innerHTML = `
    ${pulseAura}
    ${topPill}

    <!-- Green Courier Delivery Motorcycle SVG rotated by heading -->
    <div class="uber-vehicle-body" style="transform: rotate(${heading}deg); transition: transform 0.35s cubic-bezier(0.2, 0, 0, 1); filter: drop-shadow(0 4px 10px rgba(0,0,0,0.28));">
      <svg width="44" height="44" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="24" cy="25" rx="8" ry="17" fill="rgba(0,0,0,0.18)" />
        <rect x="22" y="33" width="4" height="10" rx="2" fill="#15191C" />
        <rect x="14.5" y="21" width="19" height="13.5" rx="3" fill="#16A34A" stroke="#ffffff" stroke-width="1.6" />
        <rect x="18" y="24" width="12" height="2" rx="1" fill="#ffffff" fill-opacity="0.9" />
        <ellipse cx="24" cy="17.5" rx="7.2" ry="5" fill="#14532D" stroke="#ffffff" stroke-width="1" />
        <circle cx="24" cy="15" r="4.3" fill="#22C55E" stroke="#ffffff" stroke-width="1.3" />
        <path d="M21.8 13.4C22.6 12.8 25.4 12.8 26.2 13.4" stroke="#15191C" stroke-width="1.8" stroke-linecap="round" />
        <path d="M14 11.5L24 12.5L34 11.5" stroke="#334155" stroke-width="2.2" stroke-linecap="round" />
        <rect x="22" y="3" width="4" height="9" rx="2" fill="#15191C" />
        <circle cx="24" cy="4" r="2.2" fill="#FEF08A" />
      </svg>
    </div>
  `;

  return container;
}

// ==========================================
// Uber-Style Distinct Destination Marker
// ==========================================
function createUberDestinationMarkerElement(label: string = 'Delivery Location'): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'uber-destination-marker';
  container.style.cssText =
    'position: relative; display: flex; flex-direction: column; align-items: center; user-select: none;';

  container.innerHTML = `
    <div style="position: absolute; top: -24px; white-space: nowrap; background: #15191C; color: #ffffff; font-size: 9.5px; font-weight: 800; padding: 2px 8px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
      ${label}
    </div>
    <div style="background-color: #2563EB; border: 3px solid #ffffff; width: 28px; height: 28px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(37,99,235,0.45);">
      <div style="width: 8px; height: 8px; background-color: #ffffff; border-radius: 9999px;"></div>
    </div>
  `;

  return container;
}

// ==========================================
// Green Teardrop Gas-Cylinder Marker + Clean White Callout (Matches Reference)
// ==========================================
function createGasCylinderMarkerElement(
  sup: Supplier,
  isServing: boolean,
  isOutOfArea: boolean,
  showCallout: boolean = true
): HTMLDivElement {
  const container = document.createElement('div');
  container.className = `ooh-gas-depot-marker animate-marker-pop cursor-pointer ${
    isOutOfArea ? 'opacity-60 z-10' : 'z-20'
  }`;

  const pinBg = isOutOfArea ? '#64748B' : '#16A34A';
  const shortName =
    sup.brand === 'K-Gas'
      ? 'K-Gas Depot'
      : sup.brand === 'TotalEnergies'
      ? 'TotalEnergies'
      : sup.brand === 'Shell Gas'
      ? 'Shell Gas'
      : sup.name.split(' ')[0];

  const calloutHtml = showCallout
    ? `<div style="margin-left: 6px; background: rgba(255,255,255,0.97); border: 1px solid rgba(0,0,0,0.06); border-radius: 12px; padding: 5px 10px; box-shadow: 0 4px 14px rgba(0,0,0,0.12); white-space: nowrap; text-align: left; font-family: 'Plus Jakarta Sans', sans-serif;">
        <div style="font-size: 11px; font-weight: 800; color: #15191C; line-height: 1.15;">${shortName}</div>
        <div style="font-size: 10px; font-weight: 600; color: #6B7280; line-height: 1.2;">${sup.distanceKm} km</div>
      </div>`
    : '';

  container.innerHTML = `
    <div style="position: relative; display: flex; align-items: center; user-select: none;">
      <div style="position: relative; width: 34px; height: 42px; display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.24));">
        <svg width="34" height="42" viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 1C8.611 1 1 8.611 1 18C1 29.75 18 43 18 43C18 43 35 29.75 35 18C35 8.611 27.389 1 18 1Z" fill="${pinBg}" stroke="#ffffff" stroke-width="2"/>
          <path d="M15 9.5H21M16.2 9.5V11.2H19.8V9.5" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round"/>
          <rect x="12.5" y="11.5" width="11" height="14" rx="3" fill="#ffffff"/>
          <path d="M12.5 16.5H23.5" stroke="${pinBg}" stroke-width="1.4"/>
          <rect x="14.5" y="25.5" width="7" height="1.8" rx="0.9" fill="#ffffff"/>
        </svg>
      </div>
      ${calloutHtml}
    </div>
  `;

  return container;
}

// Rich Supplier Details Popup Content
function createSupplierPopupHtml(
  sup: Supplier,
  isServing: boolean,
  isOutOfArea: boolean,
  hasSelection: boolean
): string {
  const servingBadge = hasSelection
    ? isServing
      ? `<div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; border-radius: 8px; padding: 5px 8px; font-size: 11px; font-weight: 700; margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
          <span>✓</span> Delivers to your pinned location
        </div>`
      : `<div style="background-color: #fef2f2; border: 1px solid #fecaca; color: #991b1b; border-radius: 8px; padding: 5px 8px; font-size: 11px; font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
          <span>✕</span> Outside this depot's active delivery zone
        </div>`
    : '';

  return `
    <div style="min-width: 210px; max-width: 250px; padding: 10px 12px; font-family: ui-sans-serif, system-ui, sans-serif; text-align: left; color: #0f172a;">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px solid #f1f5f9;">
        <div>
          <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #10b981;">LPG Depot</span>
          <h4 style="margin: 0; font-size: 13px; font-weight: 800; color: #0f172a; line-height: 1.2;">${sup.name}</h4>
        </div>
        <div style="background: ${sup.isOpen ? '#f0fdf4' : '#fef2f2'}; border: 1px solid ${sup.isOpen ? '#bbf7d0' : '#fecaca'}; color: ${sup.isOpen ? '#166534' : '#991b1b'}; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 6px; white-space: nowrap;">
          ${sup.isOpen ? '● Open' : '○ Closed'}
        </div>
      </div>

      ${servingBadge}

      <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: #475569; margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #64748b;">Area:</span>
          <span style="font-weight: 600; color: #1e293b;">${sup.locationArea}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #64748b;">Distance:</span>
          <span style="font-weight: 600; color: #1e293b;">${sup.distanceKm} km away</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #64748b;">Est. Delivery:</span>
          <span style="font-weight: 600; color: #1e293b;">${sup.deliveryTimeMin}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #64748b;">Delivery Fee:</span>
          <span style="font-weight: 700; color: #047857;">${sup.deliveryFee === 0 ? 'FREE' : `KSh ${sup.deliveryFee}`}</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 2px;">
          <span style="color: #64748b;">Rating:</span>
          <span style="color: #b45309; font-weight: 700;">★ ${sup.rating.toFixed(1)} (${sup.reviewCount})</span>
        </div>
      </div>

      <div style="font-size: 9.5px; color: #94a3b8; text-align: center; border-top: 1px dashed #e2e8f0; padding-top: 6px;">
        Verified Ooh Gas Supplier Network
      </div>
    </div>
  `;
}

export const MapboxDeliveryMap: React.FC<MapboxDeliveryMapProps> = ({
  currentLocation,
  suppliers,
  riders = [],
  activeOrder,
  riderProgressPercent = 35,
  isExpanded = false,
  coverageResult,
  isCoverageLoading = false,
  zones = [],
  onZonesUpdated,
  onOpenLocationModal,
  onSelectLocation,
  onSelectSupplierPin,
  onSelectRiderPin,
  searchValue,
  onSearchValueChange,
  isHomeHero = false,
  liveDriverLocation,
  onDriverTelemetryUpdated,
  heightClassName,
  hideSearchOverlay = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto-follow delivery vehicle toggle
  const [autoFollowVehicle, setAutoFollowVehicle] = useState(true);
  const [driverRouteInfo, setDriverRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null);
  const currentRiderPosRef = useRef<[number, number] | null>(null);
  const riderHeadingRef = useRef<number>(0);
  const lastReroutedPosRef = useRef<[number, number] | null>(null);
  const lastReroutedTimeRef = useRef<number>(0);
  const currentRouteCoordsRef = useRef<[number, number][]>([]);


  // Engine state: mapbox-gl (if WebGL available AND token set) or clean Google Maps-style Leaflet Voyager road tiles
  const [engine, setEngine] = useState<'mapbox-gl' | 'leaflet'>(() => {
    const token = getMapboxToken();
    return isWebGLAvailable() && Boolean(token) ? 'mapbox-gl' : 'leaflet';
  });

  // Token management
  const [activeToken, setActiveToken] = useState<string>(() => getMapboxToken());
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isLayersMenuOpen, setIsLayersMenuOpen] = useState(false);

  // Map style state: Streets (Google Maps clean light road tiles) vs Minimal Light
  const [mapStyle, setMapStyle] = useState<'streets' | 'light'>('streets');
  const [showZonesOverlay, setShowZonesOverlay] = useState(!isHomeHero);

  // Interactive Admin Polygon Vertex Editor on Map
  const [adminEditingZone, setAdminEditingZone] = useState<DeliveryZone | null>(null);
  const [editedPolygon, setEditedPolygon] = useState<PolygonCoordinate[]>([]);
  const [isSavingPolygon, setIsSavingPolygon] = useState(false);

  // Search state
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const effectiveSearchQuery = searchValue !== undefined ? searchValue : internalSearchQuery;
  const setSearchQuery = (val: string) => {
    setInternalSearchQuery(val);
    onSearchValueChange?.(val);
  };
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GeocodedPlace[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchDebounceRef = useRef<any>(null);

  // Geolocation state
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [gpsStatusMessage, setGpsStatusMessage] = useState<string | null>(null);

  // Address geocoding status
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Fullscreen / Expanded local toggle
  const [isFullscreen, setIsFullscreen] = useState(isExpanded);

  // Map references
  const mapboxMapRef = useRef<mapboxgl.Map | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const leafletCustomerMarkerRef = useRef<L.Marker | null>(null);
  const leafletRiderMarkerRef = useRef<L.Marker | null>(null);
  const leafletIdleRidersRef = useRef<L.Marker[]>([]);
  const leafletSupplierMarkersRef = useRef<L.Marker[]>([]);
  const leafletRouteLayerRef = useRef<L.Polyline | null>(null);
  const leafletZoneLayersRef = useRef<L.Polygon[]>([]);
  const leafletVertexMarkersRef = useRef<L.Marker[]>([]);

  const mapboxCustomerMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const mapboxRiderMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const mapboxIdleRidersRef = useRef<mapboxgl.Marker[]>([]);
  const mapboxSupplierMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const mapboxVertexMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const mapboxAnimationFrameRef = useRef<number | null>(null);

  const isDedicatedTracking = Boolean(activeOrder && activeOrder.stage !== 'idle');
  const matchedSupplier = activeOrder?.matchedSupplier || suppliers[0];

  const customerCoords = {
    lng: currentLocation.coordinates?.lng ?? 36.7856,
    lat: currentLocation.coordinates?.lat ?? -1.2921,
  };

  const supplierCoords = {
    lng: matchedSupplier?.coordinates?.lng ?? 36.7865,
    lat: matchedSupplier?.coordinates?.lat ?? -1.2785,
  };

  // Sync token from localStorage or storage events
  useEffect(() => {
    const handleStorage = () => {
      const token = getMapboxToken();
      if (token !== activeToken) {
        setActiveToken(token);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [activeToken]);

  // Handle forward search input with debounce (Mapbox Places + local Nairobi locations fallback)
  useEffect(() => {
    const q = effectiveSearchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const localMatches: GeocodedPlace[] = NAIROBI_LOCATIONS.filter(
      (loc) =>
        loc.name.toLowerCase().includes(q.toLowerCase()) ||
        loc.area.toLowerCase().includes(q.toLowerCase())
    ).map((loc) => ({
      id: loc.id,
      name: loc.name,
      area: loc.area,
      fullAddress: `${loc.name} · ${loc.area}`,
      coordinates: { lng: loc.coordinates.lng, lat: loc.coordinates.lat },
    }));

    if (!activeToken) {
      setSearchResults(localMatches);
      setIsSearching(false);
      return;
    }

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    setIsSearching(true);

    searchDebounceRef.current = setTimeout(async () => {
      const remote = await searchPlaces(
        q,
        { lng: customerCoords.lng, lat: customerCoords.lat },
        activeToken
      );
      const merged = remote.length > 0 ? remote : localMatches;
      setSearchResults(merged);
      setIsSearching(false);
    }, 280);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [effectiveSearchQuery, activeToken, customerCoords.lng, customerCoords.lat]);

  // Reverse geocode when pin moves
  const handlePinMoved = useCallback(
    async (lng: number, lat: number) => {
      setIsGeocoding(true);
      try {
        const addressInfo = await reverseGeocode(lng, lat, activeToken);
        const updatedLocation: NairobiLocation = {
          id: `pin-${lng.toFixed(4)}-${lat.toFixed(4)}`,
          name: addressInfo.name,
          area: addressInfo.area,
          details: addressInfo.details,
          coordinates: {
            lat,
            lng,
            x: 50,
            y: 50,
          },
        };
        if (onSelectLocation) {
          onSelectLocation(updatedLocation);
        }
      } catch (err) {
        console.error('Reverse geocode error:', err);
      } finally {
        setIsGeocoding(false);
      }
    },
    [activeToken, onSelectLocation]
  );

  // ==========================================
  // Leaflet Map Initialization (Zero-WebGL Safe)
  // ==========================================
  useEffect(() => {
    if (engine !== 'leaflet' || !mapContainerRef.current) return;

    mapContainerRef.current.innerHTML = '';

    const lMap = L.map(mapContainerRef.current, {
      center: [customerCoords.lat, customerCoords.lng],
      zoom: isDedicatedTracking ? 14 : 14.8,
      zoomControl: false,
      attributionControl: false,
    });

    leafletMapRef.current = lMap;

    const tileUrl = activeToken
      ? `https://api.mapbox.com/styles/v1/mapbox/${
          mapStyle === 'streets' ? 'streets-v12' : 'light-v11'
        }/tiles/256/{z}/{x}/{y}?access_token=${activeToken}`
      : mapStyle === 'streets'
      ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    const tiles = L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: '© Carto © OpenStreetMap',
    }).addTo(lMap);

    tiles.on('tileerror', () => {
      tiles.setUrl('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
    });

    setIsMapLoaded(true);
    setMapError(null);

    lMap.on('click', (e: L.LeafletMouseEvent) => {
      if (isDedicatedTracking || adminEditingZone) return;
      const { lat, lng } = e.latlng;
      if (leafletCustomerMarkerRef.current) {
        leafletCustomerMarkerRef.current.setLatLng([lat, lng]);
      }
      handlePinMoved(lng, lat);
    });

    const resizeObserver = new ResizeObserver(() => {
      lMap.invalidateSize();
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      lMap.remove();
      leafletMapRef.current = null;
      setIsMapLoaded(false);
    };
  }, [engine, activeToken, mapStyle, isDedicatedTracking]);

  // Leaflet: Render Delivery Zone Polygons with Subtle Glowing Breathing Animation
  useEffect(() => {
    if (engine !== 'leaflet' || !leafletMapRef.current || !isMapLoaded) return;
    const lMap = leafletMapRef.current;

    leafletZoneLayersRef.current.forEach((layer) => layer.remove());
    leafletZoneLayersRef.current = [];

    if (!showZonesOverlay || zones.length === 0) return;

    zones.forEach((zone) => {
      const isCurrentlyEditing = adminEditingZone?.id === zone.id;
      const polyCoords = isCurrentlyEditing ? editedPolygon : zone.polygon;
      const latLngs = polyCoords.map((c) => [c.lat, c.lng] as [number, number]);
      const isMatched = Boolean(coverageResult?.matchedZones?.some((mz) => mz.id === zone.id));

      const poly = L.polygon(latLngs, {
        color: zone.color,
        fillColor: zone.color,
        fillOpacity: zone.isActive ? (isCurrentlyEditing ? 0.38 : isMatched ? 0.28 : 0.15) : 0.05,
        weight: isCurrentlyEditing || isMatched ? 3.5 : zone.isActive ? 2 : 1.5,
        dashArray: zone.isActive ? undefined : '5, 5',
        className: isMatched || (zone.isActive && !adminEditingZone) ? 'leaflet-active-zone-pulse' : undefined,
      }).addTo(lMap);

      poly.bindTooltip(
        `<div style="font-family: sans-serif; font-size: 10px; font-weight: bold; color: ${zone.color};">
          ${zone.name} ${isMatched ? '★ Matching Area' : zone.isActive ? '✓ Active Service Area' : '(Inactive)'}
        </div>`,
        { sticky: true }
      );

      leafletZoneLayersRef.current.push(poly);
    });
  }, [engine, isMapLoaded, zones, showZonesOverlay, adminEditingZone, editedPolygon, coverageResult]);

  // Leaflet: Interactive Admin Polygon Vertex Handles
  useEffect(() => {
    if (engine !== 'leaflet' || !leafletMapRef.current || !isMapLoaded) return;
    const lMap = leafletMapRef.current;

    leafletVertexMarkersRef.current.forEach((m) => m.remove());
    leafletVertexMarkersRef.current = [];

    if (!adminEditingZone || editedPolygon.length === 0) return;

    editedPolygon.forEach((coord, idx) => {
      const handleIcon = L.divIcon({
        className: 'leaflet-vertex-handle',
        html: `
          <div style="background-color: ${adminEditingZone.color}; border: 2.5px solid #ffffff; width: 18px; height: 18px; border-radius: 9999px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; cursor: grab;">
            <div style="width: 5px; height: 5px; background-color: #ffffff; border-radius: 9999px;"></div>
          </div>
        `,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      const vertexMarker = L.marker([coord.lat, coord.lng], {
        icon: handleIcon,
        draggable: true,
      }).addTo(lMap);

      vertexMarker.on('drag', (e) => {
        const { lat, lng } = e.target.getLatLng();
        setEditedPolygon((prev) =>
          prev.map((p, i) => (i === idx ? { lat, lng } : p))
        );
      });

      leafletVertexMarkersRef.current.push(vertexMarker);
    });
  }, [engine, isMapLoaded, adminEditingZone, editedPolygon]);

  // Leaflet: Update customer marker
  useEffect(() => {
    if (engine !== 'leaflet' || !leafletMapRef.current || !isMapLoaded) return;
    const lMap = leafletMapRef.current;

    if (leafletCustomerMarkerRef.current) {
      leafletCustomerMarkerRef.current.remove();
    }

    const isOutOfZone = coverageResult && !coverageResult.isCovered;
    const customerIcon = L.divIcon({
      className: 'leaflet-custom-customer-icon',
      html: `
        <div style="position: relative; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; cursor: grab;">
          <div style="position: absolute; inset: 4px; border-radius: 9999px; background: ${
            isOutOfZone ? 'rgba(220,38,38,0.12)' : 'rgba(37, 99, 235, 0.14)'
          };"></div>
          <div style="position: absolute; inset: 14px; border-radius: 9999px; background: ${
            isOutOfZone ? 'rgba(220,38,38,0.24)' : 'rgba(37, 99, 235, 0.24)'
          };"></div>
          <div style="position: relative; background-color: ${
            isOutOfZone ? '#dc2626' : '#2563EB'
          }; border: 3.5px solid #ffffff; width: 22px; height: 22px; border-radius: 9999px; box-shadow: 0 3px 10px rgba(37,99,235,0.45);"></div>
        </div>
      `,
      iconSize: [64, 64],
      iconAnchor: [32, 32],
    });

    const marker = L.marker([customerCoords.lat, customerCoords.lng], {
      icon: customerIcon,
      draggable: !isDedicatedTracking && !adminEditingZone,
    }).addTo(lMap);

    if (!isDedicatedTracking) {
      marker.on('dragend', () => {
        const { lat, lng } = marker.getLatLng();
        handlePinMoved(lng, lat);
      });
    }

    leafletCustomerMarkerRef.current = marker;
  }, [
    engine,
    isMapLoaded,
    customerCoords.lat,
    customerCoords.lng,
    isDedicatedTracking,
    adminEditingZone,
    coverageResult,
    handlePinMoved,
  ]);

  // Leaflet: Supplier depot green cylinder pins with white callouts
  useEffect(() => {
    if (engine !== 'leaflet' || !leafletMapRef.current || !isMapLoaded) return;
    const lMap = leafletMapRef.current;

    leafletSupplierMarkersRef.current.forEach((m) => m.remove());
    leafletSupplierMarkersRef.current = [];

    const suppliersToShow = isDedicatedTracking
      ? [matchedSupplier].filter(Boolean)
      : suppliers.slice(0, 8);

    const eligibleSupplierIds = new Set((coverageResult?.eligibleSuppliers || []).map((s) => s.id));
    const hasLocationSelection = Boolean(coverageResult && (coverageResult.matchedZones.length > 0 || coverageResult.isCovered || coverageResult.checkedAt));

    suppliersToShow.forEach((sup) => {
      const lat = sup.coordinates?.lat ?? -1.2785;
      const lng = sup.coordinates?.lng ?? 36.7865;
      const isServing = hasLocationSelection ? eligibleSupplierIds.has(sup.id) : true;
      const isOutOfArea = hasLocationSelection ? !eligibleSupplierIds.has(sup.id) : false;

      const markerEl = createGasCylinderMarkerElement(sup, isServing, isOutOfArea, !isDedicatedTracking);
      const popupHtml = createSupplierPopupHtml(sup, isServing, isOutOfArea, hasLocationSelection);

      const depotIcon = L.divIcon({
        className: 'leaflet-custom-depot-icon',
        html: markerEl.outerHTML,
        iconSize: [148, 44],
        iconAnchor: [17, 40],
        popupAnchor: [0, -34],
      });

      const marker = L.marker([lat, lng], { icon: depotIcon }).addTo(lMap);
      if (onSelectSupplierPin) {
        marker.on('click', () => onSelectSupplierPin(sup));
      } else {
        marker.bindPopup(popupHtml, { maxWidth: 260, closeButton: true });
      }

      leafletSupplierMarkersRef.current.push(marker);
    });
  }, [engine, isMapLoaded, suppliers, matchedSupplier, isDedicatedTracking, coverageResult, onSelectSupplierPin]);

  // Leaflet: Idle Available Delivery Motorcycles around customer location on Home map
  useEffect(() => {
    if (engine !== 'leaflet' || !leafletMapRef.current || !isMapLoaded) return;
    const lMap = leafletMapRef.current;

    leafletIdleRidersRef.current.forEach((m) => m.remove());
    leafletIdleRidersRef.current = [];

    if (isDedicatedTracking || riders.length === 0) return;

    const offsets: Array<[number, number, number]> = [
      [0.0022, -0.0026, 45],
      [-0.0028, 0.0038, 210],
      [0.0034, 0.0029, 315],
    ];

    riders.slice(0, 4).forEach((rider, idx) => {
      const [dLat, dLng, heading] = offsets[idx % offsets.length];
      const lat = rider.coordinates?.lat ?? customerCoords.lat + dLat;
      const lng = rider.coordinates?.lng ?? customerCoords.lng + dLng;

      const statusText = idx === 1 ? 'On the way' : undefined;
      const el = createRealisticMotorbikeMarkerElement(heading, null, false, statusText);
      const bikeIcon = L.divIcon({
        className: 'leaflet-idle-rider-icon',
        html: el.outerHTML,
        iconSize: [58, 58],
        iconAnchor: [29, 29],
      });

      const marker = L.marker([lat, lng], { icon: bikeIcon }).addTo(lMap);
      if (onSelectRiderPin) {
        marker.on('click', () => onSelectRiderPin(rider));
      } else {
        marker.bindPopup(
          `<div style="padding:8px 10px;font-family:sans-serif;font-size:11px;min-width:160px;">
            <strong style="color:#15191C;display:block;">${rider.name}</strong>
            <span style="color:#226946;font-weight:700;">Available · ★ ${rider.rating}</span><br/>
            <span style="color:#6B7280;">${rider.vehicleModel} (${rider.plateNumber})</span>
          </div>`
        );
      }

      leafletIdleRidersRef.current.push(marker);
    });
  }, [engine, isMapLoaded, riders, isDedicatedTracking, customerCoords.lat, customerCoords.lng, onSelectRiderPin]);

  // Leaflet: Dedicated tracking route & moving rider
  useEffect(() => {
    if (engine !== 'leaflet' || !leafletMapRef.current || !isMapLoaded || !isDedicatedTracking) return;
    const lMap = leafletMapRef.current;

    const setupRouteAndRider = async () => {
      const origin: [number, number] = [supplierCoords.lng, supplierCoords.lat];
      const destination: [number, number] = [customerCoords.lng, customerCoords.lat];

      const routeData = await getDirectionsRoute(origin, destination, activeToken);
      const rawCoords = routeData?.coordinates || [origin, destination];
      const latLngs = rawCoords.map(([lng, lat]) => [lat, lng] as [number, number]);

      if (leafletRouteLayerRef.current) {
        leafletRouteLayerRef.current.remove();
      }

      leafletRouteLayerRef.current = L.polyline(latLngs, {
        color: '#10b981',
        weight: 5,
        opacity: 0.85,
        lineCap: 'round',
      }).addTo(lMap);

      lMap.fitBounds(leafletRouteLayerRef.current.getBounds(), { padding: [50, 50] });

      if (leafletRiderMarkerRef.current) {
        leafletRiderMarkerRef.current.remove();
      }

      let riderPos: [number, number];
      let heading = 0;
      let speedKmH = 24;
      let isLiveGps = false;

      if (
        liveDriverLocation &&
        !isNaN(liveDriverLocation.latitude) &&
        !isNaN(liveDriverLocation.longitude)
      ) {
        riderPos = [liveDriverLocation.latitude, liveDriverLocation.longitude];
        isLiveGps = true;
        speedKmH =
          liveDriverLocation.speed != null ? Math.round(liveDriverLocation.speed * 3.6) : 22;
        heading = liveDriverLocation.heading || 0;
      } else {
        const t = Math.min(100, Math.max(0, riderProgressPercent)) / 100;
        const index = Math.min(latLngs.length - 1, Math.floor(t * (latLngs.length - 1)));
        riderPos = latLngs[index] || latLngs[0];
      }

      const vehicleEl = createRealisticMotorbikeMarkerElement(heading, speedKmH, isLiveGps);
      const riderIcon = L.divIcon({
        className: 'leaflet-custom-rider-icon',
        html: vehicleEl.outerHTML,
        iconSize: [56, 56],
        iconAnchor: [28, 28],
      });

      leafletRiderMarkerRef.current = L.marker(riderPos, { icon: riderIcon }).addTo(lMap);
      if (autoFollowVehicle) {
        lMap.panTo(riderPos);
      }
    };

    setupRouteAndRider();
  }, [
    engine,
    isMapLoaded,
    isDedicatedTracking,
    riderProgressPercent,
    liveDriverLocation,
    autoFollowVehicle,
    supplierCoords.lng,
    supplierCoords.lat,
    customerCoords.lng,
    customerCoords.lat,
    activeToken,
  ]);

  // ==========================================
  // Mapbox GL JS Initialization (WebGL Supported)
  // ==========================================
  useEffect(() => {
    if (engine !== 'mapbox-gl' || !mapContainerRef.current) return;

    if (!activeToken) {
      setMapError('Mapbox access token is required to load interactive tiles.');
      return;
    }

    if (!isWebGLAvailable()) {
      setEngine('leaflet');
      return;
    }

    setMapError(null);
    mapboxgl.accessToken = activeToken;

    const styleUrl =
      mapStyle === 'streets'
        ? 'mapbox://styles/mapbox/streets-v12'
        : 'mapbox://styles/mapbox/light-v11';

    let map: mapboxgl.Map;
    try {
      map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: styleUrl,
        center: [customerCoords.lng, customerCoords.lat],
        zoom: isDedicatedTracking ? 13.8 : 14.5,
        attributionControl: false,
      });
    } catch (err: any) {
      console.warn('Mapbox GL WebGL initialization failed. Switching to Leaflet engine:', err);
      setEngine('leaflet');
      return;
    }

    mapboxMapRef.current = map;
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left');

    map.on('load', () => {
      setIsMapLoaded(true);
      if (isDedicatedTracking && activeToken) {
        addTrackingRoute(map);
      }
    });

    map.on('error', (e: any) => {
      if (e?.error?.status === 401) {
        setMapError('Invalid Mapbox access token. Please verify your public token.');
      }
    });

    map.on('click', (e) => {
      if (isDedicatedTracking || adminEditingZone) return;
      const { lng, lat } = e.lngLat;
      if (mapboxCustomerMarkerRef.current) {
        mapboxCustomerMarkerRef.current.setLngLat([lng, lat]);
      }
      handlePinMoved(lng, lat);
    });

    return () => {
      if (mapboxAnimationFrameRef.current) {
        cancelAnimationFrame(mapboxAnimationFrameRef.current);
        mapboxAnimationFrameRef.current = null;
      }
      mapboxVertexMarkersRef.current.forEach((m) => m.remove());
      mapboxVertexMarkersRef.current = [];
      map.remove();
      mapboxMapRef.current = null;
      setIsMapLoaded(false);
    };
  }, [engine, activeToken, mapStyle, isDedicatedTracking]);

  // Mapbox GL: Customer marker
  useEffect(() => {
    if (engine !== 'mapbox-gl' || !mapboxMapRef.current || !isMapLoaded) return;
    const map = mapboxMapRef.current;

    if (mapboxCustomerMarkerRef.current) {
      mapboxCustomerMarkerRef.current.remove();
    }

    let el: HTMLDivElement;

    if (isDedicatedTracking) {
      const destinationLabel =
        activeOrder?.destination.building ||
        activeOrder?.destination.estate?.split(',')[0] ||
        'Delivery Destination';
      el = createUberDestinationMarkerElement(destinationLabel);
    } else {
      const isOutOfZone = coverageResult && !coverageResult.isCovered;
      const dotColor = isOutOfZone ? '#dc2626' : '#2563EB';

      el = document.createElement('div');
      el.className = 'ooh-gas-customer-marker cursor-grab active:cursor-grabbing animate-marker-pop';
      el.innerHTML = `
        <div style="position: relative; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; inset: 4px; border-radius: 9999px; background: ${
            isOutOfZone ? 'rgba(220,38,38,0.12)' : 'rgba(37, 99, 235, 0.14)'
          };"></div>
          <div style="position: absolute; inset: 14px; border-radius: 9999px; background: ${
            isOutOfZone ? 'rgba(220,38,38,0.24)' : 'rgba(37, 99, 235, 0.24)'
          };"></div>
          <div style="position: relative; background-color: ${dotColor}; border: 3.5px solid #ffffff; width: 22px; height: 22px; border-radius: 9999px; box-shadow: 0 3px 10px rgba(37,99,235,0.45);"></div>
        </div>
      `;
    }

    const marker = new mapboxgl.Marker({
      element: el,
      draggable: !isDedicatedTracking && !adminEditingZone,
    })
      .setLngLat([customerCoords.lng, customerCoords.lat])
      .addTo(map);

    if (!isDedicatedTracking) {
      marker.on('dragend', () => {
        const lngLat = marker.getLngLat();
        handlePinMoved(lngLat.lng, lngLat.lat);
      });
    }

    mapboxCustomerMarkerRef.current = marker;
  }, [
    engine,
    isMapLoaded,
    customerCoords.lng,
    customerCoords.lat,
    isDedicatedTracking,
    adminEditingZone,
    coverageResult,
    handlePinMoved,
  ]);

  // Mapbox GL: Render Delivery Zones GeoJSON & Subtle Glowing Animated Outline
  useEffect(() => {
    if (engine !== 'mapbox-gl' || !mapboxMapRef.current || !isMapLoaded) return;
    const map = mapboxMapRef.current;

    const sourceId = 'ooh-delivery-zones-source';
    const fillLayerId = 'ooh-delivery-zones-fill';
    const glowLayerId = 'ooh-delivery-zones-glow';
    const lineLayerId = 'ooh-delivery-zones-line';

    // Construct GeoJSON FeatureCollection
    const features: any[] = [];

    if (showZonesOverlay && zones.length > 0) {
      zones.forEach((zone) => {
        if (!zone.polygon || zone.polygon.length < 3) return;
        const isCurrentlyEditing = adminEditingZone?.id === zone.id;
        const polyCoords = isCurrentlyEditing ? editedPolygon : zone.polygon;
        const ring = polyCoords.map((c) => [c.lng, c.lat]);
        if (
          ring.length > 0 &&
          (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])
        ) {
          ring.push([...ring[0]]);
        }
        const isMatched = Boolean(coverageResult?.matchedZones?.some((mz) => mz.id === zone.id));

        features.push({
          type: 'Feature',
          id: zone.id,
          properties: {
            id: zone.id,
            name: zone.name,
            color: zone.color || '#10b981',
            isActive: Boolean(zone.isActive),
            isMatched,
            isEditing: isCurrentlyEditing,
            description: zone.description || '',
          },
          geometry: {
            type: 'Polygon',
            coordinates: [ring],
          },
        });
      });
    }

    const geojsonData: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features,
    };

    if (map.getSource(sourceId)) {
      (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(geojsonData);
    } else {
      map.addSource(sourceId, {
        type: 'geojson',
        data: geojsonData,
      });

      // 1. Polygon Fill Layer
      map.addLayer({
        id: fillLayerId,
        type: 'fill',
        source: sourceId,
        layout: {
          visibility: showZonesOverlay ? 'visible' : 'none',
        },
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': [
            'case',
            ['boolean', ['get', 'isEditing'], false],
            0.36,
            ['boolean', ['get', 'isMatched'], false],
            0.26,
            ['boolean', ['get', 'isActive'], false],
            0.14,
            0.04,
          ],
        },
      });

      // 2. Subtle Glowing Outer Aura Layer (Pulsing highlight)
      map.addLayer({
        id: glowLayerId,
        type: 'line',
        source: sourceId,
        layout: {
          visibility: showZonesOverlay ? 'visible' : 'none',
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': [
            'case',
            ['boolean', ['get', 'isMatched'], false],
            8,
            ['boolean', ['get', 'isEditing'], false],
            8,
            5,
          ],
          'line-blur': 4,
          'line-opacity': 0.35,
        },
        filter: ['==', ['get', 'isActive'], true],
      });

      // 3. Crisp Zone Boundary Line
      map.addLayer({
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        layout: {
          visibility: showZonesOverlay ? 'visible' : 'none',
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': [
            'case',
            ['boolean', ['get', 'isEditing'], false],
            3.5,
            ['boolean', ['get', 'isMatched'], false],
            3,
            ['boolean', ['get', 'isActive'], false],
            2,
            1.5,
          ],
          'line-opacity': [
            'case',
            ['boolean', ['get', 'isActive'], false],
            0.95,
            0.4,
          ],
        },
      });

      // Interactive popup on zone click
      map.on('click', fillLayerId, (e) => {
        if (adminEditingZone || isDedicatedTracking) return;
        const feat = e.features?.[0];
        if (!feat || !feat.properties) return;
        const p = feat.properties;
        new mapboxgl.Popup({ offset: 12, closeButton: true })
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="min-width: 170px; padding: 6px 8px; font-family: ui-sans-serif, system-ui, sans-serif; text-align: left;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px;">
                <span style="width: 10px; height: 10px; border-radius: 9999px; background: ${p.color}; border: 1px solid #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.2);"></span>
                <strong style="font-size: 12px; color: #0f172a;">${p.name}</strong>
              </div>
              <div style="font-size: 10.5px; color: #475569; margin-bottom: 5px;">${p.description || 'Designated LPG Service Zone'}</div>
              <div style="font-size: 10px; font-weight: 700; color: ${p.isActive ? '#047857' : '#64748b'};">
                ${p.isMatched ? '★ Matching Your Location' : p.isActive ? '✓ Active Service Area' : '○ Inactive Zone'}
              </div>
            </div>
          `)
          .addTo(map);
      });

      map.on('mouseenter', fillLayerId, () => {
        if (!adminEditingZone) map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', fillLayerId, () => {
        if (!adminEditingZone) map.getCanvas().style.cursor = '';
      });
    }

    // Toggle layer visibility
    if (map.getLayer(fillLayerId)) {
      map.setLayoutProperty(fillLayerId, 'visibility', showZonesOverlay ? 'visible' : 'none');
    }
    if (map.getLayer(glowLayerId)) {
      map.setLayoutProperty(glowLayerId, 'visibility', showZonesOverlay ? 'visible' : 'none');
    }
    if (map.getLayer(lineLayerId)) {
      map.setLayoutProperty(lineLayerId, 'visibility', showZonesOverlay ? 'visible' : 'none');
    }

    // Subtle breathing glow animation for active zones
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!prefersReducedMotion && showZonesOverlay) {
      let animStart = performance.now();
      const animateBoundaryGlow = (timestamp: number) => {
        if (!mapboxMapRef.current || !mapboxMapRef.current.getLayer(glowLayerId)) return;
        const elapsed = timestamp - animStart;
        const dynamicOpacity = 0.25 + 0.18 * Math.sin(elapsed / 650);
        try {
          mapboxMapRef.current.setPaintProperty(glowLayerId, 'line-opacity', dynamicOpacity);
        } catch {
          // Map layer may have been unmounted
        }
        mapboxAnimationFrameRef.current = requestAnimationFrame(animateBoundaryGlow);
      };
      mapboxAnimationFrameRef.current = requestAnimationFrame(animateBoundaryGlow);
    }

    return () => {
      if (mapboxAnimationFrameRef.current) {
        cancelAnimationFrame(mapboxAnimationFrameRef.current);
        mapboxAnimationFrameRef.current = null;
      }
    };
  }, [engine, isMapLoaded, zones, showZonesOverlay, adminEditingZone, editedPolygon, coverageResult]);

  // Mapbox GL: Supplier depot markers with Animated LPG Cylinders & Pulsing Aura
  useEffect(() => {
    if (engine !== 'mapbox-gl' || !mapboxMapRef.current || !isMapLoaded) return;
    const map = mapboxMapRef.current;

    mapboxSupplierMarkersRef.current.forEach((m) => m.remove());
    mapboxSupplierMarkersRef.current = [];

    const suppliersToShow = isDedicatedTracking
      ? [matchedSupplier].filter(Boolean)
      : suppliers.slice(0, 8);

    const eligibleSupplierIds = new Set((coverageResult?.eligibleSuppliers || []).map((s) => s.id));
    const hasLocationSelection = Boolean(
      coverageResult &&
        (coverageResult.matchedZones.length > 0 || coverageResult.isCovered || coverageResult.checkedAt)
    );

    suppliersToShow.forEach((sup) => {
      const lng = sup.coordinates?.lng ?? 36.7865;
      const lat = sup.coordinates?.lat ?? -1.2785;
      const isServing = hasLocationSelection ? eligibleSupplierIds.has(sup.id) : true;
      const isOutOfArea = hasLocationSelection ? !eligibleSupplierIds.has(sup.id) : false;

      const depotEl = createGasCylinderMarkerElement(sup, isServing, isOutOfArea, !isDedicatedTracking);
      const popupHtml = createSupplierPopupHtml(sup, isServing, isOutOfArea, hasLocationSelection);

      if (onSelectSupplierPin) {
        depotEl.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelectSupplierPin(sup);
        });
      }

      const depotMarker = new mapboxgl.Marker({ element: depotEl, anchor: 'bottom-left' })
        .setLngLat([lng, lat]);

      if (!onSelectSupplierPin) {
        const popup = new mapboxgl.Popup({ offset: 24, closeButton: true, maxWidth: '260px' }).setHTML(
          popupHtml
        );
        depotMarker.setPopup(popup);
      }

      depotMarker.addTo(map);
      mapboxSupplierMarkersRef.current.push(depotMarker);
    });
  }, [engine, isMapLoaded, suppliers, matchedSupplier, isDedicatedTracking, coverageResult, onSelectSupplierPin]);

  // Mapbox GL: Available Delivery Motorcycles around customer location on Home map
  useEffect(() => {
    if (engine !== 'mapbox-gl' || !mapboxMapRef.current || !isMapLoaded) return;
    const map = mapboxMapRef.current;

    mapboxIdleRidersRef.current.forEach((m) => m.remove());
    mapboxIdleRidersRef.current = [];

    if (isDedicatedTracking || riders.length === 0) return;

    const offsets: Array<[number, number, number]> = [
      [0.0022, -0.0026, 45],
      [-0.0028, 0.0038, 210],
      [0.0034, 0.0029, 315],
    ];

    riders.slice(0, 4).forEach((rider, idx) => {
      const [dLat, dLng, heading] = offsets[idx % offsets.length];
      const lat = rider.coordinates?.lat ?? customerCoords.lat + dLat;
      const lng = rider.coordinates?.lng ?? customerCoords.lng + dLng;

      const statusText = idx === 1 ? 'On the way' : undefined;
      const riderEl = createRealisticMotorbikeMarkerElement(heading, null, false, statusText);
      riderEl.style.pointerEvents = 'auto';
      riderEl.style.cursor = 'pointer';

      if (onSelectRiderPin) {
        riderEl.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelectRiderPin(rider);
        });
      }

      const marker = new mapboxgl.Marker({ element: riderEl, anchor: 'center' })
        .setLngLat([lng, lat]);

      if (!onSelectRiderPin) {
        const popup = new mapboxgl.Popup({ offset: 20, closeButton: true, maxWidth: '220px' }).setHTML(
          `<div style="padding:8px 10px;font-family:sans-serif;font-size:11px;min-width:165px;">
            <strong style="color:#15191C;display:block;font-size:12px;">${rider.name}</strong>
            <span style="color:#226946;font-weight:700;">Available Nearby · ★ ${rider.rating}</span><br/>
            <span style="color:#6B7280;">${rider.vehicleModel} · ${rider.plateNumber}</span>
          </div>`
        );
        marker.setPopup(popup);
      }

      marker.addTo(map);
      mapboxIdleRidersRef.current.push(marker);
    });
  }, [engine, isMapLoaded, riders, isDedicatedTracking, customerCoords.lat, customerCoords.lng, onSelectRiderPin]);

  // Mapbox GL: Interactive Admin Polygon Vertex Handles
  useEffect(() => {
    if (engine !== 'mapbox-gl' || !mapboxMapRef.current || !isMapLoaded) return;
    const map = mapboxMapRef.current;

    mapboxVertexMarkersRef.current.forEach((m) => m.remove());
    mapboxVertexMarkersRef.current = [];

    if (!adminEditingZone || editedPolygon.length === 0) return;

    editedPolygon.forEach((coord, idx) => {
      const handleEl = document.createElement('div');
      handleEl.className = 'mapbox-vertex-handle cursor-grab active:cursor-grabbing';
      handleEl.innerHTML = `
        <div style="background-color: ${adminEditingZone.color}; border: 2.5px solid #ffffff; width: 20px; height: 20px; border-radius: 9999px; box-shadow: 0 3px 8px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; transform: translate(-50%, -50%); transition: transform 0.15s ease;">
          <div style="width: 6px; height: 6px; background-color: #ffffff; border-radius: 9999px;"></div>
        </div>
      `;

      const vertexMarker = new mapboxgl.Marker({
        element: handleEl,
        draggable: true,
      })
        .setLngLat([coord.lng, coord.lat])
        .addTo(map);

      vertexMarker.on('drag', () => {
        const lngLat = vertexMarker.getLngLat();
        setEditedPolygon((prev) =>
          prev.map((p, i) => (i === idx ? { lat: lngLat.lat, lng: lngLat.lng } : p))
        );
      });

      mapboxVertexMarkersRef.current.push(vertexMarker);
    });

    return () => {
      mapboxVertexMarkersRef.current.forEach((m) => m.remove());
      mapboxVertexMarkersRef.current = [];
    };
  }, [engine, isMapLoaded, adminEditingZone, editedPolygon]);

  // Helper: compute geographical bearing between two [lng, lat] points
  const calculateBearing = (start: [number, number], end: [number, number]): number => {
    const startLng = (start[0] * Math.PI) / 180;
    const startLat = (start[1] * Math.PI) / 180;
    const endLng = (end[0] * Math.PI) / 180;
    const endLat = (end[1] * Math.PI) / 180;

    const dLng = endLng - startLng;
    const y = Math.sin(dLng) * Math.cos(endLat);
    const x =
      Math.cos(startLat) * Math.sin(endLat) -
      Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);
    const brng = (Math.atan2(y, x) * 180) / Math.PI;
    return (brng + 360) % 360;
  };

  // Helper: estimate distance in meters between two [lng, lat] points
  const getDistanceMeters = (p1: [number, number], p2: [number, number]): number => {
    const R = 6371000;
    const dLat = ((p2[1] - p1[1]) * Math.PI) / 180;
    const dLng = ((p2[0] - p1[0]) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((p1[1] * Math.PI) / 180) *
        Math.cos((p2[1] * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Mapbox GL: Route and rider marker
  const addTrackingRoute = async (map: mapboxgl.Map) => {
    const origin: [number, number] = [supplierCoords.lng, supplierCoords.lat];
    const destination: [number, number] = [customerCoords.lng, customerCoords.lat];

    const routeData = await getDirectionsRoute(origin, destination, activeToken);
    const coordinates = routeData?.coordinates || [origin, destination];
    currentRouteCoordsRef.current = coordinates;

    if (routeData) {
      setDriverRouteInfo({ distanceKm: routeData.distanceKm, durationMin: routeData.durationMin });
      onDriverTelemetryUpdated?.({
        distanceRemainingKm: routeData.distanceKm,
        etaMinutes: routeData.durationMin,
      });
    }

    if (map.getSource('tracking-route')) {
      (map.getSource('tracking-route') as mapboxgl.GeoJSONSource).setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates,
        },
      });
    } else {
      map.addSource('tracking-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates,
          },
        },
      });

      // Dark contrast undercasing for clear road visibility
      map.addLayer({
        id: 'tracking-route-casing',
        type: 'line',
        source: 'tracking-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#064e3b', 'line-width': 7, 'line-opacity': 0.85 },
      });

      // Uber-style vibrant neon emerald road route
      map.addLayer({
        id: 'tracking-route-line',
        type: 'line',
        source: 'tracking-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#10b981', 'line-width': 4.5 },
      });
    }

    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend(origin);
    bounds.extend(destination);
    map.fitBounds(bounds, { padding: 60, maxZoom: 16 });

    updateMapboxRiderMarker(map, coordinates);
  };

  const updateMapboxRiderMarker = (map: mapboxgl.Map, coordinates: [number, number][]) => {
    let riderPos: [number, number];
    let heading = riderHeadingRef.current;
    let speedKmH = 24;
    let isLiveGps = false;

    if (liveDriverLocation && !isNaN(liveDriverLocation.latitude) && !isNaN(liveDriverLocation.longitude)) {
      // Validate GPS accuracy (< 100m) to reject erratic jumps
      const newPos: [number, number] = [liveDriverLocation.longitude, liveDriverLocation.latitude];
      if (liveDriverLocation.accuracy > 120 && currentRiderPosRef.current) {
        const dist = getDistanceMeters(currentRiderPosRef.current, newPos);
        // If accuracy is poor (>120m) and jumped excessively (>300m), retain last reliable position
        if (dist > 300) {
          riderPos = currentRiderPosRef.current;
        } else {
          riderPos = newPos;
        }
      } else {
        riderPos = newPos;
      }

      isLiveGps = true;
      speedKmH = liveDriverLocation.speed != null ? Math.round(liveDriverLocation.speed * 3.6) : 22;

      // Real heading from device compass / telemetry
      if (
        liveDriverLocation.heading != null &&
        !isNaN(liveDriverLocation.heading) &&
        liveDriverLocation.heading >= 0
      ) {
        heading = liveDriverLocation.heading;
      } else if (currentRiderPosRef.current) {
        const distMoved = getDistanceMeters(currentRiderPosRef.current, riderPos);
        if (distMoved > 3) {
          heading = calculateBearing(currentRiderPosRef.current, riderPos);
        }
      }
    } else {
      // Fallback: interpolate along actual road route
      const coords = coordinates.length > 0 ? coordinates : currentRouteCoordsRef.current;
      if (coords.length > 0) {
        const t = Math.min(100, Math.max(0, riderProgressPercent)) / 100;
        const index = Math.min(coords.length - 1, Math.floor(t * (coords.length - 1)));
        riderPos = coords[index] || coords[0];

        // Heading along current road segment
        const nextIndex = Math.min(coords.length - 1, index + 1);
        if (nextIndex > index) {
          heading = calculateBearing(coords[index], coords[nextIndex]);
        }
      } else {
        riderPos = [supplierCoords.lng, supplierCoords.lat];
      }
    }

    currentRiderPosRef.current = riderPos;
    riderHeadingRef.current = heading;

    // Update or create Realistic Motorbike Marker element
    if (mapboxRiderMarkerRef.current) {
      mapboxRiderMarkerRef.current.setLngLat(riderPos);

      const el = mapboxRiderMarkerRef.current.getElement();
      const bodyEl = el.querySelector<HTMLElement>('.uber-vehicle-body');
      if (bodyEl) {
        bodyEl.style.transform = `rotate(${heading}deg)`;
      }

      const speedBadge = el.querySelector<HTMLElement>('.uber-speed-badge');
      if (speedBadge) {
        const label = speedKmH > 0 ? `${speedKmH} km/h` : 'Stopped';
        speedBadge.innerHTML = `
          <span style="width: 5px; height: 5px; border-radius: 9999px; background: ${isLiveGps ? '#10b981' : '#a3e635'};"></span>
          <span>${label}</span>
        `;
      }
    } else {
      const riderEl = createRealisticMotorbikeMarkerElement(heading, speedKmH, isLiveGps);
      const marker = new mapboxgl.Marker({ element: riderEl, anchor: 'center' })
        .setLngLat(riderPos)
        .addTo(map);
      mapboxRiderMarkerRef.current = marker;
    }

    // Auto-follow delivery vehicle: smoothly ease camera to vehicle
    if (autoFollowVehicle) {
      try {
        map.easeTo({
          center: riderPos,
          duration: 750,
          essential: false,
        });
      } catch {
        // Safe fallback if map is transitioning
      }
    }

    // Recalculate road route and ETA when vehicle has moved significantly
    if (isLiveGps) {
      const now = Date.now();
      const prevRouted = lastReroutedPosRef.current;
      const distSinceReroute = prevRouted ? getDistanceMeters(prevRouted, riderPos) : 999;
      const timeSinceReroute = now - lastReroutedTimeRef.current;

      if (!prevRouted || distSinceReroute > 100 || timeSinceReroute > 25000) {
        lastReroutedPosRef.current = riderPos;
        lastReroutedTimeRef.current = now;

        const dest: [number, number] = [customerCoords.lng, customerCoords.lat];
        getDirectionsRoute(riderPos, dest, activeToken).then((updatedRoute) => {
          if (updatedRoute && updatedRoute.coordinates.length > 0 && mapboxMapRef.current) {
            currentRouteCoordsRef.current = updatedRoute.coordinates;
            setDriverRouteInfo({
              distanceKm: updatedRoute.distanceKm,
              durationMin: updatedRoute.durationMin,
            });
            onDriverTelemetryUpdated?.({
              distanceRemainingKm: updatedRoute.distanceKm,
              etaMinutes: updatedRoute.durationMin,
            });

            const source = mapboxMapRef.current.getSource('tracking-route') as mapboxgl.GeoJSONSource | undefined;
            if (source) {
              source.setData({
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: updatedRoute.coordinates,
                },
              });
            }
          }
        });
      }
    }
  };

  useEffect(() => {
    if (engine === 'mapbox-gl' && isDedicatedTracking && mapboxMapRef.current && isMapLoaded) {
      addTrackingRoute(mapboxMapRef.current);
    }
  }, [engine, isDedicatedTracking, isMapLoaded]);

  // Sync rider position whenever riderProgressPercent or liveDriverLocation changes
  useEffect(() => {
    if (engine === 'mapbox-gl' && isDedicatedTracking && mapboxMapRef.current && isMapLoaded) {
      updateMapboxRiderMarker(mapboxMapRef.current, currentRouteCoordsRef.current);
    }
  }, [engine, riderProgressPercent, liveDriverLocation, isDedicatedTracking, isMapLoaded, autoFollowVehicle]);


  // ==========================================
  // GPS "Use My Current Location" Handler
  // ==========================================
  const handleUseCurrentLocation = () => {
    setIsLocatingUser(true);
    setGpsStatusMessage(null);

    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setIsLocatingUser(false);
      setGpsStatusMessage('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocatingUser(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        if (engine === 'mapbox-gl' && mapboxMapRef.current) {
          mapboxMapRef.current.flyTo({ center: [lng, lat], zoom: 16, essential: true });
          mapboxCustomerMarkerRef.current?.setLngLat([lng, lat]);
        } else if (engine === 'leaflet' && leafletMapRef.current) {
          leafletMapRef.current.setView([lat, lng], 16);
          leafletCustomerMarkerRef.current?.setLatLng([lat, lng]);
        }

        await handlePinMoved(lng, lat);
        setGpsStatusMessage('Location acquired successfully!');
        setTimeout(() => setGpsStatusMessage(null), 3000);
      },
      (error) => {
        setIsLocatingUser(false);
        let msg = 'Unable to retrieve your location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission denied. Please search or drag the pin.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out. Please try again.';
        }
        setGpsStatusMessage(msg);
        setTimeout(() => setGpsStatusMessage(null), 4000);
      },
      { timeout: 9000, enableHighAccuracy: true, maximumAge: 0 }
    );
  };

  // Zoom controls
  const handleZoomIn = () => {
    if (engine === 'mapbox-gl') mapboxMapRef.current?.zoomIn();
    else leafletMapRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    if (engine === 'mapbox-gl') mapboxMapRef.current?.zoomOut();
    else leafletMapRef.current?.zoomOut();
  };

  const handleResetNorth = () => {
    if (engine === 'mapbox-gl') mapboxMapRef.current?.resetNorth();
    else leafletMapRef.current?.setView([customerCoords.lat, customerCoords.lng], 15);
  };

  // Search selection handler
  const handleSelectSearchResult = (result: GeocodedPlace) => {
    setSearchQuery(result.name);
    setIsSearchOpen(false);

    const { lng, lat } = result.coordinates;

    if (engine === 'mapbox-gl' && mapboxMapRef.current) {
      mapboxMapRef.current.flyTo({ center: [lng, lat], zoom: 15.5, essential: true });
      mapboxCustomerMarkerRef.current?.setLngLat([lng, lat]);
    } else if (engine === 'leaflet' && leafletMapRef.current) {
      leafletMapRef.current.setView([lat, lng], 15.5);
      leafletCustomerMarkerRef.current?.setLatLng([lat, lng]);
    }

    const updatedLoc: NairobiLocation = {
      id: result.id,
      name: result.name,
      area: result.area,
      details: result.fullAddress,
      coordinates: {
        lat,
        lng,
        x: 50,
        y: 50,
      },
    };
    if (onSelectLocation) onSelectLocation(updatedLoc);
  };

  // Start map polygon editing with smooth camera transition
  const handleStartEditingPolygon = (zone: DeliveryZone) => {
    setAdminEditingZone(zone);
    setEditedPolygon([...zone.polygon]);
    if (zone.polygon && zone.polygon.length > 0) {
      if (engine === 'mapbox-gl' && mapboxMapRef.current) {
        const bounds = new mapboxgl.LngLatBounds();
        zone.polygon.forEach((c) => bounds.extend([c.lng, c.lat]));
        mapboxMapRef.current.fitBounds(bounds, { padding: 60, duration: 800, essential: true });
      } else if (leafletMapRef.current) {
        const bounds = L.latLngBounds(zone.polygon.map((c) => [c.lat, c.lng]));
        leafletMapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  };

  // Save polygon changes from map editor
  const handleSaveMapPolygonChanges = async () => {
    if (!adminEditingZone) return;
    const token = getStoredAdminToken();
    if (!token) {
      setIsAdminModalOpen(true);
      return;
    }

    setIsSavingPolygon(true);
    const updatedZone: Partial<DeliveryZone> = {
      ...adminEditingZone,
      polygon: editedPolygon,
    };

    const res = await adminSaveZone(updatedZone, token);
    setIsSavingPolygon(false);

    if (res.success) {
      setAdminEditingZone(null);
      if (onZonesUpdated) onZonesUpdated();
    } else {
      alert(res.error || 'Failed saving polygon changes');
    }
  };

  return (
    <div
      className={`relative w-full overflow-hidden bg-[#EEF2EE] transition-all duration-300 text-left ${
        isFullscreen
          ? 'fixed inset-4 z-50 h-[calc(100vh-2rem)] max-w-5xl mx-auto rounded-2xl shadow-2xl border border-black'
          : isHomeHero
          ? `rounded-none lg:rounded-3xl lg:border lg:border-neutral-200/90 ${
              heightClassName || 'h-[66dvh] min-h-[430px] lg:h-[580px]'
            }`
          : `rounded-2xl border border-neutral-200/90 shadow-sm ${
              heightClassName || (isDedicatedTracking ? 'h-[300px] sm:h-[360px]' : 'h-[260px] sm:h-[320px]')
            }`
      }`}
    >
      {/* Top Floating Admin Boundary Editor Bar */}
      {adminEditingZone && (
        <div className="absolute top-2.5 left-2.5 right-2.5 z-30 bg-neutral-900/95 text-white px-3 py-2 rounded-xl shadow-xl flex items-center justify-between gap-2 backdrop-blur-md animate-in fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-3 h-3 rounded-full shrink-0 border border-white"
              style={{ backgroundColor: adminEditingZone.color }}
            />
            <div className="truncate">
              <span className="text-xs font-bold truncate block">
                Editing: {adminEditingZone.name}
              </span>
              <span className="text-[10px] text-emerald-300 truncate block">
                Drag circular vertex pins on the map to sculpt delivery perimeter
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setAdminEditingZone(null)}
              className="px-2.5 py-1 text-neutral-300 hover:text-white text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveMapPolygonChanges}
              disabled={isSavingPolygon}
              className="px-3 py-1 bg-black hover:bg-neutral-800 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
            >
              {isSavingPolygon ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>Save Boundary</span>
            </button>
          </div>
        </div>
      )}

      {/* Uber Dedicated Live Driver Tracking Floating Control Bar */}
      {isDedicatedTracking && (
        <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between gap-2 pointer-events-none">
          <div className="pointer-events-auto bg-black/90 backdrop-blur-md text-white rounded-xl px-3 py-1.5 border border-neutral-700/80 shadow-xl flex items-center gap-2 max-w-[calc(100%-110px)] truncate">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                liveDriverLocation ? 'bg-emerald-400 animate-pulse' : 'bg-lime-400'
              }`}
            />
            <div className="min-w-0 leading-tight">
              <div className="text-[11px] font-extrabold text-white truncate flex items-center gap-1.5">
                <span>
                  {driverRouteInfo
                    ? `~${driverRouteInfo.durationMin} min remaining`
                    : `Driver en route`}
                </span>
                <span className="text-neutral-400 font-normal">·</span>
                <span className="text-emerald-400 font-bold">
                  {driverRouteInfo ? `${driverRouteInfo.distanceKm} km` : 'Road route'}
                </span>
              </div>
              <div className="text-[9.5px] text-neutral-300 truncate">
                {liveDriverLocation
                  ? `Live GPS ±${Math.round(liveDriverLocation.accuracy)}m · ${
                      liveDriverLocation.speed ? Math.round(liveDriverLocation.speed * 3.6) : 0
                    } km/h`
                  : 'Road telemetry synchronized'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const next = !autoFollowVehicle;
              setAutoFollowVehicle(next);
              if (currentRiderPosRef.current && mapboxMapRef.current) {
                mapboxMapRef.current.easeTo({
                  center: currentRiderPosRef.current,
                  zoom: 16,
                  duration: 600,
                });
              }
            }}
            className={`pointer-events-auto px-2.5 py-1.5 rounded-xl border text-[11px] font-bold shadow-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              autoFollowVehicle
                ? 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-500 ring-2 ring-emerald-400/30'
                : 'bg-white/95 text-neutral-900 border-neutral-200 hover:bg-neutral-100'
            }`}
          >
            <Navigation
              className={`w-3.5 h-3.5 ${autoFollowVehicle ? 'text-white' : 'text-neutral-700'}`}
            />
            <span>{autoFollowVehicle ? 'Following' : 'Follow'}</span>
          </button>
        </div>
      )}

      {/* Top Floating Search Bar ("Search for gas...") matching Reference */}
      {!isDedicatedTracking && !adminEditingZone && !hideSearchOverlay && (
        <div className="absolute top-3 left-3 right-3 z-20 flex flex-col gap-1.5 pointer-events-auto">
          <div className="relative">
            <div className="flex items-center bg-white/98 backdrop-blur-md rounded-full border border-neutral-200/70 shadow-lg px-4 py-2.5 focus-within:ring-2 focus-within:ring-[#226946]">
              <Search className="w-4.5 h-4.5 text-neutral-400 shrink-0 mr-2.5" />
              <input
                type="text"
                value={effectiveSearchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                placeholder="Search for gas or area..."
                className="w-full bg-transparent text-sm text-[#15191C] placeholder-neutral-400 font-medium focus:outline-none"
              />
              {isSearching ? (
                <Loader2 className="w-4 h-4 text-[#226946] animate-spin shrink-0" />
              ) : effectiveSearchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setIsSearchOpen(false);
                  }}
                  className="p-0.5 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : null}
            </div>

            {/* Area / Address Suggestions Dropdown */}
            {isSearchOpen && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl border border-neutral-200 shadow-xl overflow-hidden max-h-52 overflow-y-auto z-30 animate-in fade-in-50">
                <div className="px-3.5 py-1.5 bg-[#F6F7F8] border-b border-neutral-100 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                  Nairobi Delivery Locations
                </div>
                {searchResults.map((place) => (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() => handleSelectSearchResult(place)}
                    className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-[#EDF6F1] border-b border-neutral-100 last:border-0 flex items-start gap-2.5 transition-colors cursor-pointer"
                  >
                    <MapPin className="w-4 h-4 text-[#226946] shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="font-bold text-[#15191C] truncate">{place.name}</div>
                      <div className="text-[11px] text-[#6B7280] truncate">{place.area}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Out-of-coverage warning or active GPS toast */}
          {coverageResult && !coverageResult.isCovered && (
            <div className="bg-rose-900/95 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="truncate">
                Outside active zone. Tap an area above or drag your pin.
              </span>
            </div>
          )}

          {gpsStatusMessage && (
            <div className="bg-neutral-900/90 text-white text-[11px] px-3 py-1.5 rounded-xl shadow-md backdrop-blur-xs flex items-center justify-between animate-in fade-in">
              <span>{gpsStatusMessage}</span>
              <button
                type="button"
                onClick={() => setGpsStatusMessage(null)}
                className="text-neutral-400 hover:text-white ml-2 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Map Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Circular Controls Bottom-Right (Current Location + Map Layers) matching Reference */}
      <div
        className={`absolute right-3 z-20 flex flex-col items-end gap-2.5 pointer-events-auto ${
          isHomeHero ? 'bottom-9 lg:bottom-5' : 'bottom-12'
        }`}
      >
        {/* Expandable Layers & Map Tools Popover */}
        {isLayersMenuOpen && (
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl p-2.5 w-52 space-y-1.5 text-xs animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-1 pb-1 border-b border-neutral-100">
              <span className="font-extrabold text-[#15191C]">Map Layers</span>
              <button
                type="button"
                onClick={() => setIsLayersMenuOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => setMapStyle('streets')}
                className={`py-1.5 px-2 rounded-xl font-bold cursor-pointer ${
                  mapStyle === 'streets'
                    ? 'bg-[#226946] text-white'
                    : 'bg-[#F6F7F8] text-[#15191C]'
                }`}
              >
                Road Map
              </button>
              <button
                type="button"
                onClick={() => setMapStyle('light')}
                className={`py-1.5 px-2 rounded-xl font-bold cursor-pointer ${
                  mapStyle === 'light'
                    ? 'bg-[#226946] text-white'
                    : 'bg-[#F6F7F8] text-[#15191C]'
                }`}
              >
                Minimal
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowZonesOverlay((p) => !p)}
              className="w-full py-1.5 px-2.5 rounded-xl bg-[#F6F7F8] hover:bg-[#EDF6F1] text-[#15191C] font-semibold flex items-center justify-between cursor-pointer"
            >
              <span>Delivery Zones</span>
              <span className="font-bold text-[#226946]">{showZonesOverlay ? 'ON' : 'OFF'}</span>
            </button>

            <div className="grid grid-cols-3 gap-1 pt-0.5">
              <button
                type="button"
                onClick={handleZoomIn}
                className="py-1.5 rounded-xl bg-[#F6F7F8] hover:bg-neutral-200 flex items-center justify-center cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="py-1.5 rounded-xl bg-[#F6F7F8] hover:bg-neutral-200 flex items-center justify-center cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleResetNorth}
                className="py-1.5 rounded-xl bg-[#F6F7F8] hover:bg-neutral-200 flex items-center justify-center cursor-pointer"
                title="Re-center Pin"
              >
                <Compass className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-1 pt-0.5 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => {
                  setIsLayersMenuOpen(false);
                  setIsAdminModalOpen(true);
                }}
                className="flex-1 py-1.5 rounded-xl hover:bg-[#EDF6F1] text-[#226946] font-bold flex items-center justify-center gap-1 cursor-pointer"
              >
                <Shield className="w-3 h-3" />
                <span>Zones</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLayersMenuOpen(false);
                  setIsTokenModalOpen(true);
                }}
                className="flex-1 py-1.5 rounded-xl hover:bg-[#F6F7F8] text-[#6B7280] font-bold flex items-center justify-center gap-1 cursor-pointer"
              >
                <Key className="w-3 h-3" />
                <span>API Key</span>
              </button>
            </div>
          </div>
        )}

        {/* Circular Current Location GPS Button */}
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLocatingUser}
          aria-label="Center on my current GPS location"
          title="Center on my current location"
          className="w-11 h-11 rounded-full bg-white hover:bg-[#F6F7F8] active:scale-95 text-[#15191C] shadow-lg border border-neutral-200/70 flex items-center justify-center cursor-pointer transition-all"
        >
          {isLocatingUser ? (
            <Loader2 className="w-5 h-5 animate-spin text-[#226946]" />
          ) : (
            <LocateFixed className="w-5 h-5 text-[#15191C]" />
          )}
        </button>

        {/* Circular Map Layers Button */}
        <button
          type="button"
          onClick={() => setIsLayersMenuOpen((o) => !o)}
          aria-label="Map layers and zoom controls"
          title="Map layers"
          className={`w-11 h-11 rounded-full shadow-lg border flex items-center justify-center cursor-pointer transition-all active:scale-95 ${
            isLayersMenuOpen
              ? 'bg-[#226946] text-white border-[#226946]'
              : 'bg-white hover:bg-[#F6F7F8] text-[#15191C] border-neutral-200/70'
          }`}
        >
          <Layers className="w-5 h-5" />
        </button>
      </div>

      {/* Subtle Bottom-Left Current Pinned Area Badge (Hidden on compact Hero if clean, visible otherwise) */}
      {!isHomeHero && (
        <div className="pointer-events-none absolute bottom-2.5 left-2.5 z-10 max-w-[calc(100%-80px)]">
          <div className="pointer-events-auto bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-neutral-200 shadow-md inline-flex items-center gap-2 truncate">
            <div
              className={`w-2 h-2 rounded-full shrink-0 ${
                coverageResult && !coverageResult.isCovered ? 'bg-rose-500' : 'bg-[#226946]'
              }`}
            />
            <div className="text-[11px] leading-tight truncate">
              <span className="font-bold text-slate-900 truncate block">
                {currentLocation.name.split(',')[0]}
              </span>
              <span className="text-[10px] text-slate-500 truncate block">
                {isGeocoding ? 'Updating address...' : 'Drag pin to exact gate'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Expand/Collapse Fullscreen Control on Non-Hero Maps */}
      {!isHomeHero && (
        <button
          type="button"
          onClick={() => setIsFullscreen((f) => !f)}
          title={isFullscreen ? 'Exit full map' : 'Expand full map'}
          className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/95 backdrop-blur-md rounded-full border border-neutral-200 shadow-md text-neutral-700 flex items-center justify-center cursor-pointer"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      )}

      {/* Missing Token Banner Overlay when in Mapbox GL mode without token */}
      {engine === 'mapbox-gl' && !activeToken && (
        <div className="absolute inset-0 z-30 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mb-2 text-[#14532d]">
            <Key className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">
            Connect Mapbox Public Token
          </h3>
          <p className="text-xs text-slate-600 max-w-sm mb-3">
            To display real interactive roads and live courier tracking, Mapbox GL requires your public access token (pk...).
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setIsTokenModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#14532d] hover:bg-[#166534] text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Enter Mapbox Token</span>
            </button>
            <button
              type="button"
              onClick={() => setEngine('leaflet')}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              <span>Use Standard Map</span>
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            Tokens start with <code className="font-mono">pk.</code> from account.mapbox.com
          </p>
        </div>
      )}

      {/* Mapbox Token Modal */}
      <MapboxTokenModal
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
        currentToken={activeToken}
        onTokenSaved={(newToken) => {
          setActiveToken(newToken);
          setMapError(null);
        }}
      />

      {/* Admin Delivery Zones Management Modal */}
      <AdminZoneModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        zones={zones}
        onZonesUpdated={() => {
          if (onZonesUpdated) onZonesUpdated();
        }}
        onStartEditingPolygonOnMap={handleStartEditingPolygon}
      />
    </div>
  );
};
