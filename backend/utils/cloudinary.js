const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.REACT_APP_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log('Cloudinary Config Check:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.REACT_APP_CLOUDINARY_CLOUD_NAME ? 'Present' : 'Missing',
  api_key: process.env.CLOUDINARY_API_KEY ? 'Present' : 'Missing',
  api_secret: process.env.CLOUDINARY_API_SECRET ? 'Present' : 'Missing'
});

const ALLOWED_FORMATS = ['jpg', 'jpeg', 'png', 'webp'];
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_IMAGES_PER_ENTITY = 20;
const COMPRESS_THRESHOLD = 20 * 1024 * 1024;

const memoryStorage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  if (ALLOWED_FORMATS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file format. Allowed: ${ALLOWED_FORMATS.join(', ')}`), false);
  }
};

const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 50 * 1024 * 1024
  },
  fileFilter: fileFilter
});

const compressImage = async (buffer) => {
  if (buffer.length <= MAX_FILE_SIZE) {
    return buffer;
  }

  let quality = 80;
  let compressed = await sharp(buffer)
    .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality })
    .toBuffer();

  while (compressed.length > MAX_FILE_SIZE && quality > 10) {
    quality -= 10;
    compressed = await sharp(compressed)
      .jpeg({ quality })
      .toBuffer();
  }

  if (compressed.length > MAX_FILE_SIZE) {
    compressed = await sharp(compressed)
      .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 60 })
      .toBuffer();
  }

  return compressed;
};

const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: options.folder || 'looncamp',
      public_id: options.public_id || `img-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      resource_type: 'image',
      ...options
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    uploadStream.end(buffer);
  });
};

const processAndUpload = async (file) => {
  let buffer = file.buffer;

  if (buffer.length > COMPRESS_THRESHOLD) {
    console.log(`Compressing image: ${file.originalname} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
    buffer = await compressImage(buffer);
    console.log(`Compressed to: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
  }

  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error('Image exceeds 20 MB even after compression. Please use a smaller image.');
  }

  const originalName = file.originalname.split('.')[0].replace(/[^a-zA-Z0-9-_]/g, '');
  const result = await uploadToCloudinary(buffer, {
    public_id: `${originalName}-${Date.now()}`
  });

  return result;
};

module.exports = { cloudinary, upload, processAndUpload, MAX_IMAGES_PER_ENTITY, ALLOWED_FORMATS };
