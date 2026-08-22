import React, { useState, useEffect } from "react";
import { 
  Mail, 
  Save, 
  Loader2, 
  Server, 
  KeyRound, 
  User, 
  AtSign, 
  Eye, 
  EyeOff, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  ShieldCheck, 
  Globe, 
  Sparkles, 
  RefreshCw,
  ExternalLink,
  Inbox,
  Clock,
  Laptop,
  Check,
  Power
} from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "motion/react";

interface EmailSettingsProps {
  onClose?: () => void;
}

interface TestResult {
  success: boolean;
  statusText: string;
  code?: string;
  host?: string;
  port?: number;
  isSimulator?: boolean;
}

const PRESET_PROVIDERS = [
  {
    id: "gmail",
    name: "Gmail / Google Workspace",
    host: "smtp.gmail.com",
    port: "465",
    secure: true,
    desc: "نیاز به رمز عبور برنامه (App Password) ۱۶ رقمی گوگل",
    badge: "بسیار محبوب"
  },
  {
    id: "outlook",
    name: "Microsoft Outlook / Office 365",
    host: "smtp.office365.com",
    port: "587",
    secure: false,
    desc: "پروتکل STARTTLS پورت 587",
    badge: "مایکروسافت"
  },
  {
    id: "yahoo",
    name: "Yahoo Mail",
    host: "smtp.mail.yahoo.com",
    port: "465",
    secure: true,
    desc: "نیاز به App Password یاهو",
    badge: "یاهو"
  },
  {
    id: "cpanel",
    name: "cPanel / DirectAdmin (هاست اختصاصی)",
    host: "mail.yourdomain.ir",
    port: "465",
    secure: true,
    desc: "ایمیل اختصاصی دامنه شهرک با SSL",
    badge: "دامنه اختصاصی"
  },
  {
    id: "liara",
    name: "لیارا / ابر آروان (سرویس‌های ابری ایران)",
    host: "smtp.c1.liara.ir",
    port: "587",
    secure: false,
    desc: "درگاه‌های ابری داخلی پرسرعت",
    badge: "ابری ایران"
  }
];

