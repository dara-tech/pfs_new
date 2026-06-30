import cloudinary from '../config/cloudinary.js';
import { Readable } from 'stream';

/**
 * Upload audio file to Cloudinary
 * @param {Buffer|Stream} fileBuffer - Audio file buffer or stream
 * @param {string} fileName - Original file name
 * @param {string} folder - Cloudinary folder path (default: 'question-audio')
 * @param {string} language - Language code ('en' or 'kh')
 * @param {string} questionKey - Question key for organizing files
 * @returns {Promise<{url: string, public_id: string}>}
 */
export const uploadAudio = async (fileBuffer, fileName, folder = 'question-audio', language = 'en', questionKey = '') => {
  return new Promise((resolve, reject) => {
    // Create a readable stream from buffer
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'video', // Cloudinary treats audio as video
        folder: `${folder}/${language}`,
        public_id: questionKey ? `${questionKey}_${language}` : `audio_${Date.now()}_${language}`,
        format: 'mp3', // Ensure MP3 format
        overwrite: true, // Overwrite if exists
        use_filename: false, // Don't use original filename
        unique_filename: false, // Don't add unique suffix
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else {
          resolve({
            url: result.secure_url,
            public_id: result.public_id
          });
        }
      }
    );

    // Convert buffer to stream and pipe to Cloudinary
    const stream = Readable.from(fileBuffer);
    stream.pipe(uploadStream);
  });
};

/**
 * Delete audio file from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<void>}
 */
export const deleteAudio = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'video'
    });
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
};

/**
 * Extract public ID from Cloudinary URL
 * @param {string} url - Cloudinary URL (works for both image and video/audio)
 * @returns {string|null} Public ID or null
 */
export const extractPublicId = (url) => {
  if (!url) return null;
  try {
    // Cloudinary URL format: 
    // Image: https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{folder}/{public_id}.{format}
    // Video/Audio: https://res.cloudinary.com/{cloud_name}/video/upload/{version}/{folder}/{public_id}.{format}
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
    if (match) {
      // Remove folder prefix if present (e.g., "app-assets/logo_123" -> "app-assets/logo_123")
      return match[1];
    }
    return null;
  } catch (error) {
    console.error('Error extracting public ID:', error);
    return null;
  }
};

/**
 * Upload image file to Cloudinary
 * @param {Buffer|Stream} fileBuffer - Image file buffer or stream
 * @param {string} fileName - Original file name
 * @param {string} folder - Cloudinary folder path (default: 'app-assets')
 * @param {string} publicId - Public ID for the image (default: auto-generated)
 * @returns {Promise<{url: string, public_id: string}>}
 */
export const uploadImage = async (fileBuffer, fileName, folder = 'app-assets', publicId = null) => {
  return new Promise((resolve, reject) => {
    // Create a readable stream from buffer
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        folder: folder,
        public_id: publicId || `logo_${Date.now()}`,
        overwrite: true,
        use_filename: false,
        unique_filename: false,
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else {
          resolve({
            url: result.secure_url,
            public_id: result.public_id
          });
        }
      }
    );

    // Convert buffer to stream and pipe to Cloudinary
    const stream = Readable.from(fileBuffer);
    stream.pipe(uploadStream);
  });
};

/**
 * Delete image file from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<void>}
 */
export const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image'
    });
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
};
