import React from 'react';
import { Flame, MapPin, Clock, FileText, Check } from 'lucide-react';

export type OrderingStep = 'cylinder' | 'address' | 'timing' | 'summary';

interface StepProgressIndicatorProps {
  currentStep: OrderingStep;
  onStepClick?: (step: OrderingStep) => void;
  canNavigateToStep?: (step: OrderingStep) => boolean;
}

export const StepProgressIndicator: React.FC<StepProgressIndicatorProps> = ({
  currentStep,
  onStepClick,
  canNavigateToStep,
}) => {
  const steps: { id: OrderingStep; label: string; shortLabel: string; icon: React.ElementType; stepNum: number }[] = [
    { id: 'cylinder', label: 'Cylinder', shortLabel: 'Gas', icon: Flame, stepNum: 1 },
    { id: 'address', label: 'Location', shortLabel: 'Address', icon: MapPin, stepNum: 2 },
    { id: 'timing', label: 'Time', shortLabel: 'Time', icon: Clock, stepNum: 3 },
    { id: 'summary', label: 'Summary', shortLabel: 'Total', icon: FileText, stepNum: 4 },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="w-full bg-slate-50 border-b border-slate-200 px-3 py-2 sm:px-4 sm:py-2.5">
      <div className="max-w-xl mx-auto flex items-center justify-between relative">
        {/* Track Line behind steps */}
        <div className="absolute left-6 right-6 top-3.5 -translate-y-1/2 h-0.5 bg-slate-200 -z-0" />
        <div
          className="absolute left-6 top-3.5 -translate-y-1/2 h-0.5 bg-[#14532d] transition-all duration-300 -z-0"
          style={{
            width: `${(currentStepIndex / (steps.length - 1)) * 85}%`,
          }}
        />

        {steps.map((step, idx) => {
          const isCurrent = step.id === currentStep;
          const isCompleted = idx < currentStepIndex;
          const isClickable = onStepClick && canNavigateToStep ? canNavigateToStep(step.id) : false;

          return (
            <button
              key={step.id}
              type="button"
              disabled={!isClickable && !isCurrent}
              onClick={() => isClickable && onStepClick && onStepClick(step.id)}
              className={`flex flex-col items-center group relative z-10 focus:outline-none ${
                isClickable ? 'cursor-pointer' : 'cursor-default'
              }`}
            >
              {/* Step Circle */}
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 border-2 ${
                  isCurrent
                    ? 'bg-[#14532d] text-white border-[#14532d] ring-2 ring-lime-400/40 shadow-xs scale-105'
                    : isCompleted
                    ? 'bg-[#f0fdf4] text-[#14532d] border-[#166534]'
                    : 'bg-white text-slate-400 border-slate-300'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5 stroke-[3] text-[#166534]" />
                ) : (
                  <span>{step.stepNum}</span>
                )}
              </div>

              {/* Step Label */}
              <span
                className={`text-[10px] sm:text-xs font-semibold mt-1 tracking-tight ${
                  isCurrent
                    ? 'text-[#14532d] font-bold'
                    : isCompleted
                    ? 'text-slate-700'
                    : 'text-slate-400'
                }`}
              >
                <span className="sm:hidden">{step.shortLabel}</span>
                <span className="hidden sm:inline">{step.label}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
