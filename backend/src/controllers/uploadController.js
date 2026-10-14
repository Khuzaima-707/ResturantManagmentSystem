import cloudinary from '../config/cloudinary.js';

/**
 * POST /api/upload
 * Uploads an image to Cloudinary and returns the permanent CDN URL.
 * Keeps MongoDB small and fast by preventing base64 blob storage.
 */
export const uploadImage = async (req, res) => {
  try {
    const { image, folder = 'rms_pos/menu', publicId } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: 'No image provided for upload.',
      });
    }

    const uploadOptions = {
      folder: folder || 'rms_pos/menu',
      resource_type: 'image',
      overwrite: true,
      invalidate: true,
    };

    if (publicId) {
      uploadOptions.public_id = publicId;
    }

    const result = await cloudinary.uploader.upload(image, uploadOptions);

    return res.status(200).json({
      success: true,
      message: 'Image uploaded to Cloudinary successfully.',
      data: {
        url: result.secure_url,
        secure_url: result.secure_url,
        public_id: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
      },
    });
  } catch (error) {
    console.error('[Cloudinary Upload Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload image to Cloudinary.',
      error: error.message,
    });
  }
};
