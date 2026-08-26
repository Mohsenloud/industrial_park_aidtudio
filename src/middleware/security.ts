import { Request, Response, NextFunction } from "express";

// In-memory stores for rate limiting and brute force protection
interface RateLimitRecord {
  count: number;
  firstRequestTime: number;
  lastRequestTime: number;
  blockedUntil?: number;
}

const ipRequestMap = new Map<string, RateLimitRecord>();
const phoneOtpMap = new Map<string, RateLimitRecord>();
const adminFailedAttemptsMap = new Map<string, RateLimitRecord>();
const securityEvents: Array<{
  id: string;
  type: "BRUTE_FORCE_BLOCKED" | "OTP_FLOOD_BLOCKED" | "MALICIOUS_PAYLOAD_BLOCKED" | "RATE_LIMIT_EXCEEDED" | "SUSPICIOUS_UPLOAD";
  target: string;
  ip: string;
  details: string;
  timestamp: string;
}> = [];

// Helper to extract client IP reliably
export function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket.remoteAddress || "127.0.0.1";
}

// Log a security incident in memory (keeps last 100 events)
export function logSecurityEvent(event: {
  type: "BRUTE_FORCE_BLOCKED" | "OTP_FLOOD_BLOCKED" | "MALICIOUS_PAYLOAD_BLOCKED" | "RATE_LIMIT_EXCEEDED" | "SUSPICIOUS_UPLOAD";
  target: string;
  ip: string;
  details: string;
}) {
  const newEvent = {
    id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    ...event,
    timestamp: new Date().toISOString()
  };
  securityEvents.unshift(newEvent);
  if (securityEvents.length > 100) {
    securityEvents.pop();
  }
  return newEvent;
}

export function getSecurityStats() {
  const now = Date.now();
  const activeBlockedIps = Array.from(adminFailedAttemptsMap.entries())
    .filter(([_, record]) => record.blockedUntil && record.blockedUntil > now)
    .map(([key, record]) => ({
      key,
      remainingSeconds: Math.ceil((record.blockedUntil! - now) / 1000)
    }));

  return {
    isGuardActive: true,
    wafStatus: "Active & Hardened",
    totalSecurityEvents: securityEvents.length,
    activeBlockedCount: activeBlockedIps.length,
    activeBlockedIps,
    recentEvents: securityEvents.slice(0, 20)
  };
}

export function clearSecurityBlock(key: string): boolean {
  let cleared = false;
  if (adminFailedAttemptsMap.has(key)) {
    adminFailedAttemptsMap.delete(key);
    cleared = true;
  }
  if (phoneOtpMap.has(key)) {
    phoneOtpMap.delete(key);
    cleared = true;
  }
  if (ipRequestMap.has(key)) {
    ipRequestMap.delete(key);
    cleared = true;
  }
  return cleared;
}

/**
 * 1. Security Headers Middleware (Helmet-like protection)
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Prevent Clickjacking - allow same origin (works seamlessly with AI Studio preview)
  res.setHeader("X-Frame-Options", "SAMEORIGIN");

  // XSS Protection for older browsers
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Strict Referrer Policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Disable download options execution in IE
  res.setHeader("X-Download-Options", "noopen");

  // Permitted cross domain policies
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");

  // Remove server technology header
  res.removeHeader("X-Powered-By");

  // For API endpoints, prevent aggressive caching of sensitive user data
  if (req.path.startsWith("/api/admin") || req.path.startsWith("/api/auth") || req.path.startsWith("/api/users")) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }

  next();
}

/**
 * 2. Input Sanitization Middleware (XSS & Script Injection Prevention)
 */
function sanitizeString(val: string): string {
  if (typeof val !== "string") return val;
  // If it's a data URL (like uploaded base64 image), don't strip
  if (val.startsWith("data:image/") || val.startsWith("data:application/pdf")) {
    return val;
  }
  // Strip dangerous tags: <script>, <iframe>, <object>, <embed>, onload=, onerror=, javascript:
  return val
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "");
}

function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") return sanitizeString(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (typeof obj === "object") {
    const cleanObj: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      cleanObj[key] = sanitizeObject(obj[key]);
    }
    return cleanObj;
  }
  return obj;
}

export function sanitizeInputMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === "object") {
    req.query = sanitizeObject(req.query);
  }
  if (req.params && typeof req.params === "object") {
    req.params = sanitizeObject(req.params);
  }
  next();
}

/**
 * 3. General API Rate Limiter
 */
