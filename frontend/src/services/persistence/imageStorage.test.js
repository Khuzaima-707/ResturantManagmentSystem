import { describe, it, expect } from 'vitest';
import {
  validateImageFile,
  dataUrlToBlob,
  normalizeAndCropImage,
  saveImage,
  getImage,
  deleteImage,
} from './imageStorage';

describe('Image Processing and Storage Persistence', () => {
  it('validates image files correctly based on MIME type and size', () => {
    const validJpeg = { type: 'image/jpeg', size: 1024 * 500 };
    expect(validateImageFile(validJpeg).valid).toBe(true);

    const validPng = { type: 'image/png', size: 1024 * 100 };
    expect(validateImageFile(validPng).valid).toBe(true);

    const validWebp = { type: 'image/webp', size: 1024 * 200 };
    expect(validateImageFile(validWebp).valid).toBe(true);

    const invalidPdf = { type: 'application/pdf', size: 1024 };
    const invalidResult = validateImageFile(invalidPdf);
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.error).toContain('Invalid file format');

    const oversized = { type: 'image/jpeg', size: 6 * 1024 * 1024 };
    const oversizedResult = validateImageFile(oversized);
    expect(oversizedResult.valid).toBe(false);
    expect(oversizedResult.error).toContain('too large');
  });

  it('converts data URLs to standardized Blob objects', () => {
    // 1x1 transparent PNG data url
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAA=';
    const blob = dataUrlToBlob(dataUrl);

    expect(blob).toBeTruthy();
    expect(blob.type).toBe('image/png');
    expect(blob.size).toBeGreaterThan(0);

    // handles invalid/null inputs safely
    expect(dataUrlToBlob(null)).toBeNull();
    expect(dataUrlToBlob('not-a-data-url')).toBeNull();
  });

  it('handles normalizeAndCropImage gracefully and returns fallback data URL in test environment', async () => {
    const sampleBlob = new Blob(['sample-image-bytes'], { type: 'image/jpeg' });
    const result = await normalizeAndCropImage(sampleBlob, { targetSize: 600 });
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('stores, retrieves, and deletes images in persistence storage', async () => {
    const testId = 'img_test_12345';
    const sampleBlob = new Blob(['image-content-here'], { type: 'image/jpeg' });

    await saveImage(testId, sampleBlob);

    const retrieved = await getImage(testId);
    expect(retrieved).toBeTruthy();

    const deleted = await deleteImage(testId);
    expect(deleted).toBe(true);

    const retrievedAfterDelete = await getImage(testId);
    expect(retrievedAfterDelete).toBeNull();
  });
});
