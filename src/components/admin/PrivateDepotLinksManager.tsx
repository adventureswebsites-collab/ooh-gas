import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DepotAccessLinkRecord,
  fetchAdminDepotLinks,
  createAdminDepotLink,
  revokeAdminDepotLink,
  regenerateAdminDepotLink,
  deleteAdminDepotLink,
} from '../../services/multiSupplierService';
import { SupplierBusiness } from '../../types/multisupplier';
import { MULTI_SUPPLIER_BUSINESSES } from '../../data/multiSupplierData';
import {
  KeyRound,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  ShieldOff,
  ShieldCheck,
  Trash2,
  Plus,
  Building2,
  AlertCircle,
} from 'lucide-react';

interface PrivateDepotLinksManagerProps {
  adminToken: string;
}

function buildPrivateDepotUrl(token: string): string {
  if (typeof window === 'undefined') {
    return `/?depotKey=${encodeURIComponent(token)}`;
  }
  return `${window.location.origin}/?depotKey=${encodeURIComponent(token)}`;
}

function maskToken(token: string): string {
  if (token.length <= 14) return token;
  return `${token.slice(0, 10)}••••${token.slice(-6)}`;
}

function formatDateShort(iso?: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const PrivateDepotLinksManager: React.FC<PrivateDepotLinksManagerProps> = ({
  adminToken,
}) => {
  const [links, setLinks] = useState<DepotAccessLinkRecord[]>([]);
  const [depots, setDepots] = useState<SupplierBusiness[]>(MULTI_SUPPLIER_BUSINESSES);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [busyLinkId, setBusyLinkId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [newlyCreatedLink, setNewlyCreatedLink] = useState<DepotAccessLinkRecord | null>(null);

  // Generator Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(
    MULTI_SUPPLIER_BUSINESSES[0]?.id || 'sup-kgas-kilimani'
  );
  const [label, setLabel] = useState<string>('Main Dispatch Desk');
  const [expiryOption, setExpiryOption] = useState<'never' | '24' | '168' | '720'>('never');

  // Filter State
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'revoked'>('all');
  const [filterDepotId, setFilterDepotId] = useState<string>('all');

  const loadLinks = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchAdminDepotLinks(adminToken);
      setLinks(data.links || []);
      if (Array.isArray(data.depots) && data.depots.length > 0) {
        setDepots(data.depots);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to load private depot links.');
    } finally {
      setIsLoading(false);
    }
  }, [adminToken]);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  const copyUrlToClipboard = async (id: string, token: string) => {
    const url = buildPrivateDepotUrl(token);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => {
        setCopiedId((prev) => (prev === id ? null : prev));
      }, 2200);
    } catch {
      // Clipboard fallback
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopiedId(id);
      setTimeout(() => {
        setCopiedId((prev) => (prev === id ? null : prev));
      }, 2200);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const expiresInHours = expiryOption === 'never' ? null : Number(expiryOption);
      const res = await createAdminDepotLink(adminToken, {
        supplierId: selectedSupplierId,
        label: label.trim() || 'Dispatch Desk',
        expiresInHours,
      });
      if (res.link) {
        setNewlyCreatedLink(res.link);
        await copyUrlToClipboard(res.link.id, res.link.token);
      }
      await loadLinks();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate private depot link.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleRevoke = async (link: DepotAccessLinkRecord) => {
    setBusyLinkId(link.id);
    setErrorMsg(null);
    try {
      await revokeAdminDepotLink(adminToken, link.id, !link.isActive);
      await loadLinks();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed updating link status.');
    } finally {
      setBusyLinkId(null);
    }
  };

  const handleRegenerate = async (link: DepotAccessLinkRecord) => {
    setBusyLinkId(link.id);
    setErrorMsg(null);
    try {
      const res = await regenerateAdminDepotLink(adminToken, link.id);
      if (res.link) {
        setNewlyCreatedLink(res.link);
      }
      await loadLinks();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed regenerating link token.');
    } finally {
      setBusyLinkId(null);
    }
  };

  const handleDelete = async (link: DepotAccessLinkRecord) => {
    setBusyLinkId(link.id);
    setErrorMsg(null);
    try {
      await deleteAdminDepotLink(adminToken, link.id);
      if (newlyCreatedLink?.id === link.id) {
        setNewlyCreatedLink(null);
      }
      await loadLinks();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed deleting link.');
    } finally {
      setBusyLinkId(null);
    }
  };

  const filteredLinks = useMemo(() => {
    return links.filter((link) => {
      if (filterDepotId !== 'all' && link.supplierId !== filterDepotId) return false;
      const isExpired =
        Boolean(link.expiresAt) && new Date(link.expiresAt!).getTime() <= Date.now();
      const effectivelyActive = link.isActive && !isExpired;
      if (filterStatus === 'active' && !effectivelyActive) return false;
      if (filterStatus === 'revoked' && effectivelyActive) return false;
      return true;
    });
  }, [links, filterStatus, filterDepotId]);

  const activeCount = links.filter(
    (l) => l.isActive && (!l.expiresAt || new Date(l.expiresAt).getTime() > Date.now())
  ).length;

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8FAFC] p-4 sm:p-5 space-y-4 text-[#0F172A]">
      {/* Generator Card */}
      <form
        onSubmit={handleGenerate}
        className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 space-y-4"
      >
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-[#0E8A45] flex items-center justify-center shrink-0">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#0F172A]">
                Generate Private Depot Portal Link
              </h3>
              <p className="text-xs text-slate-500">
                Create a scoped, secret URL for a gas depot to receive orders and manage deliveries without accessing the customer website.
              </p>
            </div>
          </div>

          <span className="text-xs font-mono tabular-nums font-semibold text-slate-600 whitespace-nowrap">
            {activeCount} active link{activeCount === 1 ? '' : 's'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-5 space-y-1">
            <label
              htmlFor="depot-select-input"
              className="block text-[11px] font-bold text-slate-600"
            >
              Depot Station
            </label>
            <select
              id="depot-select-input"
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-neutral-200 bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0E8A45]"
            >
              {depots.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.tradeName}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3 space-y-1">
            <label
              htmlFor="depot-label-input"
              className="block text-[11px] font-bold text-slate-600"
            >
              Shift / Desk Label
            </label>
            <input
              id="depot-label-input"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Main Dispatch Desk"
              maxLength={48}
              className="w-full h-10 px-3 rounded-xl border border-neutral-200 bg-[#F8FAFC] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0E8A45]"
            />
          </div>

          <div className="md:col-span-2 space-y-1">
            <label
              htmlFor="depot-expiry-input"
              className="block text-[11px] font-bold text-slate-600"
            >
              Expiration
            </label>
            <select
              id="depot-expiry-input"
              value={expiryOption}
              onChange={(e) => setExpiryOption(e.target.value as any)}
              className="w-full h-10 px-3 rounded-xl border border-neutral-200 bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0E8A45]"
            >
              <option value="never">Never expires</option>
              <option value="24">24 hours</option>
              <option value="168">7 days</option>
              <option value="720">30 days</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isGenerating}
              className="w-full h-10 px-3 rounded-xl bg-[#0E8A45] hover:bg-[#0B7138] disabled:opacity-50 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>{isGenerating ? 'Minting...' : 'Generate Link'}</span>
            </button>
          </div>
        </div>

        {/* Newly Generated Link Highlight */}
        {newlyCreatedLink && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0 space-y-0.5">
              <div className="text-[11px] font-bold text-[#0E8A45]">
                Ready to share with {newlyCreatedLink.supplierTradeName} · {newlyCreatedLink.label}
              </div>
              <div className="font-mono text-xs text-emerald-950 truncate select-all">
                {buildPrivateDepotUrl(newlyCreatedLink.token)}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() =>
                  copyUrlToClipboard(newlyCreatedLink.id, newlyCreatedLink.token)
                }
                className="px-3 py-1.5 rounded-lg bg-white border border-emerald-300 hover:bg-emerald-100 text-[#0E8A45] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                {copiedId === newlyCreatedLink.id ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>

              <a
                href={buildPrivateDepotUrl(newlyCreatedLink.token)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-[#0E8A45] hover:bg-[#0B7138] text-white text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <span>Open Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </form>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {(['all', 'active', 'revoked'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors whitespace-nowrap ${
                filterStatus === status
                  ? 'bg-[#0F172A] text-white'
                  : 'bg-white border border-neutral-200 text-slate-600 hover:text-[#0F172A]'
              }`}
            >
              {status === 'all' ? 'All Links' : status === 'active' ? 'Active' : 'Revoked / Expired'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterDepotId}
            onChange={(e) => setFilterDepotId(e.target.value)}
            aria-label="Filter links by depot"
            className="h-9 px-3 rounded-lg border border-neutral-200 bg-white text-xs font-semibold text-[#0F172A] focus:outline-none"
          >
            <option value="all">All Depots</option>
            {depots.map((d) => (
              <option key={d.id} value={d.id}>
                {d.tradeName}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={loadLinks}
            className="h-9 px-3 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Links List */}
      <div className="space-y-2.5">
        {filteredLinks.length === 0 ? (
          <div className="bg-white border border-neutral-200 rounded-2xl p-8 text-center text-xs text-slate-500">
            No private depot links match this filter.
          </div>
        ) : (
          filteredLinks.map((link) => {
            const isExpired =
              Boolean(link.expiresAt) && new Date(link.expiresAt!).getTime() <= Date.now();
            const isEffectiveActive = link.isActive && !isExpired;
            const isBusy = busyLinkId === link.id;
            const fullUrl = buildPrivateDepotUrl(link.token);

            return (
              <article
                key={link.id}
                className="bg-white border border-neutral-200 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="font-extrabold text-[#0F172A]">
                      {link.supplierTradeName}
                    </span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="font-semibold text-slate-600">{link.label}</span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span
                      className={`font-bold ${
                        isEffectiveActive
                          ? 'text-[#16A34A]'
                          : isExpired
                            ? 'text-[#D97706]'
                            : 'text-[#DC2626]'
                      }`}
                    >
                      {isEffectiveActive ? 'Active' : isExpired ? 'Expired' : 'Revoked'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-600 font-mono">
                    <span className="truncate">{maskToken(link.token)}</span>
                    <span aria-hidden="true" className="text-slate-300 font-sans">·</span>
                    <span className="font-sans text-[11px] text-slate-500 whitespace-nowrap">
                      Opens: <strong className="font-mono tabular-nums text-slate-700">{link.accessCount}</strong>
                    </span>
                    <span aria-hidden="true" className="text-slate-300 font-sans">·</span>
                    <span className="font-sans text-[11px] text-slate-500 whitespace-nowrap">
                      Last used: {formatDateShort(link.lastUsedAt)}
                    </span>
                    {link.expiresAt && (
                      <>
                        <span aria-hidden="true" className="text-slate-300 font-sans">·</span>
                        <span className="font-sans text-[11px] text-slate-500 whitespace-nowrap">
                          Expires: {formatDateShort(link.expiresAt)}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                  <button
                    type="button"
                    disabled={!isEffectiveActive}
                    onClick={() => copyUrlToClipboard(link.id, link.token)}
                    className="px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 disabled:opacity-45 text-xs font-bold text-[#0F172A] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    {copiedId === link.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#0E8A45]" />
                        <span className="text-[#0E8A45]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copy URL</span>
                      </>
                    )}
                  </button>

                  {isEffectiveActive ? (
                    <a
                      href={fullUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-[#0E8A45] hover:bg-[#0B7138] text-white text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <span>Open</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <span className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-400 text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap">
                      <span>Disabled</span>
                    </span>
                  )}

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleRegenerate(link)}
                    title="Rotate private token and invalidate previous link"
                    className="px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 disabled:opacity-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`} />
                    <span>Rotate</span>
                  </button>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleToggleRevoke(link)}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                      link.isActive
                        ? 'border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800'
                        : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-[#0E8A45]'
                    }`}
                  >
                    {link.isActive ? (
                      <>
                        <ShieldOff className="w-3.5 h-3.5" />
                        <span>Revoke</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Restore</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleDelete(link)}
                    aria-label={`Delete link for ${link.supplierTradeName}`}
                    className="p-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 text-slate-400 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};
