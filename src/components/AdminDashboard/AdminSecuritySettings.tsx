import React, { useState } from "react";
import { KeyRound, User, Lock, CheckCircle2, AlertCircle, ShieldCheck, Save, Eye, EyeOff } from "lucide-react";
import { motion } from "motion/react";

export default function AdminSecuritySettings() {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

      const data = await res.json();
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
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100">
            <KeyRound className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800">تنظیمات نام کاربری و کلمه عبور مدیریت</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              تغییر مشخصات اختصاصی ورود به پنل مدیریت ارشد و کلیدهای دسترسی امنیتی
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-600">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Super Admin Guard Active</span>
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

      {/* Form */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm max-w-3xl">
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
