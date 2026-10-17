import React, { useState, useRef, useEffect } from 'react';
import { Camera, Trash2, User, Check, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useAppStore } from '../../store';
import {
  validateImageFile,
  normalizeAndCropImage,
  dataUrlToBlob,
  saveImage,
  uploadImageToCloudinary,
} from '../../services/persistence/imageStorage';

export const EditProfileModal = ({ isOpen, onClose }) => {
  const { user, updateUser } = useAppStore();
  const fileInputRef = useRef(null);
  const nameInputRef = useRef(null);
  const roleInputRef = useRef(null);

  const isCashier = (user?.username || user?.role || '').toLowerCase().includes('cashier');
  const defaultName = isCashier ? 'Cashier 1' : 'John Holland';
  const defaultRole = isCashier ? 'Cashier' : 'Admin Cashier';

  const [name, setName] = useState(user?.name || defaultName);
  const [role, setRole] = useState(user?.role || defaultRole);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [error, setError] = useState('');
  const [isProcessingImg, setIsProcessingImg] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(user?.name || defaultName);
      setRole(user?.role || defaultRole);
      setAvatarUrl(user?.avatarUrl || '');
      setError('');
    }
  }, [isOpen, user, defaultName, defaultRole]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setIsProcessingImg(true);
      const previewDataUrl = await normalizeAndCropImage(file, { targetSize: 300, quality: 0.88 });
      if (previewDataUrl) {
        setAvatarUrl(previewDataUrl);
      }
      setIsProcessingImg(false);

      const imageId = `avatar_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const croppedBlob = dataUrlToBlob(previewDataUrl);
      if (croppedBlob) {
        saveImage(imageId, croppedBlob).catch(() => {});
      }

      // Upload to Cloudinary in background
      uploadImageToCloudinary(previewDataUrl, 'rms_pos/avatars')
        .then((cloudinaryUrl) => {
          if (cloudinaryUrl) {
            setAvatarUrl(cloudinaryUrl);
          }
        })
        .catch(() => {});
    } catch {
      setError('Failed to upload image. Please try another file.');
      setIsProcessingImg(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = () => {
    setAvatarUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Name is required');
      nameInputRef.current?.focus();
      return;
    }

    // Generate initials (e.g. John Holland -> JH, Cashier 1 -> C1)
    const initials = trimmedName
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0].toUpperCase())
      .slice(0, 2)
      .join('');

    updateUser({
      name: trimmedName,
      role: role.trim() || defaultRole,
      avatarUrl: avatarUrl || null,
      initials: initials || (isCashier ? 'C1' : 'JH'),
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Profile"
      icon={User}
      maxWidth="max-w-[420px]"
      bodyClassName="p-5 overflow-y-auto"
      className="rounded-3xl shadow-2xl border border-slate-100"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Avatar Upload Section */}
        <div className="flex flex-col items-center justify-center gap-2.5 pb-1">
          <div className="relative group">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={name}
                className="w-20 h-20 rounded-full object-cover border-2 border-orange-100 shadow-sm"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-orange-100 text-[#FF5C28] flex items-center justify-center font-bold text-2xl border-2 border-orange-200">
                {name
                  .split(' ')
                  .filter(Boolean)
                  .map((n) => n[0].toUpperCase())
                  .slice(0, 2)
                  .join('') || 'U'}
              </div>
            )}
            <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-xs" />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingImg}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer shadow-2xs"
            >
              <Camera className="w-3.5 h-3.5 text-slate-500" />
              <span>{isProcessingImg ? 'Uploading...' : 'Change Photo'}</span>
            </button>
            {avatarUrl && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-rose-100 hover:border-rose-200 bg-rose-50/50 hover:bg-rose-50 text-xs font-medium text-rose-600 transition-colors cursor-pointer"
                title="Remove photo"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            )}
          </div>
        </div>

        {/* Full Name */}
        <div className="flex flex-col gap-1 w-full">
          <label className="text-[11px] font-bold text-slate-800 select-none">
            Full Name *
          </label>
          <input
            ref={nameInputRef}
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                roleInputRef.current?.focus();
              }
            }}
            placeholder="e.g. John Holland"
            autoFocus
            className={`w-full h-8 px-3 rounded-full border bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:outline-none focus:ring-0 focus:border-slate-400 ${
              error ? 'border-rose-400' : 'border-slate-300'
            }`}
          />
          {error && (
            <p className="text-[10px] font-medium text-rose-600 mt-0.5">{error}</p>
          )}
        </div>

        {/* Role / Designation */}
        <div className="flex flex-col gap-1 w-full">
          <label className="text-[11px] font-bold text-slate-800 select-none">
            Role / Designation
          </label>
          <input
            ref={roleInputRef}
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="e.g. Admin Cashier, Manager, Owner"
            className="w-full h-8 px-3 rounded-full border border-slate-300 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:outline-none focus:ring-0 focus:border-slate-400"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-4 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="h-8 px-5 rounded-full bg-[#FF5C28] hover:bg-[#E04D1D] active:bg-[#D83F0E] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save Changes</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditProfileModal;
