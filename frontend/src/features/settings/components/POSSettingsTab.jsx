import React, { useState } from 'react';
import { ShoppingBag, Save, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../../components/ui/Card';
import { FormField } from '../../../components/ui/FormField';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';
import { Toggle } from '../../../components/ui/Toggle';

/**
 * POSSettingsTab Component
 * Controls order workflow, checkout defaults, cart confirmations, and invoice triggers.
 */
export const POSSettingsTab = ({ settings, onSave }) => {
  const pos = settings?.pos || {};

  const [defaultOrderType, setDefaultOrderType] = useState(
    pos.defaultOrderType || settings?.defaultOrderType || 'Dine-In'
  );
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState(
    pos.defaultPaymentMethod || 'Cash'
  );
  const [showItemImages, setShowItemImages] = useState(
    pos.showItemImages !== undefined ? pos.showItemImages : true
  );
  const [confirmClearCart, setConfirmClearCart] = useState(
    pos.confirmClearCart !== undefined ? pos.confirmClearCart : true
  );
  const [autoOpenInvoice, setAutoOpenInvoice] = useState(
    pos.autoOpenInvoice !== undefined ? pos.autoOpenInvoice : true
  );

  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const initialOrderType = pos.defaultOrderType || settings?.defaultOrderType || 'Dine-In';
  const initialPaymentMethod = pos.defaultPaymentMethod || 'Cash';
  const initialShowImages = pos.showItemImages !== undefined ? pos.showItemImages : true;
  const initialConfirmClear = pos.confirmClearCart !== undefined ? pos.confirmClearCart : true;
  const initialAutoOpen = pos.autoOpenInvoice !== undefined ? pos.autoOpenInvoice : true;

  const isDirty =
    defaultOrderType !== initialOrderType ||
    defaultPaymentMethod !== initialPaymentMethod ||
    showItemImages !== initialShowImages ||
    confirmClearCart !== initialConfirmClear ||
    autoOpenInvoice !== initialAutoOpen;

  const handleSave = async (e) => {
    e?.preventDefault();
    setIsSaving(true);
    await onSave({
      pos: {
        defaultOrderType,
        defaultPaymentMethod,
        showItemImages,
        confirmClearCart,
        autoOpenInvoice,
      },
      // Backward-compatible mirror fields
      defaultOrderType,
    });
    setIsSaving(false);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#FF5C28] flex items-center justify-center">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <CardTitle>POS & Register Settings</CardTitle>
            <CardDescription>
              Configure default order types, payment preferences, and terminal interaction options.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <form onSubmit={handleSave}>
        <CardContent className="space-y-6 pt-4 max-w-xl">
          {/* Dropdown Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Default Order Type" hint="Pre-selected on new POS orders">
              <Select
                options={[
                  { value: 'Dine-In', label: 'Dine-In' },
                  { value: 'Takeaway', label: 'Takeaway' },
                ]}
                value={defaultOrderType}
                onChange={(e) => setDefaultOrderType(e.target.value)}
              />
            </FormField>

            <FormField label="Default Payment Method" hint="Pre-selected in checkout drawer">
              <Select
                options={[
                  { value: 'Cash', label: 'Cash' },
                  { value: 'Online', label: 'Online / Transfer' },
                ]}
                value={defaultPaymentMethod === 'Card' ? 'Cash' : defaultPaymentMethod}
                onChange={(e) => setDefaultPaymentMethod(e.target.value)}
              />
            </FormField>
          </div>

          {/* Operational Toggles */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Terminal Preferences
            </h4>

            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-4">
              <Toggle
                checked={confirmClearCart}
                onChange={setConfirmClearCart}
                label="Confirm Before Clear Cart"
                description="Requires confirmation before wiping all current cart lines to prevent accidental clears."
              />

              <div className="border-t border-slate-200/60 pt-3">
                <Toggle
                  checked={autoOpenInvoice}
                  onChange={setAutoOpenInvoice}
                  label="Auto-Open Invoice After Sale"
                  description="Automatically pops up the invoice preview and printable receipt modal immediately after a sale completes."
                />
              </div>

              <div className="border-t border-slate-200/60 pt-3">
                <Toggle
                  checked={showItemImages}
                  onChange={setShowItemImages}
                  label="Show Product Photos in Catalog"
                  description="Displays uploaded product photo thumbnails on POS product cards for quick visual recognition."
                />
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isSaved && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <CheckCircle className="w-3.5 h-3.5" />
                POS settings saved successfully
              </span>
            )}
            {!isSaved && (
              <span className="text-xs text-slate-400">
                Changes apply immediately to new POS sessions.
              </span>
            )}
          </div>

          <Button
            variant="primary"
            type="submit"
            leftIcon={Save}
            isLoading={isSaving}
            disabled={!isDirty || isSaving}
          >
            Save POS Settings
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default POSSettingsTab;
