import React, { useState } from 'react';
import { Supplier, CustomerOrderFlowState, CylinderSize, PurchaseType, DeliveryAddressForm, DeliveryTimingSelection } from '../../types';
import { MOCK_SAVED_ADDRESSES } from '../../data/mockData';
import { StepProgressIndicator, OrderingStep } from './StepProgressIndicator';
import { StepCylinderSelection } from './StepCylinderSelection';
import { StepDeliveryLocation } from './StepDeliveryLocation';
import { StepDeliveryTiming } from './StepDeliveryTiming';
import { StepOrderSummary } from './StepOrderSummary';
import { SupplierLettermark } from '../BrandIdentities';
import { CustomerAuthSession } from '../../services/customerAuthService';
import { X, ArrowLeft, ArrowRight } from 'lucide-react';

interface OrderFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  initialSize?: CylinderSize;
  initialPurchaseType?: PurchaseType;
  currentLocationName?: string;
  customerSession?: CustomerAuthSession | null;
  onRequestLogin?: () => void;
}

export const OrderFlowModal: React.FC<OrderFlowModalProps> = ({
  isOpen,
  onClose,
  supplier,
  initialSize = '13kg',
  initialPurchaseType = 'refill',
  currentLocationName = 'Kilimani, Nairobi',
  customerSession,
  onRequestLogin,
}) => {
  if (!isOpen || !supplier) return null;

  const defaultSaved = MOCK_SAVED_ADDRESSES[0];

  // Primary state for ordering flow
  const [currentStep, setCurrentStep] = useState<OrderingStep>('cylinder');
  const [selectedSize, setSelectedSize] = useState<CylinderSize>(initialSize);
  const [purchaseType, setPurchaseType] = useState<PurchaseType>(initialPurchaseType);
  const [quantity, setQuantity] = useState<number>(1);

  // Address form state
  const [addressForm, setAddressForm] = useState<DeliveryAddressForm>({
    fullName: defaultSaved.fullName,
    phoneNumber: defaultSaved.phoneNumber,
    estate: currentLocationName,
    building: defaultSaved.building,
    unitNumber: defaultSaved.unitNumber,
    deliveryInstructions: defaultSaved.deliveryInstructions,
    pinLocation: {
      lat: -1.2921,
      lng: 36.7856,
      areaName: currentLocationName,
      isCustomPinned: false,
    },
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Timing state
  const [timingSelection, setTimingSelection] = useState<DeliveryTimingSelection>({
    type: 'asap',
    asapEstimateWindow: `${supplier.deliveryTimeMin}`,
    scheduledDate: '',
    scheduledDateFormatted: '',
    scheduledSlotId: '',
    scheduledSlotLabel: '',
  });

  // Reset step if re-opened
  React.useEffect(() => {
    if (isOpen) {
      setSelectedSize(initialSize);
      setPurchaseType(initialPurchaseType);
      setCurrentStep('cylinder');
      setValidationErrors({});
    }
  }, [isOpen, initialSize, initialPurchaseType]);

  // Validation function for Step 2
  const validateAddressStep = (): boolean => {
    const errors: Record<string, string> = {};

    if (!addressForm.fullName.trim()) {
      errors.fullName = 'Recipient full name is required.';
    }
    if (!addressForm.phoneNumber.trim()) {
      errors.phoneNumber = 'Phone number is required for delivery rider contact.';
    } else if (addressForm.phoneNumber.trim().length < 9) {
      errors.phoneNumber = 'Please enter a valid phone number (e.g. 0712 345 678).';
    }
    if (!addressForm.estate.trim()) {
      errors.estate = 'Please select a delivery estate in Nairobi.';
    }
    if (!addressForm.building.trim()) {
      errors.building = 'Building or estate court name is required.';
    }
    if (!addressForm.unitNumber.trim()) {
      errors.unitNumber = 'House, apartment, or floor details are required.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Step Navigation Handlers
  const handleNextStep = () => {
    if (currentStep === 'cylinder') {
      setCurrentStep('address');
    } else if (currentStep === 'address') {
      if (validateAddressStep()) {
        setCurrentStep('timing');
      }
    } else if (currentStep === 'timing') {
      setCurrentStep('summary');
    }
  };

  const handlePrevStep = () => {
    if (currentStep === 'summary') {
      setCurrentStep('timing');
    } else if (currentStep === 'timing') {
      setCurrentStep('address');
    } else if (currentStep === 'address') {
      setCurrentStep('cylinder');
    } else {
      onClose();
    }
  };

  const handleNavigateDirectly = (step: OrderingStep) => {
    if (step === 'timing' || step === 'summary') {
      if (!validateAddressStep()) return;
    }
    setCurrentStep(step);
  };

  const orderState: CustomerOrderFlowState = {
    supplier,
    cylinderSize: selectedSize,
    purchaseType,
    quantity,
    address: addressForm,
    timing: timingSelection,
  };

  const stepTitles: Record<OrderingStep, { title: string; subtitle: string }> = {
    cylinder: { title: 'Select Cylinder & Refill', subtitle: 'Choose size, gas exchange type and quantity' },
    address: { title: 'Delivery Address & Location', subtitle: 'Where should the rider deliver your cylinder?' },
    timing: { title: 'Choose Delivery Window', subtitle: 'Express ASAP or scheduled time slot' },
    summary: { title: 'Review Order Summary', subtitle: 'Confirm all details before checkout' },
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 transition-opacity backdrop-blur-xs"
      role="presentation"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-t-2xl sm:rounded-xl border border-slate-200 overflow-hidden max-h-[94vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-4 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="flow-modal-title"
      >
        {/* Mobile Drag Notch Handle */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300 mx-auto mt-2 mb-0.5 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="px-3.5 sm:px-4 py-2.5 sm:py-3 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <SupplierLettermark brand={supplier.brand} className="w-8 h-8 shrink-0" />
            <div className="min-w-0">
              <h2 id="flow-modal-title" className="text-xs sm:text-sm font-bold text-slate-900 leading-tight truncate">
                {stepTitles[currentStep].title}
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">
                {stepTitles[currentStep].subtitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Responsive Step Progress Indicator */}
        <StepProgressIndicator
          currentStep={currentStep}
          onStepClick={handleNavigateDirectly}
          canNavigateToStep={() => true}
        />

        {/* Scrollable Step Body Content */}
        <div className="overflow-y-auto p-3.5 sm:p-5 flex-1">
          {currentStep === 'cylinder' && (
            <StepCylinderSelection
              supplier={supplier}
              selectedSize={selectedSize}
              onChangeSize={setSelectedSize}
              purchaseType={purchaseType}
              onChangePurchaseType={setPurchaseType}
              quantity={quantity}
              onChangeQuantity={setQuantity}
            />
          )}

          {currentStep === 'address' && (
            <StepDeliveryLocation
              formData={addressForm}
              onChangeFormData={setAddressForm}
              validationErrors={validationErrors}
            />
          )}

          {currentStep === 'timing' && (
            <StepDeliveryTiming
              timingSelection={timingSelection}
              onChangeTiming={setTimingSelection}
              estimatedDeliveryMin={supplier.deliveryTimeMin}
            />
          )}

          {currentStep === 'summary' && (
            <StepOrderSummary
              orderState={orderState}
              onEditStep={(step) => setCurrentStep(step)}
              onFinishFlow={onClose}
              customerSession={customerSession}
              onRequestLogin={onRequestLogin}
            />
          )}
        </div>

        {/* Modal Footer Controls (Sticky with Safe Area Support) */}
        {currentStep !== 'summary' && (
          <div
            className="p-3 sm:p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2.5 shrink-0"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
          >
            {/* Back / Cancel Button */}
            <button
              type="button"
              onClick={handlePrevStep}
              className="py-2.5 px-3.5 min-h-[44px] rounded-xl border border-slate-300 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{currentStep === 'cylinder' ? 'Cancel' : 'Back'}</span>
            </button>

            {/* Continue Button */}
            <button
              type="button"
              onClick={handleNextStep}
              className="flex-1 max-w-[240px] py-2.5 px-4 min-h-[44px] rounded-xl bg-[#14532d] hover:bg-[#166534] active:bg-[#0f3d21] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <span>
                {currentStep === 'cylinder'
                  ? 'Continue to Address'
                  : currentStep === 'address'
                  ? 'Continue to Timing'
                  : 'Review Order'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
