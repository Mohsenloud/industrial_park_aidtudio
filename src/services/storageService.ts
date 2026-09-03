import fs from "fs";
import path from "path";
import crypto from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  mimeType: string;
  storageType: "r2" | "s3" | "local";
}

export interface StorageStatus {
  storageType: "r2" | "s3" | "local";
  isCloudConfigured: boolean;
  bucket?: string;
  localUploadsCount: number;
  localUploadsSizeMB: number;
}

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

// Ensure local uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  } catch (e) {
    console.error("Failed to create uploads directory:", e);
  }
}

// Lazy S3/R2 Client initialization
let s3ClientInstance: S3Client | null = null;

function getCloudflareR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const publicUrl = process.env.R2_PUBLIC_URL; // e.g. https://pub-xxx.r2.dev or custom CDN

  if (accountId && accessKeyId && secretAccessKey && bucket) {
    return {
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      region: "auto",
      credentials: { accessKeyId, secretAccessKey },
      bucket,
      publicUrl: (publicUrl || "").replace(/\/$/, "")
    };
  }
  return null;
}

function getGenericS3Config() {
  const endpoint = process.env.S3_ENDPOINT;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION || "us-east-1";
  const publicUrl = process.env.S3_PUBLIC_URL;

  if (accessKeyId && secretAccessKey && bucket) {
    return {
      endpoint,
      region,
      credentials: { accessKeyId, secretAccessKey },
      bucket,
      publicUrl: (publicUrl || "").replace(/\/$/, "")
    };
  }
  return null;
}

function getStorageClient() {
  const r2 = getCloudflareR2Config();
  if (r2) {
    if (!s3ClientInstance) {
      s3ClientInstance = new S3Client({
        endpoint: r2.endpoint,
        region: r2.region,
        credentials: r2.credentials
      });
    }
    return { client: s3ClientInstance, bucket: r2.bucket, publicUrl: r2.publicUrl, type: "r2" as const };
  }

  const s3 = getGenericS3Config();
  if (s3) {
    if (!s3ClientInstance) {
      s3ClientInstance = new S3Client({
        endpoint: s3.endpoint,
        region: s3.region,
        credentials: s3.credentials
      });
    }
    return { client: s3ClientInstance, bucket: s3.bucket, publicUrl: s3.publicUrl, type: "s3" as const };
  }

  return null;
}

// Magic bytes validation and MIME detector
export function detectImageFormat(buffer: Buffer): { ext: string; mime: string; isValid: boolean } {
  if (buffer.length < 4) {
    return { ext: "bin", mime: "application/octet-stream", isValid: false };
  }

  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { ext: "png", mime: "image/png", isValid: true };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: "jpg", mime: "image/jpeg", isValid: true };
  }

  // WebP: RIFF ... WEBP (52 49 46 46 .... 57 45 42 50)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return { ext: "webp", mime: "image/webp", isValid: true };
  }

  // GIF: GIF87a or GIF89a
  if (
    buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 &&
    buffer[3] === 0x38 && (buffer[4] === 0x37 || buffer[4] === 0x39) && buffer[5] === 0x61
  ) {
    return { ext: "gif", mime: "image/gif", isValid: true };
  }

  // SVG check (text based)
  const header = buffer.slice(0, 100).toString("utf8").trim().toLowerCase();
  if (header.includes("<svg") || header.includes("<?xml")) {
    return { ext: "svg", mime: "image/svg+xml", isValid: true };
  }

  return { ext: "bin", mime: "application/octet-stream", isValid: false };
}

/**
 * Saves an image payload (Data URI or Base64 string or Buffer) either to
 * Cloudflare R2 / AWS S3 Object Storage or local disk, returning a clean HTTP URL.
 */
export async function saveImage(
  dataInput: string | Buffer,
  originalFilename?: string
): Promise<UploadResult> {
  let buffer: Buffer;
  let declaredMime = "";

  if (Buffer.isBuffer(dataInput)) {
    buffer = dataInput;
  } else if (typeof dataInput === "string") {
    const dataUriMatch = dataInput.match(/^data:([a-zA-Z0-9\/+.-]+);base64,(.+)$/);
    if (dataUriMatch) {
      declaredMime = dataUriMatch[1];
      buffer = Buffer.from(dataUriMatch[2], "base64");
    } else {
      buffer = Buffer.from(dataInput, "base64");
    }
  } else {
    throw new Error("نوع داده ورودی تصویر نامعتبر است.");
  }

  // Validate size (cap at 15MB)
  if (buffer.length > 15 * 1024 * 1024) {
    throw new Error("حجم فایل تصویر بیش از حد مجاز (حداکثر ۱۵ مگابایت) است.");
  }

  const detected = detectImageFormat(buffer);
  if (!detected.isValid) {
    throw new Error("فایل تصویر ارسالی ساختار استانداردی ندارد (تنها فرمت‌های PNG، JPEG، WebP و SVG مجاز هستند).");
  }

  const mimeType = detected.mime;
  const ext = detected.ext;
  const uniqueId = `img_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
  const filename = `${uniqueId}.${ext}`;

  const cloud = getStorageClient();

  if (cloud) {
    try {
      const s3Key = `uploads/${filename}`;
      await cloud.client.send(
        new PutObjectCommand({
          Bucket: cloud.bucket,
          Key: s3Key,
          Body: buffer,
          ContentType: mimeType,
          CacheControl: "public, max-age=31536000, immutable"
        })
      );

      const publicUrl = cloud.publicUrl
        ? `${cloud.publicUrl}/${s3Key}`
        : `/uploads/${filename}`;

      return {
        url: publicUrl,
        key: s3Key,
        size: buffer.length,
        mimeType,
        storageType: cloud.type
      };
    } catch (cloudErr: any) {
      console.warn(`[Object Storage Warning] Failed to upload to ${cloud.type}, falling back to local disk:`, cloudErr.message);
    }
  }

  // Fallback: Local Disk Storage
  const localFilePath = path.join(UPLOADS_DIR, filename);
  await fs.promises.writeFile(localFilePath, buffer);

  return {
    url: `/uploads/${filename}`,
    key: filename,
    size: buffer.length,
    mimeType,
    storageType: "local"
  };
}

/**
 * Returns summary statistics and status of storage
 */
export function getStorageStatus(): StorageStatus {
  const cloud = getStorageClient();
  let count = 0;
  let totalBytes = 0;

  try {
    if (fs.existsSync(UPLOADS_DIR)) {
      const files = fs.readdirSync(UPLOADS_DIR);
      count = files.length;
      for (const file of files) {
        try {
          const stat = fs.statSync(path.join(UPLOADS_DIR, file));
          totalBytes += stat.size;
        } catch (_) {}
      }
    }
  } catch (e) {}

  return {
    storageType: cloud ? cloud.type : "local",
    isCloudConfigured: !!cloud,
    bucket: cloud?.bucket,
    localUploadsCount: count,
    localUploadsSizeMB: Number((totalBytes / (1024 * 1024)).toFixed(2))
  };
}
