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
}

// ==========================================
// LPG Gas Cylinder SVG & Dynamic Marker Generator
// Clean green-and-white visual style with pulsing aura
// ==========================================
function createGasCylinderMarkerElement(
  sup: Supplier,
  isServing: boolean,
  isOutOfArea: boolean,
  hasSelection: boolean
): HTMLDivElement {
  const container = document.createElement('div');
  container.className = `ooh-gas-depot-marker animate-marker-pop cursor-pointer ${
    isServing ? 'animate-gas-aura z-20' : isOutOfArea ? 'opacity-60 z-10' : 'z-10'
  }`;

  const primaryColor = isServing ? '#10b981' : isOutOfArea ? '#64748b' : '#14532d';
  const pulseHtml = isServing
    ? `<div class="animate-gas-pulse-ring" style="position: absolute; inset: -6px; border-radius: 9999px; border: 2px solid rgba(16, 185, 129, 0.65); background: rgba(16, 185, 129, 0.15); pointer-events: none;"></div>`
    : '';

  const badgeText = isServing
    ? '✓ Delivers here'
    : isOutOfArea
    ? 'Outside area'
    : sup.brandLettermark || 'LPG';

  const badgeBg = isServing
    ? '#064e3b'
    : isOutOfArea
    ? '#475569'
    : '#14532d';

  container.innerHTML = `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; user-select: none;">
      ${pulseHtml}
      
      <!-- Realistic Clean Ooh Gas LPG Cylinder Icon -->
      <div style="position: relative; width: 34px; height: 42px; display: flex; flex-direction: column; align-items: center;">
        <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.22));">
          <!-- Cylinder Handle / Collar -->
          <path d="M11 6V3C11 2.44772 11.4477 2 12 2H22C22.5523 2 23 2.44772 23 3V6" stroke="${primaryColor}" stroke-width="2" stroke-linecap="round"/>
          <path d="M14 6H20" stroke="#047857" stroke-width="2.5" stroke-linecap="round"/>
          <!-- Brass Valve in Center -->
          <circle cx="17" cy="5" r="1.5" fill="#f59e0b"/>

          <!-- Cylinder Body Shell -->
          <rect x="5" y="8" width="24" height="28" rx="8" fill="#ffffff" stroke="${primaryColor}" stroke-width="2"/>
          
          <!-- Brand Accent Stripe -->
          <rect x="7" y="15" width="20" height="12" rx="3" fill="${isServing ? '#ecfdf5' : '#f8fafc'}"/>
          <path d="M7 19H27" stroke="${primaryColor}" stroke-width="1.2" stroke-opacity="0.5"/>
          <path d="M7 23H27" stroke="${primaryColor}" stroke-width="1.2" stroke-opacity="0.5"/>

          <!-- Ooh Gas Flame Emblem -->
          <path d="M17 13C17 13 13.5 17 13.5 19.5C13.5 21.433 15.067 23 17 23C18.933 23 20.5 21.433 20.5 19.5C20.5 17 17 13 17 13Z" fill="${primaryColor}"/>
          <path d="M17 17C17 17 15.5 19 15.5 20.2C15.5 21.194 16.172 22 17 22C17.828 22 18.5 21.194 18.5 20.2C18.5 19 17 17 17 17Z" fill="#fbbf24"/>

          <!-- Base Ring -->
          <rect x="9" y="36" width="16" height="3" rx="1.5" fill="${primaryColor}"/>
        </svg>

        <!-- Dynamic Brand / Status Micro-Badge -->
        <div style="position: absolute; bottom: -8px; background: ${badgeBg}; color: #ffffff; font-size: 8.5px; font-weight: 700; padding: 1.5px 5px; border-radius: 9999px; border: 1.5px solid #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.15); white-space: nowrap;">
          ${badgeText}
        </div>
      </div>
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
  activeOrder,
  riderProgressPercent = 35,
  isExpanded = false,
  coverageResult,
  isCoverageLoading = false,
  zones = [],
  onZonesUpdated,
  onOpenLocationModal,
  onSelectLocation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  // Engine state: mapbox-gl (if WebGL available) or leaflet (standard HTML5 fallback)
  const [engine, setEngine] = useState<'mapbox-gl' | 'leaflet'>(() => {
    return isWebGLAvailable() ? 'mapbox-gl' : 'leaflet';
  });

  // Token management
  const [activeToken, setActiveToken] = useState<string>(() => getMapboxToken());
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Map style state: Streets vs Light (Uber style)
  const [mapStyle, setMapStyle] = useState<'streets' | 'light'>('streets');
  const [showZonesOverlay, setShowZonesOverlay] = useState(true);

  // Interactive Admin Polygon Vertex Editor on Map
  const [adminEditingZone, setAdminEditingZone] = useState<DeliveryZone | null>(null);
  const [editedPolygon, setEditedPolygon] = useState<PolygonCoordinate[]>([]);
  const [isSavingPolygon, setIsSavingPolygon] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
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
  const leafletSupplierMarkersRef = useRef<L.Marker[]>([]);
  const leafletRouteLayerRef = useRef<L.Polyline | null>(null);
  const leafletZoneLayersRef = useRef<L.Polygon[]>([]);
  const leafletVertexMarkersRef = useRef<L.Marker[]>([]);

  const mapboxCustomerMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const mapboxRiderMarkerRef = useRef<mapboxgl.Marker | null>(null);
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

  // Handle forward search input with debounce
  useEffect(() => {
    if (!searchQuery.trim() || !activeToken) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    setIsSearching(true);

    searchDebounceRef.current = setTimeout(async () => {
      const results = await searchPlaces(
        searchQuery,
        { lng: customerCoords.lng, lat: customerCoords.lat },
        activeToken
      );
      setSearchResults(results);
      setIsSearching(false);
    }, 300);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery, activeToken, customerCoords.lng, customerCoords.lat]);

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
      : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

    const tiles = L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: '© Mapbox © OpenStreetMap',
    }).addTo(lMap);

    tiles.on('tileerror', () => {
      if (activeToken) {
        tiles.setUrl('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
      }
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

    const customerIcon = L.divIcon({
      className: 'leaflet-custom-customer-icon',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
          <div style="background-color: ${
            coverageResult && !coverageResult.isCovered ? '#dc2626' : '#14532d'
          }; border: 2.5px solid #ffffff; width: 34px; height: 34px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); transition: background-color 0.2s;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <div style="width: 8px; height: 4px; background: rgba(0,0,0,0.25); border-radius: 9999px; margin-top: 2px;"></div>
          <div style="position: absolute; top: -20px; white-space: nowrap; background: #ffffff; color: ${
            coverageResult && !coverageResult.isCovered ? '#dc2626' : '#14532d'
          }; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 6px; border: 1px solid #cbd5e1; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            ${coverageResult && !coverageResult.isCovered ? 'No Coverage' : 'Delivery Pin'}
          </div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 34],
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

  // Leaflet: Update supplier depot markers with Animated LPG Cylinders & Aura Glow
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

      const markerEl = createGasCylinderMarkerElement(sup, isServing, isOutOfArea, hasLocationSelection);
      const popupHtml = createSupplierPopupHtml(sup, isServing, isOutOfArea, hasLocationSelection);

      const depotIcon = L.divIcon({
        className: 'leaflet-custom-depot-icon',
        html: markerEl.outerHTML,
        iconSize: [34, 42],
        iconAnchor: [17, 36],
        popupAnchor: [0, -32],
      });

      const marker = L.marker([lat, lng], { icon: depotIcon })
        .bindPopup(popupHtml, { maxWidth: 260, closeButton: true })
        .addTo(lMap);

      leafletSupplierMarkersRef.current.push(marker);
    });
  }, [engine, isMapLoaded, suppliers, matchedSupplier, isDedicatedTracking, coverageResult]);

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

      const t = Math.min(100, Math.max(0, riderProgressPercent)) / 100;
      const index = Math.min(latLngs.length - 1, Math.floor(t * (latLngs.length - 1)));
      const riderPos = latLngs[index] || latLngs[0];

      const riderIcon = L.divIcon({
        className: 'leaflet-custom-rider-icon',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -50%);">
            <div style="background-color: #0f172a; border: 2.5px solid #10b981; width: 34px; height: 34px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); z-index: 2;">
              <span style="font-size: 15px;">🛵</span>
            </div>
            <div style="margin-top: 2px; background: #0f172a; color: #10b981; font-size: 9px; font-weight: 800; padding: 1px 5px; border-radius: 4px; border: 1px solid #10b981; white-space: nowrap; z-index: 2;">
              Rider En Route
            </div>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      leafletRiderMarkerRef.current = L.marker(riderPos, { icon: riderIcon }).addTo(lMap);
    };

    setupRouteAndRider();
  }, [
    engine,
    isMapLoaded,
    isDedicatedTracking,
    riderProgressPercent,
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

    const isOutOfZone = coverageResult && !coverageResult.isCovered;
    const pinColor = isOutOfZone ? '#dc2626' : '#14532d';

    const el = document.createElement('div');
    el.className = 'ooh-gas-customer-marker cursor-grab active:cursor-grabbing animate-marker-pop';
    el.innerHTML = `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <div style="background-color: ${pinColor}; border: 2.5px solid #ffffff; width: 34px; height: 34px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); transition: background-color 0.2s;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <div style="width: 8px; height: 4px; background: rgba(0,0,0,0.25); border-radius: 9999px; margin-top: 2px;"></div>
        <div style="position: absolute; top: -20px; white-space: nowrap; background: #ffffff; color: ${pinColor}; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 6px; border: 1px solid #cbd5e1; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          ${isOutOfZone ? 'No Coverage' : 'Delivery Pin'}
        </div>
      </div>
    `;

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

      const depotEl = createGasCylinderMarkerElement(sup, isServing, isOutOfArea, hasLocationSelection);
      const popupHtml = createSupplierPopupHtml(sup, isServing, isOutOfArea, hasLocationSelection);

      const popup = new mapboxgl.Popup({ offset: 24, closeButton: true, maxWidth: '260px' }).setHTML(
        popupHtml
      );

      const depotMarker = new mapboxgl.Marker({ element: depotEl })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map);

      mapboxSupplierMarkersRef.current.push(depotMarker);
    });
  }, [engine, isMapLoaded, suppliers, matchedSupplier, isDedicatedTracking, coverageResult]);

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

  // Mapbox GL: Route and rider marker
  const addTrackingRoute = async (map: mapboxgl.Map) => {
    const origin: [number, number] = [supplierCoords.lng, supplierCoords.lat];
    const destination: [number, number] = [customerCoords.lng, customerCoords.lat];

    const routeData = await getDirectionsRoute(origin, destination, activeToken);
    const coordinates = routeData?.coordinates || [origin, destination];

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

      map.addLayer({
        id: 'tracking-route-casing',
        type: 'line',
        source: 'tracking-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#064e3b', 'line-width': 6, 'line-opacity': 0.8 },
      });

      map.addLayer({
        id: 'tracking-route-line',
        type: 'line',
        source: 'tracking-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#10b981', 'line-width': 4 },
      });
    }

    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend(origin);
    bounds.extend(destination);
    map.fitBounds(bounds, { padding: 60, maxZoom: 16 });

    updateMapboxRiderMarker(map, coordinates);
  };

  const updateMapboxRiderMarker = (map: mapboxgl.Map, coordinates: [number, number][]) => {
    if (mapboxRiderMarkerRef.current) {
      mapboxRiderMarkerRef.current.remove();
    }

    const t = Math.min(100, Math.max(0, riderProgressPercent)) / 100;
    const index = Math.min(coordinates.length - 1, Math.floor(t * (coordinates.length - 1)));
    const riderPos = coordinates[index] || coordinates[0];

    const riderEl = document.createElement('div');
    riderEl.className = 'ooh-gas-rider-marker';
    riderEl.innerHTML = `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <div style="position: absolute; width: 44px; height: 44px; border-radius: 9999px; background: rgba(16,185,129,0.3); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="background-color: #0f172a; border: 2.5px solid #10b981; width: 34px; height: 34px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); z-index: 2;">
          <span style="font-size: 15px;">🛵</span>
        </div>
        <div style="margin-top: 2px; background: #0f172a; color: #10b981; font-size: 9px; font-weight: 800; padding: 1px 5px; border-radius: 4px; border: 1px solid #10b981; white-space: nowrap; z-index: 2;">
          Rider En Route
        </div>
      </div>
    `;

    const marker = new mapboxgl.Marker({ element: riderEl })
      .setLngLat(riderPos)
      .addTo(map);

    mapboxRiderMarkerRef.current = marker;
  };

  useEffect(() => {
    if (engine === 'mapbox-gl' && isDedicatedTracking && mapboxMapRef.current && isMapLoaded) {
      addTrackingRoute(mapboxMapRef.current);
    }
  }, [engine, riderProgressPercent, isDedicatedTracking, isMapLoaded]);

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
      className={`relative w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-xs transition-all duration-300 text-left ${
        isFullscreen
          ? 'fixed inset-4 z-50 h-[calc(100vh-2rem)] max-w-5xl mx-auto shadow-2xl border-emerald-600'
          : isDedicatedTracking
          ? 'h-[280px] sm:h-[340px]'
          : 'h-[185px] min-[360px]:h-[205px] sm:h-[235px]'
      }`}
    >
      {/* Top Floating Admin Boundary Editor Bar */}
      {adminEditingZone && (
        <div className="absolute top-2.5 left-2.5 right-2.5 z-30 bg-slate-900/95 text-white px-3 py-2 rounded-xl shadow-xl flex items-center justify-between gap-2 backdrop-blur-md animate-in fade-in">
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
              className="px-2.5 py-1 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveMapPolygonChanges}
              disabled={isSavingPolygon}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
            >
              {isSavingPolygon ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Save Boundary</span>
            </button>
          </div>
        </div>
      )}

      {/* Search & Location Bar (Overlay on Map) */}
      {!isDedicatedTracking && !adminEditingZone && (
        <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex flex-col gap-1.5 pointer-events-auto">
          <div className="flex items-center gap-1.5">
            {/* Search Input Box */}
            <div className="relative flex-1">
              <div className="flex items-center bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 shadow-md px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-[#14532d]">
                <Search className="w-4 h-4 text-slate-400 shrink-0 mr-1.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  placeholder="Search estate, street, or building in Kenya..."
                  className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
                />
                {isSearching ? (
                  <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin shrink-0" />
                ) : searchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="p-0.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : null}
              </div>

              {/* Autocomplete Dropdown */}
              {isSearchOpen && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden max-h-52 overflow-y-auto z-30 animate-in fade-in-50">
                  <div className="px-2.5 py-1 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Kenya Places
                  </div>
                  {searchResults.map((place) => (
                    <button
                      key={place.id}
                      type="button"
                      onClick={() => handleSelectSearchResult(place)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50/70 border-b border-slate-100 last:border-0 flex items-start gap-2 transition-colors cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 truncate">{place.name}</div>
                        <div className="text-[10px] text-slate-500 truncate">{place.area}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* GPS My Location Button */}
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLocatingUser}
              title="Use current GPS location"
              className="h-8 px-2.5 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 shadow-md text-emerald-800 hover:bg-emerald-50 active:scale-95 flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shrink-0"
            >
              {isLocatingUser ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              ) : (
                <Navigation className="w-3.5 h-3.5 text-[#14532d]" />
              )}
              <span className="hidden sm:inline">GPS</span>
            </button>
          </div>

          {/* Live Delivery Zone Coverage Status Pill */}
          {!isDedicatedTracking && (
            <div className="flex items-center gap-1.5 animate-in fade-in">
              {isCoverageLoading ? (
                <div className="bg-slate-900/85 backdrop-blur-md text-white text-[10px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
                  <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                  <span>Verifying delivery zone coverage...</span>
                </div>
              ) : coverageResult?.isCovered ? (
                <div className="bg-[#064e3b]/95 backdrop-blur-md text-white text-[10.5px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm border border-emerald-500/40 truncate max-w-full">
                  <Check className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                  <span className="truncate">
                    {coverageResult.primaryZone?.name} · {coverageResult.eligibleSuppliers.length} Depots Serving You
                  </span>
                </div>
              ) : coverageResult && !coverageResult.isCovered ? (
                <div className="bg-rose-900/95 backdrop-blur-md text-white text-[10.5px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm border border-rose-500/40 truncate max-w-full">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span className="truncate">
                    Delivery unavailable at this location. Pin inside an active zone.
                  </span>
                </div>
              ) : null}
            </div>
          )}

          {/* GPS Message Banner */}
          {gpsStatusMessage && (
            <div className="bg-slate-900/90 text-white text-[11px] px-3 py-1.5 rounded-lg shadow-md backdrop-blur-xs flex items-center justify-between animate-in fade-in">
              <span>{gpsStatusMessage}</span>
              <button
                type="button"
                onClick={() => setGpsStatusMessage(null)}
                className="text-slate-400 hover:text-white ml-2"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Map Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Bottom Floating Delivery Info Pill */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between pointer-events-none gap-2">
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-md flex items-center gap-2 max-w-[calc(100%-140px)] truncate">
          <div
            className={`w-2 h-2 rounded-full shrink-0 ${
              coverageResult && !coverageResult.isCovered
                ? 'bg-rose-500'
                : 'bg-emerald-500 animate-pulse'
            }`}
          />
          <div className="text-[11px] leading-tight truncate">
            <span className="font-bold text-slate-900 truncate block">
              {currentLocation.name.split(',')[0]}
            </span>
            <span
              className={`text-[10px] truncate block ${
                coverageResult && !coverageResult.isCovered
                  ? 'text-rose-600 font-bold'
                  : 'text-slate-500'
              }`}
            >
              {isGeocoding
                ? 'Updating address...'
                : coverageResult && !coverageResult.isCovered
                ? 'Outside delivery zones'
                : 'Drag pin to exact gate'}
            </span>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="pointer-events-auto flex items-center gap-1">
          {/* Delivery Zones Overlay Toggle */}
          <button
            type="button"
            onClick={() => setShowZonesOverlay((prev) => !prev)}
            title={showZonesOverlay ? 'Hide Delivery Zones' : 'Show Delivery Zones'}
            className={`w-7 h-7 backdrop-blur-md rounded-lg border shadow-md flex items-center justify-center text-[10px] font-bold cursor-pointer transition-colors ${
              showZonesOverlay
                ? 'bg-emerald-800 text-white border-emerald-900'
                : 'bg-white/95 text-slate-600 border-slate-200 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
          </button>

          {/* Admin Delivery Zones Manager Button */}
          <button
            type="button"
            onClick={() => setIsAdminModalOpen(true)}
            title="Delivery Zone Admin Portal"
            className="w-7 h-7 bg-white/95 hover:bg-emerald-50 backdrop-blur-md rounded-lg border border-slate-200 shadow-md text-emerald-800 flex items-center justify-center cursor-pointer transition-colors"
          >
            <Shield className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen((f) => !f)}
            title={isFullscreen ? 'Exit full map' : 'Expand full map'}
            className="w-7 h-7 bg-white/95 backdrop-blur-md rounded-lg border border-slate-200 shadow-md text-slate-600 hover:text-slate-900 flex items-center justify-center cursor-pointer transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Mapbox Token Settings Button */}
          <button
            type="button"
            onClick={() => setIsTokenModalOpen(true)}
            title="Configure Mapbox Token"
            className={`w-7 h-7 rounded-lg border shadow-md flex items-center justify-center cursor-pointer transition-colors ${
              activeToken
                ? 'bg-white/95 text-emerald-800 border-slate-200 hover:bg-emerald-50'
                : 'bg-amber-500 text-white border-amber-600 animate-bounce'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Floating Zoom & Compass Controls (Top Right) */}
      <div className="absolute top-12 sm:top-14 right-2.5 z-10 flex flex-col gap-1 pointer-events-auto">
        <button
          type="button"
          onClick={handleZoomIn}
          className="w-7 h-7 bg-white/95 backdrop-blur-md rounded-lg border border-slate-200 shadow-md text-slate-700 hover:bg-slate-50 flex items-center justify-center cursor-pointer font-bold text-xs"
          title="Zoom in"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="w-7 h-7 bg-white/95 backdrop-blur-md rounded-lg border border-slate-200 shadow-md text-slate-700 hover:bg-slate-50 flex items-center justify-center cursor-pointer font-bold text-xs"
          title="Zoom out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleResetNorth}
          className="w-7 h-7 bg-white/95 backdrop-blur-md rounded-lg border border-slate-200 shadow-md text-slate-700 hover:bg-slate-50 flex items-center justify-center cursor-pointer text-xs"
          title="Reset view"
        >
          <Compass className="w-3.5 h-3.5" />
        </button>
      </div>

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
