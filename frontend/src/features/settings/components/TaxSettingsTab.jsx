import React, { useState } from 'react';
import { Percent, Save, CheckCircle, Info } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../../components/ui/Card';
import { FormField } from '../../../components/ui/FormField';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Toggle } from '../../../components/ui/Toggle';
import { validateTaxRate } from '../../../domain/rules/settingsRules';

/**
 * TaxSettingsTab Component
 * Configures restaurant sales tax / GST applied at order checkout.
 * Enforces strict validation and guarantees historical invoice safety.
 */
export const TaxSettingsTab = ({ settings, onSave }) => {
  const tax = settings?.tax || {};

  const [enabled, setEnabled] = useState(
    tax.enabled !== undefined ? tax.enabled : (settings?.taxEnabled !== undefined ? settings.taxEnabled : true)
  );
  const [rate, setRate] = useState(
    tax.rate !== undefined ? String(tax.rate) : (settings?.taxRate !== undefined ? String(settings.taxRate) : '5')
  );
  const [label, setLabel] = useState(tax.label || 'GST / Sales Tax');

  const [error, setError] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const initialEnabled = tax.enabled !== undefined ? tax.enabled : (settings?.taxEnabled ?? true);
  const initialRate = tax.rate !== undefined ? String(tax.rate) : String(settings?.taxRate ?? '5');
  const initialLabel = tax.label || 'GST / Sales Tax';

  const isDirty =
    enabled !== initialEnabled ||
    rate !== initialRate ||
    label !== initialLabel;

  const handleRateChange = (e) => {
    const val = e.target.value;
    setRate(val);
    if (enabled) {
      const valRes = validateTaxRate(val);
      setError(valRes.valid ? null : valRes.error);
    } else {
      setError(null);
    }
  };

  const handleSave = async (e) => {
    e?.preventDefault();

    if (enabled) {
      const validation = validateTaxRate(rate);
      if (!validation.valid) {
        setError(validation.error);
        return;
      }
    }
    setError(null);

    const parsedRate = enabled ? Number(rate) : 0;

    setIsSaving(true);
    await onSave({
      tax: {
        enabled,
        rate: parsedRate,
        label: label.trim() || 'GST / Sales Tax',
      },
      // Backward-compatible mirror fields
      taxRate: parsedRate,
      taxEnabled: enabled,
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
            <Percent className="w-4 h-4" />
          </div>
          <div>
            <CardTitle>Tax Configuration</CardTitle>
            <CardDescription>
              Configure sales tax rates applied at order checkout.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <form onSubmit={handleSave}>
        <CardContent className="space-y-5 pt-4 max-w-xl">
          {/* Enable Tax Toggle */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
            <Toggle
              checked={enabled}
              onChange={(next) => {
                setEnabled(next);
                if (!next) setError(null);
              }}
              label="Enable Sales Tax on Orders"
              description="When enabled, tax is automatically calculated on discounted order subtotals."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Tax Rate (%)"
              required={enabled}
              error={error}
              hint="Standard rate applied to new transactions (e.g. 5, 13, 16)"
            >
              <Input
                type="number"
                step="0.1"
                min="0"
                max="50"
                disabled={!enabled}
                value={rate}
                onChange={handleRateChange}
                placeholder="5"
              />
            </FormField>

            <FormField label="Receipt Tax Label" hint="Name displayed on receipts & invoices">
              <Input
                value={label}
                disabled={!enabled}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. GST / Sales Tax"
              />
            </FormField>
          </div>

          {/* Historical Tax Safety Note */}
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-blue-900/80 leading-relaxed">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900">Historical Tax Protection</p>
              <p className="mt-0.5 text-blue-800/80">
                Updating tax settings only affects <strong>future</strong> sales. Completed historical invoices and reports retain their exact original tax rate snapshots permanently.
              </p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isSaved && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <CheckCircle className="w-3.5 h-3.5" />
                Tax settings saved successfully
              </span>
            )}
            {!isSaved && (
              <span className="text-xs text-slate-400">
                Tax is excluded from net revenue calculations.
              </span>
            )}
          </div>

          <Button
            variant="primary"
            type="submit"
            leftIcon={Save}
            isLoading={isSaving}
            disabled={!isDirty || isSaving || (enabled && Boolean(error))}
          >
            Save Tax Settings
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default TaxSettingsTab;
