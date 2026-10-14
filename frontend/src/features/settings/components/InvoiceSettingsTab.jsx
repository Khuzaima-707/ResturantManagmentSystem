import React, { useState } from 'react';
import { Receipt, Save, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../../components/ui/Card';
import { FormField } from '../../../components/ui/FormField';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Toggle } from '../../../components/ui/Toggle';

/**
 * InvoiceSettingsTab Component
 * Customizes invoice footer messages and printable receipt section visibility.
 */
export const InvoiceSettingsTab = ({ settings, onSave }) => {
  const invoice = settings?.invoice || {};

  const [footer, setFooter] = useState(
    invoice.footer || settings?.invoiceFooter || 'Thank you for dining with us! • Good Food • Good Mood'
  );
  const [showLogo, setShowLogo] = useState(
    invoice.showLogo !== undefined ? invoice.showLogo : true
  );
  const [showAddress, setShowAddress] = useState(
    invoice.showAddress !== undefined ? invoice.showAddress : true
  );
  const [showPhone, setShowPhone] = useState(
    invoice.showPhone !== undefined ? invoice.showPhone : true
  );
  const [showEmail, setShowEmail] = useState(
    invoice.showEmail !== undefined ? invoice.showEmail : true
  );
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(
    invoice.showTaxBreakdown !== undefined ? invoice.showTaxBreakdown : true
  );
  const [showPaymentDetails, setShowPaymentDetails] = useState(
    invoice.showPaymentDetails !== undefined ? invoice.showPaymentDetails : true
  );

  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const initialFooter = invoice.footer || settings?.invoiceFooter || 'Thank you for dining with us! • Good Food • Good Mood';
  const initialShowLogo = invoice.showLogo !== undefined ? invoice.showLogo : true;
  const initialShowAddress = invoice.showAddress !== undefined ? invoice.showAddress : true;
  const initialShowPhone = invoice.showPhone !== undefined ? invoice.showPhone : true;
  const initialShowEmail = invoice.showEmail !== undefined ? invoice.showEmail : true;
  const initialShowTax = invoice.showTaxBreakdown !== undefined ? invoice.showTaxBreakdown : true;
  const initialShowPayment = invoice.showPaymentDetails !== undefined ? invoice.showPaymentDetails : true;

  const isDirty =
    footer !== initialFooter ||
    showLogo !== initialShowLogo ||
    showAddress !== initialShowAddress ||
    showPhone !== initialShowPhone ||
    showEmail !== initialShowEmail ||
    showTaxBreakdown !== initialShowTax ||
    showPaymentDetails !== initialShowPayment;

  const handleSave = async (e) => {
    e?.preventDefault();
    setIsSaving(true);
    await onSave({
      invoice: {
        footer: footer.trim(),
        showLogo,
        showAddress,
        showPhone,
        showEmail,
        showTaxBreakdown,
        showPaymentDetails,
      },
      // Backward-compatible mirror fields
      invoiceFooter: footer.trim(),
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
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <CardTitle>Invoice & Receipt Settings</CardTitle>
            <CardDescription>
              Configure custom receipt footer notes, branding visibility, and layout sections.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <form onSubmit={handleSave}>
        <CardContent className="space-y-6 pt-4 max-w-xl">
          {/* Custom Footer Message */}
          <FormField
            label="Invoice Footer Note"
            hint="Printed at the bottom of customer receipts, invoice modals, and downloaded PDFs"
          >
            <Input
              value={footer}
              onChange={(e) => setFooter(e.target.value)}
              placeholder="e.g. Thank you for dining with us! • Good Food • Good Mood"
              maxLength={120}
            />
          </FormField>

          {/* Receipt Section Visibility */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Receipt Section Visibility
            </h4>

            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-3.5">
              <Toggle
                checked={showLogo}
                onChange={setShowLogo}
                label="Show Restaurant Logo"
                description="Displays uploaded restaurant business logo at the top of invoice preview and PDFs."
              />

              <div className="border-t border-slate-200/60 pt-3">
                <Toggle
                  checked={showAddress}
                  onChange={setShowAddress}
                  label="Show Restaurant Address"
                  description="Prints store street address in the invoice header."
                />
              </div>

              <div className="border-t border-slate-200/60 pt-3">
                <Toggle
                  checked={showPhone}
                  onChange={setShowPhone}
                  label="Show Contact Phone"
                  description="Prints store contact phone number on receipts."
                />
              </div>

              <div className="border-t border-slate-200/60 pt-3">
                <Toggle
                  checked={showEmail}
                  onChange={setShowEmail}
                  label="Show Contact Email"
                  description="Prints business contact email on receipts."
                />
              </div>

              <div className="border-t border-slate-200/60 pt-3">
                <Toggle
                  checked={showTaxBreakdown}
                  onChange={setShowTaxBreakdown}
                  label="Show Tax Line Item"
                  description="Displays the explicit calculated tax amount row above grand total."
                />
              </div>

              <div className="border-t border-slate-200/60 pt-3">
                <Toggle
                  checked={showPaymentDetails}
                  onChange={setShowPaymentDetails}
                  label="Show Payment & Change Details"
                  description="Displays amount received and change breakdown on printed invoices."
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
                Invoice settings saved successfully
              </span>
            )}
            {!isSaved && (
              <span className="text-xs text-slate-400">
                Customizations reflect instantly on all future invoice renderings.
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
            Save Invoice Settings
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default InvoiceSettingsTab;
