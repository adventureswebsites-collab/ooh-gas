import React from 'react';
import { NotificationItem } from '../types';
import { X, Bell } from 'lucide-react';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllAsRead: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
}) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 transition-opacity backdrop-blur-xs"
      role="presentation"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-xl border border-slate-200 overflow-hidden max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-4 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-modal-title"
      >
        {/* Mobile Drag Notch Handle */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300 mx-auto mt-2 mb-0.5 sm:hidden shrink-0" />

        {/* Header */}
        <div className="px-4 py-2.5 sm:py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Bell className="w-4 h-4 text-[#166534] shrink-0" />
            <div className="min-w-0">
              <h2 id="notification-modal-title" className="text-xs min-[360px]:text-sm font-bold text-slate-900 leading-tight">
                Notifications
              </h2>
              <p className="text-[10px] min-[360px]:text-[11px] text-slate-500">
                Delivery alerts & safety reminders
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors flex items-center justify-center cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="px-4 py-2 bg-white border-b border-slate-100 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-500 text-[11px]">
            {notifications.filter((n) => !n.read).length} unread updates
          </span>
          <button
            onClick={onMarkAllAsRead}
            className="text-[11px] font-semibold text-[#166534] hover:underline cursor-pointer py-1"
          >
            Mark all read
          </button>
        </div>

        {/* Notification List */}
        <div className="overflow-y-auto p-3 space-y-2 flex-1 text-left">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-3 rounded-lg border text-left transition-colors ${
                notif.read
                  ? 'border-slate-100 bg-white text-slate-600'
                  : 'border-[#bbf7d0] bg-[#f0fdf4] text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-slate-900">{notif.title}</h4>
                <span className="text-[10px] text-slate-400 shrink-0">{notif.time}</span>
              </div>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                {notif.message}
              </p>
            </div>
          ))}
        </div>

        <div
          className="p-3 bg-slate-50 border-t border-slate-200 text-center shrink-0"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
        >
          <button
            onClick={onClose}
            className="w-full min-h-[44px] py-2 bg-[#14532d] hover:bg-[#166534] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
