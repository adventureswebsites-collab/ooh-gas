import React from 'react';
import { DeliveryTimingSelection, DeliveryTimingType } from '../../types';
import { AVAILABLE_DELIVERY_TIME_SLOTS } from '../../data/mockData';
import { Zap, Calendar, Clock, Check, ShieldCheck } from 'lucide-react';

interface StepDeliveryTimingProps {
  timingSelection: DeliveryTimingSelection;
  onChangeTiming: (timing: DeliveryTimingSelection) => void;
  estimatedDeliveryMin: string;
}

export const StepDeliveryTiming: React.FC<StepDeliveryTimingProps> = ({
  timingSelection,
  onChangeTiming,
  estimatedDeliveryMin,
}) => {
  // Generate next 7 upcoming valid dates starting from today (strictly preventing past dates!)
  const upcomingDates = React.useMemo(() => {
    const list = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateKey = `${yyyy}-${mm}-${dd}`;

      let formattedLabel = '';
      if (i === 0) formattedLabel = 'Today';
      else if (i === 1) formattedLabel = 'Tomorrow';
      else formattedLabel = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

      const dayName = d.toLocaleDateString('en-GB', { weekday: 'short' });
      const dayNum = d.getDate();
      const monthName = d.toLocaleDateString('en-GB', { month: 'short' });

      list.push({
        dateKey,
        formattedLabel,
        dayName,
        dayNum,
        monthName,
        isToday: i === 0,
      });
    }
    return list;
  }, []);

  const handleSelectTimingType = (type: DeliveryTimingType) => {
    if (type === 'asap') {
      onChangeTiming({
        ...timingSelection,
        type: 'asap',
      });
    } else {
      onChangeTiming({
        ...timingSelection,
        type: 'scheduled',
        scheduledDate: timingSelection.scheduledDate || upcomingDates[1].dateKey,
        scheduledDateFormatted: timingSelection.scheduledDateFormatted || `${upcomingDates[1].formattedLabel} (${upcomingDates[1].dayNum} ${upcomingDates[1].monthName})`,
        scheduledSlotId: timingSelection.scheduledSlotId || AVAILABLE_DELIVERY_TIME_SLOTS[1].id,
        scheduledSlotLabel: timingSelection.scheduledSlotLabel || AVAILABLE_DELIVERY_TIME_SLOTS[1].label,
      });
    }
  };

  const handleSelectDate = (dateItem: typeof upcomingDates[0]) => {
    onChangeTiming({
      ...timingSelection,
      type: 'scheduled',
      scheduledDate: dateItem.dateKey,
      scheduledDateFormatted: `${dateItem.formattedLabel} (${dateItem.dayNum} ${dateItem.monthName})`,
    });
  };

  const handleSelectSlot = (slot: typeof AVAILABLE_DELIVERY_TIME_SLOTS[0]) => {
    onChangeTiming({
      ...timingSelection,
      type: 'scheduled',
      scheduledSlotId: slot.id,
      scheduledSlotLabel: slot.label,
    });
  };

  return (
    <div className="space-y-4 text-left">
      {/* 1. Primary Option Selector: ASAP vs Scheduled */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Delivery Window Preference
        </label>

        {/* ASAP Option Card */}
        <button
          type="button"
          onClick={() => handleSelectTimingType('asap')}
          className={`w-full p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start justify-between gap-3 ${
            timingSelection.type === 'asap'
              ? 'border-[#14532d] bg-[#f0fdf4] ring-1 ring-[#14532d] shadow-xs'
              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
          }`}
        >
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                timingSelection.type === 'asap'
                  ? 'bg-[#14532d] text-[#bef264]'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              <Zap className="w-5 h-5 fill-current" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900 leading-tight">
                  Deliver As Soon As Possible
                </h4>
                <span className="text-[10px] font-bold text-[#14532d] bg-[#dcfce7] px-2 py-0.2 rounded uppercase">
                  Fastest
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Estimated arrival window: <strong className="text-[#14532d]">{estimatedDeliveryMin}</strong>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Nearest courier assigned immediately upon order confirmation.
              </p>
            </div>
          </div>

          <div className="shrink-0 mt-0.5">
            {timingSelection.type === 'asap' ? (
              <div className="w-5 h-5 rounded-full bg-[#14532d] text-white flex items-center justify-center">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full border border-slate-300" />
            )}
          </div>
        </button>

        {/* Schedule for Later Option Card */}
        <button
          type="button"
          onClick={() => handleSelectTimingType('scheduled')}
          className={`w-full p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start justify-between gap-3 ${
            timingSelection.type === 'scheduled'
              ? 'border-[#14532d] bg-[#f0fdf4] ring-1 ring-[#14532d] shadow-xs'
              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
          }`}
        >
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                timingSelection.type === 'scheduled'
                  ? 'bg-[#14532d] text-[#bef264]'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              <Calendar className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900 leading-tight">
                  Schedule For Later Date
                </h4>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Choose a specific date and 2-hour window that fits your schedule.
              </p>
              {timingSelection.type === 'scheduled' && (
                <p className="text-[11px] font-semibold text-[#14532d] mt-1">
                  Selected: {timingSelection.scheduledDateFormatted} · {timingSelection.scheduledSlotLabel}
                </p>
              )}
            </div>
          </div>

          <div className="shrink-0 mt-0.5">
            {timingSelection.type === 'scheduled' ? (
              <div className="w-5 h-5 rounded-full bg-[#14532d] text-white flex items-center justify-center">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full border border-slate-300" />
            )}
          </div>
        </button>
      </div>

      {/* 2. Expanded Schedule Controls (Only active when 'scheduled' is selected) */}
      {timingSelection.type === 'scheduled' && (
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-3.5 animate-in fade-in duration-150">
          {/* Upcoming Date Picker (Scrollable horizontally, strictly prevents past dates!) */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#166534]" />
                Select Delivery Date
              </span>
              <span className="text-[11px] text-slate-400">Next 7 days available</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {upcomingDates.map((d) => {
                const isSelected = timingSelection.scheduledDate === d.dateKey;
                return (
                  <button
                    key={d.dateKey}
                    type="button"
                    onClick={() => handleSelectDate(d)}
                    className={`py-2 px-2.5 rounded-xl border text-center transition-all cursor-pointer min-w-[70px] shrink-0 flex flex-col items-center justify-between min-h-[58px] ${
                      isSelected
                        ? 'border-[#14532d] bg-[#14532d] text-white shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className={`text-[10px] font-bold uppercase ${isSelected ? 'text-[#bef264]' : 'text-slate-400'}`}>
                      {d.dayName}
                    </span>
                    <span className="text-sm font-extrabold my-0.5">
                      {d.dayNum}
                    </span>
                    <span className={`text-[9.5px] font-medium ${isSelected ? 'text-white' : 'text-slate-500'}`}>
                      {d.isToday ? 'Today' : d.monthName}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Slot Picker */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#166534]" />
                Select Time Slot
              </span>
              <span className="text-[11px] text-slate-400">Doorstep window</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {AVAILABLE_DELIVERY_TIME_SLOTS.map((slot) => {
                const isSelected = timingSelection.scheduledSlotId === slot.id;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => handleSelectSlot(slot)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-[#14532d] bg-[#f0fdf4] ring-1 ring-[#14532d]'
                        : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">{slot.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{slot.tag}</div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-[#166534] stroke-[3] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. Safety & Punctuality Reassurance */}
      <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 text-emerald-950 text-xs flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
        <span className="text-[11px] leading-tight">
          Delivery technicians are equipped with certified scales and safety test kits for on-time doorstep verification.
        </span>
      </div>
    </div>
  );
};
