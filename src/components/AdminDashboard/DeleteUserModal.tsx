import React, { useState } from "react";
import { Trash2, AlertTriangle, ShieldAlert, X, Loader2, User, Smartphone, Mail, Calendar } from "lucide-react";
import { RegisteredUserItem } from "../../types";

interface DeleteUserModalProps {
  userItem: RegisteredUserItem;
  onClose: () => void;
  onConfirm: (userItem: RegisteredUserItem) => Promise<void>;
}

export default function DeleteUserModal({ userItem, onClose, onConfirm }: DeleteUserModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "ثبت نشده";
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat("fa-IR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const handleExecuteDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onConfirm(userItem);
      onClose();
    } catch (e) {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl border border-rose-100 shadow-2xl max-w-lg w-full overflow-hidden text-right"
        style={{ direction: "rtl" }}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-l from-rose-600 to-rose-800 p-6 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-xs">
              <ShieldAlert className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg">حذف حساب کاربری</h3>
              <p className="text-rose-100 text-xs mt-0.5 font-medium">
                {userItem.hasUnit
                  ? "حذف حساب کاربری به همراه سوابق کاربر"
                  : "حذف کامل کاربر بدون کارگاه از سامانه"}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            disabled={isDeleting}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          <div className="p-4 bg-rose-50 border border-rose-200/80 rounded-2xl space-y-2 text-rose-950">
            <div className="flex items-center gap-2 text-rose-700 font-bold text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>آیا از حذف این حساب کاربری اطمینان دارید؟</span>
            </div>
            <p className="text-xs text-rose-800 leading-relaxed font-medium">
              {userItem.hasUnit ? (
                <>
                  این کاربر دارای <strong className="font-bold text-rose-950">{userItem.unitCount} کارگاه</strong> ثبت‌شده در سیستم است. با حذف حساب، دسترسی کاربر به سیستم قطع خواهد شد.
                </>
              ) : (
                <>
                  این کاربر ثبت‌نام نموده اما <strong className="font-bold text-rose-950">هیچ کارگاهی</strong> برای او ثبت نشده است. با حذف، اطلاعات کاربری او به طور کامل از دیتابیس پاک خواهد شد.
                </>
              )}
            </p>
          </div>

          {/* User Details Card */}
          <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
            <div className="flex justify-between items-center text-slate-600">
              <span className="font-semibold text-slate-400 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-slate-400" />
                نام کاربر:
              </span>
              <span className="font-bold text-slate-800">{userItem.name || "کاربر گرامی"}</span>
            </div>

            <div className="flex justify-between items-center text-slate-600">
              <span className="font-semibold text-slate-400 flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5 text-slate-400" />
                شماره همراه:
              </span>
              <span className="font-mono text-slate-800 font-bold" style={{ direction: "ltr" }}>
                {userItem.phone || "ثبت نشده"}
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-600">
              <span className="font-semibold text-slate-400 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                ایمیل:
              </span>
              <span className="font-mono text-slate-700 font-medium truncate max-w-[200px]">
                {userItem.email || "ثبت نشده"}
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-600">
              <span className="font-semibold text-slate-400 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                تاریخ عضویت:
              </span>
              <span className="font-mono text-slate-600 text-[11px]">
                {formatDate(userItem.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            انصراف
          </button>

          <button
            onClick={handleExecuteDelete}
            disabled={isDeleting}
            className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-200 cursor-pointer"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>در حال حذف حساب...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                <span>تایید و حذف حساب کاربر</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