export default function EmailSettings({ onClose }: EmailSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Email Mode State: "simulator" or "real_smtp"
  const [emailMode, setEmailMode] = useState<"simulator" | "real_smtp">("simulator");
  const [emailEnabled, setEmailEnabled] = useState(true);

  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("no-reply@industrialpark.ir");
  const [smtpFromName, setSmtpFromName] = useState("سامانه جامع شهرک صنعتی");
  const [smtpSecure, setSmtpSecure] = useState(false);
  
  const [showPass, setShowPass] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const getHeaders = () => {
    let headers: Record<string, string> = { "Content-Type": "application/json" };
    const savedUser = localStorage.getItem("custom_auth_user");
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      if (parsed?.token) {
        headers["Authorization"] = `Bearer ${parsed.token}`;
      }
    }
    return headers;
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        const settingsMap: Record<string, string> = {};
        if (Array.isArray(data)) {
          data.forEach((item: any) => {
            settingsMap[item.key] = item.value;
          });
        }

        const mode = settingsMap["email_provider"] || settingsMap["email_mode"] || "simulator";
        setEmailMode(mode === "real_smtp" || mode === "real" ? "real_smtp" : "simulator");

        if (settingsMap["email_enabled"] !== undefined) {
          setEmailEnabled(settingsMap["email_enabled"] !== "false");
        }

        if (settingsMap["smtp_host"]) setSmtpHost(settingsMap["smtp_host"]);
        if (settingsMap["smtp_port"]) {
          setSmtpPort(settingsMap["smtp_port"]);
          setSmtpSecure(settingsMap["smtp_port"] === "465");
        }
        if (settingsMap["smtp_user"]) {
          setSmtpUser(settingsMap["smtp_user"]);
          if (!testEmailAddress) setTestEmailAddress(settingsMap["smtp_user"]);
        }
        if (settingsMap["smtp_pass"]) setSmtpPass(settingsMap["smtp_pass"]);
        if (settingsMap["smtp_from"]) setSmtpFrom(settingsMap["smtp_from"]);
        if (settingsMap["smtp_from_name"]) setSmtpFromName(settingsMap["smtp_from_name"]);
        if (settingsMap["smtp_secure"]) setSmtpSecure(settingsMap["smtp_secure"] === "true");
      }
    } catch (err) {
      console.error("Error fetching email settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleApplyPreset = (preset: typeof PRESET_PROVIDERS[0]) => {
    setSmtpHost(preset.host);
    setSmtpPort(preset.port);
    setSmtpSecure(preset.secure);
    setEmailMode("real_smtp");
    toast.success(`تنظیمات پیش‌فرض «${preset.name}» اعمال شد و حالت ارسال واقعی فعال گردید.`);
  };

  const handlePortChange = (val: string) => {
    setSmtpPort(val);
    if (val === "465") {
      setSmtpSecure(true);
    } else if (val === "587" || val === "25") {
      setSmtpSecure(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        configs: [
          { key: "email_enabled", value: emailEnabled ? "true" : "false" },
          { key: "email_provider", value: emailMode },
          { key: "email_mode", value: emailMode },
          { key: "smtp_host", value: smtpHost.trim() },
          { key: "smtp_port", value: smtpPort.trim() },
          { key: "smtp_user", value: smtpUser.trim() },
          { key: "smtp_pass", value: smtpPass.trim() },
          { key: "smtp_from", value: smtpFrom.trim() },
          { key: "smtp_from_name", value: smtpFromName.trim() },
          { key: "smtp_secure", value: smtpSecure ? "true" : "false" }
        ]
      };

      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        toast.success(
          emailMode === "simulator"
            ? "تنظیمات ذخیره شد: حالت شبیه‌ساز ایمیل فعال است."
            : "تنظیمات ذخیره شد: حالت ارسال واقعی با سرور SMTP فعال است."
        );
      } else {
        const errData = await res.json();
        toast.error(errData.error || "خطا در ذخیره تنظیمات ایمیل.");
      }
    } catch (err) {
      toast.error("خطا در برقراری ارتباط با سرور.");
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async (overrideMode?: "simulator" | "real_smtp") => {
    const activeTestMode = overrideMode || emailMode;

    if (!testEmailAddress || !testEmailAddress.includes("@")) {
      toast.error("لطفاً یک آدرس ایمیل معتبر برای دریافت تست وارد کنید.");
      return;
    }

    if (activeTestMode === "real_smtp" && (!smtpHost || !smtpUser || !smtpPass)) {
      toast.error("برای تست واقعی SMTP، لطفاً ابتدا فیلدهای آدرس سرور (Host)، نام کاربری و رمز عبور را تکمیل نمایید.");
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/admin/test-email", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          provider: activeTestMode,
          toEmail: testEmailAddress.trim(),
          host: smtpHost.trim(),
          port: smtpPort.trim(),
          user: smtpUser.trim(),
          pass: smtpPass.trim(),
          from: smtpFrom.trim(),
          fromName: smtpFromName.trim(),
          secure: smtpSecure
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setTestResult({
          success: true,
          statusText: data.statusText,
          code: data.code,
          host: data.host,
          port: data.port,
          isSimulator: data.isSimulator
        });
        toast.success(
          activeTestMode === "simulator"
            ? `کد آزمایشی شبیه‌ساز با موفقیت تولید شد: ${data.code}`
            : "ایمیل آزمایشی با موفقیت از طریق SMTP ارسال شد!"
        );
      } else {
        setTestResult({
          success: false,
          statusText: data.error || "ارسال ایمیل تستی با خطا مواجه شد."
        });
        toast.error(data.error || "خطا در ارسال ایمیل آزمایشی");
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        statusText: "خطا در برقراری ارتباط با سرور: " + err.message
      });
      toast.error("خطای شبکه در تست درگاه ایمیل");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-56 gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
        <span className="text-xs text-slate-500 font-bold">در حال بارگذاری تنظیمات درگاه ایمیل...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{ direction: "rtl" }}>
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-3 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-xs font-black text-indigo-300">
              <Mail className="h-3.5 w-3.5" />
              <span>پیکربندی درگاه ایمیل و احراز هویت (Email Dispatcher)</span>
            </div>
            {emailMode === "simulator" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 border border-amber-400/40 rounded-full text-xs font-black text-amber-300">
                <Laptop className="h-3.5 w-3.5" />
                حالت شبیه‌ساز (Simulator) فعال است
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-400/40 rounded-full text-xs font-black text-emerald-300">
                <Globe className="h-3.5 w-3.5" />
                ارسال واقعی با سرور SMTP فعال است
              </span>
            )}
          </div>
          <h2 className="text-2xl font-black tracking-tight">تنظیمات ارسال ایمیل‌های تایید و اطلاع‌رسانی</h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            در این بخش می‌توانید انتخاب کنید که کدهای تایید ورود به صورت شبیه‌سازی شده (بدون نیاز به سرور) ارسال شوند یا از طریق اتصال به سرور واقعی SMTP به صندوق ورودی ایمیل کاربران فرستاده شوند.
          </p>
        </div>
        <Mail className="h-48 w-48 text-indigo-500/10 absolute -left-6 -bottom-8 pointer-events-none" />
      </div>

      {/* Mode Selection Cards (Simulator vs Real SMTP) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              حالت نحوه ارسال کدهای تایید به ایمیل (Email Dispatch Mode)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              یک گزینه را جهت تعیین نحوه پردازش کدهای فعال‌سازی انتخاب کنید:
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEmailEnabled(!emailEnabled)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                emailEnabled 
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-slate-100 text-slate-500 border border-slate-200"
              }`}
            >
              <Power className="h-3.5 w-3.5" />
              <span>{emailEnabled ? "درگاه ایمیل: فعال" : "درگاه ایمیل: غیرفعال"}</span>
            </button>
          </div>
        </div>

        {/* 2 Big Mode Option Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Mode 1: Simulator */}
          <div
            onClick={() => setEmailMode("simulator")}
            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between gap-4 ${
              emailMode === "simulator"
                ? "border-amber-500 bg-amber-50/50 shadow-md shadow-amber-100 ring-2 ring-amber-400/30"
                : "border-slate-200 bg-slate-50/40 hover:bg-slate-100/70 hover:border-slate-300"
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${emailMode === "simulator" ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-600"}`}>
                    <Laptop className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">۱. حالت شبیه‌ساز تستی (Simulator Mode)</h4>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">توصیه شده برای تست و توسعه</span>
                  </div>
                </div>
                {emailMode === "simulator" && (
                  <div className="h-6 w-6 rounded-full bg-amber-500 text-white flex items-center justify-center">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pr-10">
                در این حالت نیازی به تنظیمات سرور SMTP و رمز عبور نیست. کدهای ۵ رقمی تایید بلافاصله در پیام اعلان (Toast) و لاگ سیستم نمایش داده می‌شوند.
              </p>
            </div>
            <div className="text-[11px] font-bold text-amber-900 bg-amber-100/80 px-3 py-2 rounded-xl border border-amber-200 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0" />
              <span>بدون قطعی و خطای اینترنت - مناسب آزمایش سریع پنل کاربری</span>
            </div>
          </div>

          {/* Mode 2: Real SMTP */}
          <div
            onClick={() => setEmailMode("real_smtp")}
            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between gap-4 ${
              emailMode === "real_smtp"
                ? "border-indigo-600 bg-indigo-50/50 shadow-md shadow-indigo-100 ring-2 ring-indigo-400/30"
                : "border-slate-200 bg-slate-50/40 hover:bg-slate-100/70 hover:border-slate-300"
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${emailMode === "real_smtp" ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">۲. ارسال واقعی با سرور SMTP (Real Gateway)</h4>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">محیط واقعی و عملیاتی</span>
                  </div>
                </div>
                {emailMode === "real_smtp" && (
                  <div className="h-6 w-6 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pr-10">
                اتصال مستقیم به سرورهای ایمیل (مانند جیمیل، اوت‌لوک، هاست اختصاصی یا لیارا). پیام تایید هویت به صورت رسمی به صندوق ورودی (Inbox) کاربر فرستاده می‌شود.
              </p>
            </div>
            <div className="text-[11px] font-bold text-indigo-950 bg-indigo-100/80 px-3 py-2 rounded-xl border border-indigo-200 flex items-center gap-1.5">
              <Mail className="h-4 w-4 text-indigo-600 shrink-0" />
              <span>ارسال قالب HTML رسمی با نام و عنوان اختصاصی شهرک صنعتی</span>
            </div>
          </div>
        </div>
      </div>

      {/* Preset Buttons for Quick SMTP Setup */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-black text-slate-800">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <span>پیش‌تنظیم‌های آماده درگاه‌های محبوب (Quick Presets)</span>
          </div>
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>{showGuide ? "بستن راهنما" : "راهنمای اتصال Gmail App Password"}</span>
          </button>
        </div>

        {/* Guide Collapsible */}
        <AnimatePresence>
          {showGuide && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl text-amber-950 text-xs leading-relaxed space-y-2">
                <p className="font-bold flex items-center gap-1.5 text-amber-900">
                  <ShieldCheck className="h-4 w-4 text-amber-600" />
                  راهنمای گام‌به‌گام اتصال جیمیل (Gmail / Google Workspace):
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-700 text-[11px]">
                  <li>وارد حساب گوگل خود شده و به بخش <strong>Google Account &gt; Security</strong> بروید.</li>
                  <li>قابلیت <strong>2-Step Verification (تایید دو مرحله‌ای)</strong> را فعال کنید.</li>
                  <li>در همان صفحه، بخش <strong>App Passwords (گذرواژه‌های برنامه)</strong> را جستجو و باز کنید.</li>
                  <li>یک نام مانند <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-300">Industrial Park</span> وارد کرده و دکمه Generate را بزنید.</li>
                  <li>کد ۱۶ رقمی اختصاصی تولیدشده را کپی کرده و در فیلد <strong>رمز عبور (Password)</strong> زیر قرار دهید.</li>
                </ol>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1">
          {PRESET_PROVIDERS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              className={`p-3 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                smtpHost === preset.host
                  ? "bg-indigo-50/90 border-indigo-500 shadow-xs ring-1 ring-indigo-400"
                  : "bg-slate-50/60 border-slate-200 hover:bg-slate-100/80 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-black text-xs text-slate-900">{preset.name.split(" ")[0]}</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-white border border-slate-200 rounded-md text-indigo-700">
                  {preset.badge}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 line-clamp-1">{preset.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Settings Form (7 cols) */}
        <form onSubmit={handleSave} className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <Server className="h-4 w-4 text-indigo-600" />
              مشخصات اتصال سرور SMTP (در صورت انتخاب ارسال واقعی)
            </h3>
            <span className="text-[10px] font-bold text-slate-400">ذخیره در پایگاه داده</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Host */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                <span>آدرس سرور میزبان (SMTP Host)</span>
                <span className="text-[10px] text-slate-400 font-mono">Host / IP</span>
              </label>
              <div className="relative">
                <Server className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="مثال: smtp.gmail.com"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  className="w-full pr-10 pl-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all text-left font-mono font-bold text-slate-800"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Port */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                <span>پورت سرور (Port)</span>
                <span className="text-[10px] text-slate-400 font-mono">465 / 587 / 25</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="587 یا 465"
                  value={smtpPort}
                  onChange={(e) => handlePortChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all text-left font-mono font-bold text-slate-800"
                  dir="ltr"
                />
                <select
                  value={smtpPort}
                  onChange={(e) => handlePortChange(e.target.value)}
                  className="px-2.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="465">SSL (465)</option>
                  <option value="587">TLS (587)</option>
                  <option value="25">Plain (25)</option>
                </select>
              </div>
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                <span>نام کاربری (SMTP Username / Email)</span>
                <span className="text-[10px] text-slate-400 font-mono">User</span>
              </label>
              <div className="relative">
                <User className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="مثال: info@industrialpark.ir"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  className="w-full pr-10 pl-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all text-left font-mono font-bold text-slate-800"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                <span>رمز عبور (App Password / SMTP Password)</span>
                <span className="text-[10px] text-slate-400 font-mono">Password</span>
              </label>
              <div className="relative">
                <KeyRound className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  className="w-full pr-10 pl-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all text-left font-mono font-bold text-slate-800"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Sender Email */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                <span>ایمیل فرستنده (From Address)</span>
                <span className="text-[10px] text-slate-400 font-mono">Sender Email</span>
              </label>
              <div className="relative">
                <AtSign className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="no-reply@industrialpark.ir"
                  value={smtpFrom}
                  onChange={(e) => setSmtpFrom(e.target.value)}
                  className="w-full pr-10 pl-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all text-left font-mono font-bold text-slate-800"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Sender Name */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                <span>نام نمایشی فرستنده (From Display Name)</span>
                <span className="text-[10px] text-slate-400">نام سربرگ</span>
              </label>
              <input
                type="text"
                placeholder="سامانه جامع شهرک صنعتی"
                value={smtpFromName}
                onChange={(e) => setSmtpFromName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all text-right font-bold text-slate-800"
              />
            </div>
          </div>

          {/* Secure SSL Toggle */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-5 w-5 text-indigo-600 shrink-0" />
              <div>
                <p className="text-xs font-black text-slate-800">اتصال رمزنگاری‌شده امن مستقیم (Direct SSL/TLS)</p>
                <p className="text-[10px] text-slate-500">برای پورت 465 فعال باشد، برای پورت 587 (STARTTLS) خودکار مدیریت می‌شود.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={smtpSecure}
                onChange={(e) => setSmtpSecure(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-100 transition-all flex items-center justify-center gap-2 min-w-[170px] cursor-pointer disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{saving ? "در حال ذخیره..." : "ذخیره تنظیمات درگاه ایمیل"}</span>
            </button>
            
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                بستن
              </button>
            )}
          </div>
        </form>

        {/* Live Test & Inbox Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Live Test Dispatcher Box */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl p-5 text-white shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-300">
                  <Send className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black">آزمایش درگاه و دریافت کد تست</h4>
                  <p className="text-[10px] text-slate-300">
                    {emailMode === "simulator" ? "تست فوری با شبیه‌ساز داخلی" : "ارسال واقعی ایمیل به سرور SMTP"}
                  </p>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-white/10 text-white border border-white/10">
                {emailMode === "simulator" ? "شبیه‌ساز" : "SMTP واقعی"}
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-300 block">آدرس ایمیل دریافت‌کننده تست:</label>
              <div className="relative">
                <input
                  type="email"
                  dir="ltr"
                  placeholder="your-email@gmail.com"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs font-mono text-left outline-none focus:border-indigo-400 transition-all text-white font-bold placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleTestEmail("simulator")}
                disabled={testing}
                className="py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs shadow-md shadow-amber-950/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Laptop className="h-3.5 w-3.5" />
                <span>تست شبیه‌ساز</span>
              </button>
              
              <button
                type="button"
                onClick={() => handleTestEmail("real_smtp")}
                disabled={testing}
                className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs shadow-md shadow-indigo-950/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {testing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Globe className="h-3.5 w-3.5" />
                )}
                <span>تست اتصال SMTP</span>
              </button>
            </div>

            {/* Test Result Message */}
            {testResult && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3.5 rounded-2xl border text-xs leading-relaxed space-y-1.5 ${
                  testResult.success
                    ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-200"
                    : "bg-rose-950/80 border-rose-500/50 text-rose-200"
                }`}
              >
                <div className="flex items-start gap-2">
                  {testResult.success ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-bold text-xs">{testResult.statusText}</p>
                    {testResult.code && (
                      <p className="text-[10px] font-mono text-indigo-200 mt-1">
                        کد تایید آزمایشی: <strong className="text-emerald-300 text-xs px-1.5 py-0.5 bg-black/40 rounded border border-emerald-500/30">{testResult.code}</strong>
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Email Template Visual Preview */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-xs font-black text-slate-800">
                <Inbox className="h-4 w-4 text-indigo-600" />
                <span>پیش‌نمایش ظاهر ایمیل در صندوق کاربر</span>
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold">
                قالب رسمی HTML
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden text-xs">
              {/* Fake Email Header */}
              <div className="bg-indigo-900 text-white p-3.5 text-center">
                <p className="font-bold text-xs">{smtpFromName || "سامانه جامع شهرک صنعتی"}</p>
                <p className="text-[10px] text-indigo-200 mt-0.5">کد تایید ورود به حساب کاربری</p>
              </div>

              {/* Fake Body */}
              <div className="p-4 space-y-3 bg-white">
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  با سلام؛ کد تایید ۶ رقمی شما جهت ورود امن به سامانه شهرک صنعتی:
                </p>
                <div className="py-2.5 px-4 bg-indigo-50 border border-indigo-100 rounded-xl text-center">
                  <span className="font-mono text-lg font-black tracking-widest text-indigo-950">582914</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> اعتبار: ۵ دقیقه
                  </span>
                  <span>{smtpFrom || "no-reply@industrialpark.ir"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

