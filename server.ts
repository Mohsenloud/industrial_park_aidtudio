import * as dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { createServer as createViteServer } from "vite";
import { db } from "./src/db/index.ts";
import { users, units, products, banners, settings, classifieds, quotes, otps, smsLogs, conversations, messages, reviews } from "./src/db/schema.ts";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { signToken } from "./src/middleware/tokenUtils.ts";
import { eq, or, and, desc } from "drizzle-orm";
import cookieParser from "cookie-parser";
import nodemailer from "nodemailer";
import { createServer } from "http";
import { Server } from "socket.io";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cookieParser());

  // Helper to determine if a user ID is an admin
  async function getIsAdmin(uid: string): Promise<boolean> {
    if (!uid) return false;
    try {
      const userResult = await db.select().from(users).where(eq(users.uid, uid));
      if (userResult.length > 0) {
        const email = userResult[0].email?.toLowerCase() || "";
        const adminEmailEnv = (process.env.ADMIN_EMAIL || "manamalat@gmail.com").toLowerCase();
        return email === "manamalat@gmail.com" || email === adminEmailEnv || email === "admin@industrialpark.ir";
      }
    } catch (e) {
      console.error("Error checking admin status:", e);
    }
    return false;
  }

  // Default banners to seed if database is empty
  const DEFAULT_BANNERS = [
    {
      id: "ad1",
      companyName: "صنایع پلیمر البرز",
      title: "تولید انواع لوله‌های پلی‌اتیلن و اتصالات پی‌وی‌سی",
      description: "بزرگترین تامین‌کننده تخصصی لوله‌های صنعتی و ساختمانی با گارانتی ۱۰ ساله تعویض و بالاترین استانداردهای کیفیت ملی.",
      image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=800",
      badge: "تامین‌کننده طلایی",
      phone: "۰۲۱-۸۸۸۸۸۸۸۸",
      createdAt: new Date().toISOString()
    },
    {
      id: "ad2",
      companyName: "برنا الکترونیک دماوند",
      title: "طراحی و ساخت ترانسفورماتورهای قدرت و تابلو برق صنعتی",
      description: "تولیدکننده نمونه تجهیزات پست برق، تابلوهای فرمان فشار قوی و ضعیف ویژه کارخانجات و کارگاه‌های تولیدی.",
      image: "https://images.unsplash.com/photo-1498084393753-b411b2d26b34?auto=format&fit=crop&q=80&w=800",
      badge: "صنعت هوشمند",
      phone: "۰۲۱-۷۷۷۷۷۷۷۷",
      createdAt: new Date().toISOString()
    },
    {
      id: "ad3",
      companyName: "فولاد آذرخش پایتخت",
      title: "فروش مستقیم تیرآهن، پروفیل و انواع ورق‌های ساختمانی",
      description: "تامین و ارسال مقاطع فولادی سنگین، قوطی، نبشی و ناودانی به سراسر پروژه‌های صنعتی کشور با فاکتور رسمی.",
      image: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&q=80&w=800",
      badge: "فروش ویژه همکار",
      phone: "۰۲۱-۶۶۶۶۶۶۶۶",
      createdAt: new Date().toISOString()
    }
  ];

  async function seedBanners() {
    try {
      const existing = await db.select().from(banners);
      if (existing.length === 0) {
        console.log("Seeding default banners in Cloud SQL...");
        await db.insert(banners).values(DEFAULT_BANNERS);
      }
    } catch (err) {
      console.error("Error seeding banners:", err);
    }
  }

  // Run the seeder
  seedBanners();

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

  // JSON parsing with size limit
  app.use(express.json({ limit: '15mb' }));

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

  // Get all settings (Admin only)
  app.get("/api/admin/settings", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid || !(await getIsAdmin(uid))) {
        return res.status(403).json({ error: "سطح دسترسی ناکافی" });
      }
      const allSettings = await db.select().from(settings);
      return res.json(allSettings);
    } catch (err: any) {
      console.error("Error fetching settings:", err);
      return res.status(500).json({ error: err.message });
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
      }

      return res.json({ success: true, message: "تنظیمات با موفقیت ذخیره شدند." });
    } catch (err: any) {
      console.error("Error saving settings:", err);
      return res.status(500).json({ error: err.message });
    }
  });
  
  // Real Email dispatcher helper
  async function sendRealEmail(
    toEmail: string,
    subject: string,
    htmlMessage: string,
    textMessage: string
  ): Promise<{ success: boolean; statusText: string }> {
    try {
      const host = process.env.SMTP_HOST;
      const port = parseInt(process.env.SMTP_PORT || "587");
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;
      const from = process.env.SMTP_FROM || "no-reply@industrialpark.ir";

      if (!host || !user || !pass) {
        console.log(`[Email OTP Simulator (Missing Config)] To: ${toEmail}, Subject: ${subject}\nMessage: ${textMessage}`);
        return { success: false, statusText: "تنظیمات SMTP کامل نیست. ارسال شبیه‌سازی شد." };
      }

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });

      await transporter.sendMail({
        from: `سامانه شهرک صنعتی <${from}>`,
        to: toEmail,
        subject: subject,
        text: textMessage,
        html: htmlMessage,
      });

      console.log(`[Email OTP Dispatched Successfully] To: ${toEmail}`);
      return { success: true, statusText: "ایمیل با موفقیت ارسال شد." };
    } catch (err: any) {
      console.error("Error sending email:", err);
      return { success: false, statusText: err.message || "خطا در ارسال ایمیل" };
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
    templatePattern: string
  ): Promise<{ success: boolean; statusText: string }> {
    try {
      const isPatternMode = !templatePattern.includes("%code%");

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

  // Email OTP Request route
  app.post("/api/auth/send-email-otp", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || email.trim() === "") {
        return res.status(400).json({ error: "وارد کردن ایمیل الزامی است." });
      }

      const cleanEmail = email.trim().toLowerCase();
      // Generate standard 5 digit code
      const code = Math.floor(10000 + Math.random() * 90000).toString();
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiry

      await db.insert(otps)
        .values({ phone: cleanEmail, code, expiresAt })
        .onConflictDoUpdate({
          target: otps.phone,
          set: { code, expiresAt }
        });

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

      const mailResult = await sendRealEmail(cleanEmail, "کد تایید هویت - سامانه شهرک صنعتی", htmlMessage, textMessage);

      return res.json({
        success: true,
        message: mailResult.success ? "کد تایید با موفقیت به ایمیل شما ارسال شد." : "ارسال ایمیل شبیه‌سازی شد.",
        codeSimulated: !process.env.SMTP_HOST ? code : undefined
      });
    } catch (err: any) {
      console.error("Error in send-email-otp:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // OTP Request route
  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const { phone } = req.body;
      if (!phone || phone.trim() === "") {
        return res.status(400).json({ error: "وارد کردن شماره همراه الزامی است." });
      }

      const cleanPhone = phone.trim();
      // Generate standard 5 digit code
      const code = Math.floor(10000 + Math.random() * 90000).toString();
      const expiresAt = Date.now() + 2 * 60 * 1000; // 2 minutes expiry

      await db.insert(otps)
        .values({ phone: cleanPhone, code, expiresAt })
        .onConflictDoUpdate({
          target: otps.phone,
          set: { code, expiresAt }
        });

      // Fetch SMS settings from DB or defaults
      let isEnabled = true;
      let provider = "simulator";
      let apiKey = "";
      let sender = "10008585";
      let templatePattern = "کد ورود شما به سامانه شهرک صنعتی: %code%";

      try {
        const dbSettings = await db.select().from(settings);
        for (const s of dbSettings) {
          if (s.key === "sms_enabled") isEnabled = s.value === "true";
          if (s.key === "sms_provider") provider = s.value;
          if (s.key === "sms_api_key") apiKey = s.value;
          if (s.key === "sms_sender") sender = s.value;
          if (s.key === "sms_otp_template") templatePattern = s.value;
        }
      } catch (dbErr) {
        console.error("Error reading SMS settings from DB:", dbErr);
      }

      const formattedMessage = templatePattern.replace("%code%", code);
      let logStatus = "شبیه‌سازی موفق";
      let displayMessage = "کد تایید ۵ رقمی از طریق پیامک ارسال شد.";

      if (!isEnabled) {
        logStatus = "مسدود شده (پنل پیامک غیرفعال)";
        displayMessage = "ارسال پیامک موقتاً توسط مدیر ارشد غیرفعال شده است. لطفاً از کد شبیه‌ساز شده استفاده کنید.";
      } else {
        console.log(`[SMS OTP Dispatched] Provider: ${provider}, Sender: ${sender}, Message: "${formattedMessage}" to ${cleanPhone}`);
        if (provider !== "simulator" && apiKey) {
          try {
            const smsResult = await sendRealSMS(provider, apiKey, sender, cleanPhone, formattedMessage, code, templatePattern);
            logStatus = smsResult.statusText;
            if (!smsResult.success) {
              displayMessage = `ارسال پیامک تایید با خطا مواجه شد. از کد شبیه‌ساز استفاده کنید. (${smsResult.statusText})`;
            }
          } catch (smsErr: any) {
            logStatus = `خطای فرستنده: ${smsErr.message}`;
            displayMessage = `خطا در برقراری ارتباط با درگاه پیامک: ${smsErr.message}`;
          }
        } else {
          logStatus = "شبیه‌سازی موفق (توسعه)";
        }
      }

      // Add to database logs
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

      return res.json({
        success: true,
        message: displayMessage,
        codeSimulated: process.env.NODE_ENV !== "production" ? code : undefined, // Only sent in non-production for dev view simulation
        smsEnabled: isEnabled,
        smsProvider: provider
      });
    } catch (err: any) {
      console.error("Error in send-otp:", err);
      return res.status(500).json({ error: err.message });
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

      const records = await db.select().from(otps).where(eq(otps.phone, cleanPhone));
      if (records.length === 0) {
        return res.status(400).json({ error: "کد تاییدی برای این شماره درخواست نشده یا منقضی شده است." });
      }

      const record = records[0];
      if (Date.now() > record.expiresAt) {
        await db.delete(otps).where(eq(otps.phone, cleanPhone));
        return res.status(400).json({ error: "کد تایید منقضی شده است. لطفا دوباره تلاش کنید." });
      }

      if (record.code !== cleanCode) {
        return res.status(400).json({ error: "کد تایید وارد شده نادرست است." });
      }

      // Valid OTP! Remove from store.
      await db.delete(otps).where(eq(otps.phone, cleanPhone));

      // Check if user exists in Drizzle db
      let userResult = await db.select().from(users).where(eq(users.phone, cleanPhone));
      let userObj;

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
      console.error("Error in verify-otp:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Custom password hashing helper using bcryptjs with legacy SHA-256 fallback compatibility
  function hashPassword(password: string): string {
    return bcrypt.hashSync(password, 10);
  }

  function verifyPassword(password: string, hash: string): boolean {
    try {
      if (hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$")) {
        return bcrypt.compareSync(password, hash);
      }
      // Fallback for old SHA-256 hashes
      const legacyHash = crypto.createHash("sha256").update(password).digest("hex");
      return legacyHash === hash;
    } catch (e) {
      return false;
    }
  }

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
      const records = await db.select().from(otps).where(eq(otps.phone, normalizedEmail));
      if (records.length === 0) {
        return res.status(400).json({ error: "کد تاییدی برای این ایمیل درخواست نشده یا منقضی شده است." });
      }

      const record = records[0];
      if (Date.now() > record.expiresAt) {
        await db.delete(otps).where(eq(otps.phone, normalizedEmail));
        return res.status(400).json({ error: "کد تایید منقضی شده است. لطفا دوباره تلاش کنید." });
      }

      if (record.code !== cleanCode) {
        return res.status(400).json({ error: "کد تایید وارد شده نادرست است." });
      }

      // Valid code! Delete from DB
      await db.delete(otps).where(eq(otps.phone, normalizedEmail));

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

          const token = signToken({ uid: existingUser.uid, email: existingUser.email });
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
              uid: existingUser.uid,
              name: name.trim(),
              phone: cleanPhone,
              email: existingUser.email,
              token: token
            }
          });
        }
        return res.status(400).json({ error: "کاربری با این ایمیل قبلاً ثبت نام کرده است." });
      }

      // Check if user already exists by phone
      const existingUsersByPhone = await db.select().from(users).where(eq(users.phone, cleanPhone));
      if (existingUsersByPhone.length > 0) {
        const existingUserByPhone = existingUsersByPhone[0];
        // If the user has no password (e.g. created via OTP), allow them to register (set password and update email)
        if (!existingUserByPhone.passwordHash) {
          const passwordHash = hashPassword(password);
          await db.update(users).set({
            name: name.trim(),
            email: normalizedEmail,
            passwordHash,
            lastLoginAt: new Date().toISOString()
          }).where(eq(users.uid, existingUserByPhone.uid));

          const token = signToken({ uid: existingUserByPhone.uid, email: normalizedEmail });
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
              uid: existingUserByPhone.uid,
              name: name.trim(),
              phone: existingUserByPhone.phone,
              email: normalizedEmail,
              token: token
            }
          });
        }
        return res.status(400).json({ error: "کاربری با این شماره همراه قبلاً ثبت نام کرده است." });
      }

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

      const userObj = inserted[0];
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
      console.error("Error in custom registration:", err);
      return res.status(500).json({ error: err.message || "خطا در ثبت نام" });
    }
  });

  // Custom Email/Password Login Endpoint (handles fallback when Firebase Email Auth is disabled)
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password, code } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "ایمیل و کلمه عبور الزامی هستند." });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const foundUsers = await db.select().from(users).where(eq(users.email, normalizedEmail));
      if (foundUsers.length === 0) {
        return res.status(400).json({ error: "ایمیل یا کلمه عبور اشتباه است." });
      }

      const userObj = foundUsers[0];
      if (!userObj.passwordHash) {
        return res.status(400).json({ error: "این حساب کاربری رمز عبور ندارد. لطفاً با کد یکبار مصرف پیامکی وارد شوید." });
      }

      if (!verifyPassword(password, userObj.passwordHash)) {
        return res.status(400).json({ error: "ایمیل یا کلمه عبور اشتباه است." });
      }

      // Check if OTP is required (last login > 7 days ago or not set)
      let requireOtp = false;
      if (!userObj.lastLoginAt) {
        requireOtp = true;
      } else {
        const lastLoginTime = new Date(userObj.lastLoginAt).getTime();
        const diffDays = (Date.now() - lastLoginTime) / (1000 * 60 * 60 * 24);
        if (diffDays > 7) {
          requireOtp = true;
        }
      }

      if (requireOtp) {
        if (!code) {
          // Send Email OTP
          const otpCode = Math.floor(10000 + Math.random() * 90000).toString();
          const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

          await db.insert(otps)
            .values({ phone: normalizedEmail, code: otpCode, expiresAt })
            .onConflictDoUpdate({
              target: otps.phone,
              set: { code: otpCode, expiresAt }
            });

          const textMessage = `کد تایید ورود شما به سامانه شهرک صنعتی: ${otpCode}`;
          const htmlMessage = `
            <div style="direction: rtl; font-family: Tahoma, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; max-width: 500px; margin: auto; background-color: #f9f9f9;">
              <h2 style="color: #3b82f6; text-align: center;">سامانه شهرک صنعتی</h2>
              <p style="font-size: 16px; color: #333; text-align: center;">با سلام،</p>
              <p style="font-size: 14px; color: #555; text-align: center; line-height: 1.6;">به دلیل عدم ورود به حساب به مدت بیش از ۷ روز، لطفاً با استفاده از کد تایید زیر وارد شوید:</p>
              <div style="text-align: center; margin: 30px 0;">
                <span style="font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #1e3a8a; background-color: #eff6ff; padding: 10px 20px; border-radius: 5px; border: 1px dashed #bfdbfe;">${otpCode}</span>
              </div>
              <p style="font-size: 12px; color: #ef4444; text-align: center;">این کد پس از ۵ دقیقه منقضی خواهد شد.</p>
            </div>
          `;

          await sendRealEmail(normalizedEmail, "کد تایید ورود - سامانه شهرک صنعتی", htmlMessage, textMessage);

          return res.json({
            success: true,
            requireOtp: true,
            message: "به دلیل عدم ورود به مدت بیش از ۷ روز، کد تایید هویت به ایمیل شما ارسال شد.",
            codeSimulated: !process.env.SMTP_HOST ? otpCode : undefined
          });
        } else {
          // Verify code
          const cleanCode = code.trim();
          const records = await db.select().from(otps).where(eq(otps.phone, normalizedEmail));
          if (records.length === 0) {
            return res.status(400).json({ error: "کد تاییدی برای این ایمیل درخواست نشده یا منقضی شده است." });
          }

          const record = records[0];
          if (Date.now() > record.expiresAt) {
            await db.delete(otps).where(eq(otps.phone, normalizedEmail));
            return res.status(400).json({ error: "کد تایید منقضی شده است. لطفا دوباره تلاش کنید." });
          }

          if (record.code !== cleanCode) {
            return res.status(400).json({ error: "کد تایید وارد شده نادرست است." });
          }

          // Valid OTP code, delete it
          await db.delete(otps).where(eq(otps.phone, normalizedEmail));
        }
      }

      // Update last login timestamp
      await db.update(users)
        .set({ lastLoginAt: new Date().toISOString() })
        .where(eq(users.uid, userObj.uid));

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
      console.error("Error in custom login:", err);
      return res.status(500).json({ error: err.message || "خطا در ورود به حساب کاربری" });
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

  // API Upload Route (Stores Base64 images permanently in DB & disk fallback)
  app.post("/api/upload", (req, res) => {
    try {
      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ error: "فایل تصویر ارسال نشده است." });
      }
      if (typeof image === "string" && image.startsWith("data:image/")) {
        try {
          const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const ext = matches[1].split('/')[1] || 'png';
            const buffer = Buffer.from(matches[2], 'base64');
            const uniqueName = `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
            fs.writeFileSync(path.join(uploadDir, uniqueName), buffer);
            return res.json({ url: `/uploads/${uniqueName}` });
          }
        } catch (e) {
          // ignore disk write errors
          console.error("File write error:", e);
        }
        return res.status(500).json({ error: "خطا در ذخیره سازی تصویر" });
      }
      return res.json({ url: image });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: err.message || "خطا در ذخیره‌سازی تصویر" });
    }
  });

  // User Profile Endpoints
  app.get("/api/users/profile/:uid", async (req, res) => {
    try {
      const { uid } = req.params;
      const result = await db.select().from(users).where(eq(users.uid, uid));
      if (result.length > 0) {
        const u = result[0];
        return res.json({
          uid: u.uid,
          name: u.name,
          phone: u.phone,
          email: u.email,
          createdAt: u.createdAt,
          hasPassword: !!u.passwordHash
        });
      } else {
        return res.json(null);
      }
    } catch (err: any) {
      console.error("Error fetching user profile:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/users/profile", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { name, phone, email, createdAt } = req.body;
      const result = await db.insert(users)
        .values({
          uid,
          name,
          phone,
          email,
          createdAt: createdAt || new Date().toISOString()
        })
        .onConflictDoUpdate({
          target: users.uid,
          set: { name, phone, email }
        })
        .returning();
      return res.json(result[0]);
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
      
      let allUnits = await db.select().from(units).where(eq(units.status, 'approved'));
      const allReviews = await db.select().from(reviews);
      
      let enhancedUnits = allUnits.map(u => {
        const unitReviews = allReviews.filter(r => r.unitId === u.id && r.status === 'approved');
        return {
          ...u,
          reviewCount: unitReviews.length,
          averageRating: unitReviews.length > 0 ? unitReviews.reduce((acc, r) => acc + r.rating, 0) / unitReviews.length : 0
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
          u.name.toLowerCase().includes(q) ||
          (u.description && u.description.toLowerCase().includes(q)) ||
          u.address.toLowerCase().includes(q)
        );
      }
      
      // Sort by createdAt descending
      enhancedUnits.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
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
      return res.status(500).json({ error: err.message });
    }
  });

  
  app.get("/api/admin/units", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!await getIsAdmin(req.user?.uid || "")) {
        return res.status(403).json({ error: "شما دسترسی لازم را ندارید." });
      }
      let allUnits = await db.select().from(units).orderBy(desc(units.createdAt));
      const allReviews = await db.select().from(reviews);
      let enhancedUnits = allUnits.map(u => {
        const unitReviews = allReviews.filter(r => r.unitId === u.id);
        return {
          ...u,
          reviewCount: unitReviews.length,
          averageRating: unitReviews.length > 0 ? unitReviews.reduce((acc, r) => acc + r.rating, 0) / unitReviews.length : 0
        };
      });
      return res.json(enhancedUnits);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/units/:id/status", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!await getIsAdmin(req.user?.uid || "")) {
        return res.status(403).json({ error: "شما دسترسی لازم را ندارید." });
      }
      const { id } = req.params;
      const { status } = req.body;
      const result = await db.update(units).set({ status }).where(eq(units.id, id)).returning();
      return res.json(result[0]);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/units/owner/:ownerId", async (req, res) => {
    try {
      const { ownerId } = req.params;
      const result = await db.select().from(units).where(eq(units.ownerId, ownerId));
      if (result.length > 0) {
        const unit = result[0];
        const unitReviews = await db.select().from(reviews).where(and(eq(reviews.unitId, unit.id), eq(reviews.status, 'approved')));
        return res.json({
          ...unit,
          reviewCount: unitReviews.length,
          averageRating: unitReviews.length > 0 ? unitReviews.reduce((acc, r) => acc + r.rating, 0) / unitReviews.length : 0
        });
      } else {
        return res.json(null);
      }
    } catch (err: any) {
      console.error("Error fetching unit by owner:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/units", requireAuth, async (req: AuthRequest, res) => {
    try {
      const requesterId = req.user!.uid;
      const isAdminUser = await getIsAdmin(requesterId);
      const unitData = req.body;

      // Check if unit exists
      const existing = await db.select().from(units).where(eq(units.id, unitData.id));
      if (existing.length > 0 && existing[0].ownerId !== requesterId && !isAdminUser) {
        return res.status(403).json({ error: "شما مجاز به ویرایش این واحد صنعتی نیستید." });
      }

      // Preserve existing ownerId, or use provided, or fallback to requesterId
      const finalOwnerId = existing.length > 0 ? existing[0].ownerId : (unitData.ownerId || requesterId);
      
      const cleanedData = {
        id: unitData.id,
        ownerId: finalOwnerId,
        name: unitData.name,
        phone: unitData.phone,
        mobile1: unitData.mobile1 || null,
        mobile2: unitData.mobile2 || null,
        address: unitData.address,
        description: unitData.description,
        category: unitData.category,
        profileImage: unitData.profileImage,
        latitude: unitData.latitude !== undefined && unitData.latitude !== null ? Number(unitData.latitude) : null,
        longitude: unitData.longitude !== undefined && unitData.longitude !== null ? Number(unitData.longitude) : null,
        mapUrl: unitData.mapUrl || null,
        seoKeywords: unitData.seoKeywords || null,
        seoDescription: unitData.seoDescription || null,
        createdAt: unitData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await db.insert(units)
        .values(cleanedData)
        .onConflictDoUpdate({
          target: units.id,
          set: cleanedData
        })
        .returning();
      return res.json(result[0]);
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

      const existing = await db.select().from(units).where(eq(units.id, id));
      if (existing.length === 0) {
        return res.status(404).json({ error: "واحد صنعتی یافت نشد." });
      }
      if (existing[0].ownerId !== requesterId && !isAdminUser) {
        return res.status(403).json({ error: "شما مجاز به حذف این واحد صنعتی نیستید." });
      }

      // First delete products of this unit
      await db.delete(products).where(eq(products.unitId, id));
      // Then delete the unit
      await db.delete(units).where(eq(units.id, id));

      return res.json({ success: true });
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
      
      let allProducts = await db.select().from(products);
      
      // Filter by unitId
      if (unitId) {
        allProducts = allProducts.filter(p => p.unitId === unitId);
      }
      
      // Filter by search
      if (search) {
        const q = search.toLowerCase().trim();
        allProducts = allProducts.filter(p => 
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
        );
      }
      
      // Sort by createdAt descending
      allProducts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
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
      return res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/products/unit/:unitId", async (req, res) => {
    try {
      const { unitId } = req.params;
      const result = await db.select().from(products).where(eq(products.unitId, unitId));
      return res.json(result);
    } catch (err: any) {
      console.error("Error fetching products by unit:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/products", requireAuth, async (req: AuthRequest, res) => {
    try {
      const requesterId = req.user!.uid;
      const isAdminUser = await getIsAdmin(requesterId);
      const productData = req.body;

      // If product already exists, check ownership
      const existing = await db.select().from(products).where(eq(products.id, productData.id));
      if (existing.length > 0 && existing[0].ownerId !== requesterId && !isAdminUser) {
        return res.status(403).json({ error: "شما مجاز به ویرایش این محصول نیستید." });
      }

      // Check ownership of unitId for new products to prevent unauthorized products creation
      if (existing.length === 0) {
        const parentUnit = await db.select().from(units).where(eq(units.id, productData.unitId));
        if (parentUnit.length === 0) {
          return res.status(404).json({ error: "واحد صنعتی مورد نظر یافت نشد." });
        }
        if (parentUnit[0].ownerId !== requesterId && !isAdminUser) {
          return res.status(403).json({ error: "شما مجاز به افزودن محصول برای این واحد نیستید." });
        }
        if (parentUnit[0].status !== 'approved' && !isAdminUser) {
          return res.status(403).json({ error: "کارگاه شما هنوز تایید نشده است. امکان افزودن محصول وجود ندارد." });
        }
      }

      const finalOwnerId = existing.length > 0 ? existing[0].ownerId : (productData.ownerId || requesterId);

      const cleanedData = {
        id: productData.id,
        unitId: productData.unitId,
        ownerId: finalOwnerId,
        name: productData.name,
        description: productData.description,
        image: productData.image,
        price: productData.price || null,
        seoKeywords: productData.seoKeywords || null,
        seoDescription: productData.seoDescription || null,
        createdAt: productData.createdAt || new Date().toISOString()
      };

      const result = await db.insert(products)
        .values(cleanedData)
        .onConflictDoUpdate({
          target: products.id,
          set: cleanedData
        })
        .returning();
      return res.json(result[0]);
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

      const existing = await db.select().from(products).where(eq(products.id, id));
      if (existing.length === 0) {
        return res.status(404).json({ error: "محصول یافت نشد." });
      }
      if (existing[0].ownerId !== requesterId && !isAdminUser) {
        return res.status(403).json({ error: "شما مجاز به حذف این محصول نیستید." });
      }

      await db.delete(products).where(eq(products.id, id));
      return res.json({ success: true });
    } catch (err: any) {
      console.error("Error deleting product:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Banners API endpoints
  app.get("/api/banners", async (req, res) => {
    try {
      const result = await db.select().from(banners);
      return res.json(result);
    } catch (err: any) {
      console.error("Error fetching all banners:", err);
      return res.status(500).json({ error: err.message });
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
      const cleanedData = {
        id: bannerData.id || `ad_${Date.now()}`,
        companyName: bannerData.companyName,
        title: bannerData.title,
        description: bannerData.description,
        image: bannerData.image,
        badge: bannerData.badge || "تبلیغات ویژه",
        phone: bannerData.phone,
        createdAt: bannerData.createdAt || new Date().toISOString(),
      };

      const result = await db.insert(banners)
        .values(cleanedData)
        .onConflictDoUpdate({
          target: banners.id,
          set: cleanedData
        })
        .returning();
      return res.json(result[0]);
    } catch (err: any) {
      console.error("Error saving banner:", err);
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

      await db.delete(banners).where(eq(banners.id, id));
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
        image: data.image || null,
        createdAt: data.createdAt || new Date().toISOString()
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

  // Quotes Endpoints (استعلام سریع قیمت و مشخصات فنی)
  app.get("/api/quotes/unit/:unitId", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { unitId } = req.params;
      const requesterId = req.user!.uid;
      const isAdminUser = await getIsAdmin(requesterId);

      // Check if unit belongs to this user or if they are admin
      const unitResult = await db.select().from(units).where(eq(units.id, unitId));
      if (unitResult.length === 0) {
        return res.status(404).json({ error: "واحد صنعتی یافت نشد." });
      }
      if (unitResult[0].ownerId !== requesterId && !isAdminUser) {
        return res.status(403).json({ error: "سطح دسترسی ناکافی به استعلام‌های این واحد." });
      }

      const result = await db.select().from(quotes).where(eq(quotes.unitId, unitId));
      return res.json(result);
    } catch (err: any) {
      console.error("Error fetching quotes for unit:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/quotes", async (req, res) => {
    try {
      const data = req.body;
      if (!data.productId || !data.unitId || !data.buyerName || !data.buyerPhone || !data.quantity) {
        return res.status(400).json({ error: "ورود تمامی فیلدهای الزامی برای استعلام الزامی است." });
      }

      const newQuote = {
        id: `qot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        productId: data.productId,
        unitId: data.unitId,
        buyerName: data.buyerName,
        buyerPhone: data.buyerPhone,
        quantity: data.quantity,
        description: data.description || "",
        status: "pending",
        createdAt: new Date().toISOString()
      };

      const result = await db.insert(quotes).values(newQuote).returning();
      return res.json(result[0]);
    } catch (err: any) {
      console.error("Error submitting quote:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/quotes/:id/status", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const requesterId = req.user!.uid;
      const isAdminUser = await getIsAdmin(requesterId);

      const existing = await db.select().from(quotes).where(eq(quotes.id, id));
      if (existing.length === 0) {
        return res.status(404).json({ error: "درخواست استعلام یافت نشد." });
      }

      const unitResult = await db.select().from(units).where(eq(units.id, existing[0].unitId));
      if (unitResult.length === 0) {
        return res.status(404).json({ error: "واحد صنعتی متناظر یافت نشد." });
      }

      if (unitResult[0].ownerId !== requesterId && !isAdminUser) {
        return res.status(403).json({ error: "شما مجاز به تغییر وضعیت این استعلام نیستید." });
      }

      const result = await db.update(quotes)
        .set({ status })
        .where(eq(quotes.id, id))
        .returning();

      return res.json(result[0]);
    } catch (err: any) {
      console.error("Error updating quote status:", err);
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
         // Mark messages as read where sender is NOT the current user
         const msgs = await db.select().from(messages)
            .where(and(eq(messages.conversationId, conversationId), eq(messages.isRead, 'false')));
            
         for (const m of msgs) {
            if (m.sender !== sender) {
               await db.update(messages).set({ isRead: 'true' }).where(eq(messages.id, m.id));
            }
         }
       } catch (err) {
         console.error("Socket error on mark_read", err);
       }
    });
  });



  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
