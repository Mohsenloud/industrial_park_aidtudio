import { Router } from "express";
import { saveImage, getStorageStatus } from "../services/storageService.ts";

export const uploadRouter = Router();

// Upload image (Supports base64 data URIs or base64 raw string, stores to R2/S3 or local uploads)
uploadRouter.post("/upload", async (req, res) => {
  try {
    const { image, fileName } = req.body;
    if (!image) {
      return res.status(400).json({ error: "فایل تصویر ارسال نشده است." });
    }

    const result = await saveImage(image, fileName);

    return res.json({
      success: true,
      url: result.url,
      storageType: result.storageType,
      size: result.size,
      mimeType: result.mimeType
    });
  } catch (err: any) {
    console.error("Upload handler error:", err);
    return res.status(400).json({
      error: err.message || "خطا در پردازش و ذخیره‌سازی تصویر"
    });
  }
});

// Inspect storage backend and usage
uploadRouter.get("/upload/status", (req, res) => {
  try {
    const status = getStorageStatus();
    return res.json(status);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