export function generalApiRateLimiter(req: Request, res: Response, next: NextFunction) {
  // Skip static assets or preflight requests
  if (req.method === "OPTIONS" || !req.path.startsWith("/api/")) {
    return next();
  }

  const ip = getClientIp(req);
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 240; // 240 requests/min per IP

  const record = ipRequestMap.get(ip);
  if (!record) {
    ipRequestMap.set(ip, { count: 1, firstRequestTime: now, lastRequestTime: now });
    return next();
  }

  if (now - record.firstRequestTime > windowMs) {
    // Reset window
    record.count = 1;
    record.firstRequestTime = now;
    record.lastRequestTime = now;
    return next();
  }

  record.count++;
  record.lastRequestTime = now;

  if (record.count > maxRequests) {
    logSecurityEvent({
      type: "RATE_LIMIT_EXCEEDED",
      target: req.path,
      ip,
      details: `تعداد درخواست‌های بیش از حد مجاز (${record.count} درخواست در ۶۰ ثانیه)`
    });
    return res.status(429).json({
      error: "تعداد درخواست‌های ارسالی از سمت شما بیش از حد مجاز است. لطفاً چند لحظه صبر نمایید.",
      code: "TOO_MANY_REQUESTS"
    });
  }

  next();
}

/**
 * 4. OTP Request Rate Limiter (Protects SMS balance and prevents flood)
 */
export function otpRateLimiter(req: Request, res: Response, next: NextFunction) {
  const phone = (req.body?.phone || req.body?.email || "").toString().trim().toLowerCase();
  const ip = getClientIp(req);
  const now = Date.now();

  if (!phone) {
    return next();
  }

  // 1. Check Cooldown timer (Minimum 45 seconds between requests for the same phone)
  const phoneRecord = phoneOtpMap.get(phone);
  if (phoneRecord) {
    const elapsedSinceLast = now - phoneRecord.lastRequestTime;
    const cooldownMs = 45 * 1000; // 45 seconds cooldown

    if (elapsedSinceLast < cooldownMs) {
      const remainingSeconds = Math.ceil((cooldownMs - elapsedSinceLast) / 1000);
      return res.status(429).json({
        error: `لطفاً ${remainingSeconds} ثانیه دیگر جهت درخواست مجدد کد تایید صبر کنید.`,
        code: "OTP_COOLDOWN",
        remainingSeconds
      });
    }

    // 2. Check 10-minute window limit (Max 4 OTPs per phone in 10 mins)
    const windowMs = 10 * 60 * 1000;
    if (now - phoneRecord.firstRequestTime < windowMs) {
      if (phoneRecord.count >= 4) {
        logSecurityEvent({
          type: "OTP_FLOOD_BLOCKED",
          target: phone,
          ip,
          details: `تلاش مکرر برای ارسال پیامک (${phoneRecord.count} بار در ۱۰ دقیقه)`
        });
        return res.status(429).json({
          error: "تعداد درخواست‌های ارسال کد تایید برای این شماره به سقف مجاز رسیده است. لطفاً ۱۰ دقیقه دیگر مجدداً تلاش نمایید.",
          code: "OTP_MAX_EXCEEDED"
        });
      }
      phoneRecord.count++;
      phoneRecord.lastRequestTime = now;
    } else {
      // Reset window
      phoneRecord.count = 1;
      phoneRecord.firstRequestTime = now;
      phoneRecord.lastRequestTime = now;
    }
  } else {
    phoneOtpMap.set(phone, {
      count: 1,
      firstRequestTime: now,
      lastRequestTime: now
    });
  }

  next();
}

/**
 * 5. Admin Login Brute-Force Defense Guard
 */
export function checkAdminBruteForce(identifier: string, ip: string): { allowed: boolean; remainingMinutes?: number } {
  const now = Date.now();
  const key = `${ip}_${identifier.toLowerCase().trim()}`;
  const record = adminFailedAttemptsMap.get(key) || adminFailedAttemptsMap.get(ip);

  if (record && record.blockedUntil && record.blockedUntil > now) {
    const remainingMinutes = Math.ceil((record.blockedUntil - now) / (60 * 1000));
    return { allowed: false, remainingMinutes };
  }

  return { allowed: true };
}

