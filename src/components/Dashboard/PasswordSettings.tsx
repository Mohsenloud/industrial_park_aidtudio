import React, { useState, useEffect } from "react";
import { Key, Lock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { CustomUser } from "../../lib/customAuth";

interface PasswordSettingsProps {
  user: CustomUser;
}

export default function PasswordSettings({ user }: PasswordSettingsProps) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [hasPassword, setHasPassword] = useState(false);
  const [checking, setChecking] = useState(true);

  const getAuthHeaders = () => {
    const savedUser = localStorage.getItem("custom_auth_user");
    let tokenHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed) {
          const token = parsed.token;
          if (token) {
            tokenHeaders["Authorization"] = `Bearer ${token}`;
          }
        }
      } catch (e) {
        console.error("Error parsing custom_auth_user:", e);
      }
    }
    return tokenHeaders;
  };

  const checkUserPasswordStatus = async () => {
    try {
      setChecking(true);
      // We can query custom endpoint or check if the logged-in user profile has password status
      const response = await fetch(`/api/units`, {
        headers: getAuthHeaders()
      });
      // Just to verify if the server is responsive under auth
      // Let's call a specific endpoint or simply see if we can check from current state.
      // We will also check our user profile status.
      const userRes = await fetch(`/api/users/is-admin/${user.uid}`);
      // Let's write a quick check endpoint or default to true/false state.
      // Wait, let's fetch user's profile from standard API
      const profileRes = await fetch(`/api/users/profile/${user.uid}`, {
        headers: getAuthHeaders()
      });
      if (profileRes.ok) {
        const data = await profileRes.json();
        // If password_hash exists in the users table, they have a password
        setHasPassword(!!data.hasPassword);
      }
    } catch (err) {
      console.error("Error checking password status:", err);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkUserPasswordStatus();
  }, [user.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < 6) {
      setError("کلمه عبور جدید باید حداقل ۶ کاراکتر باشد.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("کلمه عبور جدید و تکرار آن مطابقت ندارند.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          oldPassword: hasPassword ? oldPassword : undefined,
          newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "خطایی در ثبت کلمه عبور رخ داد.");
      }

      setSuccess("کلمه عبور شما با موفقیت ثبت و بروزرسانی شد.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setHasPassword(true);
    } catch (err: any) {
      setError(err.message || "خطایی رخ داد.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6" id="password-settings-card">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4" style={{ direction: "rtl" }}>
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
          <Key className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-sm sm:text-base">تنظیمات کلمه عبور حساب کاربری</h3>
          <p className="text-xs text-slate-500 mt-1">
            {hasPassword 
              ? "کلمه عبور خود را جهت ورودهای بعدی با ایمیل تغییر دهید." 
              : "جهت ورود آسان با ایمیل و رمز عبور بدون نیاز به پیامک یکبار مصرف، یک رمز عبور تعیین کنید."}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl text-xs flex items-center gap-2" style={{ direction: "rtl" }}>
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl text-xs flex items-center gap-2" style={{ direction: "rtl" }}>
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" style={{ direction: "rtl" }}>
        {hasPassword && (
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">کلمه عبور فعلی</label>
            <div className="relative">
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 pr-10"
                placeholder="کلمه عبور فعلی خود را وارد کنید"
                required
              />
              <Lock className="absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">کلمه عبور جدید</label>
            <div className="relative">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 pr-10"
                placeholder="حداقل ۶ کاراکتر"
                required
              />
              <Lock className="absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">تکرار کلمه عبور جدید</label>
            <div className="relative">
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 pr-10"
                placeholder="تکرار کلمه عبور جدید"
                required
              />
              <Lock className="absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>در حال ثبت...</span>
            </>
          ) : (
            <span>{hasPassword ? "تغییر کلمه عبور" : "تعیین کلمه عبور ورود"}</span>
          )}
        </button>
      </form>
    </div>
  );
}
