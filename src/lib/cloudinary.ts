export const cloudinaryConfig = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '',
  uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '',
};

export const uploadImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', cloudinaryConfig.uploadPreset);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error('Upload failed');
  }

  const data = await response.json();
  return data.secure_url;
};

export const getOptimizedImageUrl = (url: string, width: number = 800) => {
  if (!url || !url.includes('cloudinary.com')) return url;

  const quality = width <= 50 ? 50 : width <= 400 ? 70 : 80;

  return url.replace(
    '/upload/',
    `/upload/f_auto,q_${quality},w_${width},c_limit,dpr_auto/`
  );
};
