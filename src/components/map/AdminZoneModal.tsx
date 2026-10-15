import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Layers,
  MapPin,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  Clock,
  DollarSign,
  ToggleLeft,
  ToggleRight,
  Eye,
  Loader2,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { DeliveryZone, PolygonCoordinate, ZoneSupplierConfig, Supplier } from '../../types';
import { MOCK_SUPPLIERS } from '../../data/mockData';
import {
  adminLogin,
  adminSaveZone,
  adminToggleZone,
  adminDeleteZone,
  getStoredAdminToken,
  clearStoredAdminToken,
} from '../../services/deliveryZoneService';

interface AdminZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  zones: DeliveryZone[];
  onZonesUpdated: () => void;
  onStartEditingPolygonOnMap?: (zone: DeliveryZone) => void;
}

export const AdminZoneModal: React.FC<AdminZoneModalProps> = ({
  isOpen,
  onClose,
  zones,
  onZonesUpdated,
  onStartEditingPolygonOnMap,
}) => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => Boolean(getStoredAdminToken()));
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active view: 'list' | 'edit' | 'test'
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);

  // Form states for zone editing
  const [zoneName, setZoneName] = useState('');
  const [zoneDescription, setZoneDescription] = useState('');
  const [zoneColor, setZoneColor] = useState('#10b981');
  const [zoneIsActive, setZoneIsActive] = useState(true);
  const [zonePolygon, setZonePolygon] = useState<PolygonCoordinate[]>([]);
  const [zoneSuppliers, setZoneSuppliers] = useState<ZoneSupplierConfig[]>([]);

  // Action status feedback
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStatusMessage(null);
      const token = getStoredAdminToken();
      setIsAuthenticated(Boolean(token));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setAuthError(null);

    const res = await adminLogin(passwordInput);
    setIsLoggingIn(false);

    if (res.success) {
      setIsAuthenticated(true);
      setPasswordInput('');
    } else {
      setAuthError(res.error || 'Incorrect admin password. Default is admin2026.');
    }
  };

  const handleLogout = () => {
    clearStoredAdminToken();
    setIsAuthenticated(false);
  };

  // Open Edit Mode
  const handleEditZone = (zone: DeliveryZone) => {
    setEditingZone(zone);
    setZoneName(zone.name);
    setZoneDescription(zone.description || '');
    setZoneColor(zone.color);
    setZoneIsActive(zone.isActive);
    setZonePolygon([...zone.polygon]);
    setZoneSuppliers(JSON.parse(JSON.stringify(zone.suppliers)));
    setView('edit');
  };

  // Create New Zone
  const handleCreateNewZone = () => {
    const newZone: DeliveryZone = {
      id: `new-${Date.now()}`,
      name: 'New Nairobi Delivery Zone',
      description: 'Custom service area for local suppliers.',
      color: '#10b981',
      isActive: true,
      polygon: [
        { lat: -1.2900, lng: 36.7800 },
        { lat: -1.2900, lng: 36.8000 },
        { lat: -1.3000, lng: 36.8000 },
        { lat: -1.3000, lng: 36.7800 },
      ],
      suppliers: [
        {
          supplierId: 'k-gas-hub',
          deliveryFee: 100,
          minOrderValue: 1300,
          operatingHours: { opensAt: '08:00', closesAt: '21:00' },
          estimatedDeliveryMin: '25–35 min',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    handleEditZone(newZone);
  };

  // Toggle Zone Active
  const handleToggleZone = async (zone: DeliveryZone) => {
    const token = getStoredAdminToken();
    if (!token) return;

    const res = await adminToggleZone(zone.id, token);
    if (res.success) {
      setStatusMessage({
        type: 'success',
        text: `Zone "${zone.name}" ${res.zone?.isActive ? 'activated' : 'deactivated'} successfully.`,
      });
      onZonesUpdated();
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Failed to toggle zone.' });
    }
  };

  // Save Zone
  const handleSaveZone = async () => {
    const token = getStoredAdminToken();
    if (!token || !editingZone) return;

    if (!zoneName.trim()) {
      setStatusMessage({ type: 'error', text: 'Zone name is required.' });
      return;
    }

    if (zonePolygon.length < 3) {
      setStatusMessage({ type: 'error', text: 'A polygon must have at least 3 vertices.' });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    const payload: Partial<DeliveryZone> = {
      id: editingZone.id,
      name: zoneName.trim(),
      description: zoneDescription.trim(),
      color: zoneColor,
      isActive: zoneIsActive,
      polygon: zonePolygon,
      suppliers: zoneSuppliers,
    };

    const res = await adminSaveZone(payload, token);
    setIsSaving(false);

    if (res.success) {
      setStatusMessage({ type: 'success', text: `Zone "${zoneName}" saved to database successfully!` });
      onZonesUpdated();
      setView('list');
      setEditingZone(null);
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Failed saving zone.' });
    }
  };

  // Delete Zone
  const handleDeleteZone = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete delivery zone "${name}"?`)) return;

    const token = getStoredAdminToken();
    if (!token) return;

    const res = await adminDeleteZone(id, token);
    if (res.success) {
      setStatusMessage({ type: 'success', text: `Zone "${name}" deleted.` });
      onZonesUpdated();
      if (editingZone?.id === id) {
        setView('list');
        setEditingZone(null);
      }
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Failed to delete zone.' });
    }
  };

  // Supplier config helper
  const handleToggleSupplierAssignment = (supplierId: string) => {
    const existingIndex = zoneSuppliers.findIndex((s) => s.supplierId === supplierId);
    if (existingIndex >= 0) {
      setZoneSuppliers(zoneSuppliers.filter((s) => s.supplierId !== supplierId));
    } else {
      setZoneSuppliers([
        ...zoneSuppliers,
        {
          supplierId,
          deliveryFee: 100,
          minOrderValue: 1300,
          operatingHours: { opensAt: '07:30', closesAt: '21:30' },
          estimatedDeliveryMin: '25–35 min',
        },
      ]);
    }
  };

  const handleUpdateSupplierFee = (supplierId: string, fee: number) => {
    setZoneSuppliers(
      zoneSuppliers.map((s) => (s.supplierId === supplierId ? { ...s, deliveryFee: fee } : s))
    );
  };

  const handleUpdateSupplierMinOrder = (supplierId: string, minOrder: number) => {
    setZoneSuppliers(
      zoneSuppliers.map((s) => (s.supplierId === supplierId ? { ...s, minOrderValue: minOrder } : s))
    );
  };

  const handleUpdateSupplierETA = (supplierId: string, eta: string) => {
    setZoneSuppliers(
      zoneSuppliers.map((s) => (s.supplierId === supplierId ? { ...s, estimatedDeliveryMin: eta } : s))
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in-50">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-left">
        {/* Header */}
        <div className="px-4 py-3 bg-[#064e3b] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-600/50 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold leading-tight">Delivery Zone Administration</h2>
              <p className="text-[10px] text-emerald-200">
                Authoritative geographic polygons & supplier assignment
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <button
                type="button"
                onClick={handleLogout}
                className="text-[11px] text-emerald-300 hover:text-white underline cursor-pointer"
              >
                Sign Out
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-emerald-200 hover:text-white rounded-lg hover:bg-emerald-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Notification Banner */}
        {statusMessage && (
          <div
            className={`px-4 py-2 text-xs flex items-center justify-between shrink-0 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-100'
                : 'bg-rose-50 text-rose-800 border-b border-rose-100'
            }`}
          >
            <div className="flex items-center gap-1.5">
              {statusMessage.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-slate-600 ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {!isAuthenticated ? (
            /* Login Form */
            <div className="py-6 max-w-sm mx-auto text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#14532d] mx-auto flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Admin Authorization Required</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Enter your administrator password to configure geographic delivery zones, boundary coordinates, and depot fee schedules.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-3">
                <div>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter admin password (default: admin2026)"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#14532d] focus:outline-none"
                    autoFocus
                  />
                  {authError && <p className="text-[11px] text-rose-600 mt-1 text-left">{authError}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-2 bg-[#14532d] hover:bg-[#166534] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  <span>Unlock Admin Controls</span>
                </button>
              </form>
            </div>
          ) : view === 'list' ? (
            /* Zone List View */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Configured Delivery Zones ({zones.length})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Active zones accept doorstep requests; inactive zones reject and display clear notices.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCreateNewZone}
                  className="px-3 py-1.5 bg-[#14532d] hover:bg-[#166534] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Zone</span>
                </button>
              </div>

              {/* Zones List */}
              <div className="space-y-2">
                {zones.map((zone) => (
                  <div
                    key={zone.id}
                    className={`p-3 rounded-xl border transition-all ${
                      zone.isActive
                        ? 'bg-white border-slate-200 hover:border-emerald-300 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 opacity-75'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 border border-white shadow-xs"
                          style={{ backgroundColor: zone.color }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-900">{zone.name}</span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                zone.isActive
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {zone.isActive ? 'Active' : 'Deactivated'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {zone.description || `${zone.polygon.length} polygon vertices`}
                          </p>
                        </div>
                      </div>

                      {/* Zone action buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Toggle Active Switch */}
                        <button
                          type="button"
                          onClick={() => handleToggleZone(zone)}
                          title={zone.isActive ? 'Deactivate zone' : 'Activate zone'}
                          className={`p-1.5 rounded-lg border cursor-pointer text-xs transition-colors ${
                            zone.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {zone.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleEditZone(zone)}
                          title="Edit zone details & suppliers"
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 cursor-pointer transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteZone(zone.id, zone.name)}
                          title="Delete zone"
                          className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg border border-slate-200 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata Footer */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10.5px] text-slate-500 flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <span>
                          <strong>{zone.polygon.length}</strong> boundary vertices
                        </span>
                        <span>
                          <strong>{zone.suppliers.length}</strong> assigned suppliers
                        </span>
                      </div>

                      {onStartEditingPolygonOnMap && (
                        <button
                          type="button"
                          onClick={() => {
                            onStartEditingPolygonOnMap(zone);
                            onClose();
                          }}
                          className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <MapPin className="w-3 h-3" />
                          <span>Shape on Map</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Zone Edit Mode */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setView('list');
                    setEditingZone(null);
                  }}
                  className="text-xs text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
                >
                  ← Back to All Zones
                </button>
                <span className="text-xs font-bold text-slate-900">
                  {editingZone?.id.startsWith('new-') ? 'Create New Zone' : `Edit: ${zoneName}`}
                </span>
              </div>

              {/* General Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Zone Name *
                  </label>
                  <input
                    type="text"
                    value={zoneName}
                    onChange={(e) => setZoneName(e.target.value)}
                    placeholder="e.g. Kilimani & Hurlingham Zone"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#14532d] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Zone Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={zoneColor}
                      onChange={(e) => setZoneColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 p-0.5"
                    />
                    <span className="text-xs font-mono text-slate-600">{zoneColor}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Description & Coverage Notes
                </label>
                <textarea
                  value={zoneDescription}
                  onChange={(e) => setZoneDescription(e.target.value)}
                  placeholder="e.g. Covers Argwings Kodhek, Yaya Centre, Wood Avenue..."
                  rows={2}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#14532d] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="zoneActiveCheck"
                  checked={zoneIsActive}
                  onChange={(e) => setZoneIsActive(e.target.checked)}
                  className="rounded text-[#14532d] focus:ring-[#14532d] w-4 h-4 cursor-pointer"
                />
                <label htmlFor="zoneActiveCheck" className="text-xs font-bold text-slate-800 cursor-pointer">
                  Zone is Active (Accepting Customer Orders)
                </label>
              </div>

              {/* Polygon Vertices Configuration */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800">
                      Geographic Boundary Vertices ({zonePolygon.length})
                    </span>
                    <p className="text-[10px] text-slate-500">
                      Coordinates forming the closed polygon. You can also drag these vertices on the real map.
                    </p>
                  </div>
                  {onStartEditingPolygonOnMap && editingZone && (
                    <button
                      type="button"
                      onClick={() => {
                        onStartEditingPolygonOnMap({
                          ...editingZone,
                          name: zoneName,
                          color: zoneColor,
                          polygon: zonePolygon,
                        });
                        onClose();
                      }}
                      className="px-2.5 py-1 bg-[#14532d] text-white text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <MapPin className="w-3 h-3" />
                      <span>Edit on Real Map</span>
                    </button>
                  )}
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {zonePolygon.map((coord, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-mono"
                    >
                      <span className="text-[10px] text-slate-400 font-bold w-4">#{idx + 1}</span>
                      <span className="text-slate-600">Lat:</span>
                      <input
                        type="number"
                        step="0.0001"
                        value={coord.lat}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setZonePolygon(
                            zonePolygon.map((p, i) => (i === idx ? { ...p, lat: val } : p))
                          );
                        }}
                        className="w-24 px-1 py-0.5 border border-slate-200 rounded text-xs"
                      />
                      <span className="text-slate-600">Lng:</span>
                      <input
                        type="number"
                        step="0.0001"
                        value={coord.lng}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setZonePolygon(
                            zonePolygon.map((p, i) => (i === idx ? { ...p, lng: val } : p))
                          );
                        }}
                        className="w-24 px-1 py-0.5 border border-slate-200 rounded text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setZonePolygon(zonePolygon.filter((_, i) => i !== idx))}
                        className="p-1 text-slate-400 hover:text-rose-600 ml-auto cursor-pointer"
                        title="Delete vertex"
                        disabled={zonePolygon.length <= 3}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const last = zonePolygon[zonePolygon.length - 1] || { lat: -1.29, lng: 36.78 };
                    setZonePolygon([...zonePolygon, { lat: last.lat + 0.002, lng: last.lng + 0.002 }]);
                  }}
                  className="text-xs text-[#14532d] hover:underline font-bold flex items-center gap-1 cursor-pointer pt-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Coordinate Vertex</span>
                </button>
              </div>

              {/* Supplier Assignment & Fees */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-800 block">
                  Assigned Suppliers & Fee Schedules for this Zone
                </span>
                <p className="text-[10px] text-slate-500">
                  Only assigned suppliers will be available to customers within this zone.
                </p>

                <div className="space-y-2">
                  {MOCK_SUPPLIERS.map((sup) => {
                    const config = zoneSuppliers.find((s) => s.supplierId === sup.id);
                    const isAssigned = Boolean(config);

                    return (
                      <div
                        key={sup.id}
                        className={`p-2.5 rounded-xl border transition-all text-xs ${
                          isAssigned ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900">
                            <input
                              type="checkbox"
                              checked={isAssigned}
                              onChange={() => handleToggleSupplierAssignment(sup.id)}
                              className="rounded text-[#14532d] focus:ring-[#14532d] w-4 h-4 cursor-pointer"
                            />
                            <span>{sup.name}</span>
                            <span className="text-[10px] font-normal text-slate-500">({sup.brand})</span>
                          </label>
                        </div>

                        {/* Config fields if assigned */}
                        {isAssigned && config && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 pt-2 border-t border-emerald-100/70">
                            <div>
                              <span className="text-[10px] text-slate-600 block mb-0.5">
                                Delivery Fee (KSh)
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="10"
                                value={config.deliveryFee}
                                onChange={(e) =>
                                  handleUpdateSupplierFee(sup.id, parseInt(e.target.value) || 0)
                                }
                                className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                              />
                            </div>

                            <div>
                              <span className="text-[10px] text-slate-600 block mb-0.5">
                                Min Order Value (KSh)
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="100"
                                value={config.minOrderValue}
                                onChange={(e) =>
                                  handleUpdateSupplierMinOrder(sup.id, parseInt(e.target.value) || 0)
                                }
                                className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                              />
                            </div>

                            <div>
                              <span className="text-[10px] text-slate-600 block mb-0.5">
                                Estimated Delivery Window
                              </span>
                              <input
                                type="text"
                                value={config.estimatedDeliveryMin}
                                onChange={(e) => handleUpdateSupplierETA(sup.id, e.target.value)}
                                placeholder="e.g. 20–30 min"
                                className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setView('list');
                    setEditingZone(null);
                  }}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveZone}
                  disabled={isSaving}
                  className="px-4 py-2 bg-[#14532d] hover:bg-[#166534] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Zone to Backend</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
