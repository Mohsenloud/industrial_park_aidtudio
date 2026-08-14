import React, { useState, useEffect } from "react";
import { 
  X, 
  Sliders, 
  Save, 
  Loader2, 
  Eye, 
  EyeOff, 
  RefreshCw 
} from "lucide-react";
import { motion } from "motion/react";
import toast from "react-hot-toast";

interface SmsSettingsProps {
  isAdmin: boolean;
  onClose: () => void;
  key?: any;
}

export default function SmsSettings({ isAdmin, onClose }: SmsSettingsProps) {
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [smsProvider, setSmsProvider] = useState("simulator");
  const [smsApiKey, setSmsApiKey] = useState("");
  const [smsSender, setSmsSender] = useState("10008585");
  const [smsOtpTemplate, setSmsOtpTemplate] = useState("کد ورود شما به سامانه شهرک صنعتی: %code%");
  const [smsLogsList, setSmsLogsList] = useState<any[]>([]);
  const [smsLogsLoading, setSmsLogsLoading] = useState(false);
  const [savingSms, setSavingSms] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

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

  useEffect(() => {
    if (isAdmin) {
      fetchSmsSettingsAndLogs();
    }
  }, [isAdmin]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6 text-right mb-8"
      style={{ direction: "rtl" }}
    >
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Sliders className="h-5 w-5 text-indigo-600" />
          <h3 className="font-extrabold text-lg text-slate-800">تنظیمات درگاه ارسال پیامک صنعتی (OTP Gateway)</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* SMS Config Form */}
        <form onSubmit={handleSaveSmsSettings} className="lg:col-span-7 space-y-6">
          {/* Enabled / Disabled Toggle Switch */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-xs font-black text-slate-800">وضعیت درگاه پیامک</label>
              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">فعال یا غیرفعال کردن کل فرآیند ارسال اس‌ام‌اس تایید هویت در کل سامانه</p>
            </div>
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

          {/* Provider Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Provider Selection */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600">انتخاب سامانه پیامکی همکار</label>
              <select
                value={smsProvider}
                onChange={(e) => setSmsProvider(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 transition-all cursor-pointer"
              >
                <option value="simulator">شبیه‌ساز و لاگ توسعه (Simulator)</option>
                <option value="kavenegar">سامانه کاوه نگار (Kavenegar)</option>
                <option value="farazsms">سامانه فراز اس‌ام‌اس (FarazSMS)</option>
                <option value="melipayamak">ملی پیامک (Melipayamak)</option>
                <option value="ippanel">پنل پیامکی IPPanel</option>
              </select>
            </div>

            {/* Sender Number */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600">خط فرستنده اختصاصی (Sender Line)</label>
              <input
                type="text"
                placeholder="مانند: 3000505 یا 10008585"
                value={smsSender}
                onChange={(e) => setSmsSender(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-right outline-none focus:border-indigo-500 transition-all font-semibold"
              />
            </div>

            {/* API Key */}
            <div className="space-y-1.5 sm:col-span-2 relative">
              <label className="text-[11px] font-bold text-slate-600">کلید وب‌سرویس / رمز عبور پنل (API Key / Token)</label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  placeholder="مثل: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                  value={smsApiKey}
                  onChange={(e) => setSmsApiKey(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-right outline-none focus:border-indigo-500 transition-all font-semibold pl-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* OTP Message Template */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[11px] font-bold text-slate-600 flex justify-between">
                <span>الگوی پیامک تایید (Pattern)</span>
                <span className="text-[10px] text-indigo-600 font-semibold">از %code% استفاده کنید</span>
              </label>
              <textarea
                rows={2}
                value={smsOtpTemplate}
                onChange={(e) => setSmsOtpTemplate(e.target.value)}
                placeholder="کد ورود شما به سامانه هوشمند شهرک صنعتی: %code%"
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 transition-all font-semibold leading-relaxed"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={savingSms}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-md disabled:bg-slate-300"
            >
              {savingSms ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>در حال ذخیره...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>ذخیره تغییرات درگاه پیامک</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              انصراف
            </button>
          </div>
        </form>

        {/* SMS Visual Simulator Panel & Logs */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live Preview Simulator */}
          <div className="p-5 bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl shadow-lg relative overflow-hidden space-y-4">
            {/* Phone interface bezel mock */}
            <div className="flex items-center justify-between border-b border-indigo-800/40 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-400" />
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                <div className="h-2 w-2 rounded-full bg-green-400" />
              </div>
              <span className="text-[10px] font-mono text-indigo-200/80">SMS Simulator</span>
              <span className="text-[10px] text-indigo-300 font-bold">پیش‌نمایش آنلاین</span>
            </div>

            {/* Message bubble */}
            <div className="bg-slate-800/80 border border-indigo-800/50 rounded-2xl p-4 text-right space-y-1.5 shadow-inner">
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold">
                <span>فرستنده: {smsSender || "10008585"}</span>
                <span>اکنون</span>
              </div>
              <p className="text-xs text-slate-100 font-bold leading-relaxed whitespace-pre-wrap">
                {smsOtpTemplate.replace("%code%", "۵۷۳۹۱")}
              </p>
            </div>

            {/* Status bar */}
            <div className="flex justify-between items-center text-[9px] text-indigo-300 pt-1">
              <span>سرویس‌دهنده: <span className="font-mono uppercase text-white font-black">{smsProvider}</span></span>
              <span className="flex items-center gap-1 font-bold">
                <span className={`h-1.5 w-1.5 rounded-full ${smsEnabled ? "bg-emerald-400" : "bg-rose-400 animate-pulse"}`} />
                {smsEnabled ? "پخش سیگنال فعال" : "درگاه غیرفعال"}
              </span>
            </div>
          </div>

          {/* Live OTP logs from the backend */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
              <h4 className="text-xs font-black text-slate-800">لاگ زنده ارسال پیامک تایید</h4>
              <button
                type="button"
                onClick={fetchSmsSettingsAndLogs}
                disabled={smsLogsLoading}
                className="p-1 hover:bg-slate-200/60 rounded-lg text-slate-500 transition-colors flex items-center justify-center cursor-pointer"
                title="به‌روزرسانی لیست لاگ‌ها"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${smsLogsLoading ? "animate-spin text-indigo-600" : ""}`} />
              </button>
            </div>

            {smsLogsLoading && smsLogsList.length === 0 ? (
              <div className="flex justify-center items-center py-6 text-slate-400 text-xs">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-600 mr-1.5" />
                <span>در حال دریافت لیست لاگ‌ها...</span>
              </div>
            ) : smsLogsList.length === 0 ? (
              <p className="text-center py-6 text-[10px] text-slate-400 font-bold">هیچ پیامکی اخیراً از سرور ارسال نشده است.</p>
            ) : (
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {smsLogsList.map((log, index) => (
                  <div
                    key={index}
                    className="p-3 bg-white border border-slate-200 rounded-2xl flex flex-col gap-1.5 text-right hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-black text-indigo-950">{log.phone}</span>
                      <span className="text-[9px] font-mono text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString("fa-IR")}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed bg-slate-50 p-2 rounded-xl">
                      {log.template}
                    </p>
                    <div className="flex items-center justify-between text-[10px] pt-1">
                      <span className="text-[9px] font-bold text-slate-400">کد: <span className="font-mono text-slate-700 font-extrabold">{log.code}</span></span>
                      <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-black ${
                        log.status.includes("مسدود")
                          ? "bg-rose-50 text-rose-600 border border-rose-100"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      }`}>
                        {log.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
