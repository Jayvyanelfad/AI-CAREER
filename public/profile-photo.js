(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CareerPathProfilePhoto = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const MAX_BYTES = 5 * 1024 * 1024;
  const MIME_EXTENSIONS = Object.freeze({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' });

  function validateProfilePhoto(file) {
    if (!file || typeof file !== 'object') return { valid: false, reason: 'missing' };
    const extension = MIME_EXTENSIONS[file.type];
    if (!extension) return { valid: false, reason: 'type' };
    if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_BYTES) return { valid: false, reason: 'size' };
    return { valid: true, extension };
  }

  async function validateImageData(file) {
    const validation = validateProfilePhoto(file);
    if (!validation.valid) return validation;
    if (typeof createImageBitmap !== 'function') return validation;
    try {
      const image = await createImageBitmap(file);
      const validDimensions = image.width > 0 && image.height > 0 && image.width <= 4096 && image.height <= 4096 && image.width * image.height <= 16777216;
      image.close?.();
      return validDimensions ? validation : { valid: false, reason: 'dimensions' };
    } catch {
      return { valid: false, reason: 'decode' };
    }
  }

  return { MAX_BYTES, validateProfilePhoto, validateImageData };
});
