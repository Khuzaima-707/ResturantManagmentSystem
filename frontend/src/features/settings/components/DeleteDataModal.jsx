import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, Trash2, ArrowRight, ShieldAlert } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

/**
 * DeleteDataModal Component
 * Two-Step Guarded Deletion Modal.
 * Step 1: Explains scope and demands EXACT typed phrase `DELETE ALL DATA`.
 * Step 2: Final explicit destructive confirmation "Yes, Delete Everything".
 */
export const DeleteDataModal = ({
  isOpen,
  onClose,
  onConfirmReset,
}) => {
  const [step, setStep] = useState(1); // 1 = Typed Confirmation, 2 = Final Confirmation
  const [typedPhrase, setTypedPhrase] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const REQUIRED_PHRASE = 'DELETE ALL DATA';
  const isPhraseMatched = typedPhrase === REQUIRED_PHRASE;

  const handleClose = () => {
    if (isDeleting) return;
    setStep(1);
    setTypedPhrase('');
    onClose?.();
  };

  const handleProceedToStep2 = () => {
    if (!isPhraseMatched) return;
    setStep(2);
  };

  const handleFinalConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirmReset();
    } finally {
      setIsDeleting(false);
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      maxWidth="max-w-md"
    >
      <div className="flex flex-col items-center text-center pt-2">
        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`w-2 h-2 rounded-full ${step === 1 ? 'bg-rose-500' : 'bg-slate-300'}`} />
          <span className={`w-2 h-2 rounded-full ${step === 2 ? 'bg-rose-500' : 'bg-slate-300'}`} />
          <span className="text-[11px] font-semibold text-slate-400">
            Step {step} of 2
          </span>
        </div>

        {/* STEP 1: Typed Confirmation */}
        {step === 1 && (
          <>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center border border-rose-200 bg-rose-50 text-rose-600 mb-3 shadow-2xs">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 tracking-tight mb-1.5">
              Delete All Restaurant Data?
            </h3>

            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              This action will permanently clear all operational restaurant data stored in this frontend application.
            </p>

            {/* Scope Summary Box */}
            <div className="w-full text-left p-3.5 rounded-xl bg-rose-50/50 border border-rose-200/80 mb-4 space-y-2 text-xs">
              <div className="font-bold text-rose-800 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>The following operational data will be permanently wiped:</span>
              </div>
              <ul className="list-disc list-inside text-rose-700/90 text-[11px] space-y-0.5 pl-1">
                <li>All Categories, Food Items & Add-ons</li>
                <li>All Completed Orders & Invoice History</li>
                <li>All Reversals & Historical Ledger records</li>
                <li>Active POS Cart & cached session data</li>
                <li>User-uploaded food images in IndexedDB</li>
              </ul>
              <div className="border-t border-rose-200/60 pt-1.5 text-[10px] text-slate-500">
                Settings will safely return to clean application defaults.
              </div>
            </div>

            {/* Typed Verification Input */}
            <div className="w-full text-left mb-5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Type <span className="font-mono text-rose-600 font-bold select-all">{REQUIRED_PHRASE}</span> to unlock:
              </label>
              <Input
                value={typedPhrase}
                onChange={(e) => setTypedPhrase(e.target.value)}
                placeholder={REQUIRED_PHRASE}
                className="text-xs font-mono font-semibold"
                autoFocus
              />
              {!isPhraseMatched && typedPhrase.length > 0 && (
                <span className="text-[10px] text-rose-500 mt-1 block">
                  Exact uppercase phrase required
                </span>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                variant="secondary"
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleProceedToStep2}
                disabled={!isPhraseMatched}
                rightIcon={ArrowRight}
                className="flex-1"
              >
                Proceed to Final Step
              </Button>
            </div>
          </>
        )}

        {/* STEP 2: Final Explicit Destructive Confirmation */}
        {step === 2 && (
          <>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center border border-rose-300 bg-rose-100 text-rose-700 mb-3 shadow-xs animate-pulse">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <h3 className="text-base font-bold text-rose-700 tracking-tight mb-1.5">
              Final Warning: Irreversible Action
            </h3>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed max-w-sm">
              Are you absolutely certain? Once confirmed, all menu, sales, invoices, and reversals will be wiped immediately. The software will return to a clean, usable empty state.
            </p>

            <div className="w-full p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs text-left mb-5 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Demo data will <strong>not</strong> be automatically restored. You will start with a fresh, empty restaurant catalog.
              </span>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                variant="secondary"
                onClick={() => setStep(1)}
                disabled={isDeleting}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                variant="danger"
                onClick={handleFinalConfirm}
                isLoading={isDeleting}
                leftIcon={Trash2}
                className="flex-1"
              >
                Yes, Delete Everything
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default DeleteDataModal;
