import React, { useState, useEffect } from "react";
import { 
  KeyRound, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Save, 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  Activity, 
  RefreshCw, 
  Unlock, 
  Shield, 
  FileCheck, 
  Zap,
  Clock
} from "lucide-react";
import { motion } from "motion/react";

interface SecurityStats {
  isGuardActive: boolean;
  wafStatus: string;
  totalSecurityEvents: number;
  activeBlockedCount: number;
  activeBlockedIps: Array<{ key: string; remainingSeconds: number }>;
  recentEvents: Array<{
    id: string;
    type: string;
    target: string;
    ip: string;
    details: string;
    timestamp: string;
  }>;
  systemStatus: {
    rateLimiter: string;
    otpProtection: string;
    bruteForceGuard: string;
    magicBytesValidation: string;
    xssFilter: string;
    securityHeaders: string;
  };
}

export default function AdminSecuritySettings() {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Security stats & active blocks
  const [secStats, setSecStats] = useState<SecurityStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [unblockingKey, setUnblockingKey] = useState<string | null>(null);

  const fetchSecurityStats = async () => {
    try {
      setLoadingStats(true);
      let tokenHeaders: Record<string, string> = {};
      const savedUser = localStorage.getItem("custom_auth_user");
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed?.token) {
          tokenHeaders["Authorization"] = `Bearer ${parsed.token}`;
        }
      }

      const res = await fetch("/api/admin/security/stats", {
        headers: tokenHeaders
      });
      if (res.ok) {
        const data = await res.json();
        setSecStats(data);
      }
    } catch (err) {
      console.warn("Failed to fetch security stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchSecurityStats();
    const interval = setInterval(fetchSecurityStats, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleUnblock = async (key: string) => {
    try {
      setUnblockingKey(key);
      let tokenHeaders: Record<string, string> = { "Content-Type": "application/json" };
      const savedUser = localStorage.getItem("custom_auth_user");
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed?.token) {
          tokenHeaders["Authorization"] = `Bearer ${parsed.token}`;
        }
      }

      const res = await fetch("/api/admin/security/unblock", {
        method: "POST",
        headers: tokenHeaders,
        body: JSON.stringify({ key })
      });

      if (res.ok) {
        fetchSecurityStats();
        setStatusMsg({ type: "success", text: `انسداد امنیتی «${key}» لغو گردید.` });
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: "خطا در رفع انسداد" });
    } finally {
      setUnblockingKey(null);
    }
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    if (newPassword && newPassword.length < 6) {
      setStatusMsg({ type: "error", text: "کلمه عبور جدید باید حداقل ۶ کاراکتر باشد." });
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setStatusMsg({ type: "error", text: "تکرار کلمه عبور جدید با کلمه عبور همخوانی ندارد." });
      return;
    }

    if (!username.trim() && !newPassword.trim() && !displayName.trim()) {
      setStatusMsg({ type: "error", text: "حداقل یکی از فیلدهای نام کاربری، نام نمایشی یا کلمه عبور جدید را تکمیل کنید." });
      return;
    }

    try {
      setIsLoading(true);
      let tokenHeaders: Record<string, string> = { "Content-Type": "application/json" };
      const savedUser = localStorage.getItem("custom_auth_user");
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed?.token) {
          tokenHeaders["Authorization"] = `Bearer ${parsed.token}`;
        }
      }

      const res = await fetch("/api/admin/change-credentials", {
        method: "POST",
        headers: tokenHeaders,
        body: JSON.stringify({
          newUsername: username.trim() || undefined,
          newName: displayName.trim() || undefined,
          newPassword: newPassword.trim() || undefined,
          currentPassword: currentPassword.trim() || undefined
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "خطا در به‌روزرسانی اطلاعات مدیریت");
      }

      setStatusMsg({ type: "success", text: data.message || "اطلاعات امنیتی مدیر ارشد با موفقیت به‌روزرسانی شد." });
      
      // Update local storage user display name if changed
      if (displayName.trim() && savedUser) {
        const parsed = JSON.parse(savedUser);
        parsed.name = displayName.trim();
        localStorage.setItem("custom_auth_user", JSON.stringify(parsed));
      }

      // Clear password fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: "error", text: err.message || "خطا در برقراری ارتباط با سرور" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8" dir="rtl">
      {/* Header card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800">امنیت، دیواره آتش و احراز هویت مدیریت</h3>
            <p className="text-xs text-slate-500 mt-1">
              پیکربندی لایه‌های حفاظتی WAF، جلوگیری از حملات Brute-force و تغییر اطلاعات امنیتی مدیر ارشد
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchSecurityStats}
            disabled={loadingStats}
            className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 cursor-pointer transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingStats ? "animate-spin" : ""}`} />
            <span>بروزرسانی وضعیت</span>
          </button>
          <div className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>دیواره آتش فعال (WAF Shield Active)</span>
          </div>
        </div>
      </div>

      {/* Message alert */}
      {statusMsg && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-bold ${
            statusMsg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {statusMsg.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </motion.div>
      )}

      {/* Security Defense Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Layer 1 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">محدودکننده نرخ درخواست (Rate Limit)</h4>
            <p className="text-xs text-slate-500 mt-1">حداکثر ۲۴۰ درخواست در دقیقه برای هر IP جهت پیشگیری از حملات داس و استخراج اطلاعات.</p>
            <span className="inline-block mt-2 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[11px] font-bold">وضعیت: فعال</span>
          </div>
        </div>

        {/* Layer 2 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">حفاظت ضد سیل پیامک (OTP Flood)</h4>
            <p className="text-xs text-slate-500 mt-1">مهلت ۴۵ ثانیه‌ای میان درخواست‌ها و سقف ۴ پیامک در ۱۰ دقیقه جهت صیانت از شارژ پیامکی.</p>
            <span className="inline-block mt-2 px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-[11px] font-bold">وضعیت: فعال</span>
          </div>
        </div>

        {/* Layer 3 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">دفاع ضد حمله Brute-Force</h4>
            <p className="text-xs text-slate-500 mt-1">مسدودسازی خودکار دسترسی به مدت ۱۵ دقیقه در صورت ۵ مرتبه ورود ناموفق ادمین.</p>
            <span className="inline-block mt-2 px-2 py-0.5 bg-rose-50 text-rose-700 rounded text-[11px] font-bold">وضعیت: فعال</span>
          </div>
        </div>

        {/* Layer 4 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <FileCheck className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">اعتبارسنجی باینری تصاویر (Magic Bytes)</h4>
            <p className="text-xs text-slate-500 mt-1">بررسی هدر بایت‌های واقعی JPG/PNG/WebP و جلوگیری از آپلود فایل‌های مخرب و اسکریپت‌ها.</p>
            <span className="inline-block mt-2 px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-[11px] font-bold">وضعیت: فعال</span>
          </div>
        </div>

        {/* Layer 5 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">فیلتر پاکسازی ورودی‌ها (Anti-XSS)</h4>
            <p className="text-xs text-slate-500 mt-1">حذف کدهای اسکریپت، iframe و اتریبیوت‌های ناامن از تمامی فرم‌ها و فیلدهای ورودی کاربر.</p>
            <span className="inline-block mt-2 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[11px] font-bold">وضعیت: فعال</span>
          </div>
        </div>

        {/* Layer 6 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">هدرهای امنیتی سخت‌گیرانه (CSP & HSTS)</h4>
            <p className="text-xs text-slate-500 mt-1">تنظیم خودکار هدرهای Nosniff، محافظت کلیک‌جکینگ و لغو کش روی نقاط انتهایی حساس.</p>
            <span className="inline-block mt-2 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[11px] font-bold">وضعیت: فعال</span>
          </div>
        </div>
      </div>

      {/* Active Blocks Section (If Any) */}
      {secStats?.activeBlockedIps && secStats.activeBlockedIps.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <ShieldAlert className="h-6 w-6 text-rose-600" />
            <h4 className="text-base font-black text-rose-900">
              آدرس‌های IP و حساب‌های مسدودشده بر اثر حملات Brute-Force ({secStats.activeBlockedIps.length})
            </h4>
          </div>
          <div className="space-y-2">
            {secStats.activeBlockedIps.map((block, bIdx) => (
              <div key={`${block.key || 'block'}-${bIdx}`} className="flex items-center justify-between bg-white rounded-xl p-3 border border-rose-100">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-slate-700">{block.key}</span>
                  <span className="text-xs text-rose-600">زمان باقی‌مانده مسدودی: {block.remainingSeconds} ثانیه</span>
                </div>
                <button
                  onClick={() => handleUnblock(block.key)}
                  disabled={unblockingKey === block.key}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                >
                  <Unlock className="h-3.5 w-3.5" />
                  <span>{unblockingKey === block.key ? "در حال رفع..." : "رفع مسدودی"}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Security Incidents */}
      {secStats?.recentEvents && secStats.recentEvents.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-slate-700" />
              <h4 className="text-base font-black text-slate-800">آخرین وقایع و هشدارهای امنیتی ثبت‌شده</h4>
            </div>
            <span className="text-xs text-slate-400">تعداد رویدادها: {secStats.totalSecurityEvents}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-4">نوع واقعه</th>
                  <th className="py-2.5 px-4">هدف / ورودی</th>
                  <th className="py-2.5 px-4">جزئیات امنیتی</th>
                  <th className="py-2.5 px-4">زمان ثبت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {secStats.recentEvents.slice(0, 10).map((ev, evIdx) => (
                  <tr key={`${ev.id || 'ev'}-${evIdx}`} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-bold text-rose-600">{ev.type}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-700">{ev.target}</td>
                    <td className="py-2.5 px-4 text-slate-600">{ev.details}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-400">{new Date(ev.timestamp).toLocaleTimeString("fa-IR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admin Credentials Update Form */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm max-w-3xl">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-base font-black text-slate-800">تغییر نام کاربری و کلمه عبور مدیر ارشد</h4>
            <p className="text-xs text-slate-400 mt-0.5">مشخصات اختصاصی ورود مستقیم به پیشخوان مدیریت</p>
          </div>
        </div>

        <form onSubmit={handleSaveCredentials} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Admin Name */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                نام نمایشی مدیر سیستم
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="مثال: مهندس علیرضا محمدی"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 focus:bg-white text-slate-900 rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-400">نامی که در بالای پنل و لاگ‌های مدیریتی نمایش داده می‌شود.</p>
            </div>

            {/* Admin Username */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                نام کاربری جدید ورود مدیریت
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="مثال: admin یا manager"
                  dir="ltr"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 focus:bg-white text-slate-900 rounded-xl px-4 py-2.5 text-sm outline-none transition-all font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-400">نام کاربری جهت ورود در صفحه <code>/admin-login</code>.</p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
              <Lock className="h-4 w-4 text-rose-600" />
              تغییر کلمه عبور مدیریت
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* New Password */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  کلمه عبور جدید
                </label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="حداقل ۶ کاراکتر"
                    dir="ltr"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 focus:bg-white text-slate-900 rounded-xl pr-4 pl-10 py-2.5 text-sm outline-none transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  تکرار کلمه عبور جدید
                </label>
                <input
                  type={showPass ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="تکرار کلمه عبور جدید"
                  dir="ltr"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 focus:bg-white text-slate-900 rounded-xl px-4 py-2.5 text-sm outline-none transition-all font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-6 py-3 rounded-xl shadow-md shadow-rose-200 transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>در حال ذخیره‌سازی...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>ذخیره تغییرات امنیتی</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
