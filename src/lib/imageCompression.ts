import imageCompression from "browser-image-compression";

/**
 * Compresses an image file to optimize size and resolution before upload.
 * Defaults to max 1MB size and 1200px width/height.
 */
export async function compressImage(file: File, maxSizeMB = 0.3, maxWidthOrHeight = 1000): Promise<File> {
  // If file is not an image or is very small, skip compression
  if (!file.type.startsWith("image/") || file.size < 100 * 1024) {
    return file;
  }

  const options = {
    maxSizeMB,
    maxWidthOrHeight,
    useWebWorker: true,
  };

  try {
    const compressedFile = await imageCompression(file, options);
    console.log(`Image compressed successfully. Original size: ${(file.size / 1024).toFixed(1)} KB, Compressed size: ${(compressedFile.size / 1024).toFixed(1)} KB`);
    return compressedFile;
  } catch (error) {
    console.warn("Failed to compress image with web worker, trying without web worker...", error);
    try {
      // Fallback: try without web worker
      const compressedFile = await imageCompression(file, { ...options, useWebWorker: false });
      return compressedFile;
    } catch (innerError) {
      console.error("Image compression completely failed, uploading original file:", innerError);
      return file;
    }
  }
}
