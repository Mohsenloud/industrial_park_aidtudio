import React, { useState, useEffect } from "react";
import { 
  X, 
  Sliders, 
  Save, 
  Loader2, 
  Eye, 
  EyeOff, 
  RefreshCw,
  Send,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Search,
  Server,
  KeyRound,
  Phone,
  ShieldCheck,
  MessageSquareCode
} from "lucide-react";
import { motion } from "motion/react";
import toast from "react-hot-toast";

interface SmsSettingsProps {
  isAdmin: boolean;
  onClose: () => void;
}

export default function SmsSettings({ isAdmin, onClose }: SmsSettingsProps) {
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [smsProvider, setSmsProvider] = useState("payamak_service");
  const [smsApiKey, setSmsApiKey] = useState("0ngqpzMRSXGLzIb4yEbJXZJK3Zst1Mv3moP3BLYqGB3yfQmfOf0jNKZiRMDBFzi3vGUdUqKebZ2oYCNg");
  const [smsSender, setSmsSender] = useState("10008585");
  const [smsEndpoint, setSmsEndpoint] = useState("http://in.payamak-service.ir/api/v2/RestWebApi/SendBatchSms");
  const [smsOtpTemplate, setSmsOtpTemplate] = useState("کد ورود شما به سامانه هوشمند شهرک صنعتی: %code%");
  
  const [smsLogsList, setSmsLogsList] = useState<any[]>([]);
  const [smsLogsLoading, setSmsLogsLoading] = useState(false);
  const [savingSms, setSavingSms] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Live Test SMS state
  const [testPhone, setTestPhone] = useState("09123442543");
  const [testMessage, setTestMessage] = useState("");
  const [testingSms, setTestingSms] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);

  // Search & Filter state for logs
  const [searchLog, setSearchLog] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "success" | "error">("all");
  const [clearingLogs, setClearingLogs] = useState(false);

  const getHeaders = () => {
    const savedUser = localStorage.getItem("custom_auth_user");
    let tokenHeaders: Record<string, string> = {};
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      if (parsed) {
        const token = parsed.token;
        if (token) {
          tokenHeaders["Authorization"] = `Bearer ${token}`;
        }
      }
    }
    return tokenHeaders;
  };

  const fetchSmsSettingsAndLogs = async () => {
    if (!isAdmin) return;
    try {
      setSmsLogsLoading(true);
      const headers = getHeaders();

      // Fetch configurations
      const configRes = await fetch("/api/admin/settings", { headers });
      if (configRes.ok) {
        const configs = await configRes.json();
        for (const c of configs) {
          if (c.key === "sms_enabled") setSmsEnabled(c.value === "true");
          if (c.key === "sms_provider") setSmsProvider(c.value);
          if (c.key === "sms_api_key") setSmsApiKey(c.value);
          if (c.key === "sms_sender") setSmsSender(c.value);
          if (c.key === "sms_endpoint") setSmsEndpoint(c.value);
          if (c.key === "sms_otp_template") setSmsOtpTemplate(c.value);
        }
      }

      // Fetch dispatch logs
      const logRes = await fetch("/api/admin/sms-logs", { headers });
      if (logRes.ok) {
        const logs = await logRes.json();
        setSmsLogsList(logs || []);
      }
    } catch (err) {
      console.error("Error fetching SMS settings or logs:", err);
    } finally {
      setSmsLogsLoading(false);
    }
  };

  const handleSaveSmsSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSms(true);
    try {
      const headers = {
        ...getHeaders(),
        "Content-Type": "application/json"
      };

      const configs = [
        { key: "sms_enabled", value: String(smsEnabled) },
        { key: "sms_provider", value: smsProvider },
        { key: "sms_api_key", value: smsApiKey },
        { key: "sms_sender", value: smsSender },
        { key: "sms_endpoint", value: smsEndpoint },
        { key: "sms_otp_template", value: smsOtpTemplate }
      ];

      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers,
        body: JSON.stringify({ configs })
      });

      if (res.ok) {
        toast.success("تنظیمات درگاه پیامک صنعتی با موفقیت به‌روزرسانی شد.");
        fetchSmsSettingsAndLogs();
      } else {
        const err = await res.json();
        toast.error(err.error || "خطا در ذخیره‌سازی تنظیمات پیامک.");
      }
    } catch (err) {
      console.error("Error saving SMS config:", err);
      toast.error("خطا در ذخیره تنظیمات.");
    } finally {
      setSavingSms(false);
    }
  };

  // Live Test SMS trigger
  const handleTestSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim()) {
      toast.error("لطفاً شماره موبایل گیرنده پیامک تست را وارد نمایید.");
      return;
    }
    setTestingSms(true);
    setTestResult(null);
    try {
      const headers = {
        ...getHeaders(),
        "Content-Type": "application/json"
      };

      const res = await fetch("/api/admin/test-sms", {
        method: "POST",
        headers,
        body: JSON.stringify({
          phone: testPhone.trim(),
          testMessage: testMessage.trim() || undefined,
          provider: smsProvider,
          apiKey: smsApiKey,
          sender: smsSender,
          endpoint: smsEndpoint
        })
      });

      const data = await res.json();
      setTestResult(data);

      if (res.ok && data.success) {
        toast.success("سیگنال ارسال پیامک تست با موفقیت به درگاه ارسال شد.");
        fetchSmsSettingsAndLogs();
      } else {
        toast.error(data.statusText || data.error || "خطا در ارسال پیامک تست.");
      }
    } catch (err: any) {
      toast.error("خطای برقراری ارتباط با سرور در حین تست پیامک.");
      setTestResult({ success: false, statusText: err.message });
    } finally {
      setTestingSms(false);
    }
  };

  // Clear all SMS logs
  const handleClearLogs = async () => {
    if (!window.confirm("آیا از پاکسازی تمام تاریخچه لاگ‌های پیامک اطمینان دارید؟")) {
      return;
    }
    setClearingLogs(true);
    try {
      const headers = getHeaders();
      const res = await fetch("/api/admin/sms-logs", {
        method: "DELETE",
        headers
      });
      if (res.ok) {
        toast.success("تاریخچه لاگ‌های پیامک با موفقیت پاکسازی شد.");
        setSmsLogsList([]);
      } else {
        toast.error("خطا در پاکسازی لاگ‌ها.");
      }
    } catch (err) {
      toast.error("خطای شبکه در پاکسازی لاگ‌ها.");
    } finally {
      setClearingLogs(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchSmsSettingsAndLogs();
    }
  }, [isAdmin]);

  // Filter logs based on search and status
  const filteredLogs = smsLogsList.filter((log) => {
    const matchSearch =
      !searchLog.trim() ||
      log.phone?.includes(searchLog.trim()) ||
      log.code?.includes(searchLog.trim()) ||
      log.template?.includes(searchLog.trim()) ||
      log.provider?.includes(searchLog.trim());

    if (!matchSearch) return false;

    if (filterStatus === "success") {
      return log.status?.includes("موفق") || log.status?.includes("ارسال");
    }
    if (filterStatus === "error") {
      return log.status?.includes("خطا") || log.status?.includes("رد") || log.status?.includes("نامعتبر");
    }
    return true;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      className="bg-white rounded-3xl border border-slate-200/80 shadow-xl p-6 sm:p-8 space-y-6 text-right mb-8"
      style={{ direction: "rtl" }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
            <Sliders className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-slate-900">تنظیمات درگاه پیامک صنعتی و لاگ ارسال (SMS Gateway & Logs)</h3>
            <p className="text-xs text-slate-500 font-medium">پیکربندی وب‌سرویس پیامک، مدیریت اعتبار و رصد زنده پیامک‌های ارسالی</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left / Center: Config & Live Test */}
        <div className="lg:col-span-7 space-y-6">
          {/* SMS Config Form */}
          <form onSubmit={handleSaveSmsSettings} className="space-y-5 bg-slate-50/70 p-5 sm:p-6 rounded-3xl border border-slate-200/70">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-indigo-600" />
                <h4 className="text-xs font-black text-slate-800">پیکربندی وب‌سرویس و درگاه پیامک</h4>
              </div>
              
              {/* Enabled / Disabled Toggle Switch */}
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold ${smsEnabled ? "text-emerald-700" : "text-slate-500"}`}>
                  {smsEnabled ? "درگاه فعال" : "درگاه غیرفعال"}
                </span>
                <button
                  type="button"
                  onClick={() => setSmsEnabled(!smsEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    smsEnabled ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      smsEnabled ? "-translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Provider Selection */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                <span>انتخاب سامانه و درگاه پیامکی</span>
                <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-semibold">پشتیبانی از پروتکل‌های استاندارد</span>
              </label>
              <select
                value={smsProvider}
                onChange={(e) => {
                  const val = e.target.value;
                  setSmsProvider(val);
                  if (val === "payamak_service") {
                    setSmsEndpoint("http://in.payamak-service.ir/api/v2/RestWebApi/SendBatchSms");
                  }
                }}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 transition-all cursor-pointer shadow-sm"
              >
                <option value="payamak_service">🌟 سامانه پیامک سرویس (Payamak-Service.ir - RestWebApi SendBatchSms)</option>
                <option value="kavenegar">سامانه کاوه نگار (Kavenegar Webhook / Pattern)</option>
                <option value="farazsms">سامانه فراز اس‌ام‌اس (FarazSMS / IPPanel)</option>
                <option value="melipayamak">سامانه ملی پیامک (Melipayamak)</option>
                <option value="ippanel">سامانه پیامکی IPPanel REST</option>
                <option value="simulator">حالت شبیه‌ساز و لاگ داخلی (Simulator Debug)</option>
              </select>
            </div>

            {/* Dedicated Sender Line Configuration Card */}
            <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-850 text-indigo-950 flex items-center gap-1.5">
                  <Phone className="h-4 w-4 text-indigo-600" />
                  <span>شماره خط فرستنده اختصاصی پیامک (Sender Line Number)</span>
                </label>
                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                  سرشماره ارسالی
                </span>
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="مثال: 10008585 یا 3000505 یا 50004000 یا 021..."
                  value={smsSender}
                  onChange={(e) => setSmsSender(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border-2 border-indigo-200 rounded-xl text-sm font-mono text-left font-black outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all text-slate-900 shadow-sm placeholder:text-slate-400 placeholder:text-xs"
                />
              </div>

              {/* Quick Preset Buttons for Popular Sender Lines */}
              <div className="flex items-center flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] text-slate-500 font-medium ml-1">پیش‌فرض‌های رایج:</span>
                {[
                  { label: "10008585 (سامانه پیش‌فرض)", value: "10008585" },
                  { label: "3000505", value: "3000505" },
                  { label: "2000500", value: "2000500" },
                  { label: "50004000", value: "50004000" },
                  { label: "9000", value: "9000" },
                  { label: "خط خدماتی 021", value: "021" }
                ].map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setSmsSender(preset.value)}
                    className={`px-2 py-0.5 text-[10px] font-mono rounded-lg border transition-all cursor-pointer ${
                      smsSender === preset.value
                        ? "bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* REST API Endpoint URL */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                <span>آدرس وب‌سرویس درگاه (API Endpoint URL)</span>
                <span className="text-[10px] text-slate-400 font-mono">REST URL</span>
              </label>
              <input
                type="text"
                placeholder="http://in.payamak-service.ir/api/v2/RestWebApi/SendBatchSms"
                value={smsEndpoint}
                onChange={(e) => setSmsEndpoint(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-left outline-none focus:border-indigo-500 transition-all font-semibold shadow-sm text-slate-700"
              />
            </div>

            {/* API Key */}
            <div className="space-y-1.5 relative">
              <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                <span>کلید وب‌سرویس / رمز دسترسی API Key</span>
                <span className="text-[10px] text-slate-400 font-mono">Token / Key</span>
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  placeholder="کلید اختصاصی API سامانه پیامکی"
                  value={smsApiKey}
                  onChange={(e) => setSmsApiKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-left outline-none focus:border-indigo-500 transition-all font-semibold pl-10 shadow-sm text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                  title={showApiKey ? "مخفی کردن کلید" : "نمایش کلید"}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* OTP Message Template */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 flex justify-between">
                <span>الگوی متن پیامک تایید هویت و ورود</span>
                <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">متغیر کد: %code%</span>
              </label>
              <textarea
                rows={2}
                value={smsOtpTemplate}
                onChange={(e) => setSmsOtpTemplate(e.target.value)}
                placeholder="کد ورود شما به سامانه هوشمند شهرک صنعتی: %code%"
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 transition-all font-semibold leading-relaxed shadow-sm"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="submit"
                disabled={savingSms}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 shadow-md shadow-indigo-100 disabled:bg-slate-300"
              >
                {savingSms ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>در حال ذخیره تنظیمات...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>ذخیره تنظیمات درگاه پیامک</span>
                  </>
                )}
              </button>

              <span className="text-[11px] text-slate-400 font-medium">ذخیره خودکار در Cloud SQL Database</span>
            </div>
          </form>

          {/* Live Interactive SMS Tester Panel */}
          <div className="p-5 sm:p-6 bg-indigo-950 text-white rounded-3xl shadow-lg border border-indigo-800/60 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-indigo-800/60">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-800 rounded-lg text-indigo-200">
                  <Send className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white">تست زنده ارسال پیامک (Live Dispatch Test)</h4>
                  <p className="text-[10px] text-indigo-300">ارسال پیامک آزمایشی به شماره دلخواه جهت بررسی اتصال و پاسخ وب‌سرویس</p>
                </div>
              </div>
              <span className="text-[10px] font-mono bg-indigo-900 px-2 py-1 rounded text-indigo-200 border border-indigo-700/50">
                {smsProvider}
              </span>
            </div>

            <form onSubmit={handleTestSms} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-6 space-y-1">
                  <label className="text-[10px] font-bold text-indigo-200 flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    <span>شماره همراه گیرنده تست:</span>
                  </label>
                  <input
                    type="text"
                    placeholder="09123442543"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-indigo-900/80 border border-indigo-700/70 rounded-xl text-xs font-mono text-right text-white outline-none focus:border-indigo-400 placeholder:text-indigo-400/60"
                  />
                </div>
                <div className="sm:col-span-6 space-y-1">
                  <label className="text-[10px] font-bold text-indigo-200 flex items-center gap-1">
                    <MessageSquareCode className="h-3 w-3" />
                    <span>متن پیام آزمایشی (اختیاری):</span>
                  </label>
                  <input
                    type="text"
                    placeholder="تست اتصال درگاه پیامک صنعتی"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    className="w-full px-3 py-2 bg-indigo-900/80 border border-indigo-700/70 rounded-xl text-xs text-right text-white outline-none focus:border-indigo-400 placeholder:text-indigo-400/60"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="submit"
                  disabled={testingSms}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 shadow-md disabled:bg-slate-600"
                >
                  {testingSms ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>در حال ارسال پیامک تست...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>ارسال پیامک تست اکنون</span>
                    </>
                  )}
                </button>
                <span className="text-[10px] text-indigo-300 font-mono">
                  خط: {smsSender || "10008585"}
                </span>
              </div>
            </form>

            {/* Test result display */}
            {testResult && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-2xl border text-xs font-semibold flex flex-col gap-2.5 ${
                  testResult.success
                    ? "bg-emerald-950/80 border-emerald-500/60 text-emerald-200"
                    : "bg-rose-950/80 border-rose-500/60 text-rose-200"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {testResult.success ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p className="font-bold text-sm leading-snug">نتیجه تست: {testResult.statusText || (testResult.success ? "ارسال موفق" : "خطا")}</p>
                    {testResult.code && <p className="text-[11px] font-mono text-indigo-200">کد آزمایشی ارسالی: {testResult.code}</p>}
                  </div>
                </div>

                {!testResult.success && testResult.statusText?.includes("۴۰۳") && (
                  <div className="mt-2 p-3 bg-rose-900/60 border border-rose-700/50 rounded-xl text-[11px] text-rose-100 font-normal leading-relaxed space-y-2">
                    <p className="font-bold text-amber-300">💡 راهنمای رفع خطای ۴۰۳ ابر آروان (ArvanCloud):</p>
                    <ul className="list-disc list-inside space-y-1 text-slate-200">
                      <li><strong>علت:</strong> وب‌سرویس پیامک‌سرویس روی شبکه توزیع ابر آروان قرار دارد و ترافیک IPهای خارج از ایران (سرورهای Google Cloud) را مسدود کرده است.</li>
                      <li><strong>راه‌حل اول (توصیه شده):</strong> از پشتیبانی سامانه پیامک بخواهید محدودیت جغرافیایی (Geo-Blocking) روی API شما را غیرفعال کرده یا آدرس وب‌سرویس بدون محدودیت به شما ارائه دهند.</li>
                      <li><strong>راه‌حل دوم:</strong> در محیط استقرار روی هاست/سرور داخل کشور، به دلیل قرارگیری در شبکه ملی اطلاعات، پیامک‌ها بدون خطا ارسال می‌شوند.</li>
                      <li><strong>راه‌حل سوم:</strong> می‌توانید از سایر سامانه‌های پیامکی بین‌المللی/مستقیم (نظیر کاوه‌نگار، فراز اس‌ام‌اس یا آی‌پی‌پنل) نیز در منوی بالا استفاده فرمایید.</li>
                    </ul>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* Right: Live Logs & Telemetry */}
        <div className="lg:col-span-5 space-y-6">
          {/* Visual Phone Simulator */}
          <div className="p-5 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl shadow-xl border border-indigo-900/50 space-y-4">
            <div className="flex items-center justify-between border-b border-indigo-800/40 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-400" />
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                <div className="h-2 w-2 rounded-full bg-green-400" />
              </div>
              <span className="text-[10px] font-mono text-indigo-300">پیش‌نمایش قالب پیامک</span>
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />
                تاییدیه OTP
              </span>
            </div>

            {/* Bubble */}
            <div className="bg-slate-800/90 border border-indigo-800/60 rounded-2xl p-4 text-right space-y-2 shadow-inner">
              <div className="flex justify-between items-center text-[10px] text-indigo-300 font-semibold">
                <span className="font-mono">از: {smsSender || "10008585"}</span>
                <span>هم‌اکنون</span>
              </div>
              <p className="text-xs text-slate-100 font-bold leading-relaxed whitespace-pre-wrap">
                {smsOtpTemplate.replace("%code%", "۵۸۴۷۲")}
              </p>
            </div>

            {/* Footer telemetry */}
            <div className="flex justify-between items-center text-[10px] text-indigo-300 pt-1">
              <span className="font-mono truncate max-w-[170px]" title={smsEndpoint}>
                {smsEndpoint.split("//")[1] || smsEndpoint}
              </span>
              <span className="flex items-center gap-1.5 font-bold">
                <span className={`h-2 w-2 rounded-full ${smsEnabled ? "bg-emerald-400" : "bg-rose-400 animate-pulse"}`} />
                {smsEnabled ? "سیستم پیامک فعال" : "درگاه متوقف"}
              </span>
            </div>
          </div>

          {/* SMS Dispatch Logs Table / List */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MessageSquareCode className="h-4 w-4 text-indigo-600" />
                <h4 className="text-xs font-black text-slate-900">لاگ و تاریخچه پیامک‌ها</h4>
                <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-mono">
                  {smsLogsList.length}
                </span>
              </div>
              
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={fetchSmsSettingsAndLogs}
                  disabled={smsLogsLoading}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors flex items-center justify-center cursor-pointer"
                  title="به‌روزرسانی لاگ‌ها"
                >
                  <RefreshCw className={`h-4 w-4 ${smsLogsLoading ? "animate-spin text-indigo-600" : ""}`} />
                </button>
                {smsLogsList.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearLogs}
                    disabled={clearingLogs}
                    className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors flex items-center justify-center cursor-pointer"
                    title="پاکسازی تمام لاگ‌ها"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter and search bar */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="جستجو در شماره، کد یا پیام..."
                  value={searchLog}
                  onChange={(e) => setSearchLog(e.target.value)}
                  className="w-full pr-8 pl-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] outline-none focus:border-indigo-500 font-semibold"
                />
              </div>
              
              <div className="flex items-center gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => setFilterStatus("all")}
                  className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                    filterStatus === "all" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  همه ({smsLogsList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus("success")}
                  className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                    filterStatus === "success" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}
                >
                  ارسال موفق
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus("error")}
                  className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                    filterStatus === "error" ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                  }`}
                >
                  ناموفق / خطا
                </button>
              </div>
            </div>

            {/* List */}
            {smsLogsLoading && smsLogsList.length === 0 ? (
              <div className="flex justify-center items-center py-8 text-slate-400 text-xs">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-600 ml-2" />
                <span>در حال فراخوانی لاگ‌ها از سرور...</span>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-xs text-slate-400 font-bold">هیچ لاگ پیامی منطبق با جستجو یافت نشد.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {filteredLogs.map((log, index) => {
                  const isSuccess = log.status?.includes("موفق") || log.status?.includes("ارسال");
                  return (
                    <div
                      key={`sms-log-${log.id || 'entry'}-${index}`}
                      className="p-3 bg-slate-50/80 hover:bg-white border border-slate-200 rounded-2xl flex flex-col gap-2 text-right hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-black text-slate-900">{log.phone}</span>
                          <span className="text-[9px] font-mono bg-slate-200 px-1.5 py-0.5 rounded text-slate-700 font-bold">
                            {log.provider}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          {log.timestamp ? new Date(log.timestamp).toLocaleTimeString("fa-IR") : "اکنون"}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-700 font-medium leading-relaxed bg-white p-2 rounded-xl border border-slate-100">
                        {log.template}
                      </p>

                      <div className="flex items-center justify-between text-[10px] pt-1">
                        <span className="text-[10px] font-bold text-slate-500">
                          کد تولیدی: <span className="font-mono text-indigo-700 font-black">{log.code}</span>
                        </span>
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-black ${
                            isSuccess
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-600 border border-rose-200"
                          }`}
                        >
                          {log.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
