import React, { useRef, useState } from 'react';
import { Upload, X, RefreshCw, AlertCircle, Image as ImageIcon } from 'lucide-react';
import {
  validateImageFile,
  normalizeAndCropImage,
  saveImage,
  dataUrlToBlob,
  uploadImageToCloudinary,
} from '../../../services/persistence/imageStorage';
import { cn } from '../../../utils/cn';

/**
 * ImageUploader Component matching reference design
 * Left: dashed rounded square with image icon
 * Right: pill button with upload icon
 */
export const ImageUploader = ({
  value, // image URL or ref
  onChange, // callback(imageRefOrUrl)
  className,
}) => {
  const fileInputRef = useRef(null);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

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
      // Fast, uniform 1:1 square crop (instant local canvas render)
      const previewDataUrl = await normalizeAndCropImage(file, { targetSize: 500, quality: 0.88 });
      
      // INSTANT PREVIEW: Update image immediately without waiting for network or Cloudinary
      if (previewDataUrl) {
        onChange?.(previewDataUrl);
      }
      setIsProcessing(false);

      // Background local and cloud persistence (non-blocking)
      const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const croppedBlob = dataUrlToBlob(previewDataUrl);
      if (croppedBlob) {
        saveImage(imageId, croppedBlob).catch(() => {});
      }

      // Sync with Cloudinary in background so database stays light
      uploadImageToCloudinary(previewDataUrl, 'rms_pos/menu')
        .then((cloudinaryUrl) => {
          if (cloudinaryUrl) {
            onChange?.(cloudinaryUrl);
          }
        })
        .catch(() => {});
    } catch {
      setError('Failed to process image. Please try another file.');
      setIsProcessing(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    setError(null);
    onChange?.(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTriggerPicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={cn('flex flex-col gap-1.5 w-full', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex items-center gap-3 w-full">
        {/* Left Thumbnail with dashed border matching screenshot */}
        <div className="relative w-12 h-12 aspect-square rounded-2xl overflow-hidden border-2 border-dashed border-slate-300 bg-white flex items-center justify-center shrink-0 group">
          {value ? (
            <img
              src={value}
              alt="Food item preview"
              className="w-full h-full aspect-square object-cover"
            />
          ) : (
            <ImageIcon className="w-5 h-5 text-slate-400 stroke-[1.5]" />
          )}

          {value && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-1 right-1 w-4 h-4 rounded-full bg-slate-900/70 hover:bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
              title="Remove photo"
              aria-label="Remove photo"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          )}
        </div>

        {/* Right Pill Button (matching screenshot) */}
        <button
          type="button"
          onClick={handleTriggerPicker}
          disabled={isProcessing}
          className="flex-1 h-9 px-4 rounded-full border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer select-none"
        >
          {isProcessing ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#FF5C28]" />
          ) : (
            <Upload className="w-3.5 h-3.5 text-[#FF5C28] stroke-[2]" />
          )}
          <span>{value ? 'Change Food Photo' : 'Upload Food Photo'}</span>
        </button>
      </div>

      {/* Validation Error Message */}
      {error && (
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-rose-600 mt-0.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
