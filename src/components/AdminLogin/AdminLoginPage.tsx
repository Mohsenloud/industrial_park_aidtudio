import React, { useState, useEffect } from "react";
import { ShieldCheck, Lock, User, ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle2, KeyRound, Server } from "lucide-react";
import { motion } from "motion/react";
import { customAuth } from "../../lib/customAuth";

interface AdminLoginPageProps {
  onLoginSuccess: (adminUser: any) => void;
  onNavigateHome: () => void;
}

export default function AdminLoginPage({ onLoginSuccess, onNavigateHome }: AdminLoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const normalizeDigits = (str: string): string => {
    if (!str) return "";
    const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
    const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    let result = str;
    for (let i = 0; i < 10; i++) {
      result = result.replace(new RegExp(persianDigits[i], "g"), i.toString());
      result = result.replace(new RegExp(arabicDigits[i], "g"), i.toString());
    }
    return result;
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setError("لطفاً نام کاربری و کلمه عبور مدیریت را وارد نمایید.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setSuccessMsg(null);

      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: normalizeDigits(cleanUser),
          password: normalizeDigits(cleanPass),
          rememberMe
        }),
      }).catch((netErr) => {
        throw new Error("خطا در برقراری ارتباط با سرور. لطفاً اتصال اینترنت خود را بررسی نمایید.");
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "نام کاربری یا کلمه عبور مدیریت نادرست است.");
      }

      setSuccessMsg("احراز هویت مدیر با موفقیت تایید شد. در حال انتقال به پنل...");

      // Save token and user info in localStorage for admin session persistence
      if (data.user) {
        customAuth.setCurrentUser(data.user);
        localStorage.setItem("custom_admin_session", JSON.stringify({
          timestamp: Date.now(),
          uid: data.user.uid,
          email: data.user.email,
          role: data.user.role || "super_admin"
        }));
      }

      setTimeout(() => {
        onLoginSuccess(data.user);
      }, 700);

    } catch (err: any) {
      console.error("Admin login error:", err);
      const isNetworkError = err?.message?.includes("Failed to fetch") || err?.name === "TypeError";
      setError(isNetworkError ? "خطا در برقراری ارتباط با سرور. لطفاً مجدداً تلاش نمایید." : (err.message || "خطا در احراز هویت مدیریت"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden" 
      style={{ direction: "rtl", fontFamily: "inherit" }}
    >
      {/* Background Decorative Grid & Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
              درگاه امنیتی مدیریت
              <span className="text-[10px] font-bold bg-rose-950/80 text-rose-400 border border-rose-800/60 px-2 py-0.5 rounded-md">
                Super Admin
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">سامانه جامع مدیریت واحدهای صنعتی و اطلاعات پایه</p>
          </div>
        </div>

        <button
          onClick={onNavigateHome}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition-all cursor-pointer"
        >
          <ArrowRight className="h-4 w-4" />
          <span>بازگشت به سامانه عمومی</span>
        </button>
      </header>

      {/* Main Login Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/60 relative"
        >
          <div className="text-center space-y-2 mb-8">
            <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-rose-500/20 to-indigo-500/20 border border-rose-500/30 text-rose-400 mb-2">
              <KeyRound className="h-7 w-7" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">ورود به پنل مدیریت ارشد</h2>
            <p className="text-xs sm:text-sm text-slate-400">
              جهت ورود، نام کاربری و کلمه عبور اختصاصی مدیر سیستم را وارد نمایید.
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 bg-rose-950/60 border border-rose-800/80 rounded-2xl flex items-start gap-3 text-rose-200 text-xs font-medium leading-relaxed"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1">{error}</div>
            </motion.div>
          )}

          {/* Success Alert */}
          {successMsg && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 bg-emerald-950/60 border border-emerald-800/80 rounded-2xl flex items-center gap-3 text-emerald-200 text-xs font-medium"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <div>{successMsg}</div>
            </motion.div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            {/* Username / Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                نام کاربری یا ایمیل مدیریت
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin یا manamalat@gmail.com"
                  dir="ltr"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-white rounded-xl pr-10 pl-4 py-3 text-sm placeholder-slate-600 transition-all outline-none font-mono text-left placeholder:text-right placeholder:font-sans"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-300">
                  کلمه عبور مدیریت
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  dir="ltr"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-white rounded-xl pr-10 pl-10 py-3 text-sm placeholder-slate-600 transition-all outline-none font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-rose-600 focus:ring-rose-500 focus:ring-offset-slate-900"
                />
                <span className="text-xs text-slate-400">ذخیره نشست مدیریت</span>
              </label>

              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Server className="h-3 w-3" />
                پروتکل امنیتی JWT
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-extrabold py-3.5 px-4 rounded-xl shadow-lg shadow-rose-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>در حال احراز هویت امنیتی...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-5 w-5" />
                  <span>ورود به پنل مدیریت</span>
                </>
              )}
            </button>
          </form>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center">
        <p className="text-xs text-slate-600">
          سامانه مدیریت جامع شهرک صنعتی • کلیه حقوق دسترسی و لاگ‌های امنیتی مانیتور می‌شوند
        </p>
      </footer>
    </div>
  );
}
