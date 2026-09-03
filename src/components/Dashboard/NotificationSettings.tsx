import React, { useState, useEffect } from "react";
import { Bell, CheckCircle2, AlertTriangle, Send, ShieldCheck, Smartphone, RefreshCw } from "lucide-react";
import { checkPushSupportAndStatus, subscribeToWebPush, unsubscribeFromWebPush, sendTestNotification, PushStatus } from "../../lib/pushClient";
import toast from "react-hot-toast";

interface NotificationSettingsProps {
  userId?: string;
}

export default function NotificationSettings({ userId }: NotificationSettingsProps) {
  const [status, setStatus] = useState<PushStatus>({
    isSupported: true,
    permission: "default",
    isSubscribed: false,
    subscription: null
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

  async function loadStatus() {
    try {
      setLoading(true);
      const s = await checkPushSupportAndStatus();
      setStatus(s);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  async function handleTogglePush() {
    try {
      setActionLoading(true);
      if (status.isSubscribed) {
        await unsubscribeFromWebPush();
        toast.success("دریافت اعلان‌ها برای این دستگاه غیرفعال شد.");
      } else {
        await subscribeToWebPush(userId);
        toast.success("اعلان‌های فوری وب برای این دستگاه فعال گردید!");
      }
      await loadStatus();
    } catch (err: any) {
      toast.error(err.message || "خطا در برقراری ارتباط با سرویس اعلان");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSendTest() {
    try {
      setTestLoading(true);
      const ok = await sendTestNotification();
      if (ok) {
        toast.success("اعلان آزمایشی به مرورگر شما ارسال شد.");
      } else {
        toast.error("ارسال ناموفق بود.");
      }
    } catch (err: any) {
      toast.error(err.message || "خطا در ارسال اعلان آزمایشی");
    } finally {
      setTestLoading(false);
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm mt-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white text-base">
              اعلان‌های وب و موبایل (Web Push Notifications)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              دریافت آنی پیام‌های استعلام قیمت، گفتگوی چت و تغییر وضعیت کارگاه حتی هنگام بسته بودن مرورگر
            </p>
          </div>
        </div>
        <button
          onClick={loadStatus}
          disabled={loading}
          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
          title="بروزرسانی وضعیت"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {!status.isSupported ? (
        <div className="mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">مرورگر فعلی شما از Web Push پشتیبانی نمی‌کند.</p>
            <p className="text-xs mt-1">
              جهت استفاده از این قابلیت، از مرورگرهای استاندارد مدرن (مانند Chrome، Firefox، Edge یا Safari در iOS 16.4+) استفاده نمایید.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              {status.isSubscribed ? (
                <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
              )}
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">
                  وضعیت این دستگاه:{" "}
                  <span className={status.isSubscribed ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500"}>
                    {status.isSubscribed ? "فعال و متصل" : "غیرفعال"}
                  </span>
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  مجوز مرورگر: {status.permission === "granted" ? "مجاز شده" : status.permission === "denied" ? "مسدود شده توسط کاربر" : "تعیین نشده"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {status.isSubscribed && (
                <button
                  type="button"
                  onClick={handleSendTest}
                  disabled={testLoading}
                  className="px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-1.5"
                >
                  <Send className={`w-3.5 h-3.5 ${testLoading ? "animate-pulse" : ""}`} />
                  <span>تست اعلان</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleTogglePush}
                disabled={actionLoading}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 ${
                  status.isSubscribed
                    ? "bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 dark:text-rose-400"
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{status.isSubscribed ? "غیرفعال‌سازی در این دستگاه" : "فعال‌سازی اعلان‌های فوری"}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-600 dark:text-slate-300">
            <div className="p-3 rounded-lg bg-slate-50/70 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/80">
              <span className="font-bold text-slate-800 dark:text-white block mb-1">📩 استعلام قیمت</span>
              هنگامی که کاربری برای محصولات شما فرم استعلام پر کند، اعلان آنی در صفحه گوشی ظاهر می‌شود.
            </div>
            <div className="p-3 rounded-lg bg-slate-50/70 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/80">
              <span className="font-bold text-slate-800 dark:text-white block mb-1">💬 پیام‌های چت آنلاین</span>
              مشتریانی که در چت به کارگاه شما پیام دهند، بدون تاخیر از پیام آنها مطلع می‌شوید.
            </div>
            <div className="p-3 rounded-lg bg-slate-50/70 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/80">
              <span className="font-bold text-slate-800 dark:text-white block mb-1">📢 اطلاعیه‌ها و قطعی‌ها</span>
              هشدارهای مهم شهرک صنعتی (قطعی برق، گاز، اطلاعیه‌های هیئت مدیره) را فورا دریافت کنید.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
