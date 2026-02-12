const ALLOWED_FORMATS = ['jpg', 'jpeg', 'png', 'webp'];
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_IMAGES = 20;

export const validateImageFile = (file: File): string | null => {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_FORMATS.includes(ext)) {
    return `Invalid format. Allowed: ${ALLOWED_FORMATS.join(', ')}`;
  }
  return null;
};

export const checkImageCount = (currentCount: number, adding: number = 1): string | null => {
  if (currentCount + adding > MAX_IMAGES) {
    return `Maximum ${MAX_IMAGES} images allowed. You have ${currentCount} already.`;
  }
  return null;
};

export const uploadImage = async (file: File): Promise<string> => {
  const validation = validateImageFile(file);
  if (validation) {
    throw new Error(validation);
  }

  const token = localStorage.getItem('adminToken') || localStorage.getItem('ownerToken');
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch('/api/properties/upload-image', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Upload failed');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message || 'Upload failed');
  }

  return data.url;
};

export const getOptimizedImageUrl = (url: string, width: number = 800) => {
  if (!url || !url.includes('cloudinary.com')) return url;

  const quality = width <= 50 ? 50 : width <= 400 ? 70 : 80;

  return url.replace(
    '/upload/',
    `/upload/f_auto,q_${quality},w_${width},c_limit,dpr_auto/`
  );
};

export { ALLOWED_FORMATS, MAX_FILE_SIZE, MAX_IMAGES };
