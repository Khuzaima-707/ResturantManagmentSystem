import React, { useState } from 'react';
import { Building2, Save, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../../components/ui/Card';
import { FormField } from '../../../components/ui/FormField';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';
import { LogoUploader } from './LogoUploader';

/**
 * BusinessProfileTab Component
 * Manages restaurant business identity, branding logo, contact info, and tax/registration numbers.
 */
export const BusinessProfileTab = ({ settings, onSave }) => {
  const business = settings?.business || {};

  const [name, setName] = useState(business.name || settings?.restaurantName || 'SpiceHub Restaurant & Grill');
  const [tagline, setTagline] = useState(business.tagline || settings?.tagline || 'Restaurant & Grill • Point of Sale');
  const [logoRef, setLogoRef] = useState(business.logoRef || null);
  const [address, setAddress] = useState(business.address || settings?.address || '123 Food Street, Gulshan, Karachi');
  const [phone, setPhone] = useState(business.phone || settings?.phone || '021-1234567');
  const [email, setEmail] = useState(business.email || settings?.email || 'info@spicehub.pk');
  const [currency] = useState(business.currency || 'PKR');
  const [registrationNumber, setRegistrationNumber] = useState(business.registrationNumber || '');
  const [website, setWebsite] = useState(business.website || '');

  const [errors, setErrors] = useState({});
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Check if form has modifications
  const isDirty =
    name !== (business.name || settings?.restaurantName || '') ||
    tagline !== (business.tagline || settings?.tagline || '') ||
    logoRef !== (business.logoRef || null) ||
    address !== (business.address || settings?.address || '') ||
    phone !== (business.phone || settings?.phone || '') ||
    email !== (business.email || settings?.email || '') ||
    registrationNumber !== (business.registrationNumber || '') ||
    website !== (business.website || '');

  const validate = () => {
    const errs = {};
    if (!name.trim()) {
      errs.name = 'Restaurant name is required';
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'Please enter a valid email address';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    await onSave({
      business: {
        name: name.trim(),
        tagline: tagline.trim(),
        logoRef,
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim(),
        currency,
        registrationNumber: registrationNumber.trim(),
        website: website.trim(),
      },
      // Backward-compatible mirror fields
      restaurantName: name.trim(),
      tagline: tagline.trim(),
      storeName: name.trim(),
      address: address.trim(),
      phone: phone.trim(),
      email: email.trim(),
      logoRef,
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
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <CardTitle>Business Profile</CardTitle>
            <CardDescription>
              Configure restaurant identity, branding logo, contact info, and tax registration details.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <form onSubmit={handleSave}>
        <CardContent className="space-y-5 pt-4">
          {/* Logo Uploader */}
          <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-100">
            <FormField label="Restaurant Logo" hint="Displayed on invoice previews, receipts, and client PDFs">
              <LogoUploader
                value={logoRef}
                onChange={(newRef) => setLogoRef(newRef)}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Restaurant Name" required error={errors.name}>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: null }));
                }}
                placeholder="e.g. SpiceHub Restaurant & Grill"
              />
            </FormField>

            <FormField label="Tagline / Slogan" hint="Displayed under restaurant name on Login screen & Sidebar">
              <Input
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Restaurant & Grill • Point of Sale"
              />
            </FormField>

            <FormField label="Currency" hint="Default operating currency">
              <Select
                options={[
                  { value: 'PKR', label: 'Rs (Pakistani Rupee - PKR)' },
                ]}
                value={currency}
                disabled
              />
            </FormField>

            <FormField label="Contact Phone" hint="Printed on customer invoices">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 021-1234567"
              />
            </FormField>

            <FormField label="Contact Email" error={errors.email}>
              <Input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                }}
                placeholder="e.g. info@spicehub.pk"
              />
            </FormField>

            <FormField label="Tax / NTN Registration Number" hint="Optional tax/NTN ID for receipts">
              <Input
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                placeholder="e.g. 1234567-8"
              />
            </FormField>

            <FormField label="Website" hint="Optional website URL">
              <Input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="e.g. https://spicehub.pk"
              />
            </FormField>
          </div>

          <FormField label="Address" hint="Full restaurant address printed on receipts and invoices">
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 123 Food Street, Gulshan, Karachi"
            />
          </FormField>
        </CardContent>

        <CardFooter className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isSaved && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <CheckCircle className="w-3.5 h-3.5" />
                Business profile saved successfully
              </span>
            )}
            {!isSaved && (
              <span className="text-xs text-slate-400">
                Future invoices and prints will use these updated details.
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
            Save Business Profile
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default BusinessProfileTab;
