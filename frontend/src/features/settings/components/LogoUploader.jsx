import React, { useRef, useState, useEffect } from 'react';
import { Upload, X, RefreshCw, AlertCircle, Building2 } from 'lucide-react';
import {
  validateImageFile,
  fileToDataUrl,
  saveImage,
  getImage,
  deleteImage,
  uploadImageToCloudinary,
} from '../../../services/persistence/imageStorage';
import { cn } from '../../../utils/cn';

/**
 * LogoUploader Component
 * Specialized image uploader for restaurant business logo.
 * Preserves exact aspect ratio without stretching, validates file, and uploads to Cloudinary.
 */
export const LogoUploader = ({
  value, // logoRef (ID in IndexedDB) or data URL or Cloudinary URL
  onChange, // callback(logoRefOrNull)
  className,
}) => {
  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load preview from Cloudinary URL, Data URL, or IndexedDB if value is a reference ID
  useEffect(() => {
    let isMounted = true;
    async function loadLogo() {
      if (!value) {
        setPreviewUrl(null);
        return;
      }
      if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:') || value.startsWith('blob:')) {
        setPreviewUrl(value);
        return;
      }
      try {
        const url = await getImage(value);
        if (isMounted) setPreviewUrl(url);
      } catch {
        if (isMounted) setPreviewUrl(null);
      }
    }
    loadLogo();
    return () => {
      isMounted = false;
    };
  }, [value]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setIsProcessing(true);
      // Generate permanent Data URL so it does not revoke on refresh
      const dataUrl = await fileToDataUrl(file);
      setPreviewUrl(dataUrl);
      onChange?.(dataUrl);
      setIsProcessing(false);

      const imageId = `logo_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      saveImage(imageId, file).catch(() => {});

      // Upload to Cloudinary in background
      uploadImageToCloudinary(file, 'rms_pos/logo')
        .then((cloudinaryUrl) => {
          if (cloudinaryUrl) {
            setPreviewUrl(cloudinaryUrl);
            onChange?.(cloudinaryUrl);
          }
        })
        .catch(() => {});
    } catch {
      setError('Failed to save business logo. Please try another file.');
      setIsProcessing(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = async (e) => {
    e.stopPropagation();
    setError(null);
    if (value && !value.startsWith('data:') && !value.startsWith('http://') && !value.startsWith('https://')) {
      try {
        await deleteImage(value);
      } catch {}
    }
    setPreviewUrl(null);
    onChange?.(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTriggerPicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={cn('flex flex-col gap-2 w-full', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex items-center gap-4">
        {/* Logo Preview Frame: preserves aspect ratio, centered, rounded */}
        <div className="relative w-20 h-20 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0 shadow-2xs group overflow-hidden">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Restaurant logo preview"
              className="w-full h-full object-contain p-1.5"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-300">
              <Building2 className="w-7 h-7" />
              <span className="text-[10px] font-medium text-slate-400 mt-0.5">No Logo</span>
            </div>
          )}

          {previewUrl && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-xs"
              title="Remove logo"
              aria-label="Remove logo"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTriggerPicker}
              disabled={isProcessing}
              className="h-9 px-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-2xs cursor-pointer select-none"
            >
              {isProcessing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#FF5C28]" />
              ) : (
                <Upload className="w-3.5 h-3.5 text-[#FF5C28]" />
              )}
              <span>{previewUrl ? 'Change Logo' : 'Upload Logo'}</span>
            </button>

            {previewUrl && (
              <button
                type="button"
                onClick={handleRemove}
                className="h-9 px-3 rounded-xl border border-slate-200 hover:border-rose-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer"
              >
                Remove
              </button>
            )}
          </div>

          <span className="text-[11px] text-slate-400 leading-normal">
            Supported formats: PNG, JPG, WebP, GIF. Max file size: 5 MB.
          </span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-rose-600 mt-0.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default LogoUploader;