export function recordFailedAdminLogin(identifier: string, ip: string): { attemptsLeft: number; isBlocked: boolean; remainingMinutes?: number } {
  const now = Date.now();
  const key = `${ip}_${identifier.toLowerCase().trim()}`;
  const maxAttempts = 5;
  const lockDurationMs = 15 * 60 * 1000; // 15 minutes lockout
  const windowMs = 15 * 60 * 1000;

  let record = adminFailedAttemptsMap.get(key);
  if (!record || (now - record.firstRequestTime > windowMs)) {
    record = { count: 1, firstRequestTime: now, lastRequestTime: now };
  } else {
    record.count++;
    record.lastRequestTime = now;
  }

  if (record.count >= maxAttempts) {
    record.blockedUntil = now + lockDurationMs;
    adminFailedAttemptsMap.set(key, record);
    adminFailedAttemptsMap.set(ip, record); // Block IP as well

    logSecurityEvent({
      type: "BRUTE_FORCE_BLOCKED",
      target: identifier,
      ip,
      details: `ورود ناموفق مکرر (${record.count} تلاش ناموفق). دسترسی به مدت ۱۵ دقیقه مسدود شد.`
    });

    return { attemptsLeft: 0, isBlocked: true, remainingMinutes: 15 };
  }

  adminFailedAttemptsMap.set(key, record);
  return { attemptsLeft: maxAttempts - record.count, isBlocked: false };
}

export function resetAdminFailedAttempts(identifier: string, ip: string) {
  const key = `${ip}_${identifier.toLowerCase().trim()}`;
  adminFailedAttemptsMap.delete(key);
  adminFailedAttemptsMap.delete(ip);
}

/**
 * 6. Image & File Upload Security Validator (Magic Bytes Check)
 */
export function validateUploadedImage(imagePayload: string): { isValid: boolean; error?: string; mimeType?: string } {
  if (!imagePayload || typeof imagePayload !== "string") {
    return { isValid: false, error: "فایل تصویر ارسال نشده است." };
  }

  // If it's a standard web URL (Unsplash or external CDN), allow it
  if (imagePayload.startsWith("http://") || imagePayload.startsWith("https://")) {
    return { isValid: true };
  }

  // Must be a Base64 data URL
  if (!imagePayload.startsWith("data:image/")) {
    return { isValid: false, error: "فرمت داده ارسال شده به عنوان تصویر نامعتبر است." };
  }

  try {
    const [header, base64Data] = imagePayload.split(",");
    if (!base64Data) {
      return { isValid: false, error: "محتوای باینری تصویر خالی است." };
    }

    const buffer = Buffer.from(base64Data, "base64");

    // Size limit check (max 12MB)
    const maxSizeBytes = 12 * 1024 * 1024;
    if (buffer.length > maxSizeBytes) {
      return { isValid: false, error: "حجم فایل تصویر بیش از حد مجاز (حداکثر ۱۲ مگابایت) است." };
    }

    if (buffer.length < 4) {
      return { isValid: false, error: "فایل تصویر مخدوش یا بسیار کوتاه است." };
    }

    // Magic Bytes Verification
    // JPEG: FF D8 FF
    const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
    // PNG: 89 50 4E 47
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
    // GIF: 47 49 46 38
    const isGif = buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38;
    // WebP: RIFF ... WEBP (0x52 0x49 0x46 0x46 at 0, 0x57 0x45 0x42 0x50 at 8)
    const isWebp = buffer.length >= 12 &&
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;

    // SVG check
    const isSvg = header.includes("image/svg+xml");
    if (isSvg) {
      const svgText = buffer.toString("utf-8");
      // Prevent XSS inside SVG
      if (
        svgText.includes("<script") ||
        svgText.includes("javascript:") ||
        /on\w+\s*=/i.test(svgText)
      ) {
        logSecurityEvent({
          type: "MALICIOUS_PAYLOAD_BLOCKED",
          target: "SVG Upload",
          ip: "UploadAPI",
          details: "کد اسکریپت مخرب در داخل فایل SVG شناسایی و مسدود شد."
        });
        return { isValid: false, error: "فایل تصویری حاوی کدهای غیرمجاز است و قابل آپلود نمی‌باشد." };
      }
      return { isValid: true, mimeType: "image/svg+xml" };
    }

    if (!isJpeg && !isPng && !isGif && !isWebp) {
      logSecurityEvent({
        type: "SUSPICIOUS_UPLOAD",
        target: header,
        ip: "UploadAPI",
        details: "تلاش برای آپلود فایلی با پسوند تصویر اما هدر باینری نامعتبر (رد Magic Bytes)"
      });
      return { isValid: false, error: "ساختار فایل ارسالی با یک تصویر معتبر (JPG/PNG/WebP) همخوانی ندارد." };
    }

    return { isValid: true };
  } catch (err: any) {
    return { isValid: false, error: "خطا در پردازش باینری تصویر: " + err.message };
  }
}
