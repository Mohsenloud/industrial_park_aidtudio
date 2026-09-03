import * as dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { createServer as createViteServer } from "vite";
import { db } from "./src/db/index.ts";
import { users, units, products, banners, settings, classifieds, quotes, otps, smsLogs, conversations, messages, reviews, activityLogs } from "./src/db/schema.ts";
import { runDatabaseDiagnostics } from "./src/db/diagnostics.ts";
import { logger } from "./src/utils/logger.ts";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { signToken } from "./src/middleware/tokenUtils.ts";
import { 
  securityHeadersMiddleware, 
  sanitizeInputMiddleware, 
  generalApiRateLimiter, 
  otpRateLimiter, 
  checkAdminBruteForce, 
  recordFailedAdminLogin, 
  resetAdminFailedAttempts, 
  validateUploadedImage, 
  getSecurityStats, 
  clearSecurityBlock, 
  getClientIp, 
  logSecurityEvent 
} from "./src/middleware/security.ts";
import { eq, or, and, desc, sql, ne } from "drizzle-orm";
import cookieParser from "cookie-parser";
import nodemailer from "nodemailer";
import { createServer } from "http";
import { Server } from "socket.io";
import { uploadRouter } from "./src/routes/uploadRoutes.ts";
import { pushRouter } from "./src/routes/pushRoutes.ts";
import { quoteRouter } from "./src/routes/quoteRoutes.ts";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 1. Security Headers Middleware (Helmet-like protection)
  app.use(securityHeadersMiddleware);

  app.use(cookieParser());

  // Enable CORS for all requests & preflight OPTIONS handling
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // JSON and URL-encoded body parsers
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // 2. Input Sanitization (XSS and Script Injection Defense)
  app.use(sanitizeInputMiddleware);

  // 3. General API Rate Limiting (DDoS & Scraping Guard)
  app.use(generalApiRateLimiter);

  // Health check endpoints
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });
  app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Password hashing helpers & Digit Normalization
  function normalizeDigits(str: string): string {
    if (!str) return "";
    const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
    const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    let result = str;
    for (let i = 0; i < 10; i++) {
      result = result.replace(new RegExp(persianDigits[i], "g"), i.toString());
      result = result.replace(new RegExp(arabicDigits[i], "g"), i.toString());
    }
    return result;
  }

  function hashPassword(password: string): string {
    return bcrypt.hashSync(password, 10);
  }

  function verifyPassword(password: string, hash: string): boolean {
    if (!password || !hash) return false;
    const cleanPass = password.trim();
    const cleanHash = hash.trim();
    const normalizedPass = normalizeDigits(cleanPass);
    
    // Direct string match fallback (in case plain text was stored or passed)
    if (cleanPass === cleanHash || normalizedPass === cleanHash) {
      return true;
    }

    try {
      if (cleanHash.startsWith("$2a$") || cleanHash.startsWith("$2b$") || cleanHash.startsWith("$2y$")) {
        if (bcrypt.compareSync(cleanPass, cleanHash)) return true;
        if (normalizedPass !== cleanPass && bcrypt.compareSync(normalizedPass, cleanHash)) return true;
        return false;
      }
      const legacyHash1 = crypto.createHash("sha256").update(cleanPass).digest("hex");
      const legacyHash2 = crypto.createHash("sha256").update(normalizedPass).digest("hex");
      return legacyHash1 === cleanHash || legacyHash2 === cleanHash;
    } catch (e) {
      return false;
    }
  }

  // System Managers & In-Memory Stores
  interface SystemManager {
    id: string;
    name: string;
    username: string;
    email?: string;
    phone?: string;
    passwordHash: string;
    role: "super_admin" | "executive_manager" | "unit_moderator" | "banner_manager" | "support_manager" | "manager";
    permissions: string[];
    isActive: boolean;
    createdAt: string;
    lastLoginAt?: string;
  }

  const settingsMemoryStore = new Map<string, string>();
  const otpMemoryCache = new Map<string, { code: string; expiresAt: number }>();
  const userMemoryStore = new Map<string, any>();
  const unitMemoryStore = new Map<string, any>();
  const productMemoryStore = new Map<string, any>();
  const bannerMemoryStore = new Map<string, any>();
  const activityLogMemoryStore = new Map<string, any>();
  const emergencyAlertsMemoryStore = new Map<string, any>();
  const capacityMemoryStore = new Map<string, any>();

  // Scope flags for initial data loading
  let emergencyAlertsLoaded = false;
  let capacitiesLoaded = false;

  // Helper to load system managers
  async function getSystemManagers(): Promise<SystemManager[]> {
    let jsonStr = settingsMemoryStore.get("system_managers");
    if (!jsonStr) {
      try {
        const dbRes = await db.select().from(settings).where(eq(settings.key, "system_managers"));
        if (dbRes.length > 0 && dbRes[0].value) {
          jsonStr = dbRes[0].value;
          settingsMemoryStore.set("system_managers", jsonStr);
        }
      } catch (err) {
        console.warn("Notice reading system_managers from db:", err);
      }
    }
    if (!jsonStr) return [];
    try {
      return JSON.parse(jsonStr);
    } catch (_) {
      return [];
    }
  }

  // Helper to save system managers
  async function saveSystemManagers(list: SystemManager[]): Promise<void> {
    const jsonStr = JSON.stringify(list);
    settingsMemoryStore.set("system_managers", jsonStr);
    const now = new Date().toISOString();
    try {
      await db.insert(settings)
        .values({ key: "system_managers", value: jsonStr, updatedAt: now })
        .onConflictDoUpdate({ target: settings.key, set: { value: jsonStr, updatedAt: now } });
    } catch (err) {
      console.warn("Notice saving system_managers to db:", err);
    }
  }

  // Helper to get comprehensive admin info and permissions
  async function getAdminInfo(uid: string, email?: string): Promise<{ isAdmin: boolean; isSuperAdmin: boolean; role: string; name: string; permissions: string[] }> {
    if (!uid && !email) {
      return { isAdmin: false, isSuperAdmin: false, role: "user", name: "", permissions: [] };
    }
    const cleanUid = (uid || "").trim();
    const cleanUidLower = cleanUid.toLowerCase();
    
    let normalizedEmail = (email || "").toLowerCase().trim();
    if (!normalizedEmail && cleanUid.includes("@")) {
      normalizedEmail = cleanUidLower;
    }

    const adminEmailEnv = (process.env.ADMIN_EMAIL || "manamalat@gmail.com").toLowerCase().trim();
    const configuredAdminUsername = (settingsMemoryStore.get("admin_username") || "admin").toLowerCase().trim();
    const configuredAdminEmail = (settingsMemoryStore.get("admin_email") || "manamalat@gmail.com").toLowerCase().trim();
    const configuredAdminName = settingsMemoryStore.get("admin_name") || "مدیر ارشد سامانه";

    const allPermissions = ["units", "content", "managers", "banners", "sms", "email", "database", "backup", "logs", "security"];

    // 1. Direct Super Admin checks (strictly verified admin token or authorized email)
    if (
      cleanUid === "usr_direct_admin" ||
      (configuredAdminUsername && cleanUidLower === configuredAdminUsername) ||
      (normalizedEmail && (
        normalizedEmail === "manamalat@gmail.com" ||
        normalizedEmail === adminEmailEnv ||
        normalizedEmail === configuredAdminEmail ||
        normalizedEmail === "admin@industrialpark.ir"
      ))
    ) {
      return {
        isAdmin: true,
        isSuperAdmin: true,
        role: "super_admin",
        name: configuredAdminName,
        permissions: allPermissions
      };
    }

    // 2. Check appointed managers list
    try {
      const managers = await getSystemManagers();
      const matched = managers.find(m => 
        m.isActive !== false && (
          m.id === cleanUid || 
          (m.username && m.username.toLowerCase() === cleanUidLower) || 
          (m.email && m.email.toLowerCase() === normalizedEmail) ||
          (m.phone && m.phone === cleanUid)
        )
      );
      if (matched) {
        const isSuper = matched.role === "super_admin" || (Array.isArray(matched.permissions) && matched.permissions.includes("*"));
        return {
          isAdmin: true,
          isSuperAdmin: isSuper,
          role: matched.role || "executive_manager",
          name: matched.name || "مدیر سامانه",
          permissions: isSuper ? allPermissions : (Array.isArray(matched.permissions) && matched.permissions.length > 0 ? matched.permissions : ["units", "banners", "sms"])
        };
      }
    } catch (_) {}

    // 3. Check memory store
    if (cleanUid) {
      const memUser = userMemoryStore.get(cleanUid);
      if (memUser) {
        const uEmail = (memUser.email || "").toLowerCase().trim();
        if (uEmail === "manamalat@gmail.com" || uEmail === adminEmailEnv || uEmail === "admin@industrialpark.ir" || memUser.role === "super_admin") {
          return {
            isAdmin: true,
            isSuperAdmin: true,
            role: "super_admin",
            name: memUser.name || configuredAdminName,
            permissions: allPermissions
          };
        }
        if (memUser.isAdmin || memUser.role === "manager" || memUser.role === "executive_manager") {
          return {
            isAdmin: true,
            isSuperAdmin: false,
            role: memUser.role || "executive_manager",
            name: memUser.name || "مدیر سامانه",
            permissions: memUser.permissions || ["units", "banners", "sms"]
          };
        }
      }
      for (const [_, u] of userMemoryStore.entries()) {
        if (u.uid === cleanUid || u.id === cleanUid) {
          const uEmail = (u.email || "").toLowerCase().trim();
          if (uEmail === "manamalat@gmail.com" || uEmail === adminEmailEnv || uEmail === "admin@industrialpark.ir" || u.role === "super_admin") {
            return {
              isAdmin: true,
              isSuperAdmin: true,
              role: "super_admin",
              name: u.name || configuredAdminName,
              permissions: allPermissions
            };
          }
          if (u.isAdmin || u.role === "manager") {
            return {
              isAdmin: true,
              isSuperAdmin: false,
              role: u.role || "executive_manager",
              name: u.name || "مدیر سامانه",
              permissions: u.permissions || ["units", "banners", "sms"]
            };
          }
        }
      }
    }

    // 4. Check DB users
    try {
      const dbUsers = await db.select().from(users).where(
        or(
          eq(users.uid, cleanUid),
          eq(users.email, normalizedEmail || cleanUidLower)
        )
      );
      if (dbUsers.length > 0) {
        const u = dbUsers[0];
        const uEmail = (u.email || "").toLowerCase().trim();
        if (uEmail === "manamalat@gmail.com" || uEmail === adminEmailEnv || uEmail === "admin@industrialpark.ir" || (u as any).isAdmin) {
          return {
            isAdmin: true,
            isSuperAdmin: true,
            role: "super_admin",
            name: u.name || configuredAdminName,
            permissions: allPermissions
          };
        }
      }
    } catch (_) {}

    return {
      isAdmin: false,
      isSuperAdmin: false,
      role: "user",
      name: "",
      permissions: []
    };
  }

  // Helper to determine if a user ID is an admin or appointed manager
  async function getIsAdmin(uid: string, email?: string): Promise<boolean> {
    const info = await getAdminInfo(uid, email);
    return info.isAdmin;
  }

  // Default banners to seed if database is empty
  const DEFAULT_BANNERS = [
    {
      id: "ad1",
      companyName: "صنایع پلیمر البرز",
      title: "تولید انواع لوله‌های پلی‌اتیلن و اتصالات پی‌وی‌سی",
      subtitle: "تضمین کیفیت با گارانتی ۱۰ ساله تعویض",
      description: "بزرگترین تامین‌کننده تخصصی لوله‌های صنعتی و ساختمانی با گارانتی ۱۰ ساله تعویض و بالاترین استانداردهای کیفیت ملی.",
      image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=800",
      logo: null,
      badge: "تامین‌کننده طلایی",
      badgeColor: "amber",
      phone: "۰۲۱-۸۸۸۸۸۸۸۸",
      mobile: "۰۹۱۲۱۱۱۱۱۱۱",
      linkUrl: "",
      linkText: "استعلام قیمت",
      themeColor: "dark",
      overlayOpacity: "medium",
      status: "active",
      priority: "1",
      placement: "hero_slider",
      expiresAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "ad2",
      companyName: "برنا الکترونیک دماوند",
      title: "طراحی و ساخت ترانسفورماتورهای قدرت و تابلو برق صنعتی",
      subtitle: "تجهیزات پست برق فشار قوی و ضعیف",
      description: "تولیدکننده نمونه تجهیزات پست برق، تابلوهای فرمان فشار قوی و ضعیف ویژه کارخانجات و کارگاه‌های تولیدی.",
      image: "https://images.unsplash.com/photo-1498084393753-b411b2d26b34?auto=format&fit=crop&q=80&w=800",
      logo: null,
      badge: "صنعت هوشمند",
      badgeColor: "cyan",
      phone: "۰۲۱-۷۷۷۷۷۷۷۷",
      mobile: "۰۹۱۲۲۲۲۲۲۲۲",
      linkUrl: "",
      linkText: "مشاهده کاتالوگ",
      themeColor: "dark",
      overlayOpacity: "medium",
      status: "active",
      priority: "2",
      placement: "hero_slider",
      expiresAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "ad3",
      companyName: "فولاد آذرخش پایتخت",
      title: "فروش مستقیم تیرآهن، پروفیل و انواع ورق‌های ساختمانی",
      subtitle: "ارسال سریع به سراسر کشور با فاکتور رسمی",
      description: "تامین و ارسال مقاطع فولادی سنگین، قوطی، نبشی و ناودانی به سراسر پروژه‌های صنعتی کشور با فاکتور رسمی.",
      image: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&q=80&w=800",
      logo: null,
      badge: "فروش ویژه همکار",
      badgeColor: "emerald",
      phone: "۰۲۱-۶۶۶۶۶۶۶۶",
      mobile: "۰۹۱۲۳۳۳۳۳۳۳",
      linkUrl: "",
      linkText: "ثبت سفارش",
      themeColor: "dark",
      overlayOpacity: "medium",
      status: "active",
      priority: "3",
      placement: "hero_slider",
      expiresAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  async function seedSmsSettings() {
    try {
      const defaultSmsConfigs = [
        { key: "sms_enabled", value: "true" },
        { key: "sms_provider", value: "payamak_service" },
        { key: "sms_api_key", value: "0ngqpzMRSXGLzIb4yEbJXZJK3Zst1Mv3moP3BLYqGB3yfQmfOf0jNKZiRMDBFzi3vGUdUqKebZ2oYCNg" },
        { key: "sms_sender", value: "10008585" },
        { key: "sms_endpoint", value: "http://in.payamak-service.ir/api/v2/RestWebApi/SendBatchSms" },
        { key: "sms_otp_template", value: "کد ورود شما به سامانه هوشمند شهرک صنعتی: %code%" }
      ];

      for (const item of defaultSmsConfigs) {
        settingsMemoryStore.set(item.key, item.value);
        const existing = await db.select().from(settings).where(eq(settings.key, item.key));
        if (existing.length === 0) {
          await db.insert(settings).values({
            key: item.key,
            value: item.value,
            updatedAt: new Date().toISOString()
          });
        }
      }
      console.log("SMS Gateway settings verified/seeded successfully.");
    } catch (err) {
      console.warn("Notice: SMS settings seeding (fallback in memory):", err);
    }
  }

  async function seedEmailSettings() {
    try {
      const defaultEmailConfigs = [
        { key: "email_enabled", value: "true" },
        { key: "email_provider", value: "simulator" }, // "simulator" or "real_smtp"
        { key: "smtp_host", value: "smtp.gmail.com" },
        { key: "smtp_port", value: "587" },
        { key: "smtp_user", value: "" },
        { key: "smtp_pass", value: "" },
        { key: "smtp_from", value: "no-reply@industrialpark.ir" },
        { key: "smtp_from_name", value: "سامانه جامع شهرک صنعتی" },
        { key: "smtp_secure", value: "false" }
      ];

      for (const item of defaultEmailConfigs) {
        if (!settingsMemoryStore.has(item.key)) {
          settingsMemoryStore.set(item.key, item.value);
        }
        const existing = await db.select().from(settings).where(eq(settings.key, item.key));
        if (existing.length === 0) {
          await db.insert(settings).values({
            key: item.key,
            value: item.value,
            updatedAt: new Date().toISOString()
          });
        } else {
          settingsMemoryStore.set(existing[0].key, existing[0].value);
        }
      }
      console.log("Email Gateway settings verified/seeded successfully.");
    } catch (err) {
      console.warn("Notice: Email settings seeding (fallback in memory):", err);
    }
  }

  async function seedAdminDefaults() {
    try {
      const defaultAdminConfigs = [
        { key: "admin_username", value: "admin" },
        { key: "admin_email", value: "manamalat@gmail.com" },
        { key: "admin_name", value: "مهندس علیرضا محمدی (مدیر ارشد)" }
      ];

      for (const item of defaultAdminConfigs) {
        if (!settingsMemoryStore.has(item.key)) {
          settingsMemoryStore.set(item.key, item.value);
        }
        const existing = await db.select().from(settings).where(eq(settings.key, item.key));
        if (existing.length === 0) {
          await db.insert(settings).values({
            key: item.key,
            value: item.value,
            updatedAt: new Date().toISOString()
          });
        } else {
          settingsMemoryStore.set(existing[0].key, existing[0].value);
        }
      }
      console.log("Admin Default credentials verified/seeded successfully.");
    } catch (err) {
      console.warn("Notice: Admin defaults seeding (fallback in memory):", err);
    }
  }

  // Run the seeder and database schema diagnostics safely in background
  seedSmsSettings().catch(e => console.warn("Seed SMS note:", e?.message || e));
  seedEmailSettings().catch(e => console.warn("Seed Email note:", e?.message || e));
  seedAdminDefaults().catch(e => console.warn("Seed Admin note:", e?.message || e));
  ensureEmergencyAlertsLoaded().catch(e => console.warn("Seed alerts note:", e?.message || e));
  ensureCapacitiesLoaded().catch(e => console.warn("Seed capacities note:", e?.message || e));
  runDatabaseDiagnostics().then((report) => {
    console.log(`[DB Diagnostics] Status: ${report.status.toUpperCase()} (${report.latencyMs}ms) | DB: ${report.connection.database} | User: ${report.connection.currentUser}`);
    if (report.summary.errors.length > 0) {
      console.error("[DB Diagnostics Errors]:", report.summary.errors);
    }
    if (report.summary.warnings.length > 0) {
      console.warn("[DB Diagnostics Warnings]:", report.summary.warnings);
    }
  }).catch((err) => {
    console.warn("[DB Diagnostics Notice]:", err?.message || err);
  });

  // Diagnostic health endpoint
  app.get("/api/diagnostics/db", async (req, res) => {
    try {
      const report = await runDatabaseDiagnostics();
      return res.status(report.status === "error" ? 500 : 200).json(report);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to run database diagnostics" });
    }
  });

  // System Logs endpoint for developer inspection and live debugging
  app.get("/api/system/logs", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 150;
      const level = req.query.level as string | undefined;
      const logs = logger.getLogs(limit, level);
      return res.json({
        success: true,
        count: logs.length,
        logs,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Download / View raw plain text logs
  app.get("/api/system/logs/raw", (req, res) => {
    try {
      const raw = logger.getRawLogText();
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      if (req.query.download === "true") {
        res.setHeader("Content-Disposition", `attachment; filename="industrialpark-system-logs-${Date.now()}.log"`);
      }
      return res.send(raw);
    } catch (err: any) {
      return res.status(500).send(`Error reading logs: ${err.message}`);
    }
  });

  // Clear system logs
  app.delete("/api/system/logs", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid || !(await getIsAdmin(uid))) {
        return res.status(403).json({ error: "سطح دسترسی ناکافی" });
      }
      logger.clearLogs();
      return res.json({ success: true, message: "لاگ‌های سیستم پاکسازی شدند." });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Check if a user is admin
  app.get("/api/users/is-admin/:uid", async (req, res) => {
    try {
      const { uid } = req.params;
      const isAdminVal = await getIsAdmin(uid);
      return res.json({ isAdmin: isAdminVal });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Static serving of uploads
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadDir));

  // Mount Modular Routes (Storage/Uploads, Web Push Notifications, Quotes/RFQ)
  app.use("/api", uploadRouter);
  app.use("/api", pushRouter);
  app.use("/api", quoteRouter);

  // API Route to fetch SMS Logs (Admin only)
  app.get("/api/admin/sms-logs", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid || !(await getIsAdmin(uid))) {
        return res.status(403).json({ error: "سطح دسترسی ناکافی" });
      }
      const logs = await db.select().from(smsLogs);
      // Sort newest first
      logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      return res.json(logs);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // API Route to clear SMS Logs (Admin only)
  app.delete("/api/admin/sms-logs", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid || !(await getIsAdmin(uid))) {
        return res.status(403).json({ error: "سطح دسترسی ناکافی" });
      }
      await db.delete(smsLogs);
      return res.json({ success: true, message: "تمام لاگ‌های پیامک پاکسازی شدند." });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // API Route to send a Live Test SMS (Admin only)
  app.post("/api/admin/test-sms", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid || !(await getIsAdmin(uid))) {
        return res.status(403).json({ error: "سطح دسترسی ناکافی" });
      }

      const { phone, testMessage, provider, apiKey, sender, endpoint } = req.body;
      if (!phone || !phone.trim()) {
        return res.status(400).json({ error: "شماره موبایل گیرنده تست الزامی است." });
      }

      const testPhone = phone.trim();
      const testCode = Math.floor(10000 + Math.random() * 90000).toString();
      const msg = testMessage || `کد تست سامانه شهرک صنعتی: ${testCode}`;
      
      const activeProvider = provider || settingsMemoryStore.get("sms_provider") || "payamak_service";
      const activeApiKey = apiKey || settingsMemoryStore.get("sms_api_key") || "";
      const activeSender = sender || settingsMemoryStore.get("sms_sender") || "10008585";
      const activeEndpoint = endpoint || settingsMemoryStore.get("sms_endpoint") || "http://in.payamak-service.ir/api/v2/RestWebApi/SendBatchSms";

      const result = await sendRealSMS(
        activeProvider,
        activeApiKey,
        activeSender,
        testPhone,
        msg,
        testCode,
        msg,
        activeEndpoint
      );

      // Save to logs
      const logId = `sms_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      try {
        await db.insert(smsLogs).values({
          id: logId,
          phone: testPhone,
          code: testCode,
          provider: activeProvider,
          template: `[پیام تست مدیریت] ${msg}`,
          status: result.statusText,
          timestamp: new Date().toISOString()
        });
      } catch (logErr) {
        console.warn("Failed to insert test SMS log:", logErr);
      }

      return res.json({
        success: result.success,
        statusText: result.statusText,
        provider: activeProvider,
        phone: testPhone,
        code: testCode
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "خطا در تست ارسال پیامک" });
    }
  });

  // Admin Test Email endpoint (Sends instant test email with custom or saved credentials or simulator)
  app.post("/api/admin/test-email", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid || !(await getIsAdmin(uid))) {
        return res.status(403).json({ error: "سطح دسترسی ناکافی" });
      }

      const { toEmail, host, port, user, pass, from, fromName, secure, provider } = req.body;
      const targetEmail = toEmail || user;

      if (!targetEmail) {
        return res.status(400).json({ error: "آدرس ایمیل دریافت‌کننده تست را وارد کنید." });
      }

      const activeProvider = provider || settingsMemoryStore.get("email_provider") || settingsMemoryStore.get("email_mode") || "simulator";

      // If test is requested specifically for simulator mode
      if (activeProvider === "simulator") {
        const testCode = Math.floor(100000 + Math.random() * 900000).toString();
        return res.json({
          success: true,
          statusText: `تست شبیه‌ساز ایمیل با موفقیت انجام شد. کد شبیه‌سازی شده: ${testCode} برای ${targetEmail}`,
          code: testCode,
          host: "simulator (local)",
          port: 0,
          isSimulator: true
        });
      }

      const activeHost = host || settingsMemoryStore.get("smtp_host") || process.env.SMTP_HOST;
      const activePort = parseInt(port || settingsMemoryStore.get("smtp_port") || process.env.SMTP_PORT || "587");
      const activeUser = user || settingsMemoryStore.get("smtp_user") || process.env.SMTP_USER;
      const activePass = pass || settingsMemoryStore.get("smtp_pass") || process.env.SMTP_PASS;
      const activeFrom = from || settingsMemoryStore.get("smtp_from") || process.env.SMTP_FROM || "no-reply@industrialpark.ir";
      const activeFromName = fromName || settingsMemoryStore.get("smtp_from_name") || "سامانه جامع شهرک صنعتی";

      if (!activeHost || !activeUser || !activePass) {
        return res.status(400).json({ error: "اطلاعات سرور ایمیل (Host، Username، Password) برای ارسال واقعی ناقص است." });
      }

      const isSecure = secure !== undefined ? Boolean(secure) : activePort === 465;

      const transporter = nodemailer.createTransport({
        host: activeHost,
        port: activePort,
        secure: isSecure,
        auth: {
          user: activeUser,
          pass: activePass,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });

      // Verify connection first
      await transporter.verify();

      const testCode = Math.floor(100000 + Math.random() * 900000).toString();
      const timestamp = new Date().toLocaleString("fa-IR", { timeZone: "Asia/Tehran" });

      const htmlContent = `
        <div style="font-family: Tahoma, Arial, sans-serif; direction: rtl; text-align: right; background-color: #f8fafc; padding: 30px; color: #1e293b;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <div style="background: linear-gradient(135deg, #1e1b4b, #312e81, #4338ca); padding: 25px; text-align: center; color: #ffffff;">
              <h1 style="margin: 0; font-size: 20px; font-weight: bold;">سامانه جامع شهرک صنعتی</h1>
              <p style="margin: 6px 0 0; font-size: 12px; color: #c7d2fe;">تست موفقیت‌آمیز درگاه ارسال ایمیل (SMTP Verification)</p>
            </div>
            
            <div style="padding: 30px 25px;">
              <p style="font-size: 14px; line-height: 1.8; margin-top: 0;">با سلام و احترام،</p>
              <p style="font-size: 13px; line-height: 1.8; color: #475569;">
                این یک ایمیل آزمایشی است که جهت تایید صحت ارتباط سرور ایمیل (<span style="font-family: monospace; font-weight: bold; color: #4338ca;">${activeHost}:${activePort}</span>) با موفقیت ارسال شده است.
              </p>
              
              <div style="background-color: #f1f5f9; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 18px; margin: 20px 0; text-align: center;">
                <span style="font-size: 11px; color: #64748b; display: block; margin-bottom: 6px;">کد تایید آزمایشی</span>
                <span style="font-size: 26px; font-weight: 900; letter-spacing: 6px; color: #1e293b; font-family: monospace;">${testCode}</span>
              </div>

              <table style="width: 100%; border-collapse: collapse; font-size: 11px; color: #64748b; margin-top: 15px;">
                <tr>
                  <td style="padding: 6px 0;">زمان ارسال:</td>
                  <td style="padding: 6px 0; text-align: left; font-family: monospace;">${timestamp}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0;">فرستنده:</td>
                  <td style="padding: 6px 0; text-align: left; font-family: monospace;">${activeFrom}</td>
                </tr>
              </table>
            </div>

            <div style="background: #f8fafc; padding: 14px 20px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
              سامانه هوشمند مدیریت واحدهای صنعتی، تولیدی و صنفی
            </div>
          </div>
        </div>
      `;

      await transporter.sendMail({
        from: `"${activeFromName}" <${activeFrom}>`,
        to: targetEmail,
        subject: `تست موفق درگاه ایمیل - سامانه شهرک صنعتی [کد: ${testCode}]`,
        text: `تست موفق درگاه ایمیل سامانه شهرک صنعتی. کد تایید تستی: ${testCode}`,
        html: htmlContent,
      });

      return res.json({
        success: true,
        statusText: `ایمیل آزمایشی با موفقیت از طریق SMTP به ${targetEmail} ارسال شد.`,
        code: testCode,
        host: activeHost,
        port: activePort
      });
    } catch (err: any) {
      console.error("Error in test-email:", err);
      let errorMsg = err.message || "خطا در برقراری ارتباط با سرور SMTP";
      if (err.code === "EAUTH") {
        errorMsg = "خطای احراز هویت (EAUTH): نام کاربری یا کلمه عبور سرور ایمیل نادرست است. (در صورت استفاده از جیمیل، باید از App Password استفاده کنید).";
      } else if (err.code === "ETIMEDOUT" || err.code === "ECONNREFUSED") {
        errorMsg = `خطای اتصال (${err.code}): ارتباط با هاست یا پورت موردنظر برقرار نشد. لطفاً Host و Port را بررسی کنید.`;
      } else if (err.code === "ENOTFOUND") {
        errorMsg = "خطای دامنه (ENOTFOUND): آدرس سرور SMTP (Host) یافت نشد.";
      }

      return res.status(500).json({ error: errorMsg, code: err.code });
    }
  });

  // Get all settings (Admin only)
  app.get("/api/admin/settings", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid || !(await getIsAdmin(uid))) {
        return res.status(403).json({ error: "سطح دسترسی ناکافی" });
      }
      
      let allSettings: any[] = [];
      try {
        allSettings = await db.select().from(settings);
        allSettings.forEach(s => settingsMemoryStore.set(s.key, s.value));
      } catch (dbErr) {
        console.warn("DB query failed for settings, using memory:", dbErr);
        allSettings = Array.from(settingsMemoryStore.entries()).map(([key, value]) => ({ key, value }));
      }
      return res.json(allSettings);
    } catch (err: any) {
      console.error("Error fetching settings:", err);
      return res.json(Array.from(settingsMemoryStore.entries()).map(([key, value]) => ({ key, value })));
    }
  });

  // Save/Update settings (Admin only)
  app.post("/api/admin/settings", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid || !(await getIsAdmin(uid))) {
        return res.status(403).json({ error: "سطح دسترسی ناکافی" });
      }

      const { configs } = req.body; // array of { key: string, value: string }
      if (!configs || !Array.isArray(configs)) {
        return res.status(400).json({ error: "فرمت تنظیمات نامعتبر است." });
      }

      for (const config of configs) {
        settingsMemoryStore.set(config.key, config.value);
        
        try {
          const existing = await db.select().from(settings).where(eq(settings.key, config.key));
          if (existing.length > 0) {
            await db.update(settings)
              .set({ value: config.value, updatedAt: new Date().toISOString() })
              .where(eq(settings.key, config.key));
          } else {
            await db.insert(settings).values({
              key: config.key,
              value: config.value,
              updatedAt: new Date().toISOString()
            });
          }
        } catch (dbErr) {
          console.warn(`Failed to save setting ${config.key} to DB, stored in memory:`, dbErr);
        }
      }

      return res.json({ success: true, message: "تنظیمات با موفقیت ذخیره شدند." });
    } catch (err: any) {
      console.error("Error saving settings:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Public Site Content Endpoint (Homepage texts, titles, slogans, announcement)
  app.get("/api/site-content", async (req, res) => {
    try {
      let contentData: any = null;
      const memValue = settingsMemoryStore.get("site_content_homepage");
      if (memValue) {
        try {
          contentData = typeof memValue === "string" ? JSON.parse(memValue) : memValue;
        } catch (_) {}
      }

      if (!contentData) {
        try {
          const rows = await db.select().from(settings).where(eq(settings.key, "site_content_homepage"));
          if (rows.length > 0 && rows[0].value) {
            contentData = JSON.parse(rows[0].value);
            settingsMemoryStore.set("site_content_homepage", rows[0].value);
          }
        } catch (dbErr) {
          console.warn("DB fetch site_content_homepage notice:", dbErr);
        }
      }

      return res.json(contentData || {});
    } catch (err: any) {
      return res.json({});
    }
  });

  // Admin Site Content Save Endpoint (Senior Admin / Authorized CMS Manager)
  app.post("/api/admin/site-content", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email;
      const adminInfo = await getAdminInfo(uid || "", email);
      if (!adminInfo.isAdmin) {
        return res.status(403).json({ error: "سطح دسترسی ناکافی" });
      }

      const content = req.body;
      if (!content || typeof content !== "object") {
        return res.status(400).json({ error: "داده‌های ارسالی نامعتبر است." });
      }

      const contentString = JSON.stringify(content);
      const now = new Date().toISOString();

      settingsMemoryStore.set("site_content_homepage", contentString);

      try {
        await db.insert(settings)
          .values({
            key: "site_content_homepage",
            value: contentString,
            updatedAt: now
          })
          .onConflictDoUpdate({
            target: settings.key,
            set: {
              value: contentString,
              updatedAt: now
            }
          });
      } catch (dbErr) {
        console.warn("DB save site_content_homepage fallback:", dbErr);
      }

      const clientIp = (req.headers["x-forwarded-for"] as string) || req.ip || "127.0.0.1";
      await recordActivityLog({
        userId: uid,
        action: "content_updated",
        title: "ویرایش و به‌روزرسانی متون صفحه اصلی توسط مدیر ارشد",
        description: `متون، تیترها و پاراگراف‌های صفحه اول سامانه توسط ${adminInfo.name || "مدیر ارشد"} با موفقیت به‌روزرسانی گردید.`,
        ipAddress: clientIp,
        performedBy: "admin"
      });

      return res.json({
        success: true,
        message: "متون صفحه اصلی با موفقیت ذخیره و منتشر شدند.",
        content
      });
    } catch (err: any) {
      console.error("Error saving site content:", err);
      return res.status(500).json({ error: err.message || "خطا در ذخیره‌سازی متون صفحه اصلی" });
    }
  });

  // ==========================================
  // ==========================================
  // Emergency and Outage Alerts Definitions & Persistence
  // ==========================================
  const SEED_EMERGENCY_ALERTS = [
    {
      id: "alert-gas-outage-phase2",
      title: "اطلاعیه مدیریت مصرف و برنامه قطعی موقت گاز فاز ۲ و ۳ صنعتی",
      message: "به استحضار صنعتگران و مدیران محترم کارگاه‌های فاز ۲ و ۳ می‌رساند به دلیل انجام عملیات اتصال و تقویت خط لوله اصلی انتقال گاز، جریان گاز از ساعت ۰۸:۰۰ الی ۱۷:۰۰ فردا با افت فشار و قطعی موقت مواجه خواهد شد. خواهشمند است تمهیدات لازم جهت خاموش‌سازی اصولی مشعل‌های کوره و مصرف‌کننده‌های صنعتی اتخاذ گردد.",
      type: "critical",
      category: "gas",
      isActive: true,
      affectedAreas: "فاز ۲ و ۳ - بلوار فناوری و تلاش",
      startDate: "فردا چهارشنبه ساعت ۰۸:۰۰",
      endDate: "فردا چهارشنبه ساعت ۱۷:۰۰",
      phoneContact: "۰۲۱-۵۶۰۰۰۰۰۱",
      createdAt: new Date().toISOString()
    },
    {
      id: "alert-safety-drill",
      title: "مانور سراسری سنجش آمادگی آتش‌نشانی و امداد و نجات شهرک",
      message: "مانور اطفاء حریق و واکنش در شرایط اضطراری با همکاری سازمان آتش‌نشانی و مدیریت بحران شهرک فردا بعدازظهر در میدان اصلی اجرا می‌گردد. تردد خودروهای سنگین در این محدوده با تمهیدات ترافیکی همراه خواهد بود.",
      type: "info",
      category: "security",
      isActive: true,
      affectedAreas: "میدان صنعت و بلوار اصلی شهرک",
      startDate: "پنجشنبه ساعت ۱۴:۰۰",
      endDate: "پنجشنبه ساعت ۱۶:۳۰",
      phoneContact: "۱۲۵",
      createdAt: new Date(Date.now() - 86400000).toISOString()
    }
  ];

  async function ensureEmergencyAlertsLoaded() {
    if (emergencyAlertsLoaded) return;
    try {
      const existing = await db.select().from(settings).where(eq(settings.key, "emergency_alerts_data"));
      if (existing.length > 0 && existing[0].value !== undefined && existing[0].value !== null) {
        emergencyAlertsMemoryStore.clear();
        try {
          const list = JSON.parse(existing[0].value);
          if (Array.isArray(list)) {
            list.forEach(a => {
              if (a && a.id) {
                emergencyAlertsMemoryStore.set(a.id, a);
              }
            });
          }
        } catch (e) {
          console.warn("Failed to parse emergency_alerts_data from DB:", e);
        }
        emergencyAlertsLoaded = true;
        return;
      }

      // First time initialization: seed initial alerts and persist
      emergencyAlertsMemoryStore.clear();
      SEED_EMERGENCY_ALERTS.forEach(a => emergencyAlertsMemoryStore.set(a.id, a));
      const now = new Date().toISOString();
      const jsonStr = JSON.stringify(SEED_EMERGENCY_ALERTS);
      await db.insert(settings).values({
        key: "emergency_alerts_data",
        value: jsonStr,
        updatedAt: now
      }).onConflictDoUpdate({
        target: settings.key,
        set: { value: jsonStr, updatedAt: now }
      });
      emergencyAlertsLoaded = true;
    } catch (err) {
      console.warn("Notice: Emergency alerts seeder/loader fallback:", err);
      if (!emergencyAlertsLoaded && emergencyAlertsMemoryStore.size === 0) {
        SEED_EMERGENCY_ALERTS.forEach(a => emergencyAlertsMemoryStore.set(a.id, a));
      }
      emergencyAlertsLoaded = true;
    }
  }

  async function persistEmergencyAlerts() {
    emergencyAlertsLoaded = true;
    try {
      const list = Array.from(emergencyAlertsMemoryStore.values());
      const jsonStr = JSON.stringify(list);
      const now = new Date().toISOString();
      settingsMemoryStore.set("emergency_alerts_data", jsonStr);
      await db.insert(settings)
        .values({ key: "emergency_alerts_data", value: jsonStr, updatedAt: now })
        .onConflictDoUpdate({ target: settings.key, set: { value: jsonStr, updatedAt: now } });
    } catch (err) {
      console.warn("Notice persisting emergency alerts:", err);
    }
  }

  app.get("/api/emergency-alerts", async (req, res) => {
    try {
      await ensureEmergencyAlertsLoaded();
      const allAlerts = Array.from(emergencyAlertsMemoryStore.values());
      allAlerts.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      return res.json(allAlerts);
    } catch (err: any) {
      return res.json([]);
    }
  });

  app.get("/api/admin/emergency-alerts", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid || !(await getIsAdmin(uid))) {
        return res.status(403).json({ error: "عدم دسترسی به بخش مدیریت اعلانات." });
      }
      await ensureEmergencyAlertsLoaded();
      const allAlerts = Array.from(emergencyAlertsMemoryStore.values());
      allAlerts.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      return res.json(allAlerts);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/emergency-alerts", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email;
      const adminInfo = await getAdminInfo(uid || "", email);
      if (!adminInfo.isAdmin) {
        return res.status(403).json({ error: "سطح دسترسی ناکافی" });
      }

      await ensureEmergencyAlertsLoaded();

      const { title, message, type, category, isActive, affectedAreas, startDate, endDate, phoneContact } = req.body;
      if (!title || !message) {
        return res.status(400).json({ error: "عنوان و متن کامل اعلان الزامی است." });
      }

      const newAlert = {
        id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: title.trim(),
        message: message.trim(),
        type: type || "warning",
        category: category || "general",
        isActive: isActive !== false,
        affectedAreas: affectedAreas ? affectedAreas.trim() : "",
        startDate: startDate ? startDate.trim() : "",
        endDate: endDate ? endDate.trim() : "",
        phoneContact: phoneContact ? phoneContact.trim() : "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      emergencyAlertsMemoryStore.set(newAlert.id, newAlert);
      await persistEmergencyAlerts();

      const clientIp = (req.headers["x-forwarded-for"] as string) || req.ip || "127.0.0.1";
      await recordActivityLog({
        userId: uid,
        action: "alert_created",
        title: `ثبت اعلان اضطراری جدید: ${newAlert.title}`,
        description: `اعلان اضطراری با موضوع ${newAlert.category} توسط مدیر سیستم ثبت و منتشر گردید.`,
        ipAddress: clientIp,
        performedBy: "admin"
      });

      return res.json({ success: true, alert: newAlert });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "خطا در ثبت اعلان اضطراری" });
    }
  });

  app.put("/api/admin/emergency-alerts/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email;
      const adminInfo = await getAdminInfo(uid || "", email);
      if (!adminInfo.isAdmin) {
        return res.status(403).json({ error: "سطح دسترسی ناکافی" });
      }

      await ensureEmergencyAlertsLoaded();

      const id = req.params.id;
      const existing = emergencyAlertsMemoryStore.get(id);
      if (!existing) {
        return res.status(404).json({ error: "اعلان اضطراری مورد نظر یافت نشد." });
      }

      const { title, message, type, category, isActive, affectedAreas, startDate, endDate, phoneContact } = req.body;
      const updated = {
        ...existing,
        title: title !== undefined ? title.trim() : existing.title,
        message: message !== undefined ? message.trim() : existing.message,
        type: type || existing.type,
        category: category || existing.category,
        isActive: isActive !== undefined ? !!isActive : existing.isActive,
        affectedAreas: affectedAreas !== undefined ? affectedAreas.trim() : existing.affectedAreas,
        startDate: startDate !== undefined ? startDate.trim() : existing.startDate,
        endDate: endDate !== undefined ? endDate.trim() : existing.endDate,
        phoneContact: phoneContact !== undefined ? phoneContact.trim() : existing.phoneContact,
        updatedAt: new Date().toISOString()
      };

      emergencyAlertsMemoryStore.set(id, updated);
      await persistEmergencyAlerts();
      return res.json({ success: true, alert: updated });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "خطا در ویرایش اعلان" });
    }
  });

  app.put("/api/admin/emergency-alerts/:id/toggle", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email;
      const adminInfo = await getAdminInfo(uid || "", email);
      if (!adminInfo.isAdmin) {
        return res.status(403).json({ error: "سطح دسترسی ناکافی" });
      }

      await ensureEmergencyAlertsLoaded();

      const id = req.params.id;
      const existing = emergencyAlertsMemoryStore.get(id);
      if (!existing) {
        return res.status(404).json({ error: "اعلان مورد نظر یافت نشد." });
      }

      existing.isActive = !existing.isActive;
      existing.updatedAt = new Date().toISOString();
      emergencyAlertsMemoryStore.set(id, existing);
      await persistEmergencyAlerts();

      return res.json({ success: true, isActive: existing.isActive });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/admin/emergency-alerts/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email;
      const adminInfo = await getAdminInfo(uid || "", email);
      if (!adminInfo.isAdmin) {
        return res.status(403).json({ error: "سطح دسترسی ناکافی" });
      }

      await ensureEmergencyAlertsLoaded();

      const id = req.params.id;
      const deleted = emergencyAlertsMemoryStore.delete(id);
      await persistEmergencyAlerts();
      
      const clientIp = (req.headers["x-forwarded-for"] as string) || req.ip || "127.0.0.1";
      await recordActivityLog({
        userId: uid,
        action: "alert_deleted",
        title: `حذف اعلان اضطراری شناسه ${id}`,
        description: `یک اعلان اضطراری توسط مدیر ارشد سامانه به طور کامل حذف گردید.`,
        ipAddress: clientIp,
        performedBy: "admin"
      });

      return res.json({ success: true, deleted, message: "اعلان اضطراری با موفقیت حذف گردید." });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // Industrial Capacity Sharing (بازارگاه ظرفیت‌های خالی ماشین‌آلات) Endpoints
  // ==========================================
  const SEED_CAPACITIES = [
    {
      id: "cap-cnc-4axis-azarakhsh",
      unitId: "unit-azarakhsh-steel",
      unitName: "فولاد آذرخش پایتخت",
      ownerId: "usr_direct_admin",
      title: "ساعات خالی دستگاه فرز CNC چهار محوره با دقت ۰.۰۱ میلیمتر",
      machineType: "cnc_machining",
      machineTypeName: "تراشکاری و فرزکاری CNC",
      modelSpecs: "کورس میز: ۱۲۰۰*۶۰۰*۶۰۰ - کنترلر زیمنس ۸۴۰D - مجهز به سفره چرخان",
      availableCapacity: "۵۰ ساعت در هفته (شیفت شب)",
      pricingType: "hourly",
      priceRate: "ساعتی ۱,۹۵۰,۰۰۰ ریال",
      minOrder: "حداقل ۲۰ ساعت یا ۱۰ قطعه",
      contactPhone: "02166554433",
      contactPerson: "مهندس قربانی (مسئول فنی)",
      workshopAddress: "بلوار اصلی شهرک، پلاک ۴",
      description: "آماده عقد قرارداد تراشکاری و فرزکاری قطعات دقیق آلومینیومی، فولاد آلیاژی و استنلس استیل. پذیرش فایل‌های STEP و DXF با تلرانس ابعادی بسته.",
      status: "active",
      tags: ["فرز CNC", "۴ محوره", "استیل", "آلومینیوم", "قطعات خودرویی"],
      createdAt: new Date().toISOString()
    },
    {
      id: "cap-laser-cutting-6kw",
      unitId: "unit-azarakhsh-steel",
      unitName: "فولاد آذرخش پایتخت",
      ownerId: "usr_direct_admin",
      title: "برش لیزر فایبر ۶ کیلووات با میز دوبل ۶*۲ متر",
      machineType: "laser_cutting",
      machineTypeName: "برش لیزر، پلاسما و واترجت",
      modelSpecs: "توان ۶۰۰۰ وات - برش آهن تا ۲۵ میلیمتر، استیل تا ۱۶ میلیمتر",
      availableCapacity: "آماده پذیرش تناژ بالا (روزانه ۲۰ ساعت)",
      pricingType: "per_piece",
      priceRate: "بر اساس طول برش متر بر دقیقه / استعلام نقشه",
      minOrder: "بدون محدودیت حداقل سفارش",
      contactPhone: "09123334455",
      contactPerson: "دفتر فنی و مهندسی",
      workshopAddress: "بلوار اصلی شهرک، پلاک ۴",
      description: "برش انواع ورق‌های روغنی، سیاه، گالوانیزه و استیل بدون پلیسه و با گاز ازت و اکسیژن با کیفیت سطحی عالی.",
      status: "active",
      tags: ["لیزر فایبر", "برش ورق", "تیراژ بالا", "آهن و استیل"],
      createdAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: "cap-plastic-injection-250t",
      unitId: "unit-alborz-polymer",
      unitName: "صنایع پلیمر البرز",
      ownerId: "usr_direct_admin",
      title: "ظرفیت خالی دستگاه تزریق پلاستیک ۲۵۰ تن هایتین",
      machineType: "plastic_injection",
      machineTypeName: "تزریق پلاستیک و بادی",
      modelSpecs: "دستگاه Haitian Mars II - وزن تزریق تا ۸۰۰ گرم",
      availableCapacity: "شیفت کامل ۲۴ ساعته (ماهانه)",
      pricingType: "contract",
      priceRate: "توافقی ضربی یا پروژه‌ای با متریال",
      minOrder: "حداقل ۵۰۰۰ ضرب",
      contactPhone: "02177889900",
      contactPerson: "مهندس ناصری",
      workshopAddress: "بلوار صنعت، خیابان ابتکار سوم، پلاک ۱۲",
      description: "تزریق قطعات پلی‌پروپیلن (PP)، پلی‌اتیلن (PE)، ABS و پلی‌آمید با قالب مشتری یا قالب‌سازی اختصاصی در محل کارخانه.",
      status: "active",
      tags: ["تزریق پلاستیک", "۲۵۰ تن", "تولید انبوه", "PP و ABS"],
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
    }
  ];

  async function ensureCapacitiesLoaded() {
    if (capacitiesLoaded) return;
    try {
      const existing = await db.select().from(settings).where(eq(settings.key, "industrial_capacities_data"));
      if (existing.length > 0 && existing[0].value !== undefined && existing[0].value !== null) {
        capacityMemoryStore.clear();
        try {
          const list = JSON.parse(existing[0].value);
          if (Array.isArray(list)) {
            list.forEach(c => {
              if (c && c.id) {
                capacityMemoryStore.set(c.id, c);
              }
            });
          }
        } catch (e) {
          console.warn("Failed to parse industrial_capacities_data from DB:", e);
        }
        capacitiesLoaded = true;
        return;
      }

      capacityMemoryStore.clear();
      SEED_CAPACITIES.forEach(c => capacityMemoryStore.set(c.id, c));
      const now = new Date().toISOString();
      const jsonStr = JSON.stringify(SEED_CAPACITIES);
      await db.insert(settings).values({
        key: "industrial_capacities_data",
        value: jsonStr,
        updatedAt: now
      }).onConflictDoUpdate({
        target: settings.key,
        set: { value: jsonStr, updatedAt: now }
      });
      capacitiesLoaded = true;
    } catch (err) {
      console.warn("Notice: Capacities seeder/loader fallback:", err);
      if (!capacitiesLoaded && capacityMemoryStore.size === 0) {
        SEED_CAPACITIES.forEach(c => capacityMemoryStore.set(c.id, c));
      }
      capacitiesLoaded = true;
    }
  }

  async function persistCapacities() {
    capacitiesLoaded = true;
    try {
      const list = Array.from(capacityMemoryStore.values());
      const jsonStr = JSON.stringify(list);
      const now = new Date().toISOString();
      settingsMemoryStore.set("industrial_capacities_data", jsonStr);
      await db.insert(settings)
        .values({ key: "industrial_capacities_data", value: jsonStr, updatedAt: now })
        .onConflictDoUpdate({ target: settings.key, set: { value: jsonStr, updatedAt: now } });
    } catch (err) {
      console.warn("Notice persisting capacities:", err);
    }
  }

  app.get("/api/capacities", async (req, res) => {
    try {
      await ensureCapacitiesLoaded();
      const machineType = req.query.machineType as string;
      const pricingType = req.query.pricingType as string;
      const search = req.query.search as string;

      let list = Array.from(capacityMemoryStore.values());

      if (machineType && machineType !== "all") {
        list = list.filter(c => c.machineType === machineType);
      }
      if (pricingType && pricingType !== "all") {
        list = list.filter(c => c.pricingType === pricingType);
      }
      if (search) {
        const q = search.toLowerCase().trim();
        list = list.filter(c => 
          c.title?.toLowerCase().includes(q) ||
          c.unitName?.toLowerCase().includes(q) ||
          c.modelSpecs?.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          (c.tags && c.tags.some((t: string) => t.toLowerCase().includes(q)))
        );
      }

      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      return res.json(list);
    } catch (err: any) {
      return res.json([]);
    }
  });

  app.post("/api/capacities", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      await ensureCapacitiesLoaded();

      const { 
        unitId, 
        unitName, 
        title, 
        machineType, 
        machineTypeName, 
        modelSpecs, 
        availableCapacity, 
        pricingType, 
        priceRate, 
        minOrder, 
        contactPhone, 
        contactPerson, 
        workshopAddress, 
        description, 
        image, 
        status, 
        tags 
      } = req.body;

      if (!title || !contactPhone) {
        return res.status(400).json({ error: "عنوان ظرفیت و شماره تماس الزامی است." });
      }

      const newCap = {
        id: `cap-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        unitId: unitId || "",
        unitName: unitName || "واحد صنعتی شهرک",
        ownerId: uid || "",
        title: title.trim(),
        machineType: machineType || "cnc_machining",
        machineTypeName: machineTypeName || "خدمات صنعتی",
        modelSpecs: modelSpecs ? modelSpecs.trim() : "",
        availableCapacity: availableCapacity ? availableCapacity.trim() : "آماده پذیرش سفارش",
        pricingType: pricingType || "negotiable",
        priceRate: priceRate ? priceRate.trim() : "",
        minOrder: minOrder ? minOrder.trim() : "",
        contactPhone: contactPhone.trim(),
        contactPerson: contactPerson ? contactPerson.trim() : "",
        workshopAddress: workshopAddress ? workshopAddress.trim() : "",
        description: description ? description.trim() : "",
        image: image || "",
        status: status || "active",
        tags: Array.isArray(tags) ? tags : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      capacityMemoryStore.set(newCap.id, newCap);
      await persistCapacities();

      const clientIp = (req.headers["x-forwarded-for"] as string) || req.ip || "127.0.0.1";
      await recordActivityLog({
        userId: uid,
        action: "capacity_added",
        title: `ثبت آگهی ظرفیت خالی دستگاه: ${newCap.title}`,
        description: `آگهی ساعات خالی دستگاه ${newCap.machineTypeName} با موفقیت در بازارگاه منتشر شد.`,
        ipAddress: clientIp,
        performedBy: "user"
      });

      return res.json({ success: true, capacity: newCap });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "خطا در ثبت آگهی ظرفیت دستگاه" });
    }
  });

  app.put("/api/capacities/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const isAdmin = uid ? await getIsAdmin(uid) : false;
      const id = req.params.id;

      await ensureCapacitiesLoaded();

      const existing = capacityMemoryStore.get(id);
      if (!existing) {
        return res.status(404).json({ error: "آگهی ظرفیت مورد نظر یافت نشد." });
      }

      if (existing.ownerId && existing.ownerId !== uid && !isAdmin) {
        return res.status(403).json({ error: "شما مجاز به ویرایش این آگهی نیستید." });
      }

      const body = req.body;
      const updated = {
        ...existing,
        ...body,
        id,
        updatedAt: new Date().toISOString()
      };

      capacityMemoryStore.set(id, updated);
      await persistCapacities();
      return res.json({ success: true, capacity: updated });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/capacities/:id/status", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const isAdmin = uid ? await getIsAdmin(uid) : false;
      const id = req.params.id;
      const { status } = req.body;

      await ensureCapacitiesLoaded();

      const existing = capacityMemoryStore.get(id);
      if (!existing) {
        return res.status(404).json({ error: "آگهی مورد نظر یافت نشد." });
      }

      if (existing.ownerId && existing.ownerId !== uid && !isAdmin) {
        return res.status(403).json({ error: "شما مجاز به تغییر وضعیت این آگهی نیستید." });
      }

      existing.status = status || "active";
      existing.updatedAt = new Date().toISOString();
      capacityMemoryStore.set(id, existing);
      await persistCapacities();

      return res.json({ success: true, status: existing.status });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/capacities/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const isAdmin = uid ? await getIsAdmin(uid) : false;
      const id = req.params.id;

      await ensureCapacitiesLoaded();

      const existing = capacityMemoryStore.get(id);
      if (!existing) {
        return res.status(404).json({ error: "آگهی مورد نظر یافت نشد." });
      }

      if (existing.ownerId && existing.ownerId !== uid && !isAdmin) {
        return res.status(403).json({ error: "شما دسترسی مجاز برای حذف این آگهی را ندارید." });
      }

      capacityMemoryStore.delete(id);
      await persistCapacities();
      return res.json({ success: true, message: "آگهی ظرفیت خالی با موفقیت حذف گردید." });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // Admin Unit Badges Management Endpoint
  // ==========================================
  app.put("/api/admin/units/:id/badges", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email;
      const adminInfo = await getAdminInfo(uid || "", email);
      if (!adminInfo.isAdmin) {
        return res.status(403).json({ error: "سطح دسترسی ناکافی" });
      }

      const id = req.params.id;
      const { badges } = req.body;

      const existingUnit = unitMemoryStore.get(id);
      if (existingUnit) {
        existingUnit.badges = Array.isArray(badges) ? badges : [];
        existingUnit.updatedAt = new Date().toISOString();
        unitMemoryStore.set(id, existingUnit);
      }

      try {
        await db.update(units).set({
          updatedAt: new Date().toISOString()
        }).where(eq(units.id, id));
      } catch (dbErr) {
        console.warn("DB update unit badges notice:", dbErr);
      }

      const clientIp = (req.headers["x-forwarded-for"] as string) || req.ip || "127.0.0.1";
      await recordActivityLog({
        userId: uid,
        action: "badges_updated",
        title: `به‌روزرسانی نشان‌ها و بج‌های تاییدیه کارگاه [${existingUnit?.name || id}]`,
        description: `نشان‌های تاییدیه صنعتی کارگاه توسط ${adminInfo.name || "مدیر ارشد"} به‌روزرسانی شد.`,
        ipAddress: clientIp,
        performedBy: "admin"
      });

      return res.json({ success: true, badges: existingUnit?.badges || badges });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "خطا در به‌روزرسانی نشان‌های کارگاه" });
    }
  });


  // Admin Backup Stats (Returns live counts of all entities)
  app.get("/api/admin/backup/stats", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid || !(await getIsAdmin(uid))) {
        return res.status(403).json({ error: "سطح دسترسی ناکافی" });
      }

      const [
        allUnits,
        allProducts,
        allUsers,
        allBanners,
        addClassifieds,
        allReviews,
        allQuotes,
        allSettings
      ] = await Promise.all([
        db.select().from(units).catch(() => []),
        db.select().from(products).catch(() => []),
        db.select().from(users).catch(() => []),
        db.select().from(banners).catch(() => []),
        db.select().from(classifieds).catch(() => []),
        db.select().from(reviews).catch(() => []),
        db.select().from(quotes).catch(() => []),
        db.select().from(settings).catch(() => [])
      ]);

      return res.json({
        units: allUnits.length,
        products: allProducts.length,
        users: allUsers.length,
        banners: allBanners.length,
        classifieds: addClassifieds.length,
        reviews: allReviews.length,
        quotes: allQuotes.length,
        settings: allSettings.length,
        lastCheck: new Date().toISOString()
      });
    } catch (err: any) {
      console.error("Error fetching backup stats:", err);
      return res.status(500).json({ error: err.message || "خطا در دریافت آمار دیتابیس" });
    }
  });

  // Admin Full Database Backup Export
  app.get("/api/admin/backup", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid || !(await getIsAdmin(uid))) {
        return res.status(403).json({ error: "سطح دسترسی ناکافی" });
      }

      const [
        allUnits,
        allProducts,
        allUsers,
        allBanners,
        addClassifieds,
        allReviews,
        allQuotes,
        allSettings
      ] = await Promise.all([
        db.select().from(units).catch(() => []),
        db.select().from(products).catch(() => []),
        db.select().from(users).catch(() => []),
        db.select().from(banners).catch(() => []),
        db.select().from(classifieds).catch(() => []),
        db.select().from(reviews).catch(() => []),
        db.select().from(quotes).catch(() => []),
        db.select().from(settings).catch(() => [])
      ]);

      const backupData = {
        system: "سامانه جامع شهرک صنعتی",
        backupVersion: "2.0",
        exportDate: new Date().toISOString(),
        exportedBy: req.user?.email || req.user?.uid || "مدیر ارشد",
        stats: {
          unitsCount: allUnits.length,
          productsCount: allProducts.length,
          usersCount: allUsers.length,
          bannersCount: allBanners.length,
          classifiedsCount: addClassifieds.length,
          reviewsCount: allReviews.length,
          quotesCount: allQuotes.length,
          settingsCount: allSettings.length,
        },
        data: {
          units: allUnits,
          products: allProducts,
          users: allUsers,
          banners: allBanners,
          classifieds: addClassifieds,
          reviews: allReviews,
          quotes: allQuotes,
          settings: allSettings,
        }
      };

      return res.json(backupData);
    } catch (err: any) {
      console.error("Error generating backup:", err);
      return res.status(500).json({ error: err.message || "خطا در ایجاد نسخه پشتیبان" });
    }
  });

  // Admin Full Database Restore
  app.post("/api/admin/restore", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid || !(await getIsAdmin(uid))) {
        return res.status(403).json({ error: "سطح دسترسی ناکافی" });
      }

      const { backupData, mode = "merge" } = req.body;
      if (!backupData || !backupData.data) {
        return res.status(400).json({ error: "ساختار فایل پشتیبان نامعتبر است." });
      }

      const {
        units: unitsList = [],
        products: productsList = [],
        users: usersList = [],
        banners: bannersList = [],
        classifieds: classifiedsList = [],
        reviews: reviewsList = [],
        quotes: quotesList = [],
        settings: settingsList = []
      } = backupData.data;

      let report = {
        unitsRestored: 0,
        productsRestored: 0,
        usersRestored: 0,
        bannersRestored: 0,
        classifiedsRestored: 0,
        reviewsRestored: 0,
        quotesRestored: 0,
        settingsRestored: 0,
        mode: mode
      };

      // If replace mode, we could delete non-admin data first, or we can upsert all
      // Restore Users
      for (const u of usersList) {
        try {
          if (u.uid && u.name) {
            const existing = await db.select().from(users).where(eq(users.uid, u.uid));
            if (existing.length > 0) {
              await db.update(users).set({
                name: u.name,
                phone: u.phone || existing[0].phone,
                email: u.email || existing[0].email,
                lastLoginAt: u.lastLoginAt || existing[0].lastLoginAt
              }).where(eq(users.uid, u.uid));
            } else {
              await db.insert(users).values({
                uid: u.uid,
                name: u.name,
                phone: u.phone || "09120000000",
                email: u.email || "user@industrialpark.ir",
                createdAt: u.createdAt || new Date().toISOString(),
                passwordHash: u.passwordHash || null,
                lastLoginAt: u.lastLoginAt || null
              });
            }
            report.usersRestored++;
          }
        } catch (e) {
          console.warn("Restore user err:", e);
        }
      }

      // Restore Units
      for (const un of unitsList) {
        try {
          if (un.id && un.name) {
            const existing = await db.select().from(units).where(eq(units.id, un.id));
            const unitValues = {
              id: un.id,
              ownerId: un.ownerId || uid,
              name: un.name,
              phone: un.phone || "021",
              mobile1: un.mobile1 || null,
              mobile2: un.mobile2 || null,
              address: un.address || "شهرک صنعتی",
              description: un.description || "",
              category: un.category || "metals",
              profileImage: un.profileImage || "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=800",
              latitude: un.latitude ? Number(un.latitude) : null,
              longitude: un.longitude ? Number(un.longitude) : null,
              mapUrl: un.mapUrl || null,
              seoKeywords: un.seoKeywords || null,
              seoDescription: un.seoDescription || null,
              email: un.email || null,
              website: un.website || null,
              status: un.status || "approved",
              createdAt: un.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };

            if (existing.length > 0) {
              await db.update(units).set(unitValues).where(eq(units.id, un.id));
            } else {
              await db.insert(units).values(unitValues);
            }
            report.unitsRestored++;
          }
        } catch (e) {
          console.warn("Restore unit err:", e);
        }
      }

      // Restore Products
      for (const p of productsList) {
        try {
          if (p.id && p.name && p.unitId) {
            const existing = await db.select().from(products).where(eq(products.id, p.id));
            const prodValues = {
              id: p.id,
              unitId: p.unitId,
              ownerId: p.ownerId || uid,
              name: p.name,
              description: p.description || "",
              image: p.image || "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=800",
              price: p.price || null,
              seoKeywords: p.seoKeywords || null,
              seoDescription: p.seoDescription || null,
              createdAt: p.createdAt || new Date().toISOString()
            };

            if (existing.length > 0) {
              await db.update(products).set(prodValues).where(eq(products.id, p.id));
            } else {
              await db.insert(products).values(prodValues);
            }
            report.productsRestored++;
          }
        } catch (e) {
          console.warn("Restore product err:", e);
        }
      }

      // Restore Banners
      for (const b of bannersList) {
        try {
          if (b.id && b.companyName) {
            const existing = await db.select().from(banners).where(eq(banners.id, b.id));
            const bannerValues = {
              id: b.id,
              companyName: b.companyName,
              title: b.title || b.companyName,
              subtitle: b.subtitle || null,
              description: b.description || "",
              image: b.image || "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&q=80&w=800",
              logo: b.logo || null,
              badge: b.badge || "ویژه",
              badgeColor: b.badgeColor || "from-amber-500 to-orange-600",
              phone: b.phone || "021",
              mobile: b.mobile || null,
              linkUrl: b.linkUrl || null,
              linkText: b.linkText || "اطلاعات بیشتر",
              themeColor: b.themeColor || "indigo",
              overlayOpacity: b.overlayOpacity || "80",
              status: b.status || "active",
              priority: b.priority || "5",
              placement: b.placement || "home_hero",
              expiresAt: b.expiresAt || null,
              createdAt: b.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };

            if (existing.length > 0) {
              await db.update(banners).set(bannerValues).where(eq(banners.id, b.id));
            } else {
              await db.insert(banners).values(bannerValues);
            }
            report.bannersRestored++;
          }
        } catch (e) {
          console.warn("Restore banner err:", e);
        }
      }

      // Restore Classifieds
      for (const c of classifiedsList) {
        try {
          if (c.id && c.title) {
            const existing = await db.select().from(classifieds).where(eq(classifieds.id, c.id));
            const classValues = {
              id: c.id,
              ownerId: c.ownerId || uid,
              type: c.type || "classified",
              title: c.title,
              description: c.description || "",
              phone: c.phone || "021",
              price: c.price || null,
              location: c.location || null,
              category: c.category || "machinery",
              image: c.image || null,
              createdAt: c.createdAt || new Date().toISOString()
            };

            if (existing.length > 0) {
              await db.update(classifieds).set(classValues).where(eq(classifieds.id, c.id));
            } else {
              await db.insert(classifieds).values(classValues);
            }
            report.classifiedsRestored++;
          }
        } catch (e) {
          console.warn("Restore classified err:", e);
        }
      }

      // Restore Reviews
      for (const r of reviewsList) {
        try {
          if (r.id && r.unitId && r.authorName) {
            const existing = await db.select().from(reviews).where(eq(reviews.id, r.id));
            const reviewValues = {
              id: r.id,
              unitId: r.unitId,
              authorName: r.authorName,
              rating: r.rating || 5,
              comment: r.comment || "",
              status: r.status || "approved",
              createdAt: r.createdAt || new Date().toISOString()
            };

            if (existing.length > 0) {
              await db.update(reviews).set(reviewValues).where(eq(reviews.id, r.id));
            } else {
              await db.insert(reviews).values(reviewValues);
            }
            report.reviewsRestored++;
          }
        } catch (e) {
          console.warn("Restore review err:", e);
        }
      }

      // Restore Quotes
      for (const q of quotesList) {
        try {
          if (q.id && q.productId && q.unitId) {
            const existing = await db.select().from(quotes).where(eq(quotes.id, q.id));
            const quoteValues = {
              id: q.id,
              productId: q.productId,
              unitId: q.unitId,
              buyerName: q.buyerName || "خریدار",
              buyerPhone: q.buyerPhone || "0912",
              quantity: q.quantity || "1",
              description: q.description || "",
              status: q.status || "pending",
              createdAt: q.createdAt || new Date().toISOString()
            };

            if (existing.length > 0) {
              await db.update(quotes).set(quoteValues).where(eq(quotes.id, q.id));
            } else {
              await db.insert(quotes).values(quoteValues);
            }
            report.quotesRestored++;
          }
        } catch (e) {
          console.warn("Restore quote err:", e);
        }
      }

      // Restore Settings
      for (const s of settingsList) {
        try {
          if (s.key && s.value) {
            settingsMemoryStore.set(s.key, s.value);
            const existing = await db.select().from(settings).where(eq(settings.key, s.key));
            if (existing.length > 0) {
              await db.update(settings).set({ value: s.value, updatedAt: new Date().toISOString() }).where(eq(settings.key, s.key));
            } else {
              await db.insert(settings).values({ key: s.key, value: s.value, updatedAt: new Date().toISOString() });
            }
            report.settingsRestored++;
          }
        } catch (e) {
          console.warn("Restore setting err:", e);
        }
      }

      return res.json({
        success: true,
        message: "بازیابی اطلاعات دیتابیس با موفقیت انجام شد.",
        report
      });
    } catch (err: any) {
      console.error("Error restoring database:", err);
      return res.status(500).json({ error: err.message || "خطا در بازیابی نسخه پشتیبان" });
    }
  });
  
  // Real Email dispatcher helper
  async function sendRealEmail(
    toEmail: string,
    subject: string,
    htmlMessage: string,
    textMessage: string
  ): Promise<{ success: boolean; statusText: string; isSimulator?: boolean }> {
    try {
      // Always get latest settings from memory or DB
      let emailProvider = settingsMemoryStore.get("email_provider") || settingsMemoryStore.get("email_mode") || "simulator";
      let emailEnabled = settingsMemoryStore.get("email_enabled") !== "false";

      try {
        const dbSettings = await db.select().from(settings);
        for (const s of dbSettings) {
          settingsMemoryStore.set(s.key, s.value);
        }
        emailProvider = settingsMemoryStore.get("email_provider") || settingsMemoryStore.get("email_mode") || "simulator";
        emailEnabled = settingsMemoryStore.get("email_enabled") !== "false";
      } catch (_) {}

      if (!emailEnabled) {
        return { success: false, statusText: "درگاه ایمیل در تنظیمات سامانه غیرفعال است.", isSimulator: false };
      }

      if (emailProvider === "simulator") {
        console.log(`[Email OTP Simulator (Simulator Mode Active)] To: ${toEmail}, Subject: ${subject}\nMessage: ${textMessage}`);
        return { success: false, statusText: "حالت شبیه‌ساز ایمیل فعال است.", isSimulator: true };
      }

      // Real SMTP settings from database/memory, then fallback to env
      const host = settingsMemoryStore.get("smtp_host") || process.env.SMTP_HOST;
      const port = parseInt(settingsMemoryStore.get("smtp_port") || process.env.SMTP_PORT || "587");
      const user = settingsMemoryStore.get("smtp_user") || process.env.SMTP_USER;
      const pass = settingsMemoryStore.get("smtp_pass") || process.env.SMTP_PASS;
      const from = settingsMemoryStore.get("smtp_from") || process.env.SMTP_FROM || "no-reply@industrialpark.ir";
      const fromName = settingsMemoryStore.get("smtp_from_name") || "سامانه جامع شهرک صنعتی";
      const secure = settingsMemoryStore.get("smtp_secure") === "true" || port === 465;

      if (!host || !user || !pass) {
        console.log(`[Email Real Dispatch Warning (Incomplete SMTP Config)] To: ${toEmail}`);
        return { success: false, statusText: "تنظیمات سرور SMTP (هاست، نام کاربری یا کلمه عبور) در پنل مدیریت ناقص است.", isSimulator: false };
      }

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });

      await transporter.sendMail({
        from: `"${fromName}" <${from}>`,
        to: toEmail,
        subject: subject,
        text: textMessage,
        html: htmlMessage,
      });

      console.log(`[Email OTP Dispatched Successfully via SMTP] To: ${toEmail}`);
      return { success: true, statusText: "ایمیل با موفقیت از طریق SMTP ارسال شد.", isSimulator: false };
    } catch (err: any) {
      console.error("Error sending email via SMTP:", err);
      return { success: false, statusText: err.message || "خطا در ارسال ایمیل از طریق SMTP", isSimulator: false };
    }
  }

  // Real SMS dispatcher helper
  async function sendRealSMS(
    provider: string,
    apiKey: string,
    sender: string,
    phone: string,
    message: string,
    code: string,
    templatePattern: string,
    customEndpoint: string = ""
  ): Promise<{ success: boolean; statusText: string }> {
    try {
      const isPatternMode = !templatePattern.includes("%code%");

      // Payamak-Service (سامانه پیامک سرویس - RestWebApi)
      if (provider === "payamak_service" || provider === "payamakservice" || provider === "payamak-service") {
        const url = (customEndpoint && customEndpoint.trim()) ? customEndpoint.trim() : "http://in.payamak-service.ir/api/v2/RestWebApi/SendBatchSms";
        
        let username = apiKey;
        let password = "";
        if (apiKey.includes(":")) {
          const parts = apiKey.split(":");
          username = parts[0];
          password = parts[1];
        }

        const payload = {
          apiKey: apiKey,
          token: apiKey,
          userName: username,
          password: password,
          fromNumber: sender || "10008585",
          toNumbers: [phone],
          message: message,
          text: message,
          isFlash: false,
          isUTF8: true
        };

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apiKey": apiKey,
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify(payload)
        });

        const rawText = await response.text();
        let parsedJson: any = null;
        try {
          parsedJson = JSON.parse(rawText);
        } catch (_) {}

        if (!response.ok) {
          let readableError = `خطای وب‌سرویس (${response.status})`;
          if (response.status === 403 && (rawText.includes("ArvanCloud") || rawText.includes("محدود شده است") || rawText.includes("Access Denied"))) {
            readableError = "خطای ۴۰۳ ابر آروان (ArvanCloud WAF): دسترسی به وب‌سرویس پیامک از خارج از کشور توسط فایروال سامانه محدود شده است (محدود به آی‌پی ایران).";
          } else if (rawText.includes("<!DOCTYPE html>")) {
            readableError = `خطای دسترسی درگاه پیامک (${response.status}) - دسترسی به دامنه وب‌سرویس مسدود است.`;
          } else {
            readableError = `خطای سامانه پیامک سرویس (${response.status}): ${rawText.substring(0, 150)}`;
          }

          return { 
            success: false, 
            statusText: readableError 
          };
        }

        if (parsedJson && (parsedJson.status === -1 || parsedJson.RetStatus === -1 || parsedJson.isError === true)) {
          return { 
            success: false, 
            statusText: `پاسخ وب‌سرویس پیامک سرویس: ${parsedJson.message || parsedJson.StrRetStatus || rawText.substring(0, 120)}` 
          };
        }

        return { 
          success: true, 
          statusText: `ارسال موفق از طریق پیامک سرویس (شناسه: ${parsedJson?.batchId || parsedJson?.Value || parsedJson?.id || "ثبت شد"})` 
        };
      }

      if (provider === "kavenegar") {
        if (isPatternMode) {
          // Kavenegar Lookup (Pattern) Mode
          const url = `https://api.kavenegar.com/v1/${apiKey}/verify/lookup.json`;
          const bodyParams = new URLSearchParams();
          bodyParams.append("receptor", phone);
          bodyParams.append("token", code);
          bodyParams.append("template", templatePattern.trim());

          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: bodyParams.toString()
          });

          if (!response.ok) {
            const errorText = await response.text();
            return { success: false, statusText: `خطای پترن کاوه نگار: ${response.status} - ${errorText}` };
          }
          return { success: true, statusText: "ارسال موفق کد از طریق پترن کاوه نگار" };
        } else {
          // Kavenegar Simple Text Mode
          const url = `https://api.kavenegar.com/v1/${apiKey}/sms/send.json`;
          const bodyParams = new URLSearchParams();
          bodyParams.append("receptor", phone);
          bodyParams.append("sender", sender);
          bodyParams.append("message", message);

          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: bodyParams.toString()
          });

          if (!response.ok) {
            const errorText = await response.text();
            return { success: false, statusText: `خطای کاوه نگار: ${response.status} - ${errorText}` };
          }
          return { success: true, statusText: "ارسال موفق پیام از طریق کاوه نگار" };
        }
      } 
      
      if (provider === "melipayamak") {
        let username = apiKey;
        let password = "";
        if (apiKey.includes(":")) {
          const parts = apiKey.split(":");
          username = parts[0];
          password = parts[1];
        }

        if (isPatternMode) {
          // Melipayamak Pattern (BaseServiceNumber) Mode
          const url = "https://rest.payamak-panel.com/api/SendSMS/BaseServiceNumber";
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username,
              password,
              to: phone,
              text: code,
              bodyId: parseInt(templatePattern.trim(), 10) || 0
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            return { success: false, statusText: `خطای پترن ملی پیامک: ${response.status} - ${errorText}` };
          }
          return { success: true, statusText: "ارسال موفق کد از طریق پترن ملی پیامک" };
        } else {
          // Melipayamak Simple Text Mode
          const url = "https://rest.payamak-panel.com/api/SendSMS/SendSMS";
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username,
              password,
              to: phone,
              from: sender,
              text: message,
              isFlash: false
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            return { success: false, statusText: `خطای ملی پیامک: ${response.status} - ${errorText}` };
          }
          return { success: true, statusText: "ارسال موفق پیام از طریق ملی پیامک" };
        }
      }

      if (provider === "farazsms" || provider === "ippanel") {
        if (isPatternMode) {
          // FarazSMS / IPPanel Pattern Mode
          const url = "https://api2.ippanel.com/api/v1/sms/pattern/normal/send";
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": apiKey
            },
            body: JSON.stringify({
              code: templatePattern.trim(),
              sender: sender,
              recipient: phone,
              values: {
                "code": code
              }
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            return { success: false, statusText: `خطای پترن آی‌پی پنل: ${response.status} - ${errorText}` };
          }
          return { success: true, statusText: "ارسال موفق کد از طریق پترن آی‌پی پنل" };
        } else {
          // FarazSMS / IPPanel Simple Text Mode
          const url = "https://api2.ippanel.com/api/v1/sms/send/simple";
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": apiKey
            },
            body: JSON.stringify({
              sender: sender,
              recipients: [phone],
              message: message
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            return { success: false, statusText: `خطای آی‌پی پنل: ${response.status} - ${errorText}` };
          }
          return { success: true, statusText: "ارسال موفق پیام از طریق آی‌پی پنل" };
        }
      }

      return { success: true, statusText: "شبیه‌سازی موفق" };
    } catch (err: any) {
      return { success: false, statusText: `خطای شبکه/ارسال: ${err.message}` };
    }
  }

  // Ensure all database tables and schema columns exist
  async function ensureDatabaseSchema() {
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS users (
          uid TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          phone TEXT NOT NULL,
          email TEXT NOT NULL,
          created_at TEXT NOT NULL,
          password_hash TEXT,
          last_login_at TEXT
        );
        ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TEXT;

        CREATE TABLE IF NOT EXISTS units (
          id TEXT PRIMARY KEY,
          owner_id TEXT NOT NULL,
          name TEXT NOT NULL,
          phone TEXT NOT NULL,
          address TEXT NOT NULL,
          description TEXT NOT NULL,
          category TEXT NOT NULL,
          profile_image TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        ALTER TABLE units ADD COLUMN IF NOT EXISTS mobile1 TEXT;
        ALTER TABLE units ADD COLUMN IF NOT EXISTS mobile2 TEXT;
        ALTER TABLE units ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
        ALTER TABLE units ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
        ALTER TABLE units ADD COLUMN IF NOT EXISTS map_url TEXT;
        ALTER TABLE units ADD COLUMN IF NOT EXISTS seo_keywords TEXT;
        ALTER TABLE units ADD COLUMN IF NOT EXISTS seo_description TEXT;
        ALTER TABLE units ADD COLUMN IF NOT EXISTS email TEXT;
        ALTER TABLE units ADD COLUMN IF NOT EXISTS website TEXT;
        ALTER TABLE units ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

        CREATE TABLE IF NOT EXISTS products (
          id TEXT PRIMARY KEY,
          unit_id TEXT NOT NULL,
          owner_id TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT NOT NULL,
          image TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        ALTER TABLE products ADD COLUMN IF NOT EXISTS price TEXT;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_keywords TEXT;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_description TEXT;

        CREATE TABLE IF NOT EXISTS banners (
          id TEXT PRIMARY KEY,
          company_name TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          image TEXT NOT NULL,
          badge TEXT NOT NULL,
          phone TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        ALTER TABLE banners ADD COLUMN IF NOT EXISTS subtitle TEXT;
        ALTER TABLE banners ADD COLUMN IF NOT EXISTS logo TEXT;
        ALTER TABLE banners ADD COLUMN IF NOT EXISTS badge_color TEXT;
        ALTER TABLE banners ADD COLUMN IF NOT EXISTS mobile TEXT;
        ALTER TABLE banners ADD COLUMN IF NOT EXISTS link_url TEXT;
        ALTER TABLE banners ADD COLUMN IF NOT EXISTS link_text TEXT;
        ALTER TABLE banners ADD COLUMN IF NOT EXISTS theme_color TEXT;
        ALTER TABLE banners ADD COLUMN IF NOT EXISTS overlay_opacity TEXT;
        ALTER TABLE banners ADD COLUMN IF NOT EXISTS status TEXT;
        ALTER TABLE banners ADD COLUMN IF NOT EXISTS priority TEXT;
        ALTER TABLE banners ADD COLUMN IF NOT EXISTS placement TEXT;
        ALTER TABLE banners ADD COLUMN IF NOT EXISTS expires_at TEXT;
        ALTER TABLE banners ADD COLUMN IF NOT EXISTS updated_at TEXT;

        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS classifieds (
          id TEXT PRIMARY KEY,
          owner_id TEXT NOT NULL,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          phone TEXT NOT NULL,
          category TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        ALTER TABLE classifieds ADD COLUMN IF NOT EXISTS price TEXT;
        ALTER TABLE classifieds ADD COLUMN IF NOT EXISTS location TEXT;
        ALTER TABLE classifieds ADD COLUMN IF NOT EXISTS image TEXT;

        CREATE TABLE IF NOT EXISTS quotes (
          id TEXT PRIMARY KEY,
          product_id TEXT NOT NULL,
          unit_id TEXT NOT NULL,
          buyer_name TEXT NOT NULL,
          buyer_phone TEXT NOT NULL,
          quantity TEXT NOT NULL,
          description TEXT NOT NULL,
          status TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS otps (
          phone TEXT PRIMARY KEY,
          code TEXT NOT NULL,
          expires_at DOUBLE PRECISION NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sms_logs (
          id TEXT PRIMARY KEY,
          phone TEXT NOT NULL,
          code TEXT NOT NULL,
          provider TEXT NOT NULL,
          template TEXT NOT NULL,
          status TEXT NOT NULL,
          timestamp TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS conversations (
          id TEXT PRIMARY KEY,
          unit_id TEXT NOT NULL,
          guest_id TEXT NOT NULL,
          guest_name TEXT NOT NULL,
          guest_phone TEXT NOT NULL,
          last_message_at TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          conversation_id TEXT NOT NULL,
          sender TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TEXT NOT NULL,
          is_read TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS reviews (
          id TEXT PRIMARY KEY,
          unit_id TEXT NOT NULL,
          author_name TEXT NOT NULL,
          rating INTEGER NOT NULL,
          comment TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'approved',
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS activity_logs (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          unit_id TEXT,
          action TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          ip_address TEXT,
          user_agent TEXT,
          performed_by TEXT,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS push_subscriptions (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          endpoint TEXT NOT NULL UNIQUE,
          p256dh TEXT NOT NULL,
          auth TEXT NOT NULL,
          user_agent TEXT,
          created_at TEXT NOT NULL
        );
      `);
      console.log("[DB Migration] All database tables and columns ensured successfully.");
    } catch (err) {
      console.warn("[DB Migration Notice] Ensure database schema notice:", err);
    }
  }

  // Helper to record an activity/audit log
  async function recordActivityLog(params: {
    userId?: string | null;
    unitId?: string | null;
    action: string;
    title: string;
    description?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    performedBy?: "user" | "admin" | "system";
  }) {
    try {
      const logId = "log-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7);
      const newLog = {
        id: logId,
        userId: params.userId || null,
        unitId: params.unitId || null,
        action: params.action,
        title: params.title,
        description: params.description || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        performedBy: params.performedBy || "user",
        createdAt: new Date().toISOString(),
      };

      activityLogMemoryStore.set(logId, newLog);

      try {
        await db.insert(activityLogs).values(newLog);
      } catch (dbErr) {
        console.warn("DB insert for activity log fallback to memory:", dbErr);
      }
      return newLog;
    } catch (err) {
      console.error("Error recording activity log:", err);
    }
  }

  // Pre-populate admin user in memory
  userMemoryStore.set("manamalat@gmail.com", {
    uid: "usr_direct_admin",
    name: "مهندس علیرضا محمدی (مدیر سیستم)",
    phone: "09123442543",
    email: "manamalat@gmail.com",
    isAdmin: true
  });

  // Seed sample units in memory for high reliability
  const SEED_UNITS = [
    {
      id: "unit-alborz-polymer",
      ownerId: "usr_direct_admin",
      name: "صنایع پلیمر البرز",
      phone: "02177889900",
      mobile1: "09121112233",
      mobile2: "09123442543",
      address: "بلوار صنعت، خیابان ابتکار سوم، پلاک ۱۲",
      description: "تولیدکننده تخصصی انواع لوله‌های دوجداره کاروگیت، اتصالات پلی‌اتیلن آبرسانی و مخازن پلیمری ضدزنگ با استانداردهای ملی و اروپایی.",
      category: "chemicals",
      profileImage: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=800",
      latitude: 35.6892,
      longitude: 51.3890,
      mapUrl: "https://nshn.ir",
      seoKeywords: "پلیمر, لوله کاروگیت, اتصالات پلی اتیلن, مخزن آب",
      seoDescription: "تولیدکننده لوله و اتصالات پلی اتیلن صنعتی در شهرک صنعتی",
      status: "approved",
      badges: ["license_verified", "knowledge_based", "national_standard"],
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      updatedAt: new Date().toISOString(),
      reviewCount: 4,
      averageRating: 4.8
    },
    {
      id: "unit-borna-electric",
      ownerId: "usr_direct_admin",
      name: "برنا الکترونیک دماوند",
      phone: "02177665544",
      mobile1: "09122223344",
      address: "فاز دو، خیابان فناوری، نبش دانش دوم",
      description: "طراحی، مونتاژ و ساخت انواع تابلوهای برق صنعتی فشار قوی و ضعیف، سیستم‌های اتوماسیون PLC و بانک‌های خازنی کارخانجات.",
      category: "electronics",
      profileImage: "https://images.unsplash.com/photo-1498084393753-b411b2d26b34?auto=format&fit=crop&q=80&w=800",
      latitude: 35.6950,
      longitude: 51.3980,
      mapUrl: "https://nshn.ir",
      seoKeywords: "تابلو برق, اتوماسیون صنعتی, PLC, درایو موتور",
      seoDescription: "مرکز طراحی و ساخت تابلو برق و اتوماسیون صنعتی",
      status: "approved",
      badges: ["license_verified", "board_member"],
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      updatedAt: new Date().toISOString(),
      reviewCount: 3,
      averageRating: 5.0
    },
    {
      id: "unit-azarakhsh-steel",
      ownerId: "usr_direct_admin",
      name: "فولاد آذرخش پایتخت",
      phone: "02166554433",
      mobile1: "09123334455",
      address: "بلوار اصلی شهرک، جنب میدان صنعت، پلاک ۴",
      description: "خدمات نورد گرم، برشکاری لیزری CNC، رول‌فرمینگ و خمکاری انواع ورق‌های استنلس استیل و ورق‌های آلیاژی صنعتی.",
      category: "metals",
      profileImage: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&q=80&w=800",
      latitude: 35.6820,
      longitude: 51.3750,
      mapUrl: "https://nshn.ir",
      seoKeywords: "برش لیزر, ورق استیل, خمکاری CNC, سازه فلزی",
      seoDescription: "خدمات برشکاری لیزر و ساخت سازه‌های سنگین فلزی",
      status: "approved",
      badges: ["license_verified", "exemplary_unit", "top_exporter"],
      createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      updatedAt: new Date().toISOString(),
      reviewCount: 2,
      averageRating: 4.5
    }
  ];

  async function ensureUnitsLoaded() {
    try {
      const existing = await db.select().from(units);
      if (existing.length > 0) {
        existing.forEach(u => unitMemoryStore.set(u.id, u));
        console.log(`[Persistence] Successfully synchronized ${existing.length} units from DB to memory.`);
      } else {
        console.log("[Persistence] Database units table is empty. Seeding initial default units...");
        for (const u of SEED_UNITS) {
          unitMemoryStore.set(u.id, u);
          try {
            await db.insert(units).values({
              id: u.id,
              ownerId: u.ownerId,
              name: u.name,
              phone: u.phone,
              mobile1: u.mobile1 || null,
              mobile2: u.mobile2 || null,
              address: u.address,
              description: u.description,
              category: u.category,
              profileImage: u.profileImage,
              latitude: u.latitude || null,
              longitude: u.longitude || null,
              mapUrl: u.mapUrl || null,
              seoKeywords: u.seoKeywords || null,
              seoDescription: u.seoDescription || null,
              email: (u as any).email || null,
              website: (u as any).website || null,
              status: u.status || "approved",
              createdAt: u.createdAt,
              updatedAt: u.updatedAt
            }).onConflictDoNothing();
          } catch (e) {}
        }
      }
    } catch (err) {
      console.warn("Notice: ensureUnitsLoaded fallback to memory:", err);
      SEED_UNITS.forEach(u => {
        if (!unitMemoryStore.has(u.id)) unitMemoryStore.set(u.id, u);
      });
    }
  }

  const SEED_PRODUCTS = [
    {
      id: "prod-1",
      unitId: "unit-alborz-polymer",
      ownerId: "usr_direct_admin",
      name: "لوله کاروگیت سایز ۴۰۰ میلیمتر",
      description: "لوله دوجداره کاروگیت با مقاومت مکانیکی SN8 مناسب فاضلاب صنعتی و انتقال آب ثقلی.",
      price: "18500000",
      images: ["https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&q=80&w=800"],
      catalogUrl: "",
      technicalSpecs: "استاندارد INSO 9114، مقاومت حلقوی SN8",
      createdAt: new Date().toISOString()
    }
  ];

  async function ensureProductsLoaded() {
    try {
      const existing = await db.select().from(products);
      if (existing.length > 0) {
        existing.forEach(p => productMemoryStore.set(p.id, p));
        console.log(`[Persistence] Successfully synchronized ${existing.length} products from DB to memory.`);
      } else {
        console.log("[Persistence] Database products table is empty. Seeding initial default products...");
        for (const p of SEED_PRODUCTS) {
          productMemoryStore.set(p.id, p);
          try {
            await db.insert(products).values({
              id: p.id,
              unitId: p.unitId,
              ownerId: p.ownerId,
              name: p.name,
              description: p.description,
              image: (p as any).image || (p.images && p.images[0]) || "https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&q=80&w=800",
              price: p.price || null,
              seoKeywords: (p as any).seoKeywords || null,
              seoDescription: (p as any).seoDescription || null,
              createdAt: p.createdAt || new Date().toISOString()
            }).onConflictDoNothing();
          } catch (e) {}
        }
      }
    } catch (err) {
      console.warn("Notice: ensureProductsLoaded fallback to memory:", err);
      SEED_PRODUCTS.forEach(p => {
        if (!productMemoryStore.has(p.id)) productMemoryStore.set(p.id, p);
      });
    }
  }

  async function ensureBannersLoaded() {
    try {
      const existing = await db.select().from(banners);
      if (existing.length > 0) {
        existing.forEach(b => bannerMemoryStore.set(b.id, b));
        console.log(`[Persistence] Successfully synchronized ${existing.length} banners from DB to memory.`);
      } else {
        console.log("[Persistence] Database banners table is empty. Seeding default banners...");
        for (const b of DEFAULT_BANNERS) {
          bannerMemoryStore.set(b.id, b);
          try {
            await db.insert(banners).values(b).onConflictDoNothing();
          } catch (e) {}
        }
      }
    } catch (err) {
      console.warn("Notice: ensureBannersLoaded fallback to memory:", err);
      DEFAULT_BANNERS.forEach(b => {
        if (!bannerMemoryStore.has(b.id)) bannerMemoryStore.set(b.id, b);
      });
    }
  }

  async function ensureClassifiedsLoaded() {
    try {
      const existing = await db.select().from(classifieds);
      console.log(`[Persistence] Verified ${existing.length} classified ads in DB.`);
    } catch (err) {
      console.warn("Notice: ensureClassifiedsLoaded note:", err);
    }
  }

  // Synchronize stores on startup after guaranteeing schema and columns
  (async () => {
    try {
      await ensureDatabaseSchema();
    } catch (e) {
      console.warn("Schema initialization notice:", e);
    }
    await Promise.allSettled([
      ensureUnitsLoaded(),
      ensureProductsLoaded(),
      ensureBannersLoaded(),
      ensureClassifiedsLoaded()
    ]);
  })();

  async function saveOtp(key: string, code: string, expiresAt: number) {
    otpMemoryCache.set(key, { code, expiresAt });
    try {
      await db.delete(otps).where(eq(otps.phone, key));
      await db.insert(otps).values({
        phone: key,
        code,
        expiresAt: expiresAt
      });
    } catch (err) {
      console.warn(`[OTP Storage Notice] DB write for ${key} fallback to memory:`, err);
    }
  }

  async function verifyAndRemoveOtp(key: string, inputCode: string): Promise<{ valid: boolean; error?: string }> {
    const cleanCode = (inputCode || "").toString().trim();
    let record = otpMemoryCache.get(key);

    if (!record) {
      try {
        const records = await db.select().from(otps).where(eq(otps.phone, key));
        if (records.length > 0) {
          record = records[0];
        }
      } catch (err) {
        console.warn(`[OTP Query Notice] DB lookup for ${key} fallback to memory:`, err);
      }
    }

    if (!record) {
      return { valid: false, error: "کد تاییدی برای این مشخصات درخواست نشده یا منقضی شده است." };
    }

    if (Date.now() > record.expiresAt) {
      otpMemoryCache.delete(key);
      try { await db.delete(otps).where(eq(otps.phone, key)); } catch (_) {}
      return { valid: false, error: "کد تایید منقضی شده است. لطفاً مجدداً درخواست دهید." };
    }

    if (record.code !== cleanCode) {
      return { valid: false, error: "کد تایید وارد شده نادرست است." };
    }

    // Successfully verified!
    otpMemoryCache.delete(key);
    try { await db.delete(otps).where(eq(otps.phone, key)); } catch (_) {}
    return { valid: true };
  }

  // Email OTP Request route
  app.post("/api/auth/send-email-otp", otpRateLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || email.trim() === "") {
        return res.status(400).json({ error: "وارد کردن ایمیل الزامی است." });
      }

      const cleanEmail = email.trim().toLowerCase();
      // Generate standard 5 digit code
      const code = Math.floor(10000 + Math.random() * 90000).toString();
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiry

      await saveOtp(cleanEmail, code, expiresAt);

      const textMessage = `کد تایید شما در سامانه شهرک صنعتی: ${code}`;
      const htmlMessage = `
        <div style="direction: rtl; font-family: Tahoma, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; max-width: 500px; margin: auto; background-color: #f9f9f9;">
          <h2 style="color: #3b82f6; text-align: center;">سامانه شهرک صنعتی</h2>
          <p style="font-size: 16px; color: #333; text-align: center;">با سلام،</p>
          <p style="font-size: 14px; color: #555; text-align: center; line-height: 1.6;">برای تایید هویت خود در سامانه شهرک صنعتی، لطفا از کد تایید زیر استفاده کنید:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #1e3a8a; background-color: #eff6ff; padding: 10px 20px; border-radius: 5px; border: 1px dashed #bfdbfe;">${code}</span>
          </div>
          <p style="font-size: 12px; color: #ef4444; text-align: center;">این کد پس از ۵ دقیقه منقضی خواهد شد.</p>
        </div>
      `;

      // Read current email settings from memory/DB
      let emailProvider = settingsMemoryStore.get("email_provider") || settingsMemoryStore.get("email_mode") || "simulator";
      try {
        const dbSettings = await db.select().from(settings);
        for (const s of dbSettings) {
          settingsMemoryStore.set(s.key, s.value);
        }
        emailProvider = settingsMemoryStore.get("email_provider") || settingsMemoryStore.get("email_mode") || "simulator";
      } catch (_) {}

      const isSimulator = emailProvider === "simulator";

      // 1. If Super Admin configured SIMULATOR mode:
      if (isSimulator) {
        return res.json({
          success: true,
          message: `کد تایید یکبار مصرف (شبیه‌ساز سیستم): ${code}`,
          codeSimulated: code,
          isSimulator: true
        });
      }

      // 2. If Super Admin configured REAL EMAIL sending:
      // Dispatch via real SMTP and strictly DO NOT return simulation code
      const mailResult = await sendRealEmail(cleanEmail, "کد تایید هویت - سامانه شهرک صنعتی", htmlMessage, textMessage);

      if (!mailResult.success) {
        return res.status(400).json({
          error: `خطا در ارسال ایمیل واقعی (${mailResult.statusText}). لطفاً از صحت آدرس ایمیل و تنظیمات سرور SMTP در پنل مدیریت اطمینان حاصل فرمایید.`,
          code: "REAL_EMAIL_SEND_FAILED",
          isSimulator: false
        });
      }

      return res.json({
        success: true,
        message: "کد تایید ۵ رقمی با موفقیت به آدرس ایمیل شما ارسال شد. لطفاً اینباکس یا پوشه هرزنامه (Spam) ایمیل خود را بررسی کنید.",
        codeSimulated: undefined,
        isSimulator: false
      });
    } catch (err: any) {
      logger.error("POST /api/auth/send-email-otp", err.message || "Failed to send email OTP", err, { body: req.body });
      return res.status(500).json({ error: err.message || "خطا در ارسال کد تایید به ایمیل", code: "SEND_EMAIL_OTP_ERROR", details: err.stack });
    }
  });

  // OTP Request route
  app.post("/api/auth/send-otp", otpRateLimiter, async (req, res) => {
    try {
      const { phone } = req.body;
      if (!phone || phone.trim() === "") {
        return res.status(400).json({ error: "وارد کردن شماره همراه الزامی است." });
      }

      const cleanPhone = phone.trim();
      // Generate standard 5 digit code
      const code = Math.floor(10000 + Math.random() * 90000).toString();
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiry

      await saveOtp(cleanPhone, code, expiresAt);

      // Fetch SMS settings from DB or defaults
      let isEnabled = true;
      let provider = "simulator";
      let apiKey = "";
      let sender = "10008585";
      let endpoint = "http://in.payamak-service.ir/api/v2/RestWebApi/SendBatchSms";
      let templatePattern = "کد ورود شما به سامانه شهرک صنعتی: %code%";

      try {
        const dbSettings = await db.select().from(settings);
        for (const s of dbSettings) {
          if (s.key === "sms_enabled") isEnabled = s.value === "true";
          if (s.key === "sms_provider") provider = s.value;
          if (s.key === "sms_api_key") apiKey = s.value;
          if (s.key === "sms_sender") sender = s.value;
          if (s.key === "sms_endpoint") endpoint = s.value;
          if (s.key === "sms_otp_template") templatePattern = s.value;
        }
      } catch (dbErr) {
        console.error("Error reading SMS settings from DB:", dbErr);
      }

      const formattedMessage = templatePattern.replace("%code%", code);
      let logStatus = "شبیه‌سازی موفق";
      let displayMessage = "کد تایید ارسال شد.";

      const isSimulator = provider === "simulator" || !apiKey;

      if (!isSimulator) {
        try {
          const smsResult = await sendRealSMS(provider, apiKey, sender, cleanPhone, formattedMessage, code, templatePattern, endpoint);
          logStatus = smsResult.statusText;
          if (smsResult.success) {
            displayMessage = "کد تایید از طریق پیامک ارسال شد.";
          }
        } catch (smsErr: any) {
          logStatus = `خطای فرستنده: ${smsErr.message}`;
        }
      } else {
        displayMessage = process.env.NODE_ENV === "production" 
          ? "کد تایید ارسال گردید." 
          : `کد تایید شبیه‌سازی شد: ${code}`;
      }

      // Add to database logs safely (non-blocking for user OTP delivery)
      try {
        const logId = `sms_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        await db.insert(smsLogs).values({
          id: logId,
          phone: cleanPhone,
          code,
          provider,
          template: formattedMessage,
          status: logStatus,
          timestamp: new Date().toISOString()
        });
      } catch (logErr: any) {
        logger.warn("SMS Log DB Insert", "Failed to save sms log to DB (non-blocking)", { error: logErr.message, phone: cleanPhone });
      }

      // Only expose codeSimulated in development when provider is simulator
      const exposeSimulatedCode = isSimulator && process.env.NODE_ENV !== "production";

      return res.json({
        success: true,
        message: displayMessage,
        codeSimulated: exposeSimulatedCode ? code : undefined,
        smsEnabled: isEnabled,
        smsProvider: provider
      });
    } catch (err: any) {
      logger.error("POST /api/auth/send-otp", err.message || "Failed to send OTP", err, { body: req.body });
      return res.status(500).json({ error: err.message || "خطا در ارسال کد تایید", code: "SEND_OTP_ERROR", details: err.stack });
    }
  });

  // OTP Verification route
  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { phone, code, name } = req.body;
      if (!phone || !code) {
        return res.status(400).json({ error: "شماره همراه و کد تایید الزامی هستند." });
      }

      const cleanPhone = phone.trim();
      const cleanCode = code.trim();

      const verification = await verifyAndRemoveOtp(cleanPhone, cleanCode);
      if (!verification.valid) {
        return res.status(400).json({ error: verification.error || "کد تایید نامعتبر است." });
      }

      let userObj: any = null;

      // Check if user exists in Drizzle db or memory
      try {
        let userResult = await db.select().from(users).where(eq(users.phone, cleanPhone));
        if (userResult.length > 0) {
          userObj = userResult[0];
        } else {
          // Create new user profile in Drizzle
          const newUid = "usr_otp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
          const newEmail = `${cleanPhone}@industrialpark.ir`;
          const profileName = name ? name.trim() : "کاربر صنعتی جدید";

          const inserted = await db.insert(users).values({
            uid: newUid,
            name: profileName,
            phone: cleanPhone,
            email: newEmail,
            createdAt: new Date().toISOString()
          }).returning();
          
          userObj = inserted[0];
        }
      } catch (dbErr) {
        console.warn("DB operation during verify-otp failed, using memory cache fallback:", dbErr);
        userObj = userMemoryStore.get(cleanPhone) || {
          uid: "usr_otp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
          name: name ? name.trim() : "کاربر محترم",
          phone: cleanPhone,
          email: `${cleanPhone}@industrialpark.ir`,
          createdAt: new Date().toISOString()
        };
      }

      // Save to memory store
      userMemoryStore.set(cleanPhone, userObj);
      if (userObj.email) {
        userMemoryStore.set(userObj.email.toLowerCase(), userObj);
      }

      // Sign a secure custom token for the OTP session
      const token = signToken({
        uid: userObj.uid,
        email: userObj.email || `${cleanPhone}@industrialpark.ir`
      });

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: "/"
      });

      return res.json({
        success: true,
        user: {
          uid: userObj.uid,
          name: userObj.name,
          phone: userObj.phone,
          email: userObj.email,
          token: token
        }
      });
    } catch (err: any) {
      logger.error("POST /api/auth/verify-otp", err.message || "Failed to verify OTP", err, { body: req.body });
      return res.status(500).json({ error: err.message || "خطا در تایید کد", code: "VERIFY_OTP_ERROR", details: err.stack });
    }
  });

  // Custom Email/Password Registration Endpoint (handles fallback when Firebase Email Auth is disabled)
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, name, phone, code } = req.body;
      if (!email || !password || !name || !phone) {
        return res.status(400).json({ error: "تمامی فیلدها الزامی هستند." });
      }
      if (!code) {
        return res.status(400).json({ error: "وارد کردن کد تایید ایمیل الزامی است." });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const cleanPhone = phone.trim();
      const cleanCode = code.trim();

      // Verify OTP code first
      const verification = await verifyAndRemoveOtp(normalizedEmail, cleanCode);
      if (!verification.valid) {
        return res.status(400).json({ error: verification.error || "کد تایید ایمیل نامعتبر است." });
      }

      let userObj: any = null;

      try {
        // Check if user already exists by email
        const existingUsers = await db.select().from(users).where(eq(users.email, normalizedEmail));
        if (existingUsers.length > 0) {
          const existingUser = existingUsers[0];
          // If the user has no password (e.g. created via OTP), allow them to register (set password)
          if (!existingUser.passwordHash) {
            const passwordHash = hashPassword(password);
            await db.update(users).set({
              name: name.trim(),
              phone: cleanPhone,
              passwordHash,
              lastLoginAt: new Date().toISOString()
            }).where(eq(users.uid, existingUser.uid));

            userObj = {
              ...existingUser,
              name: name.trim(),
              phone: cleanPhone,
              passwordHash
            };
          } else {
            return res.status(400).json({ error: "کاربری با این ایمیل قبلاً ثبت نام کرده است." });
          }
        } else {
          // Check if user already exists by phone
          const existingUsersByPhone = await db.select().from(users).where(eq(users.phone, cleanPhone));
          if (existingUsersByPhone.length > 0) {
            const existingUserByPhone = existingUsersByPhone[0];
            if (!existingUserByPhone.passwordHash) {
              const passwordHash = hashPassword(password);
              await db.update(users).set({
                name: name.trim(),
                email: normalizedEmail,
                passwordHash,
                lastLoginAt: new Date().toISOString()
              }).where(eq(users.uid, existingUserByPhone.uid));

              userObj = {
                ...existingUserByPhone,
                name: name.trim(),
                email: normalizedEmail,
                passwordHash
              };
            } else {
              return res.status(400).json({ error: "کاربری با این شماره همراه قبلاً ثبت نام کرده است." });
            }
          }
        }

        if (!userObj) {
          const newUid = "usr_pass_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
          const passwordHash = hashPassword(password);

          const inserted = await db.insert(users).values({
            uid: newUid,
            name: name.trim(),
            phone: cleanPhone,
            email: normalizedEmail,
            passwordHash,
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString()
          }).returning();

          userObj = inserted[0];
        }
      } catch (dbErr) {
        console.warn("Database error during registration, falling back to memory store:", dbErr);
        const passwordHash = hashPassword(password);
        userObj = {
          uid: "usr_pass_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
          name: name.trim(),
          phone: cleanPhone,
          email: normalizedEmail,
          passwordHash,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        };
      }

      // Cache user in memory
      userMemoryStore.set(normalizedEmail, userObj);
      userMemoryStore.set(cleanPhone, userObj);

      const token = signToken({ uid: userObj.uid, email: userObj.email });

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: "/"
      });

      return res.json({
        success: true,
        user: {
          uid: userObj.uid,
          name: userObj.name,
          phone: userObj.phone,
          email: userObj.email,
          token: token
        }
      });
    } catch (err: any) {
      logger.error("POST /api/auth/register", err.message || "Registration failed", err, { body: { email: req.body?.email, phone: req.body?.phone, name: req.body?.name } });
      return res.status(500).json({ error: err.message || "خطا در ثبت نام", code: "REGISTER_ERROR", details: err.stack });
    }
  });

  // Custom Email/Password Login Endpoint (handles fallback when Firebase Email Auth is disabled)
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "ایمیل و کلمه عبور الزامی هستند." });
      }

      const normalizedEmail = email.trim().toLowerCase();
      let userObj: any = null;

      try {
        const foundUsers = await db.select().from(users).where(eq(users.email, normalizedEmail));
        if (foundUsers.length > 0) {
          userObj = foundUsers[0];
        }
      } catch (dbErr) {
        console.warn("DB lookup failed during login, checking memory store:", dbErr);
      }

      // Memory fallback if not found in DB
      if (!userObj) {
        userObj = userMemoryStore.get(normalizedEmail);
      }

      if (!userObj) {
        return res.status(400).json({ error: "حساب کاربری با این ایمیل یافت نشد. لطفاً ابتدا ثبت‌نام کنید." });
      }

      if (!userObj.passwordHash) {
        // Special case: Default admin override or no password
        if (normalizedEmail === "manamalat@gmail.com" && (password === "123456" || password === "admin123")) {
          userObj.passwordHash = hashPassword(password);
        } else {
          return res.status(400).json({ 
            error: "این حساب کاربری هنوز رمز عبور ندارد. لطفاً با کد یکبار مصرف پیامکی (OTP) وارد شوید یا از گزینه «تعیین/بازیابی رمز عبور» استفاده نمایید.",
            code: "NO_PASSWORD_SET",
            hasNoPassword: true,
            phone: userObj.phone,
            email: userObj.email
          });
        }
      }

      if (!verifyPassword(password, userObj.passwordHash)) {
        return res.status(400).json({ error: "کلمه عبور وارد شده اشتباه است." });
      }

      // Update last login timestamp in background
      try {
        await db.update(users)
          .set({ lastLoginAt: new Date().toISOString() })
          .where(eq(users.uid, userObj.uid));
      } catch (_) {}

      // Cache updated user in memory
      userMemoryStore.set(normalizedEmail, userObj);
      if (userObj.phone) userMemoryStore.set(userObj.phone, userObj);

      const token = signToken({ uid: userObj.uid, email: userObj.email });

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: "/"
      });

      return res.json({
        success: true,
        user: {
          uid: userObj.uid,
          name: userObj.name,
          phone: userObj.phone,
          email: userObj.email,
          token: token
        }
      });
    } catch (err: any) {
      logger.error("POST /api/auth/login", err.message || "Login failed", err, { body: { email: req.body?.email } });
      return res.status(500).json({ 
        error: err.message || "خطا در ورود به حساب کاربری", 
        code: "LOGIN_ERROR", 
        details: err.stack 
      });
    }
  });

  // Dedicated Admin Login Endpoint (Supports Super Admin and Appointed Managers)
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "وارد کردن نام کاربری/ایمیل و کلمه عبور الزامی است." });
      }

      const clientIp = getClientIp(req);
      const userAgent = (req.headers["user-agent"] as string) || "";

      const rawUser = String(username).trim();
      const rawPass = String(password).trim();

      // Check brute-force lockout status before evaluating
      const bruteCheck = checkAdminBruteForce(rawUser, clientIp);
      if (!bruteCheck.allowed) {
        return res.status(429).json({
          error: `به دلیل تلاش‌های ناموفق مکرر، دسترسی ورود موقتاً مسدود شده است. لطفاً ${bruteCheck.remainingMinutes} دقیقه دیگر مجدداً تلاش فرمایید.`,
          code: "ADMIN_BRUTE_FORCE_LOCKED",
          remainingMinutes: bruteCheck.remainingMinutes
        });
      }

      const normalizedUser = normalizeDigits(rawUser).toLowerCase();
      const normalizedPass = normalizeDigits(rawPass);
      const inputUser = rawUser.toLowerCase();
      const inputPass = rawPass;

      // Read configured super admin credentials from settings or defaults
      let configuredAdminUsername = (settingsMemoryStore.get("admin_username") || process.env.ADMIN_USERNAME || "admin").toLowerCase().trim();
      let configuredAdminEmail = (settingsMemoryStore.get("admin_email") || process.env.ADMIN_EMAIL || "manamalat@gmail.com").toLowerCase().trim();
      let configuredAdminName = settingsMemoryStore.get("admin_name") || "مدیر ارشد سامانه";
      let configuredAdminPassHash = settingsMemoryStore.get("admin_password_hash");

      // Check DB settings if not in memory
      if (!configuredAdminPassHash) {
        try {
          const dbSettings = await db.select().from(settings);
          for (const s of dbSettings) {
            if (s.key === "admin_username" && s.value) configuredAdminUsername = s.value.toLowerCase().trim();
            if (s.key === "admin_email" && s.value) configuredAdminEmail = s.value.toLowerCase().trim();
            if (s.key === "admin_name" && s.value) configuredAdminName = s.value;
            if (s.key === "admin_password_hash" && s.value) configuredAdminPassHash = s.value;
          }
        } catch (_) {}
      }

      let isValid = false;
      let adminProfile: any = null;

      // Super Admin identities (strictly configured username, email, or system defaults)
      const superAdminUsernames = [
        "admin",
        "manamalat@gmail.com",
        "admin@industrialpark.ir",
        "09123442543",
        configuredAdminUsername,
        configuredAdminEmail,
        (process.env.ADMIN_EMAIL || "").toLowerCase().trim(),
        (process.env.ADMIN_USERNAME || "").toLowerCase().trim()
      ].map(s => (s || "").toLowerCase().trim()).filter(Boolean);

      const isConfiguredSuperAdminIdentity = 
        superAdminUsernames.includes(inputUser) || 
        superAdminUsernames.includes(normalizedUser);

      // Initial password if not yet configured in DB (can be configured via ADMIN_PASSWORD in .env)
      const initialDefaultPassword = process.env.ADMIN_PASSWORD || "Industrial@2025";

      let isSuperAdminPasswordValid = false;
      if (configuredAdminPassHash) {
        isSuperAdminPasswordValid = 
          verifyPassword(inputPass, configuredAdminPassHash) ||
          verifyPassword(normalizedPass, configuredAdminPassHash);
      } else {
        isSuperAdminPasswordValid = 
          inputPass === initialDefaultPassword ||
          normalizedPass === initialDefaultPassword ||
          verifyPassword(inputPass, initialDefaultPassword);
      }

      // 1. Super Admin Match (Strict check: MUST match both identity AND verified password)
      if (isConfiguredSuperAdminIdentity && isSuperAdminPasswordValid) {
        isValid = true;
        adminProfile = {
          uid: "usr_direct_admin",
          name: configuredAdminName || "مهندس علیرضا محمدی (مدیر ارشد)",
          email: configuredAdminEmail || "manamalat@gmail.com",
          phone: "09123442543",
          isAdmin: true,
          role: "super_admin",
          permissions: ["units", "banners", "sms", "email", "database", "backup", "logs", "security", "managers"]
        };
      }

      // 2. Check appointed managers list defined by Super Admin
      if (!isValid) {
        try {
          const managers = await getSystemManagers();
          const targetManager = managers.find(m => {
            const mUser = (m.username || "").toLowerCase().trim();
            const mEmail = (m.email || "").toLowerCase().trim();
            const mPhone = normalizeDigits(m.phone || "").trim();
            return (
              mUser === inputUser ||
              mUser === normalizedUser ||
              mEmail === inputUser ||
              mEmail === normalizedUser ||
              (mPhone && (mPhone === normalizedUser || mPhone === inputUser)) ||
              m.id === inputUser
            );
          });

          if (targetManager) {
            if (targetManager.isActive === false) {
              return res.status(403).json({
                error: "حساب کاربری مدیریتی شما توسط مدیر ارشد غیرفعال شده است. لطفاً با مدیر ارشد تماس حاصل فرمایید."
              });
            }

            const isManagerPassValid = 
              targetManager.passwordHash && (
                verifyPassword(inputPass, targetManager.passwordHash) || 
                verifyPassword(normalizedPass, targetManager.passwordHash)
              );

            if (isManagerPassValid) {
              isValid = true;
              
              // Update last login
              targetManager.lastLoginAt = new Date().toISOString();
              await saveSystemManagers(managers);

              const isSuper = targetManager.role === "super_admin";
              adminProfile = {
                uid: targetManager.id,
                name: targetManager.name,
                email: targetManager.email || `${targetManager.username}@industrialpark.ir`,
                phone: targetManager.phone || "",
                username: targetManager.username,
                isAdmin: true,
                role: targetManager.role || "manager",
                permissions: isSuper ? ["units", "banners", "sms", "email", "database", "backup", "logs", "security", "managers"] : (targetManager.permissions || ["units", "banners", "sms"])
              };
            }
          }
        } catch (mgrErr) {
          console.warn("Appointed manager check error:", mgrErr);
        }
      }

      // 3. If not matched yet, check DB users table with valid admin privileges
      if (!isValid) {
        try {
          const foundUsers = await db.select().from(users).where(
            or(
              eq(users.email, inputUser),
              eq(users.email, normalizedUser),
              eq(users.phone, inputUser),
              eq(users.phone, normalizedUser),
              eq(users.uid, inputUser)
            )
          );

          if (foundUsers.length > 0) {
            const candidate = foundUsers[0];
            const candidateIsAdmin = await getIsAdmin(candidate.uid, candidate.email);
            if (candidateIsAdmin && candidate.passwordHash) {
              if (
                verifyPassword(inputPass, candidate.passwordHash) || 
                verifyPassword(normalizedPass, candidate.passwordHash)
              ) {
                isValid = true;
                adminProfile = {
                  uid: candidate.uid,
                  name: candidate.name || "مدیر سامانه",
                  email: candidate.email || configuredAdminEmail,
                  phone: candidate.phone,
                  isAdmin: true,
                  role: "super_admin",
                  permissions: ["units", "banners", "sms", "email", "database", "backup", "logs", "security", "managers"]
                };
              }
            }
          }
        } catch (dbErr) {
          console.warn("Admin DB fallback check notice:", dbErr);
        }
      }

      // 4. Memory store fallback check
      if (!isValid) {
        const memUser = userMemoryStore.get(inputUser) || userMemoryStore.get(normalizedUser);
        if (memUser && (memUser.isAdmin || memUser.uid === "usr_direct_admin" || memUser.role === "manager" || memUser.role === "super_admin")) {
          if (
            memUser.passwordHash &&
            (verifyPassword(inputPass, memUser.passwordHash) || verifyPassword(normalizedPass, memUser.passwordHash))
          ) {
            isValid = true;
            adminProfile = {
              uid: memUser.uid || "usr_direct_admin",
              name: memUser.name || "مدیر سامانه",
              email: memUser.email || "manamalat@gmail.com",
              phone: memUser.phone || "09123442543",
              isAdmin: true,
              role: memUser.role || "super_admin",
              permissions: memUser.permissions || ["units", "banners", "sms", "email", "database", "backup", "logs", "security", "managers"]
            };
          }
        }
      }

      if (!isValid || !adminProfile) {
        const bruteResult = recordFailedAdminLogin(rawUser, clientIp);

        // Record failed attempt in audit log
        await recordActivityLog({
          action: "admin_login_failed",
          title: "تلاش ناموفق برای ورود به پنل مدیریت",
          description: `نام کاربری وارد شده: ${username} | وضعیت: ${bruteResult.isBlocked ? "مسدودسازی ۱۵ دقیقه‌ای" : `${bruteResult.attemptsLeft} تلاش باقی‌مانده`}`,
          ipAddress: clientIp,
          userAgent: userAgent,
          performedBy: "admin"
        });

        if (bruteResult.isBlocked) {
          return res.status(429).json({
            error: "به دلیل ۵ مرتبه تلاش ناموفق پیاپی، دسترسی ورود برای ۱۵ دقیقه مسدود شد.",
            code: "ADMIN_LOCKED_OUT",
            isBlocked: true,
            remainingMinutes: 15
          });
        }

        return res.status(401).json({
          error: `نام کاربری یا کلمه عبور مدیریت نادرست است. (${bruteResult.attemptsLeft} فرصت تا مسدودی موقت)`,
          attemptsLeft: bruteResult.attemptsLeft
        });
      }

      // Reset failed attempts upon successful login
      resetAdminFailedAttempts(rawUser, clientIp);

      // Sign token
      const token = signToken({
        uid: adminProfile.uid,
        email: adminProfile.email
      });

      // Update memory store
      userMemoryStore.set(adminProfile.uid, adminProfile);
      userMemoryStore.set(adminProfile.email, adminProfile);

      // Record successful login
      await recordActivityLog({
        userId: adminProfile.uid,
        action: "admin_login_success",
        title: `ورود موفق ${adminProfile.role === "super_admin" ? "مدیر ارشد" : "مدیر پلتفرم"} به پنل مدیریت`,
        description: `کاربر: ${adminProfile.name} (${adminProfile.email || adminProfile.username})`,
        ipAddress: clientIp,
        userAgent: userAgent,
        performedBy: "admin"
      });

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: "/"
      });

      return res.json({
        success: true,
        message: "ورود به پنل مدیریت با موفقیت انجام شد.",
        user: {
          uid: adminProfile.uid,
          name: adminProfile.name,
          phone: adminProfile.phone,
          email: adminProfile.email,
          username: adminProfile.username,
          isAdmin: true,
          role: adminProfile.role || "super_admin",
          permissions: adminProfile.permissions || [],
          token: token
        }
      });
    } catch (err: any) {
      logger.error("POST /api/admin/login", err.message || "Admin login error", err);
      return res.status(500).json({ error: "خطای سرور در احراز هویت مدیریت" });
    }
  });

  // Dedicated Admin Update Credentials (Username, Password, Display Name)
  app.post("/api/admin/change-credentials", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email;
      if (!uid || !(await getIsAdmin(uid, email))) {
        return res.status(403).json({ error: "سطح دسترسی ناکافی" });
      }

      const { newUsername, newPassword, newName } = req.body;

      if (newPassword && newPassword.length < 6) {
        return res.status(400).json({ error: "کلمه عبور جدید باید حداقل ۶ کاراکتر باشد." });
      }

      const now = new Date().toISOString();

      if (newUsername && newUsername.trim()) {
        const cleanUser = newUsername.trim().toLowerCase();
        settingsMemoryStore.set("admin_username", cleanUser);
        await db.insert(settings)
          .values({ key: "admin_username", value: cleanUser, updatedAt: now })
          .onConflictDoUpdate({ target: settings.key, set: { value: cleanUser, updatedAt: now } });
      }

      if (newName && newName.trim()) {
        const cleanName = newName.trim();
        settingsMemoryStore.set("admin_name", cleanName);
        await db.insert(settings)
          .values({ key: "admin_name", value: cleanName, updatedAt: now })
          .onConflictDoUpdate({ target: settings.key, set: { value: cleanName, updatedAt: now } });

        // Update user name in DB if exists
        try {
          await db.update(users).set({ name: cleanName }).where(eq(users.uid, uid));
        } catch (_) {}
      }

      if (newPassword && newPassword.trim()) {
        const hashed = hashPassword(newPassword.trim());
        settingsMemoryStore.set("admin_password_hash", hashed);
        await db.insert(settings)
          .values({ key: "admin_password_hash", value: hashed, updatedAt: now })
          .onConflictDoUpdate({ target: settings.key, set: { value: hashed, updatedAt: now } });

        // Also update user's passwordHash in db if exists
        try {
          await db.update(users).set({ passwordHash: hashed }).where(eq(users.uid, uid));
        } catch (_) {}
      }

      await recordActivityLog({
        userId: uid,
        action: "admin_credentials_updated",
        title: "تغییر مشخصات دسترسی مدیر ارشد",
        description: `نام کاربری جدید: ${newUsername || "بدون تغییر"} | تغییر رمز: ${newPassword ? "انجام شد" : "خیر"}`,
        performedBy: "admin"
      });

      return res.json({
        success: true,
        message: "مشخصات امنیتی پنل مدیریت با موفقیت به‌روزرسانی شد."
      });
    } catch (err: any) {
      logger.error("POST /api/admin/change-credentials", err.message || "Failed to update admin credentials", err);
      return res.status(500).json({ error: "خطا در ذخیره‌سازی اطلاعات مدیریت" });
    }
  });

  // ==========================================
  // Security Hardening & WAF Status Endpoints
  // ==========================================
  app.get("/api/admin/security/stats", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email;
      if (!uid || !(await getIsAdmin(uid, email))) {
        return res.status(403).json({ error: "سطح دسترسی ناکافی" });
      }

      const stats = getSecurityStats();
      return res.json({
        success: true,
        ...stats,
        systemStatus: {
          rateLimiter: "فعال (۲۴۰ درخواست در دقیقه)",
          otpProtection: "فعال (حداکثر ۴ کد در ۱۰ دقیقه + خنک‌سازی ۴۵ ثانیه‌ای)",
          bruteForceGuard: "فعال (مسدودسازی پس از ۵ تلاش ناموفق)",
          magicBytesValidation: "فعال (بررسی باینری JPG/PNG/WebP)",
          xssFilter: "فعال (پالایش خودکار اسکریپت‌ها)",
          securityHeaders: "فعال (HSTS, CSP, Nosniff, Clickjacking Guard)"
        }
      });
    } catch (err: any) {
      logger.error("GET /api/admin/security/stats", err.message || "Security stats error", err);
      return res.status(500).json({ error: "خطا در دریافت وضعیت امنیتی" });
    }
  });

  app.post("/api/admin/security/unblock", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email;
      if (!uid || !(await getIsAdmin(uid, email))) {
        return res.status(403).json({ error: "سطح دسترسی ناکافی" });
      }

      const { key } = req.body;
      if (!key) {
        return res.status(400).json({ error: "شناسه یا IP جهت رفع انسداد مشخص نشده است." });
      }

      const result = clearSecurityBlock(String(key).trim());

      await recordActivityLog({
        userId: uid,
        action: "security_unblock",
        title: "رفع انسداد امنیتی کاربر/IP",
        description: `شناسه یا IP: ${key}`,
        performedBy: "admin"
      });

      return res.json({
        success: true,
        cleared: result,
        message: `انسداد امنیتی برای «${key}» با موفقیت لغو شد.`
      });
    } catch (err: any) {
      logger.error("POST /api/admin/security/unblock", err.message || "Security unblock error", err);
      return res.status(500).json({ error: "خطا در رفع انسداد امنیتی" });
    }
  });

  // ==========================================
  // Appointed Managers Management Endpoints (Super Admin Only)
  // ==========================================

  // 1. Get All Defined Managers
  app.get("/api/admin/managers", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email;
      if (!uid || !(await getIsAdmin(uid, email))) {
        return res.status(403).json({ error: "سطح دسترسی ناکافی" });
      }

      const managers = await getSystemManagers();
      // Sanitize passwordHash before returning to frontend
      const sanitized = managers.map(m => ({
        id: m.id,
        name: m.name,
        username: m.username,
        email: m.email || "",
        phone: m.phone || "",
        role: m.role || "manager",
        permissions: m.permissions || ["units", "banners", "sms"],
        isActive: m.isActive !== false,
        createdAt: m.createdAt,
        lastLoginAt: m.lastLoginAt || null
      }));

      return res.json(sanitized);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "خطا در دریافت لیست مدیران" });
    }
  });

  // 2. Create / Appoint New Manager
  app.post("/api/admin/managers", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email;
      if (!uid || !(await getIsAdmin(uid, email))) {
        return res.status(403).json({ error: "سطح دسترسی ناکافی" });
      }

      const { name, username, password, email: mgrEmail, phone, role, permissions } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: "وارد کردن نام و نام خانوادگی مدیر الزامی است." });
      }
      if (!username || !username.trim()) {
        return res.status(400).json({ error: "وارد کردن نام کاربری اختصاصی الزامی است." });
      }
      if (!password || password.trim().length < 6) {
        return res.status(400).json({ error: "کلمه عبور مدیر باید حداقل ۶ کاراکتر باشد." });
      }

      const cleanUsername = username.trim().toLowerCase();
      const cleanName = name.trim();
      const cleanEmail = mgrEmail ? mgrEmail.trim().toLowerCase() : "";
      const cleanPhone = phone ? phone.trim() : "";

      // Check if username is already taken by super admin or another manager
      const configuredSuperAdminUser = (settingsMemoryStore.get("admin_username") || "admin").toLowerCase().trim();
      if (cleanUsername === configuredSuperAdminUser || cleanUsername === "admin" || cleanUsername === "superadmin") {
        return res.status(400).json({ error: "این نام کاربری به مدیر ارشد سیستم اختصاص دارد و قابل انتخاب نیست." });
      }

      const managers = await getSystemManagers();
      const existing = managers.find(m => m.username.toLowerCase() === cleanUsername);
      if (existing) {
        return res.status(400).json({ error: "مدیری با این نام کاربری قبلاً در سامانه تعریف شده است." });
      }

      const newManagerId = "mgr_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
      const hashedPassword = hashPassword(password.trim());

      const newManager: SystemManager = {
        id: newManagerId,
        name: cleanName,
        username: cleanUsername,
        email: cleanEmail,
        phone: cleanPhone,
        passwordHash: hashedPassword,
        role: role || "manager",
        permissions: Array.isArray(permissions) && permissions.length > 0 ? permissions : ["units", "banners", "sms"],
        isActive: true,
        createdAt: new Date().toISOString()
      };

      managers.push(newManager);
      await saveSystemManagers(managers);

      // Register in userMemoryStore as well
      userMemoryStore.set(cleanUsername, {
        uid: newManagerId,
        name: cleanName,
        email: cleanEmail || `${cleanUsername}@industrialpark.ir`,
        phone: cleanPhone,
        isAdmin: true,
        role: newManager.role
      });

      await recordActivityLog({
        userId: uid,
        action: "manager_appointed",
        title: "تعریف مدیر جدید در سامانه",
        description: `مدیر جدید: ${cleanName} (نام کاربری: ${cleanUsername}) توسط مدیریت ارشد تعیین شد.`,
        performedBy: "admin"
      });

      return res.status(201).json({
        success: true,
        message: `مدیر جدید «${cleanName}» با موفقیت تعریف و فعال گردید.`,
        manager: {
          id: newManager.id,
          name: newManager.name,
          username: newManager.username,
          email: newManager.email,
          phone: newManager.phone,
          role: newManager.role,
          permissions: newManager.permissions,
          isActive: newManager.isActive,
          createdAt: newManager.createdAt
        }
      });
    } catch (err: any) {
      logger.error("POST /api/admin/managers", err.message || "Failed to create manager", err);
      return res.status(500).json({ error: err.message || "خطا در تعریف مدیر جدید" });
    }
  });

  // 3. Update Manager Profile / Password
  app.put("/api/admin/managers/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email;
      if (!uid || !(await getIsAdmin(uid, email))) {
        return res.status(403).json({ error: "سطح دسترسی ناکافی" });
      }

      const { id } = req.params;
      const { name, username, password, email: mgrEmail, phone, role, permissions, isActive } = req.body;

      const managers = await getSystemManagers();
      const index = managers.findIndex(m => m.id === id);
      if (index === -1) {
        return res.status(404).json({ error: "مدیر مورد نظر یافت نشد." });
      }

      const target = managers[index];

      if (name && name.trim()) target.name = name.trim();
      if (username && username.trim()) {
        const cleanUser = username.trim().toLowerCase();
        // check unique
        const dup = managers.find(m => m.id !== id && m.username.toLowerCase() === cleanUser);
        if (dup) return res.status(400).json({ error: "این نام کاربری به مدیر دیگری اختصاص دارد." });
        target.username = cleanUser;
      }
      if (mgrEmail !== undefined) target.email = (mgrEmail || "").trim().toLowerCase();
      if (phone !== undefined) target.phone = (phone || "").trim();
      if (role) target.role = role;
      if (Array.isArray(permissions)) target.permissions = permissions;
      if (isActive !== undefined) target.isActive = Boolean(isActive);

      if (password && password.trim()) {
        if (password.trim().length < 6) {
          return res.status(400).json({ error: "کلمه عبور باید حداقل ۶ کاراکتر باشد." });
        }
        target.passwordHash = hashPassword(password.trim());
      }

      managers[index] = target;
      await saveSystemManagers(managers);

      await recordActivityLog({
        userId: uid,
        action: "manager_updated",
        title: "به‌روزرسانی مشخصات مدیر",
        description: `اطلاعات مدیر ${target.name} (${target.username}) به‌روزرسانی شد.`,
        performedBy: "admin"
      });

      return res.json({
        success: true,
        message: `مشخصات مدیر «${target.name}» با موفقیت ذخیره شد.`,
        manager: {
          id: target.id,
          name: target.name,
          username: target.username,
          email: target.email,
          phone: target.phone,
          role: target.role,
          permissions: target.permissions,
          isActive: target.isActive,
          createdAt: target.createdAt,
          lastLoginAt: target.lastLoginAt
        }
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "خطا در به‌روزرسانی مدیر" });
    }
  });

  // 4. Toggle Manager Active/Inactive Status
  app.post("/api/admin/managers/:id/toggle-status", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email;
      if (!uid || !(await getIsAdmin(uid, email))) {
        return res.status(403).json({ error: "سطح دسترسی ناکافی" });
      }

      const { id } = req.params;
      const managers = await getSystemManagers();
      const target = managers.find(m => m.id === id);
      if (!target) {
        return res.status(404).json({ error: "مدیر مورد نظر یافت نشد." });
      }

      target.isActive = !target.isActive;
      await saveSystemManagers(managers);

      await recordActivityLog({
        userId: uid,
        action: target.isActive ? "manager_activated" : "manager_deactivated",
        title: target.isActive ? "فعال‌سازی حساب مدیر" : "غیرفعال‌سازی حساب مدیر",
        description: `وضعیت مدیر ${target.name} به ${target.isActive ? "فعال" : "غیرفعال"} تغییر یافت.`,
        performedBy: "admin"
      });

      return res.json({
        success: true,
        isActive: target.isActive,
        message: `وضعیت مدیر «${target.name}» به «${target.isActive ? "فعال" : "غیرفعال"}» تغییر یافت.`
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "خطا در تغییر وضعیت مدیر" });
    }
  });

  // 5. Reset Manager Password directly by Super Admin
  app.post("/api/admin/managers/:id/reset-password", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email;
      if (!uid || !(await getIsAdmin(uid, email))) {
        return res.status(403).json({ error: "سطح دسترسی ناکافی" });
      }

      const { id } = req.params;
      const { newPassword } = req.body;

      if (!newPassword || newPassword.trim().length < 6) {
        return res.status(400).json({ error: "کلمه عبور جدید باید حداقل ۶ کاراکتر باشد." });
      }

      const managers = await getSystemManagers();
      const target = managers.find(m => m.id === id);
      if (!target) {
        return res.status(404).json({ error: "مدیر مورد نظر یافت نشد." });
      }

      target.passwordHash = hashPassword(newPassword.trim());
      await saveSystemManagers(managers);

      await recordActivityLog({
        userId: uid,
        action: "manager_password_reset",
        title: "تغییر کلمه عبور مدیر توسط مدیر ارشد",
        description: `کلمه عبور مدیر ${target.name} (${target.username}) بازنشانی شد.`,
        performedBy: "admin"
      });

      return res.json({
        success: true,
        message: `کلمه عبور جدید برای مدیر «${target.name}» با موفقیت تنظیم شد.`
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "خطا در تنظیم کلمه عبور مدیر" });
    }
  });

  // 6. Delete Appointed Manager
  app.delete("/api/admin/managers/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email;
      if (!uid || !(await getIsAdmin(uid, email))) {
        return res.status(403).json({ error: "سطح دسترسی ناکافی" });
      }

      const { id } = req.params;
      const managers = await getSystemManagers();
      const target = managers.find(m => m.id === id);
      if (!target) {
        return res.status(404).json({ error: "مدیر مورد نظر یافت نشد." });
      }

      const updatedList = managers.filter(m => m.id !== id);
      await saveSystemManagers(updatedList);

      userMemoryStore.delete(target.username);
      if (target.email) userMemoryStore.delete(target.email);

      await recordActivityLog({
        userId: uid,
        action: "manager_deleted",
        title: "حذف مدیر از سامانه",
        description: `دسترسی مدیریتی ${target.name} (${target.username}) به طور کامل حذف شد.`,
        performedBy: "admin"
      });

      return res.json({
        success: true,
        message: `دسترسی مدیریتی «${target.name}» با موفقیت حذف گردید.`
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "خطا در حذف مدیر" });
    }
  });

  // Current Admin Permissions Endpoint (Returns live role & permissions assigned by Super Admin)
  app.get("/api/admin/my-permissions", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid || "";
      const email = req.user?.email || "";
      const adminInfo = await getAdminInfo(uid, email);

      if (!adminInfo.isAdmin) {
        return res.status(403).json({ 
          error: "دسترسی مدیریت برای این حساب کاربری تعریف نشده است.",
          isAdmin: false,
          isSuperAdmin: false,
          permissions: []
        });
      }

      return res.json({
        isAdmin: true,
        isSuperAdmin: adminInfo.isSuperAdmin,
        role: adminInfo.role,
        name: adminInfo.name,
        permissions: adminInfo.permissions
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "خطا در بررسی دسترسی‌های مدیریت" });
    }
  });

  // Dedicated Admin Logout Endpoint
  app.post("/api/admin/logout", async (req, res) => {
    try {
      res.clearCookie("token", { path: "/" });
      return res.json({ success: true, message: "خروج از پنل مدیریت انجام شد." });
    } catch (err: any) {
      return res.status(500).json({ error: "خطا در خروج" });
    }
  });

  // Custom Reset/Set Password with Email OTP
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email, code, newPassword } = req.body;
      if (!email || !code || !newPassword) {
        return res.status(400).json({ error: "ایمیل، کد تایید و کلمه عبور جدید الزامی هستند." });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "کلمه عبور جدید باید حداقل ۶ کاراکتر باشد." });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const cleanCode = code.trim();

      const verification = await verifyAndRemoveOtp(normalizedEmail, cleanCode);
      if (!verification.valid) {
        return res.status(400).json({ error: verification.error || "کد تایید وارد شده نادرست یا منقضی است." });
      }

      const poolStatus = { status: "sqlite", totalCount: 1 };
      console.log(`[POST /api/auth/reset-password] Executing user lookup for email: ${normalizedEmail} | Database Pool Status: ${JSON.stringify(poolStatus)}`);

      const foundUsers = await db.select().from(users).where(eq(users.email, normalizedEmail));
      console.log(`[POST /api/auth/reset-password] User lookup completed. Found: ${foundUsers.length} record(s)`);

      let userObj;
      const newHash = hashPassword(newPassword);

      if (foundUsers.length > 0) {
        userObj = foundUsers[0];
        await db.update(users).set({
          passwordHash: newHash,
          lastLoginAt: new Date().toISOString()
        }).where(eq(users.uid, userObj.uid));
      } else {
        // Create user if not exists
        const newUid = "usr_pass_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
        const inserted = await db.insert(users).values({
          uid: newUid,
          name: normalizedEmail.split("@")[0],
          phone: "ثبت نشده",
          email: normalizedEmail,
          passwordHash: newHash,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        }).returning();
        userObj = inserted[0];
      }

      const token = signToken({ uid: userObj.uid, email: userObj.email });

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: "/"
      });

      return res.json({
        success: true,
        message: "کلمه عبور با موفقیت بروزرسانی شد.",
        user: {
          uid: userObj.uid,
          name: userObj.name,
          phone: userObj.phone,
          email: userObj.email,
          token: token
        }
      });
    } catch (err: any) {
      const poolStatus = { status: "sqlite", totalCount: 1 };
      logger.error("POST /api/auth/reset-password", err.message || "Reset password failed", err, { 
        body: { email: req.body?.email },
        poolStatus
      });
      return res.status(500).json({ 
        error: err.message || "خطا در تنظیم کلمه عبور", 
        code: "RESET_PASSWORD_ERROR", 
        poolStatus,
        details: err.stack 
      });
    }
  });

  // Custom Logout Endpoint
  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/"
    });
    return res.json({ success: true });
  });

  // Custom password change and definition endpoint
  app.post("/api/auth/change-password", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        return res.status(401).json({ error: "کاربر احراز هویت نشده است." });
      }

      const { oldPassword, newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: "کلمه عبور جدید باید حداقل ۶ کاراکتر باشد." });
      }

      const foundUsers = await db.select().from(users).where(eq(users.uid, uid));
      if (foundUsers.length === 0) {
        return res.status(404).json({ error: "کاربر یافت نشد." });
      }

      const userObj = foundUsers[0];
      const hasPassword = !!userObj.passwordHash;

      if (hasPassword) {
        if (!oldPassword) {
          return res.status(400).json({ error: "وارد کردن کلمه عبور قبلی الزامی است." });
        }
        if (!verifyPassword(oldPassword, userObj.passwordHash)) {
          return res.status(400).json({ error: "کلمه عبور قبلی اشتباه است." });
        }
      }

      const newHash = hashPassword(newPassword);
      await db.update(users).set({ passwordHash: newHash }).where(eq(users.uid, uid));

      return res.json({ success: true, message: "کلمه عبور با موفقیت تنظیم/تغییر یافت." });
    } catch (err: any) {
      console.error("Error in change-password:", err);
      return res.status(500).json({ error: err.message || "خطا در تغییر کلمه عبور" });
    }
  });

  // User Profile Endpoints
  app.get("/api/users/profile/:uid", async (req, res) => {
    try {
      const { uid } = req.params;
      let userObj = null;

      try {
        const result = await db.select().from(users).where(eq(users.uid, uid));
        if (result.length > 0) {
          userObj = result[0];
        }
      } catch (dbErr) {
        console.warn("DB lookup failed for user profile, checking memory:", dbErr);
      }

      if (!userObj) {
        for (const [_, u] of userMemoryStore.entries()) {
          if (u.uid === uid) {
            userObj = u;
            break;
          }
        }
      }

      if (userObj) {
        return res.json({
          uid: userObj.uid,
          name: userObj.name,
          phone: userObj.phone,
          email: userObj.email,
          createdAt: userObj.createdAt,
          hasPassword: !!userObj.passwordHash
        });
      } else {
        return res.json(null);
      }
    } catch (err: any) {
      console.error("Error fetching user profile:", err);
      return res.json(null);
    }
  });

  app.post("/api/users/profile", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { name, phone, email, createdAt } = req.body;
      const profileData = {
        uid,
        name: name || "کاربر گرامی",
        phone: phone || "",
        email: email || req.user?.email || "",
        createdAt: createdAt || new Date().toISOString()
      };

      try {
        const result = await db.insert(users)
          .values(profileData)
          .onConflictDoUpdate({
            target: users.uid,
            set: { name, phone, email }
          })
          .returning();
        if (result.length > 0) {
          profileData.name = result[0].name;
        }
      } catch (dbErr) {
        console.warn("DB save failed for user profile, storing in memory:", dbErr);
      }

      userMemoryStore.set(uid, profileData);
      if (email) userMemoryStore.set(email.toLowerCase(), profileData);
      if (phone) userMemoryStore.set(phone, profileData);

      return res.json(profileData);
    } catch (err: any) {
      console.error("Error saving user profile:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Units Endpoints
  app.get("/api/units", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 9;
      const category = req.query.category as string;
      const search = req.query.search as string;
      
      let allUnits: any[] = [];
      let allReviews: any[] = [];

      try {
        allUnits = await db.select().from(units).where(eq(units.status, 'approved'));
        allReviews = await db.select().from(reviews);
        // Sync retrieved units to memory cache
        allUnits.forEach(u => unitMemoryStore.set(u.id, u));
      } catch (dbErr) {
        console.warn("DB query failed for units, using memory cache:", dbErr);
        allUnits = Array.from(unitMemoryStore.values()).filter(u => u.status === 'approved' || !u.status);
      }

      if (allUnits.length === 0 && unitMemoryStore.size > 0) {
        allUnits = Array.from(unitMemoryStore.values()).filter(u => u.status === 'approved' || !u.status);
      }
      
      let enhancedUnits = allUnits.map(u => {
        const unitReviews = allReviews.filter(r => r.unitId === u.id && r.status === 'approved');
        return {
          ...u,
          reviewCount: u.reviewCount || unitReviews.length,
          averageRating: u.averageRating || (unitReviews.length > 0 ? unitReviews.reduce((acc: number, r: any) => acc + r.rating, 0) / unitReviews.length : 0)
        };
      });
      
      // Filter by category
      if (category) {
        enhancedUnits = enhancedUnits.filter(u => u.category === category);
      }
      
      // Filter by search
      if (search) {
        const q = search.toLowerCase().trim();
        enhancedUnits = enhancedUnits.filter(u => 
          u.name?.toLowerCase().includes(q) ||
          (u.description && u.description.toLowerCase().includes(q)) ||
          (u.address && u.address.toLowerCase().includes(q))
        );
      }
      
      // Sort by createdAt descending
      enhancedUnits.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      
      const total = enhancedUnits.length;
      const totalPages = Math.ceil(total / limit);
      const offset = (page - 1) * limit;
      const data = enhancedUnits.slice(offset, offset + limit);
      
      if (req.query.page || req.query.limit || req.query.category || req.query.search) {
        return res.json({
          data,
          pagination: {
            total,
            page,
            limit,
            totalPages
          }
        });
      }
      
      return res.json(enhancedUnits);
    } catch (err: any) {
      console.error("Error fetching units:", err);
      return res.json(Array.from(unitMemoryStore.values()));
    }
  });

  app.get("/api/admin/units", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!await getIsAdmin(req.user?.uid || "")) {
        return res.status(403).json({ error: "شما دسترسی لازم را ندارید." });
      }
      let allUnits: any[] = [];
      let allReviews: any[] = [];
      let allUsers: any[] = [];
      try {
        allUnits = await db.select().from(units).orderBy(desc(units.createdAt));
        allReviews = await db.select().from(reviews);
        allUsers = await db.select().from(users);
      } catch (dbErr) {
        console.warn("DB query failed for admin units/users:", dbErr);
        allUnits = Array.from(unitMemoryStore.values());
        allUsers = Array.from(userMemoryStore.values());
      }

      // Create a map of users by uid, email, phone for quick and resilient lookup
      const userMap = new Map<string, any>();
      allUsers.forEach(usr => {
        if (usr.uid) userMap.set(usr.uid, usr);
        if (usr.email) userMap.set(usr.email.toLowerCase(), usr);
        if (usr.phone) userMap.set(usr.phone, usr);
      });
      // Also merge in memory store users
      for (const [key, memU] of userMemoryStore.entries()) {
        if (memU && typeof memU === 'object') {
          if (memU.uid && !userMap.has(memU.uid)) userMap.set(memU.uid, memU);
          if (memU.email && !userMap.has(memU.email.toLowerCase())) userMap.set(memU.email.toLowerCase(), memU);
          if (memU.phone && !userMap.has(memU.phone)) userMap.set(memU.phone, memU);
        }
      }

      let enhancedUnits = allUnits.map(u => {
        const unitReviews = allReviews.filter(r => r.unitId === u.id);
        let ownerUser = userMap.get(u.ownerId);
        if (!ownerUser && u.email) {
          ownerUser = userMap.get(u.email.toLowerCase());
        }
        if (!ownerUser && u.phone) {
          ownerUser = userMap.get(u.phone);
        }
        if (!ownerUser && u.mobile1) {
          ownerUser = userMap.get(u.mobile1);
        }

        return {
          ...u,
          ownerUser: ownerUser ? {
            uid: ownerUser.uid,
            name: ownerUser.name,
            phone: ownerUser.phone,
            email: ownerUser.email,
            createdAt: ownerUser.createdAt,
            lastLoginAt: ownerUser.lastLoginAt
          } : null,
          reviewCount: u.reviewCount || unitReviews.length,
          averageRating: u.averageRating || (unitReviews.length > 0 ? unitReviews.reduce((acc: number, r: any) => acc + r.rating, 0) / unitReviews.length : 0)
        };
      });
      return res.json(enhancedUnits);
    } catch (err: any) {
      return res.json(Array.from(unitMemoryStore.values()));
    }
  });

  // Dedicated Admin Endpoint: All registered users (including those without a workshop yet)
  app.get("/api/admin/users", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!await getIsAdmin(req.user?.uid || "", req.user?.email || "")) {
        return res.status(403).json({ error: "شما دسترسی لازم را ندارید." });
      }

      let allDbUsers: any[] = [];
      let allDbUnits: any[] = [];
      try {
        allDbUsers = await db.select().from(users).orderBy(desc(users.createdAt));
        allDbUnits = await db.select().from(units).orderBy(desc(units.createdAt));
      } catch (dbErr) {
        console.warn("DB query failed for admin users/units:", dbErr);
      }

      // Collect all unique users by UID and normalized identifiers
      const userMap = new Map<string, any>();

      // 1. Add users from database
      allDbUsers.forEach(u => {
        if (u.uid) {
          userMap.set(u.uid, {
            uid: u.uid,
            name: u.name || "کاربر گرامی",
            phone: u.phone || "",
            email: u.email || "",
            role: u.role || (u.uid === "usr_direct_admin" || u.email === "manamalat@gmail.com" ? "super_admin" : "user"),
            createdAt: u.createdAt || new Date().toISOString(),
            lastLoginAt: u.lastLoginAt || null,
            isActive: u.isActive !== false
          });
        }
      });

      // 2. Merge users from memory store
      for (const [key, memU] of userMemoryStore.entries()) {
        if (memU && typeof memU === "object" && memU.uid) {
          if (!userMap.has(memU.uid)) {
            userMap.set(memU.uid, {
              uid: memU.uid,
              name: memU.name || "کاربر گرامی",
              phone: memU.phone || (memU.uid.startsWith("usr_otp_") ? key : ""),
              email: memU.email || (key.includes("@") ? key : ""),
              role: memU.role || (memU.isAdmin || memU.uid === "usr_direct_admin" ? "super_admin" : "user"),
              createdAt: memU.createdAt || new Date().toISOString(),
              lastLoginAt: memU.lastLoginAt || null,
              isActive: memU.isActive !== false
            });
          } else {
            const existing = userMap.get(memU.uid);
            if (!existing.phone && memU.phone) existing.phone = memU.phone;
            if (!existing.email && memU.email) existing.email = memU.email;
            if (!existing.lastLoginAt && memU.lastLoginAt) existing.lastLoginAt = memU.lastLoginAt;
          }
        }
      }

      // 3. Gather all units (DB + memory)
      const unitListMap = new Map<string, any>();
      allDbUnits.forEach(un => unitListMap.set(un.id, un));
      for (const [id, memUn] of unitMemoryStore.entries()) {
        if (!unitListMap.has(id)) unitListMap.set(id, memUn);
      }
      const allUnits = Array.from(unitListMap.values());

      // 4. Also synthesize owner placeholder if a unit owner is not yet in userMap
      allUnits.forEach(u => {
        if (u.ownerId && !userMap.has(u.ownerId)) {
          userMap.set(u.ownerId, {
            uid: u.ownerId,
            name: u.name ? `مالک کارگاه ${u.name}` : "کاربر ثبت‌نامی",
            phone: u.mobile1 || u.phone || "",
            email: u.email || "",
            role: "user",
            createdAt: u.createdAt || new Date().toISOString(),
            lastLoginAt: null,
            isActive: true
          });
        }
      });

      // 5. Build enhanced response with units and status
      const registeredUsers = Array.from(userMap.values()).map(usr => {
        const usrUnits = allUnits.filter(u => 
          Boolean(u.ownerId && u.ownerId === usr.uid)
        );

        return {
          uid: usr.uid,
          name: usr.name || "کاربر گرامی",
          phone: usr.phone || "",
          email: usr.email || "",
          role: usr.role || (usr.uid === "usr_direct_admin" || usr.email === "manamalat@gmail.com" ? "super_admin" : "user"),
          createdAt: usr.createdAt || new Date().toISOString(),
          lastLoginAt: usr.lastLoginAt || null,
          isActive: usr.isActive !== false,
          hasUnit: usrUnits.length > 0,
          unitCount: usrUnits.length,
          units: usrUnits
        };
      });

      // Sort newest users first
      registeredUsers.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      return res.json(registeredUsers);
    } catch (err: any) {
      console.error("Error fetching admin registered users:", err);
      return res.status(500).json({ error: err.message || "خطا در دریافت لیست کاربران" });
    }
  });

  // Admin delete a user
  app.delete("/api/admin/users/:uid", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!await getIsAdmin(req.user?.uid || "", req.user?.email || "")) {
        return res.status(403).json({ error: "شما دسترسی لازم را ندارید." });
      }

      const { uid } = req.params;
      if (!uid) {
        return res.status(400).json({ error: "شناسه کاربری مشخص نیست." });
      }

      if (uid === "usr_direct_admin" || uid === "admin" || uid === req.user?.uid) {
        return res.status(400).json({ error: "امکان حذف حساب مدیر ارشد جاری وجود ندارد." });
      }

      // Delete from DB
      try {
        await db.delete(users).where(eq(users.uid, uid));
      } catch (e) {
        console.warn("DB user delete notice:", e);
      }

      // Delete from memory
      userMemoryStore.delete(uid);
      for (const [key, u] of userMemoryStore.entries()) {
        if (u && (u.uid === uid || u.id === uid)) {
          userMemoryStore.delete(key);
        }
      }

      return res.json({ success: true, message: "حساب کاربری با موفقیت حذف گردید." });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "خطا در حذف کاربر" });
    }
  });

  app.put("/api/units/:id/status", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!await getIsAdmin(req.user?.uid || "")) {
        return res.status(403).json({ error: "شما دسترسی لازم را ندارید." });
      }
      const { id } = req.params;
      const { status } = req.body;
      let result = null;
      try {
        const resList = await db.update(units).set({ status }).where(eq(units.id, id)).returning();
        if (resList.length > 0) result = resList[0];
      } catch (dbErr) {
        console.warn("DB update failed for unit status, updating in memory:", dbErr);
      }
      const memUnit = unitMemoryStore.get(id);
      if (memUnit) {
        memUnit.status = status;
        unitMemoryStore.set(id, memUnit);
        result = memUnit;
      }

      // Record activity log for status change
      try {
        const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
        const statusTitle = status === "approved" ? "تایید و انتشار کارگاه توسط مدیر" : status === "rejected" ? "رد کارگاه توسط مدیر" : "تغییر وضعیت به در انتظار بررسی";
        await recordActivityLog({
          userId: memUnit?.ownerId || null,
          unitId: id,
          action: "status_changed",
          title: statusTitle,
          description: `وضعیت کارگاه به «${status === "approved" ? "تایید شده" : status === "rejected" ? "رد شده" : "در انتظار تایید"}» تغییر یافت.`,
          ipAddress: String(ip),
          performedBy: "admin"
        });
      } catch (logErr) {}

      return res.json(result || { id, status });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Workshop & User Activity Logs Endpoint (Combined DB logs + Synthesized Timeline)
  app.get("/api/units/:id/activity-logs", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const requesterId = req.user?.uid || "";
      const requesterEmail = req.user?.email || "";
      const isAdminUser = await getIsAdmin(requesterId, requesterEmail);

      // Find unit
      let unit: any = null;
      try {
        const uList = await db.select().from(units).where(eq(units.id, id));
        if (uList.length > 0) unit = uList[0];
      } catch (e) {
        unit = unitMemoryStore.get(id);
      }
      if (!unit) {
        unit = unitMemoryStore.get(id);
      }

      // Check permission: either admin or owner
      if (unit && unit.ownerId && unit.ownerId !== requesterId && !isAdminUser) {
        return res.status(403).json({ error: "عدم دسترسی به لاگ‌های این کارگاه." });
      }

      const unitOwnerId = unit?.ownerId || requesterId;

      // 1. Fetch persistent activity logs from DB safely
      let persistentLogs: any[] = [];
      try {
        if (unitOwnerId) {
          persistentLogs = await db.select().from(activityLogs)
            .where(or(eq(activityLogs.unitId, id), eq(activityLogs.userId, unitOwnerId)))
            .orderBy(desc(activityLogs.createdAt));
        } else {
          persistentLogs = await db.select().from(activityLogs)
            .where(eq(activityLogs.unitId, id))
            .orderBy(desc(activityLogs.createdAt));
        }
      } catch (dbErr) {
        console.warn("DB query for activity logs failed, using memory:", dbErr);
      }

      // Merge memory logs
      for (const [_, log] of activityLogMemoryStore.entries()) {
        if ((log.unitId === id || (unitOwnerId && log.userId === unitOwnerId)) && !persistentLogs.some(p => p.id === log.id)) {
          persistentLogs.push(log);
        }
      }

      // 2. Synthesize chronological timeline from related models (users, unit, products, quotes, reviews)
      const synthesizedEvents: any[] = [];

      // Find owner user
      let ownerUser: any = null;
      if (unitOwnerId) {
        try {
          const usrList = await db.select().from(users).where(eq(users.uid, unitOwnerId));
          if (usrList.length > 0) ownerUser = usrList[0];
        } catch (e) {}
        if (!ownerUser) {
          for (const [_, u] of userMemoryStore.entries()) {
            if (u.uid === unitOwnerId || (unit?.email && u.email === unit.email)) {
              ownerUser = u;
              break;
            }
          }
        }
      }

      // User Registration Event
      if (ownerUser?.createdAt) {
        synthesizedEvents.push({
          id: `synth-user-reg-${unitOwnerId}`,
          userId: unitOwnerId,
          unitId: id,
          action: "user_registered",
          title: "عضویت کاربر در سامانه",
          description: `کاربر «${ownerUser.name || "نامشخص"}» با شماره ${ownerUser.phone || unit?.phone || "همراه"} در سامانه ثبت‌نام کرد.`,
          performedBy: "user",
          createdAt: ownerUser.createdAt
        });
      }

      // User Last Login Event
      if (ownerUser?.lastLoginAt) {
        synthesizedEvents.push({
          id: `synth-user-login-${unitOwnerId}`,
          userId: unitOwnerId,
          unitId: id,
          action: "login",
          title: "ورود به حساب کاربری",
          description: `کاربر «${ownerUser.name || "صاحب کارگاه"}» وارد پنل کاربری شد.`,
          performedBy: "user",
          createdAt: ownerUser.lastLoginAt
        });
      }

      // Unit Creation Event
      if (unit?.createdAt) {
        synthesizedEvents.push({
          id: `synth-unit-created-${id}`,
          userId: unitOwnerId,
          unitId: id,
          action: "unit_created",
          title: "ثبت و ایجاد کارگاه صنعتی",
          description: `واحد صنعتی «${unit.name}» با دسته‌بندی ${unit.category} ثبت شد.`,
          performedBy: "user",
          createdAt: unit.createdAt
        });
      }

      // Unit Last Update Event (if different from created)
      if (unit?.updatedAt && unit.updatedAt !== unit.createdAt) {
        synthesizedEvents.push({
          id: `synth-unit-updated-${id}`,
          userId: unitOwnerId,
          unitId: id,
          action: "unit_updated",
          title: "به‌روزرسانی مشخصات کارگاه",
          description: `اطلاعات تماس، موقعیت نقشه یا توضیحات کارگاه «${unit?.name || ""}» به‌روزرسانی شد.`,
          performedBy: "user",
          createdAt: unit.updatedAt
        });
      }

      // Products Events
      let unitProducts: any[] = [];
      try {
        unitProducts = await db.select().from(products).where(eq(products.unitId, id));
      } catch (e) {
        unitProducts = Array.from(productMemoryStore.values()).filter(p => p.unitId === id);
      }
      unitProducts.forEach((p, idx) => {
        synthesizedEvents.push({
          id: `synth-prod-${p.id || idx}`,
          userId: unit.ownerId,
          unitId: id,
          action: "product_added",
          title: `ثبت محصول: ${p.name}`,
          description: `محصول «${p.name}» ${p.price ? `با قیمت ${p.price} تومان` : ""} به کاتالوگ کارگاه افزوده شد.`,
          performedBy: "user",
          createdAt: p.createdAt || unit.createdAt
        });
      });

      // Reviews Events
      let unitReviews: any[] = [];
      try {
        unitReviews = await db.select().from(reviews).where(eq(reviews.unitId, id));
      } catch (e) {}
      unitReviews.forEach((r, idx) => {
        synthesizedEvents.push({
          id: `synth-rev-${r.id || idx}`,
          userId: unit.ownerId,
          unitId: id,
          action: "review_added",
          title: `ثبت دیدگاه جدید (${r.rating} ستاره)`,
          description: `کاربر «${r.authorName}» دیدگاهی با متن: «${r.comment.slice(0, 50)}${r.comment.length > 50 ? "..." : ""}» ثبت کرد.`,
          performedBy: "system",
          createdAt: r.createdAt || unit.createdAt
        });
      });

      // Quotes Events
      let unitQuotes: any[] = [];
      try {
        unitQuotes = await db.select().from(quotes).where(eq(quotes.unitId, id));
      } catch (e) {}
      unitQuotes.forEach((q, idx) => {
        synthesizedEvents.push({
          id: `synth-quote-${q.id || idx}`,
          userId: unit.ownerId,
          unitId: id,
          action: "quote_received",
          title: `دریافت استعلام قیمت (تعداد: ${q.quantity})`,
          description: `استعلام از طرف «${q.buyerName}» (${q.buyerPhone}) برای این واحد ثبت گردید.`,
          performedBy: "system",
          createdAt: q.createdAt || unit.createdAt
        });
      });

      // Combine persistent logs with synthesized ones
      const combinedMap = new Map<string, any>();
      persistentLogs.forEach(l => combinedMap.set(l.id, l));
      synthesizedEvents.forEach(s => {
        const hasSimilar = persistentLogs.some(p => p.title === s.title && Math.abs(new Date(p.createdAt).getTime() - new Date(s.createdAt).getTime()) < 5000);
        if (!hasSimilar && !combinedMap.has(s.id)) {
          combinedMap.set(s.id, s);
        }
      });

      const allLogs = Array.from(combinedMap.values()).sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      return res.json({
        unitId: id,
        ownerId: unit.ownerId,
        totalLogs: allLogs.length,
        logs: allLogs
      });
    } catch (err: any) {
      console.error("Error fetching activity logs:", err);
      return res.status(500).json({ error: err.message || "خطا در دریافت لاگ‌ها" });
    }
  });

  // Admin Add Custom Audit Note / Activity Log
  app.post("/api/units/:id/activity-logs", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const requesterId = req.user?.uid || "";
      const isAdminUser = await getIsAdmin(requesterId);
      if (!isAdminUser) {
        return res.status(403).json({ error: "فقط مدیر ارشد مجاز به ثبت یادداشت و لاگ نظارتی است." });
      }

      const { title, description, action = "admin_note" } = req.body;
      if (!title) {
        return res.status(400).json({ error: "عنوان رویداد یا یادداشت الزامی است." });
      }

      let ownerId = null;
      try {
        const unitRes = await db.select().from(units).where(eq(units.id, id));
        if (unitRes.length > 0) ownerId = unitRes[0].ownerId;
      } catch (e) {
        const memU = unitMemoryStore.get(id);
        if (memU) ownerId = memU.ownerId;
      }

      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
      const userAgent = req.headers["user-agent"] || "";

      const createdLog = await recordActivityLog({
        userId: ownerId,
        unitId: id,
        action: action,
        title: title,
        description: description || null,
        ipAddress: String(ip),
        userAgent: String(userAgent).slice(0, 150),
        performedBy: "admin"
      });

      return res.json({
        success: true,
        message: "یادداشت نظارتی و لاگ فعالیت با موفقیت ثبت شد.",
        log: createdLog
      });
    } catch (err: any) {
      console.error("Error adding activity log:", err);
      return res.status(500).json({ error: err.message || "خطا در ثبت لاگ" });
    }
  });

  // Delete an Activity Log
  app.delete("/api/admin/activity-logs/:logId", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { logId } = req.params;
      const requesterId = req.user?.uid || "";
      if (!await getIsAdmin(requesterId)) {
        return res.status(403).json({ error: "سطح دسترسی ناکافی." });
      }

      activityLogMemoryStore.delete(logId);
      try {
        await db.delete(activityLogs).where(eq(activityLogs.id, logId));
      } catch (dbErr) {}

      return res.json({ success: true, message: "لاگ حذف شد." });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/units/owner/:ownerId", async (req, res) => {
    try {
      const { ownerId } = req.params;

      // Administrators and Super Admins do not own personal workshops (only manage & supervise)
      const isAdminUser = await getIsAdmin(ownerId);
      if (isAdminUser || ownerId === "usr_direct_admin" || ownerId === "admin") {
        return res.json(null);
      }

      let unit: any = null;
      try {
        const result = await db.select().from(units).where(eq(units.ownerId, ownerId));
        if (result.length > 0) {
          unit = result[0];
        }
      } catch (dbErr) {
        console.warn("DB query failed for unit by owner, checking memory:", dbErr);
      }

      if (!unit) {
        for (const [_, u] of unitMemoryStore.entries()) {
          if (u.ownerId === ownerId) {
            unit = u;
            break;
          }
        }
      }

      if (unit) {
        return res.json({
          ...unit,
          reviewCount: unit.reviewCount || 0,
          averageRating: unit.averageRating || 0
        });
      } else {
        return res.json(null);
      }
    } catch (err: any) {
      console.error("Error fetching unit by owner:", err);
      return res.json(null);
    }
  });

  app.post("/api/units", requireAuth, async (req: AuthRequest, res) => {
    try {
      const requesterId = req.user!.uid;
      const isAdminUser = await getIsAdmin(requesterId);
      const unitData = req.body;

      const finalOwnerId = (isAdminUser && unitData.ownerId) ? unitData.ownerId : (unitData.ownerId || requesterId);
      const unitId = unitData.id || ("unit-" + Date.now());

      // Check if unit exists
      let existingUnit: any = null;
      try {
        const found = await db.select().from(units).where(eq(units.id, unitId));
        if (found.length > 0) existingUnit = found[0];
      } catch (e) {}
      if (!existingUnit && unitMemoryStore.has(unitId)) {
        existingUnit = unitMemoryStore.get(unitId);
      }

      // Non-admins cannot edit someone else's unit
      if (existingUnit && existingUnit.ownerId !== requesterId && !isAdminUser) {
        return res.status(403).json({ error: "شما مجاز به ویرایش این واحد صنعتی نیستید." });
      }

      // Determine status:
      // If admin: allow setting any status or keep existing
      // If new unit by user: ALWAYS set to 'pending'
      // If updating existing unit by user: preserve current status (pending/approved/rejected)
      let finalStatus = "pending";
      if (isAdminUser) {
        finalStatus = unitData.status || (existingUnit ? existingUnit.status : "approved");
      } else {
        if (existingUnit) {
          finalStatus = existingUnit.status || "pending";
        } else {
          finalStatus = "pending";
        }
      }
      
      const cleanedData = {
        id: unitId,
        ownerId: finalOwnerId,
        name: unitData.name,
        phone: unitData.phone,
        mobile1: unitData.mobile1 || null,
        mobile2: unitData.mobile2 || null,
        address: unitData.address,
        description: unitData.description,
        category: unitData.category,
        profileImage: unitData.profileImage || existingUnit?.profileImage || "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=800",
        latitude: unitData.latitude !== undefined && unitData.latitude !== null ? Number(unitData.latitude) : null,
        longitude: unitData.longitude !== undefined && unitData.longitude !== null ? Number(unitData.longitude) : null,
        mapUrl: unitData.mapUrl || null,
        seoKeywords: unitData.seoKeywords || null,
        seoDescription: unitData.seoDescription || null,
        email: unitData.email || existingUnit?.email || null,
        website: unitData.website || existingUnit?.website || null,
        status: finalStatus,
        createdAt: existingUnit?.createdAt || unitData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      unitMemoryStore.set(cleanedData.id, cleanedData);

      // Record activity log for unit creation/update
      try {
        const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
        const isNewUnit = !existingUnit;
        await recordActivityLog({
          userId: finalOwnerId,
          unitId: cleanedData.id,
          action: isNewUnit ? "unit_created" : "unit_updated",
          title: isNewUnit ? "ثبت و ایجاد کارگاه صنعتی (در انتظار تایید مدیر)" : "ویرایش و به‌روزرسانی مشخصات کارگاه",
          description: isNewUnit 
            ? `واحد صنعتی «${cleanedData.name}» ثبت گردید و در انتظار تایید مدیریت قرار گرفت.`
            : `مشخصات کارگاه «${cleanedData.name}» به‌روزرسانی شد.`,
          ipAddress: String(ip),
          performedBy: isAdminUser ? "admin" : "user"
        });
      } catch (logErr) {}

      try {
        const result = await db.insert(units)
          .values(cleanedData)
          .onConflictDoUpdate({
            target: units.id,
            set: cleanedData
          })
          .returning();
        if (result.length > 0) {
          return res.json(result[0]);
        }
      } catch (dbErr) {
        console.warn("DB save for unit failed, using memory cache:", dbErr);
      }

      return res.json(cleanedData);
    } catch (err: any) {
      console.error("Error saving unit:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/units/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const requesterId = req.user!.uid;
      const isAdminUser = await getIsAdmin(requesterId);

      // Verify unit exists and permission
      let existingUnit: any = null;
      try {
        const found = await db.select().from(units).where(eq(units.id, id));
        if (found.length > 0) existingUnit = found[0];
      } catch (e) {}
      if (!existingUnit && unitMemoryStore.has(id)) {
        existingUnit = unitMemoryStore.get(id);
      }

      if (existingUnit && existingUnit.ownerId !== requesterId && !isAdminUser) {
        return res.status(403).json({ error: "شما دسترسی مجاز برای حذف این کارگاه را ندارید." });
      }

      const unitName = existingUnit?.name || id;

      // 1. Delete from memory caches
      unitMemoryStore.delete(id);

      // Remove unit products from memory
      for (const [pId, prod] of productMemoryStore.entries()) {
        if (prod.unitId === id) {
          productMemoryStore.delete(pId);
        }
      }

      // 2. Cascade delete from all database tables
      try {
        // Find conversations of this unit to clean messages
        const convList = await db.select({ id: conversations.id }).from(conversations).where(eq(conversations.unitId, id));
        for (const conv of convList) {
          await db.delete(messages).where(eq(messages.conversationId, conv.id));
        }
        await db.delete(conversations).where(eq(conversations.unitId, id));
      } catch (e) {
        console.warn("DB delete conversations failed:", e);
      }

      try {
        await db.delete(quotes).where(eq(quotes.unitId, id));
      } catch (e) {
        console.warn("DB delete quotes failed:", e);
      }

      try {
        await db.delete(reviews).where(eq(reviews.unitId, id));
      } catch (e) {
        console.warn("DB delete reviews failed:", e);
      }

      try {
        await db.delete(products).where(eq(products.unitId, id));
      } catch (e) {
        console.warn("DB delete products failed:", e);
      }

      try {
        await db.delete(activityLogs).where(eq(activityLogs.unitId, id));
      } catch (e) {
        console.warn("DB delete activity logs failed:", e);
      }

      try {
        await db.delete(units).where(eq(units.id, id));
      } catch (dbErr) {
        console.warn("DB delete for unit failed:", dbErr);
      }

      // Record admin action in activity logs
      try {
        const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
        await recordActivityLog({
          userId: requesterId,
          unitId: null,
          action: "unit_permanently_deleted",
          title: "حذف کامل و دائم کارگاه صنعتی",
          description: `واحد صنعتی «${unitName}» (شناسه: ${id}) و کلیه داده‌های مرتبط (محصولات، استعلام‌ها، پیام‌ها و لاگ‌ها) به طور کامل از پایگاه داده پاکسازی گردید.`,
          ipAddress: String(ip),
          performedBy: isAdminUser ? "admin" : "user"
        });
      } catch (logErr) {}

      return res.json({ success: true, message: "کارگاه و کلیه اطلاعات مربوطه به طور کامل از دیتابیس حذف گردید." });
    } catch (err: any) {
      console.error("Error deleting unit:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Products Endpoints
  app.get("/api/products", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 12;
      const search = req.query.search as string;
      const unitId = req.query.unitId as string;
      
      let allProducts: any[] = [];
      try {
        allProducts = await db.select().from(products);
        allProducts.forEach(p => productMemoryStore.set(p.id, p));
      } catch (dbErr) {
        console.warn("DB query for products failed, using memory cache:", dbErr);
        allProducts = Array.from(productMemoryStore.values());
      }

      if (allProducts.length === 0 && productMemoryStore.size > 0) {
        allProducts = Array.from(productMemoryStore.values());
      }
      
      // Filter by unitId
      if (unitId) {
        allProducts = allProducts.filter(p => p.unitId === unitId);
      }
      
      // Filter by search
      if (search) {
        const q = search.toLowerCase().trim();
        allProducts = allProducts.filter(p => 
          p.name?.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
        );
      }
      
      // Sort by createdAt descending
      allProducts.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      
      const total = allProducts.length;
      const totalPages = Math.ceil(total / limit);
      const offset = (page - 1) * limit;
      const data = allProducts.slice(offset, offset + limit);
      
      if (req.query.page || req.query.limit || req.query.search || req.query.unitId) {
        return res.json({
          data,
          pagination: {
            total,
            page,
            limit,
            totalPages
          }
        });
      }
      
      return res.json(allProducts);
    } catch (err: any) {
      console.error("Error fetching all products:", err);
      return res.json(Array.from(productMemoryStore.values()));
    }
  });

  app.get("/api/products/unit/:unitId", async (req, res) => {
    try {
      const { unitId } = req.params;
      let result: any[] = [];
      try {
        result = await db.select().from(products).where(eq(products.unitId, unitId));
      } catch (dbErr) {
        console.warn("DB query for unit products failed, using memory:", dbErr);
        result = Array.from(productMemoryStore.values()).filter(p => p.unitId === unitId);
      }
      if (result.length === 0) {
        result = Array.from(productMemoryStore.values()).filter(p => p.unitId === unitId);
      }
      return res.json(result);
    } catch (err: any) {
      console.error("Error fetching products by unit:", err);
      return res.json([]);
    }
  });

  app.post("/api/products", requireAuth, async (req: AuthRequest, res) => {
    try {
      const requesterId = req.user!.uid;
      const isAdminUser = await getIsAdmin(requesterId);
      const productData = req.body;
      const prodId = productData.id || ("prod-" + Date.now());

      // If product already exists, check ownership and parent unit status
      let existing: any[] = [];
      try {
        existing = await db.select().from(products).where(eq(products.id, prodId));
      } catch (e) {}
      if (existing.length === 0 && productMemoryStore.has(prodId)) {
        existing = [productMemoryStore.get(prodId)];
      }

      if (existing.length > 0 && existing[0].ownerId !== requesterId && !isAdminUser) {
        return res.status(403).json({ error: "شما مجاز به ویرایش این محصول نیستید." });
      }

      const targetUnitId = productData.unitId || (existing.length > 0 ? existing[0].unitId : null);
      if (!targetUnitId) {
        return res.status(400).json({ error: "شناسه کارگاه مشخص نشده است." });
      }

      // Check parent unit existence, ownership, and approval status
      let parentUnit: any = null;
      try {
        const found = await db.select().from(units).where(eq(units.id, targetUnitId));
        if (found.length > 0) parentUnit = found[0];
      } catch (e) {}
      if (!parentUnit && unitMemoryStore.has(targetUnitId)) {
        parentUnit = unitMemoryStore.get(targetUnitId);
      }

      if (!parentUnit && !isAdminUser) {
        return res.status(404).json({ error: "واحد صنعتی مورد نظر یافت نشد. لطفاً ابتدا مشخصات کارگاه را ثبت کنید." });
      }

      if (parentUnit && parentUnit.ownerId !== requesterId && !isAdminUser) {
        return res.status(403).json({ error: "شما مجاز به مدیریت محصولات این واحد نیستید." });
      }

      // Critical Rule: Parent unit must be approved before adding or editing products
      if (parentUnit && parentUnit.status !== 'approved' && !isAdminUser) {
        return res.status(403).json({ 
          error: "کارگاه شما هنوز توسط مدیریت تایید نشده است. پس از تایید مدیریت، امکان ثبت و ویرایش محصولات فعال خواهد شد." 
        });
      }

      const finalOwnerId = existing.length > 0 ? existing[0].ownerId : (productData.ownerId || (parentUnit ? parentUnit.ownerId : requesterId));

      const cleanedData = {
        id: prodId,
        unitId: targetUnitId,
        ownerId: finalOwnerId,
        name: productData.name,
        description: productData.description || "",
        image: productData.image || (existing.length > 0 ? existing[0].image : null) || "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=600",
        price: productData.price || null,
        seoKeywords: productData.seoKeywords || null,
        seoDescription: productData.seoDescription || null,
        createdAt: existing.length > 0 ? existing[0].createdAt : (productData.createdAt || new Date().toISOString())
      };

      productMemoryStore.set(prodId, cleanedData);

      try {
        const result = await db.insert(products)
          .values(cleanedData)
          .onConflictDoUpdate({
            target: products.id,
            set: cleanedData
          })
          .returning();
        if (result.length > 0) return res.json(result[0]);
      } catch (dbErr) {
        console.warn("DB insert for product failed, stored in memory:", dbErr);
      }

      return res.json(cleanedData);
    } catch (err: any) {
      console.error("Error saving product:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/products/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const requesterId = req.user!.uid;
      const isAdminUser = await getIsAdmin(requesterId);

      let existing: any[] = [];
      try {
        existing = await db.select().from(products).where(eq(products.id, id));
      } catch (e) {}
      if (existing.length === 0 && productMemoryStore.has(id)) {
        existing = [productMemoryStore.get(id)];
      }

      if (existing.length === 0) {
        return res.status(404).json({ error: "محصول یافت نشد." });
      }
      if (existing[0].ownerId !== requesterId && !isAdminUser) {
        return res.status(403).json({ error: "شما مجاز به حذف این محصول نیستید." });
      }

      productMemoryStore.delete(id);
      try {
        await db.delete(products).where(eq(products.id, id));
      } catch (dbErr) {
        console.warn("DB delete for product failed:", dbErr);
      }

      return res.json({ success: true });
    } catch (err: any) {
      console.error("Error deleting product:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Banners API endpoints
  app.get("/api/banners", async (req, res) => {
    try {
      let result: any[] = [];
      try {
        result = await db.select().from(banners);
        result.forEach(b => bannerMemoryStore.set(b.id, b));
      } catch (dbErr) {
        console.warn("DB query for banners failed, using memory:", dbErr);
        result = Array.from(bannerMemoryStore.values());
      }
      if (result.length === 0 && bannerMemoryStore.size > 0) {
        result = Array.from(bannerMemoryStore.values());
      }

      // Sort by priority (asc, 1 first) then createdAt desc
      result.sort((a, b) => {
        const pA = a.priority ? parseInt(String(a.priority), 10) : 999;
        const pB = b.priority ? parseInt(String(b.priority), 10) : 999;
        if (pA !== pB) return pA - pB;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });

      return res.json(result);
    } catch (err: any) {
      console.error("Error fetching all banners:", err);
      return res.json(Array.from(bannerMemoryStore.values()));
    }
  });

  app.post("/api/banners", requireAuth, async (req: AuthRequest, res) => {
    try {
      const requesterId = req.user!.uid;
      const isAdminUser = await getIsAdmin(requesterId);
      if (!isAdminUser) {
        return res.status(403).json({ error: "شما به عنوان مدیر ارشد مجاز به ویرایش بنرها نیستید." });
      }

      const bannerData = req.body;
      const now = new Date().toISOString();

      let existingBanner: any = null;
      if (bannerData.id) {
        existingBanner = bannerMemoryStore.get(bannerData.id);
        try {
          const bList = await db.select().from(banners).where(eq(banners.id, bannerData.id));
          if (bList.length > 0) existingBanner = bList[0];
        } catch (e) {}
      }

      const cleanedData = {
        id: bannerData.id || `ad_${Date.now()}`,
        companyName: bannerData.companyName || "",
        title: bannerData.title || "",
        subtitle: bannerData.subtitle || "",
        description: bannerData.description || "",
        image: bannerData.image || existingBanner?.image || "",
        logo: bannerData.logo || existingBanner?.logo || "",
        badge: bannerData.badge || "تبلیغات ویژه",
        badgeColor: bannerData.badgeColor || "amber",
        phone: bannerData.phone || "",
        mobile: bannerData.mobile || "",
        linkUrl: bannerData.linkUrl || "",
        linkText: bannerData.linkText || "",
        themeColor: bannerData.themeColor || "dark",
        overlayOpacity: bannerData.overlayOpacity || "medium",
        status: bannerData.status || "active",
        priority: bannerData.priority ? String(bannerData.priority) : "1",
        placement: bannerData.placement || "hero_slider",
        expiresAt: bannerData.expiresAt || "",
        createdAt: bannerData.createdAt || existingBanner?.createdAt || now,
        updatedAt: now,
      };

      bannerMemoryStore.set(cleanedData.id, cleanedData);

      try {
        const result = await db.insert(banners)
          .values(cleanedData)
          .onConflictDoUpdate({
            target: banners.id,
            set: cleanedData
          })
          .returning();
        if (result.length > 0) return res.json(result[0]);
      } catch (dbErr) {
        console.warn("DB insert for banner failed, stored in memory:", dbErr);
      }

      return res.json(cleanedData);
    } catch (err: any) {
      console.error("Error saving banner:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/banners/:id/status", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const requesterId = req.user!.uid;
      const isAdminUser = await getIsAdmin(requesterId);
      if (!isAdminUser) {
        return res.status(403).json({ error: "شما مجاز به تغییر وضعیت این بنر نیستید." });
      }

      const validStatus = status === "inactive" ? "inactive" : "active";
      const now = new Date().toISOString();

      const existingMem = bannerMemoryStore.get(id);
      if (existingMem) {
        existingMem.status = validStatus;
        existingMem.updatedAt = now;
        bannerMemoryStore.set(id, existingMem);
      }

      try {
        await db.update(banners)
          .set({ status: validStatus, updatedAt: now })
          .where(eq(banners.id, id));
      } catch (dbErr) {
        console.warn("DB status update for banner failed:", dbErr);
      }

      return res.json({ success: true, status: validStatus });
    } catch (err: any) {
      console.error("Error updating banner status:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/banners/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const requesterId = req.user!.uid;
      const isAdminUser = await getIsAdmin(requesterId);
      if (!isAdminUser) {
        return res.status(403).json({ error: "شما مجاز به حذف این بنر نیستید." });
      }

      bannerMemoryStore.delete(id);
      try {
        await db.delete(banners).where(eq(banners.id, id));
      } catch (dbErr) {
        console.warn("DB delete for banner failed:", dbErr);
      }

      return res.json({ success: true });
    } catch (err: any) {
      console.error("Error deleting banner:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Classifieds Endpoints (نیازمندی‌ها، استخدام و املاک)
  app.get("/api/classifieds", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 9;
      const type = req.query.type as string; // 'all' | 'job' | 'real_estate' | 'classified'
      const search = req.query.search as string;
      const category = req.query.category as string;
      
      let allClassifieds = await db.select().from(classifieds);
      
      // Filter by type
      if (type && type !== "all") {
        allClassifieds = allClassifieds.filter(c => c.type === type);
      }
      
      // Filter by category
      if (category) {
        allClassifieds = allClassifieds.filter(c => c.category === category);
      }
      
      // Filter by search
      if (search) {
        const q = search.toLowerCase().trim();
        allClassifieds = allClassifieds.filter(c => 
          c.title.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q)) ||
          (c.location && c.location.toLowerCase().includes(q))
        );
      }
      
      // Sort by createdAt descending
      allClassifieds.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      const total = allClassifieds.length;
      const totalPages = Math.ceil(total / limit);
      const offset = (page - 1) * limit;
      const data = allClassifieds.slice(offset, offset + limit);
      
      if (req.query.page || req.query.limit || req.query.type || req.query.search || req.query.category) {
        return res.json({
          data,
          pagination: {
            total,
            page,
            limit,
            totalPages
          }
        });
      }
      
      return res.json(allClassifieds);
    } catch (err: any) {
      console.error("Error fetching classifieds:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/classifieds", requireAuth, async (req: AuthRequest, res) => {
    try {
      const requesterId = req.user!.uid;
      const isAdminUser = await getIsAdmin(requesterId);
      const data = req.body;

      // Check if user has an approved unit if not admin
      if (!isAdminUser) {
        let userUnits: any[] = [];
        try {
          userUnits = await db.select().from(units).where(eq(units.ownerId, requesterId));
        } catch (e) {}
        if (userUnits.length === 0) {
          userUnits = Array.from(unitMemoryStore.values()).filter(u => u.ownerId === requesterId);
        }

        // If user has a registered unit but it's pending/rejected
        if (userUnits.length > 0) {
          const approvedUnit = userUnits.find(u => u.status === 'approved');
          if (!approvedUnit) {
            return res.status(403).json({ 
              error: "کارگاه شما هنوز توسط مدیریت تایید نشده است. امکان ثبت آگهی پس از تایید مدیریت فعال خواهد شد." 
            });
          }
        }
      }

      const existing = data.id ? await db.select().from(classifieds).where(eq(classifieds.id, data.id)) : [];
      if (existing.length > 0 && existing[0].ownerId !== requesterId && !isAdminUser) {
        return res.status(403).json({ error: "شما مجاز به ویرایش این مورد نیستید." });
      }

      const finalOwnerId = existing.length > 0 ? existing[0].ownerId : requesterId;
      const finalId = data.id || `clf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const cleanedData = {
        id: finalId,
        ownerId: finalOwnerId,
        type: data.type, // 'job' | 'real_estate' | 'classified'
        title: data.title,
        description: data.description,
        phone: data.phone,
        price: data.price || null,
        location: data.location || null,
        category: data.category,
        image: (data.image !== undefined && data.image !== "") ? data.image : (existing.length > 0 ? existing[0].image : null),
        createdAt: data.createdAt || (existing.length > 0 ? existing[0].createdAt : new Date().toISOString())
      };

      const result = await db.insert(classifieds)
        .values(cleanedData)
        .onConflictDoUpdate({
          target: classifieds.id,
          set: cleanedData
        })
        .returning();

      return res.json(result[0]);
    } catch (err: any) {
      console.error("Error saving classified:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/classifieds/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const requesterId = req.user!.uid;
      const isAdminUser = await getIsAdmin(requesterId);

      const existing = await db.select().from(classifieds).where(eq(classifieds.id, id));
      if (existing.length === 0) {
        return res.status(404).json({ error: "آگهی مورد نظر یافت نشد." });
      }
      if (existing[0].ownerId !== requesterId && !isAdminUser) {
        return res.status(403).json({ error: "شما مجاز به حذف این مورد نیستید." });
      }

      await db.delete(classifieds).where(eq(classifieds.id, id));
      return res.json({ success: true });
    } catch (err: any) {
      console.error("Error deleting classified:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // REST API routes for chat
  app.post("/api/chat/start", async (req, res) => {
    try {
      const { unitId, guestId, guestName, guestPhone } = req.body;
      
      // Check if conversation already exists
      const existing = await db.select().from(conversations)
        .where(and(eq(conversations.unitId, unitId), eq(conversations.guestId, guestId)));
        
      if (existing.length > 0) {
        return res.json(existing[0]);
      }
      
      const newConv = {
        id: `conv_${Date.now()}_${Math.random().toString(36).substring(2,7)}`,
        unitId,
        guestId,
        guestName,
        guestPhone,
        lastMessageAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      
      await db.insert(conversations).values(newConv);
      return res.json(newConv);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/chat/conversations/guest/:guestId", async (req, res) => {
    try {
      const { guestId } = req.params;
      const results = await db.select().from(conversations).where(eq(conversations.guestId, guestId)).orderBy(desc(conversations.lastMessageAt));
      return res.json(results);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/chat/conversations/unit/:unitId", async (req, res) => {
    try {
      const { unitId } = req.params;
      const results = await db.select().from(conversations).where(eq(conversations.unitId, unitId)).orderBy(desc(conversations.lastMessageAt));
      return res.json(results);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/chat/messages/:conversationId", async (req, res) => {
    try {
      const { conversationId } = req.params;
      const results = await db.select().from(messages).where(eq(messages.conversationId, conversationId));
      return res.json(results);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // REST API routes for reviews
  app.get("/api/units/:id/reviews", async (req, res) => {
    try {
      const { id } = req.params;
      const results = await db.select().from(reviews)
        .where(and(eq(reviews.unitId, id), eq(reviews.status, 'approved')))
        .orderBy(desc(reviews.createdAt));
      return res.json(results);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/units/:id/reviews/all", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const unit = await db.select().from(units).where(eq(units.id, id));
      if (unit.length === 0 || unit[0].ownerId !== req.user?.uid) {
        return res.status(403).json({ error: "عدم دسترسی" });
      }
      
      const results = await db.select().from(reviews)
        .where(eq(reviews.unitId, id))
        .orderBy(desc(reviews.createdAt));
      return res.json(results);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/units/:id/reviews/:reviewId/status", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id, reviewId } = req.params;
      const { status } = req.body; // 'approved' or 'rejected' or 'pending'
      
      const unit = await db.select().from(units).where(eq(units.id, id));
      if (unit.length === 0 || unit[0].ownerId !== req.user?.uid) {
        return res.status(403).json({ error: "عدم دسترسی" });
      }
      
      await db.update(reviews).set({ status }).where(eq(reviews.id, reviewId));
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/units/:id/reviews/:reviewId", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id, reviewId } = req.params;
      
      const unit = await db.select().from(units).where(eq(units.id, id));
      if (unit.length === 0 || unit[0].ownerId !== req.user?.uid) {
        return res.status(403).json({ error: "عدم دسترسی" });
      }
      
      await db.delete(reviews).where(eq(reviews.id, reviewId));
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/units/:id/reviews", async (req, res) => {
    try {
      const { id } = req.params;
      const { authorName, rating, comment } = req.body;
      
      if (!authorName || !rating || !comment) {
        return res.status(400).json({ error: "لطفا تمامی فیلدها را پر کنید." });
      }

      if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: "امتیاز باید بین ۱ تا ۵ باشد." });
      }

      const newReview = {
        id: `rev_${Date.now()}_${Math.random().toString(36).substring(2,7)}`,
        unitId: id,
        authorName,
        rating,
        comment,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      await db.insert(reviews).values(newReview);
      return res.json(newReview);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Catch-all 404 JSON handler for unhandled /api/* endpoints to prevent returning index.html
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: "مسیر API مورد نظر یافت نشد.", path: req.path });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" } // Allows the client to connect
  });

  io.on("connection", (socket) => {
    // Client will join a room based on conversationId
    socket.on("join_conversation", (conversationId) => {
      socket.join(conversationId);
    });

    socket.on("send_message", async (data) => {
      try {
        const { conversationId, sender, content } = data;
        
        // Save to database
        const newMsgId = `msg_${Date.now()}`;
        const newMsg = {
          id: newMsgId,
          conversationId,
          sender,
          content,
          createdAt: new Date().toISOString(),
          isRead: 'false'
        };
        await db.insert(messages).values(newMsg);

        // Update lastMessageAt in conversation
        await db.update(conversations)
          .set({ lastMessageAt: newMsg.createdAt })
          .where(eq(conversations.id, conversationId));

        // Emit to the room
        io.to(conversationId).emit("receive_message", newMsg);
      } catch (err) {
        console.error("Socket error on send_message:", err);
      }
    });

    socket.on("mark_read", async (data) => {
       try {
         const { conversationId, sender } = data;
         if (!conversationId || !sender) return;
         // Mark all messages as read where sender is NOT the current user in a single batch query
         await db.update(messages)
            .set({ isRead: 'true' })
            .where(and(
               eq(messages.conversationId, conversationId),
               eq(messages.isRead, 'false'),
               ne(messages.sender, sender)
            ));
       } catch (err) {
         console.error("Socket error on mark_read", err);
       }
    });
  });



  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Critical: Failed to start server:", err);
});
