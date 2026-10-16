import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  MapPin,
  HelpCircle,
  ShieldCheck,
  Scale,
  KeyRound,
  Sparkles,
  LogOut,
  User,
  Phone,
  Mail,
  Plus,
  Trash2,
  Check,
  Edit2,
  Lock,
  Loader2,
  AlertCircle,
  Copy,
} from 'lucide-react';
import { SupplierLettermark } from './BrandIdentities';
import { OnDemandOrderState } from '../types';
import {
  CustomerAuthSession,
  signOutCustomer,
  updateCustomerProfile,
  resetCustomerPassword,
  getCustomerSavedAddresses,
  saveCustomerAddress,
  deleteCustomerAddress,
  setDefaultCustomerAddress,
  getCustomerOrderHistory,
  loginWithDemoAccount,
} from '../services/customerAuthService';
import { CustomerAddress, MultiSupplierOrder } from '../types/multisupplier';

interface ViewProps {
  onBackToHome: () => void;
  activeOrder?: OnDemandOrderState | null;
  onOpenTracker?: () => void;
  customerSession?: CustomerAuthSession | null;
  onOpenAuthModal?: (mode?: 'signin' | 'signup') => void;
  onReorderCylinder?: (brand: string, size: string) => void;
}

// ==============================================================================
// 1. ORDERS VIEW (Strict Customer Isolation & Real-Time Tracking Link)
// ==============================================================================
export const OrdersView: React.FC<ViewProps> = ({
  onBackToHome,
  activeOrder,
  onOpenTracker,
  customerSession,
  onOpenAuthModal,
  onReorderCylinder,
}) => {
  const [orders, setOrders] = useState<MultiSupplierOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!customerSession) {
      setOrders([]);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    getCustomerOrderHistory(customerSession.user.id)
      .then((data) => {
        if (isMounted) {
          setOrders(data);
        }
      })
      .catch((err) => console.warn('[OrdersView] Failed fetching orders:', err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [customerSession?.user.id]);

  const defaultMockOrders = [
    {
      id: 'ord-mock-1',
      orderNumber: 'OG-91823',
      brand: 'TotalEnergies',
      cylinderSize: '13kg',
      purchaseType: 'Refill',
      estate: 'Kilimani, Nairobi',
      date: '18 Oct 2026',
      totalAmount: 2920,
      weightKg: '27.2 kg',
      status: 'DELIVERED',
    },
    {
      id: 'ord-mock-2',
      orderNumber: 'OG-82711',
      brand: 'K-Gas',
      cylinderSize: '6kg',
      purchaseType: 'Refill',
      estate: 'Westlands, Nairobi',
      date: '02 Sep 2026',
      totalAmount: 1300,
      weightKg: '13.0 kg',
      status: 'DELIVERED',
    },
  ];

  return (
    <div className="space-y-3 pb-24 text-left max-w-xl mx-auto w-full animate-in fade-in duration-150">
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#14532d] hover:underline cursor-pointer min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Marketplace</span>
        </button>
        <span className="text-[10.5px] min-[360px]:text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Order Activity
        </span>
      </div>

      {/* Active On-Demand Order Banner (if in progress) */}
      {activeOrder && activeOrder.stage !== 'completed' && (
        <div className="rounded-2xl border-2 border-[#166534] bg-[#f0fdf4] p-3.5 sm:p-4 space-y-3 shadow-sm animate-in slide-in-from-top-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-[#166534] uppercase tracking-wider bg-white px-2 py-0.5 rounded-full border border-[#86efac]">
                <span className="w-2 h-2 rounded-full bg-[#166534] animate-ping" />
                <span>Active Delivery in Progress</span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 mt-1">
                {activeOrder.quantity}x {activeOrder.cylinderSize} (
                {activeOrder.purchaseType === 'refill' ? 'Refill' : 'New Set'})
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Courier: <strong>{activeOrder.assignedRider?.name || 'Juma Kiprono'}</strong> (
                {activeOrder.assignedRider?.plateNumber || 'KMD 824J'})
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-semibold uppercase block">Doorstep PIN</span>
              <span className="font-mono text-base font-black text-[#14532d] bg-white px-2 py-0.5 rounded border border-[#86efac]">
                {activeOrder.handoverPin}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#bbf7d0] text-xs">
            <span className="text-slate-600 font-medium">ETA: ~{activeOrder.etaMinutes} mins away</span>
            <button
              type="button"
              onClick={onOpenTracker}
              className="py-1.5 px-3 rounded-lg bg-[#14532d] hover:bg-[#166534] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              Open Live Tracker →
            </button>
          </div>
        </div>
      )}

      {/* When Customer is Not Signed In */}
      {!customerSession ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-[#f0fdf4] text-[#166534] mx-auto flex items-center justify-center border border-[#bbf7d0]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
              Sign In to View Your Orders
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-0.5">
              Access your real-time order history, digital scale weight receipts, and one-tap cylinder refills.
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => onOpenAuthModal?.('signin')}
              className="py-2 px-4 rounded-xl bg-[#14532d] hover:bg-[#166534] text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => onOpenAuthModal?.('signup')}
              className="py-2 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Create Account
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Your Gas Orders
            </h2>
            <span className="text-[10px] font-bold text-emerald-800 bg-[#f0fdf4] border border-[#bbf7d0] px-2 py-0.5 rounded-full">
              Protected by Supabase RLS
            </span>
          </div>

          {isLoading ? (
            <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#166534]" />
              <span className="text-xs">Loading your order history...</span>
            </div>
          ) : orders.length > 0 ? (
            <div className="space-y-2.5">
              {orders.map((ord: any) => (
                <div
                  key={ord.id || ord.orderNumber}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <SupplierLettermark
                        brand={ord.items?.[0]?.product?.brand || 'K-Gas'}
                        className="w-8 h-8 shrink-0"
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          Order #{ord.orderNumber}
                        </h4>
                        <p className="text-[10.5px] text-slate-500 truncate">
                          {ord.deliveryAddress?.estate || 'Nairobi'} ·{' '}
                          {new Date(ord.createdAt || Date.now()).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    <span className="text-[9.5px] font-bold text-[#166534] bg-[#f0fdf4] border border-[#bbf7d0] px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-3 h-3" /> {ord.status || 'DELIVERED'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-200 text-slate-600">
                    <span>
                      {ord.items?.[0]?.quantity || 1}x {ord.items?.[0]?.product?.cylinderSize || '13kg'} (
                      {ord.items?.[0]?.purchaseType || 'Refill'})
                    </span>
                    <span className="font-bold text-slate-900">
                      KSh {(ord.totalAmount || 2850).toLocaleString()}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      onReorderCylinder?.(
                        ord.items?.[0]?.product?.brand || 'K-Gas',
                        ord.items?.[0]?.product?.cylinderSize || '13kg'
                      );
                      onBackToHome();
                    }}
                    className="w-full min-h-[38px] py-1.5 rounded-lg bg-[#14532d] hover:bg-[#166534] text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Reorder This Cylinder
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2.5">
              {defaultMockOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <SupplierLettermark brand={ord.brand as any} className="w-8 h-8 shrink-0" />
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {ord.brand} {ord.cylinderSize} {ord.purchaseType}
                        </h4>
                        <p className="text-[10.5px] text-slate-500 truncate">
                          {ord.estate} · {ord.date}
                        </p>
                      </div>
                    </div>
                    <span className="text-[9.5px] font-bold text-[#166534] bg-[#f0fdf4] border border-[#bbf7d0] px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-3 h-3" /> {ord.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-200 text-slate-600">
                    <span>Digital Scale verified: {ord.weightKg}</span>
                    <span className="font-bold text-slate-900">
                      KSh {ord.totalAmount.toLocaleString()}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      onReorderCylinder?.(ord.brand, ord.cylinderSize);
                      onBackToHome();
                    }}
                    className="w-full min-h-[38px] py-1.5 rounded-lg bg-[#14532d] hover:bg-[#166534] text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Reorder Cylinder
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ==============================================================================
// 2. WALLET VIEW (Ooh Gas Lipa Na M-Pesa Balance)
// ==============================================================================
export const WalletView: React.FC<ViewProps> = ({ onBackToHome, customerSession }) => {
  return (
    <div className="space-y-3 pb-24 text-left max-w-xl mx-auto w-full animate-in fade-in duration-150">
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#14532d] hover:underline cursor-pointer min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Marketplace</span>
        </button>
        <span className="text-[10.5px] min-[360px]:text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Ooh Gas Wallet
        </span>
      </div>

      {/* Wallet Card */}
      <div className="rounded-2xl bg-[#14532d] p-4 sm:p-5 text-white border border-[#0f3d21] shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] min-[360px]:text-[11px] font-semibold text-emerald-200 uppercase tracking-wider">
            Available Balance
          </span>
          <span className="text-[9.5px] min-[360px]:text-[10px] bg-[#22c55e]/20 text-[#bef264] border border-[#bef264]/30 px-2 py-0.5 rounded-full font-bold">
            M-Pesa Linked ✓
          </span>
        </div>
        <div className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight">
          KSh 3,250
        </div>
        <p className="mt-1 text-[11px] text-emerald-200/90 font-mono">
          Linked Phone: {customerSession?.user.phoneNumber || '+254 712 345 678'}
        </p>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className="flex-1 py-2 px-3 min-h-[40px] rounded-xl bg-white text-[#14532d] text-xs font-bold hover:bg-emerald-50 transition-colors cursor-pointer shadow-xs"
          >
            Top Up via M-Pesa
          </button>
          <button
            type="button"
            className="flex-1 py-2 px-3 min-h-[40px] rounded-xl bg-[#0d341d] text-white text-xs font-bold hover:bg-[#092615] transition-colors cursor-pointer border border-emerald-800"
          >
            Payment Receipts
          </button>
        </div>
      </div>
    </div>
  );
};

// ==============================================================================
// 3. PROFILE VIEW (Comprehensive Customer Account, Addresses, Password Reset & Logout)
// ==============================================================================
export const ProfileView: React.FC<ViewProps> = ({
  onBackToHome,
  customerSession,
  onOpenAuthModal,
}) => {
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);

  // Edit Profile State
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editFullName, setEditFullName] = useState(customerSession?.user.fullName || '');
  const [editPhone, setEditPhone] = useState(customerSession?.user.phoneNumber || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Add Address State
  const [isAddAddressOpen, setIsAddAddressOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('Home');
  const [newStreet, setNewStreet] = useState('');
  const [newBuilding, setNewBuilding] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  // Password reset message
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const loadAddresses = async () => {
    setIsLoadingAddresses(true);
    try {
      const list = await getCustomerSavedAddresses();
      setAddresses(list);
    } catch (e) {
      console.warn('[ProfileView] Addresses load error:', e);
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  useEffect(() => {
    if (customerSession) {
      setEditFullName(customerSession.user.fullName);
      setEditPhone(customerSession.user.phoneNumber);
      loadAddresses();
    }
  }, [customerSession]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileMessage(null);
    try {
      await updateCustomerProfile({
        fullName: editFullName,
        phoneNumber: editPhone,
      });
      setProfileMessage('Profile details updated successfully!');
      setTimeout(() => {
        setIsEditProfileOpen(false);
        setProfileMessage(null);
      }, 1000);
    } catch (err: any) {
      setProfileMessage(err.message || 'Failed to update profile.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAddress(true);
    try {
      await saveCustomerAddress({
        label: newLabel,
        streetAddress: newStreet,
        buildingName: newBuilding,
        houseOrFlatNumber: newUnit,
        deliveryNotes: newNotes,
        location: { lat: -1.2921, lng: 36.7856 },
        isDefault: addresses.length === 0,
      });
      setIsAddAddressOpen(false);
      setNewStreet('');
      setNewBuilding('');
      setNewUnit('');
      setNewNotes('');
      loadAddresses();
    } catch (err) {
      console.warn('[ProfileView] Save address error:', err);
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    await deleteCustomerAddress(id);
    loadAddresses();
  };

  const handleSetDefaultAddress = async (id: string) => {
    await setDefaultCustomerAddress(id);
    loadAddresses();
  };

  const handleTriggerPasswordReset = async () => {
    if (!customerSession?.user.email) return;
    setIsSendingReset(true);
    setResetMessage(null);
    try {
      const res = await resetCustomerPassword(customerSession.user.email);
      setResetMessage(res.message);
    } catch (e: any) {
      setResetMessage(e.message || 'Failed to send password reset email.');
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleSignOut = async () => {
    await signOutCustomer();
  };

  return (
    <div className="space-y-3 pb-24 text-left max-w-xl mx-auto w-full animate-in fade-in duration-150">
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#14532d] hover:underline cursor-pointer min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Marketplace</span>
        </button>
        <span className="text-[10.5px] min-[360px]:text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Customer Account
        </span>
      </div>

      {/* When Customer is Not Signed In */}
      {!customerSession ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center space-y-3 shadow-xs">
          <div className="w-14 h-14 rounded-full bg-[#f0fdf4] text-[#166534] mx-auto flex items-center justify-center border border-[#bbf7d0]">
            <User className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
              Welcome to Ooh Gas Kenya
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-0.5">
              Sign in or create your customer account to save delivery estates, track orders in real time, and verify cylinder weights.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-2 max-w-xs mx-auto">
            <button
              type="button"
              onClick={() => onOpenAuthModal?.('signin')}
              className="py-2.5 px-4 rounded-xl bg-[#14532d] hover:bg-[#166534] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => onOpenAuthModal?.('signup')}
              className="py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Create Account
            </button>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => loginWithDemoAccount()}
              className="text-xs font-bold text-[#166534] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>1-Tap Demo Login (Wangari Mwangi)</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Authenticated Profile Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-14 h-14 rounded-full bg-[#14532d] text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-xs border-2 border-white ring-2 ring-[#86efac]">
                  {customerSession.user.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-base font-extrabold text-slate-900 truncate">
                      {customerSession.user.fullName}
                    </h3>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Verified Member
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 truncate mt-0.5 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{customerSession.user.phoneNumber}</span>
                  </p>
                  <p className="text-xs text-slate-500 truncate mt-0.5 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span>{customerSession.user.email}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditProfileOpen(true)}
                className="py-1.5 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            </div>

            {/* Unique Customer ID Badge with Copy Control */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Unique Customer Identity ID
                </span>
                <span className="font-mono text-[11px] text-slate-800 font-semibold truncate block">
                  {customerSession.user.id}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(customerSession.user.id);
                    setCopiedId(true);
                    setTimeout(() => setCopiedId(false), 2000);
                  }}
                  className="px-2 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-100 active:bg-slate-200 text-slate-700 text-[10.5px] font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  title="Copy Unique Customer ID"
                >
                  {copiedId ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-500" />
                      <span>Copy ID</span>
                    </>
                  )}
                </button>
                <span className="text-[10px] font-bold text-[#14532d] bg-[#f0fdf4] border border-[#bbf7d0] px-2 py-0.5 rounded">
                  Supabase RLS
                </span>
              </div>
            </div>
          </div>

          {/* Edit Profile Dialog Modal */}
          {isEditProfileOpen && (
            <div className="p-4 rounded-2xl bg-white border border-emerald-200 shadow-md space-y-3 animate-in fade-in">
              <h4 className="text-xs font-extrabold text-[#14532d] uppercase tracking-wider">
                Edit Personal Information
              </h4>

              {profileMessage && (
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800 text-xs border border-emerald-200">
                  {profileMessage}
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 focus:border-[#166534] outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 focus:border-[#166534] outline-hidden"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="flex-1 py-2 rounded-xl bg-[#14532d] hover:bg-[#166534] text-white text-xs font-bold cursor-pointer transition-colors"
                  >
                    {isUpdatingProfile ? 'Saving...' : 'Save Profile Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditProfileOpen(false)}
                    className="px-3 py-2 rounded-xl border border-slate-300 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Saved Delivery Addresses Section */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Saved Delivery Addresses</h4>
                <p className="text-[11px] text-slate-500">
                  Quickly choose your home or office during gas checkout
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddAddressOpen(!isAddAddressOpen)}
                className="py-1 px-2.5 rounded-lg bg-[#14532d] hover:bg-[#166534] text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New</span>
              </button>
            </div>

            {/* Add Address Form */}
            {isAddAddressOpen && (
              <form onSubmit={handleSaveAddress} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs animate-in fade-in">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Label</label>
                    <input
                      type="text"
                      required
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder="e.g. Home, Work, Parents"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Street / Road</label>
                    <input
                      type="text"
                      required
                      value={newStreet}
                      onChange={(e) => setNewStreet(e.target.value)}
                      placeholder="e.g. Argwings Kodhek Rd"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Building Name</label>
                    <input
                      type="text"
                      value={newBuilding}
                      onChange={(e) => setNewBuilding(e.target.value)}
                      placeholder="e.g. Silver Oak Court"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">House / Apartment #</label>
                    <input
                      type="text"
                      value={newUnit}
                      onChange={(e) => setNewUnit(e.target.value)}
                      placeholder="e.g. Apt 4B (2nd Floor)"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Delivery Notes for Courier</label>
                  <input
                    type="text"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="e.g. Ring buzzer 104, call at gate"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={isSavingAddress}
                    className="flex-1 py-1.5 rounded-lg bg-[#14532d] hover:bg-[#166534] text-white font-bold transition-colors cursor-pointer"
                  >
                    {isSavingAddress ? 'Saving Address...' : 'Save Address'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddAddressOpen(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Address List */}
            {isLoadingAddresses ? (
              <div className="py-4 text-center text-xs text-slate-400">Loading addresses...</div>
            ) : addresses.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400">
                No saved addresses yet. Click "Add New" to save your delivery location.
              </div>
            ) : (
              <div className="space-y-2">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`p-3 rounded-xl border text-xs transition-colors flex items-start justify-between gap-2.5 ${
                      addr.isDefault
                        ? 'border-emerald-300 bg-[#f0fdf4]'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-slate-900">{addr.label}</span>
                        {addr.isDefault && (
                          <span className="text-[9.5px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-slate-700 truncate">
                        {addr.buildingName ? `${addr.buildingName}, ` : ''}
                        {addr.houseOrFlatNumber ? `${addr.houseOrFlatNumber}, ` : ''}
                        {addr.streetAddress}
                      </p>
                      {addr.deliveryNotes && (
                        <p className="text-[10.5px] text-slate-500 italic">
                          Note: {addr.deliveryNotes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {!addr.isDefault && (
                        <button
                          type="button"
                          onClick={() => handleSetDefaultAddress(addr.id)}
                          className="px-2 py-1 rounded-md text-[10.5px] font-bold text-[#14532d] hover:bg-emerald-100 transition-colors cursor-pointer"
                        >
                          Make Default
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="p-1 rounded-md text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                        aria-label="Delete address"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Account Security & Password Reset */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Account Security & Password
            </h4>

            {resetMessage && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                {resetMessage}
              </div>
            )}

            <div className="flex items-center justify-between text-xs py-1">
              <div>
                <span className="font-bold text-slate-800 block">Password Reset</span>
                <span className="text-[11px] text-slate-500">
                  Send reset link to {customerSession.user.email}
                </span>
              </div>
              <button
                type="button"
                onClick={handleTriggerPasswordReset}
                disabled={isSendingReset}
                className="py-1.5 px-3 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold transition-colors cursor-pointer"
              >
                {isSendingReset ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>
          </div>

          {/* Sign Out Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full py-2.5 px-4 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-red-600" />
              <span>Sign Out of Ooh Gas</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
