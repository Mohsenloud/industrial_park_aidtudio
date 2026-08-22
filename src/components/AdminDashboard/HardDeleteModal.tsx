import React, { useState } from "react";
import { Trash2, AlertTriangle, ShieldAlert, X, Loader2, CheckCircle2 } from "lucide-react";
import { Unit } from "../../types";

interface HardDeleteModalProps {
  unit: Unit;
  onClose: () => void;
  onConfirm: (unitId: string) => Promise<void>;
}

export default function HardDeleteModal({ unit, onClose, onConfirm }: HardDeleteModalProps) {
  const [confirmName, setConfirmName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const isConfirmed = confirmName.trim() === unit.name.trim();

  const handleExecuteDelete = async () => {
    if (!isConfirmed || isDeleting) return;
    setIsDeleting(true);
    try {
      await onConfirm(unit.id);
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
        <div className="bg-gradient-to-l from-rose-600 to-rose-700 p-6 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-xs">
              <ShieldAlert className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg">حذف کامل و دائمی از پایگاه داده</h3>
              <p className="text-rose-100 text-xs mt-0.5 font-medium">
                پاکسازی دائم و بازگشت‌ناپذیر کارگاه و تمام اطلاعات وابسته
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
              <span>هشدار جدی: این عملیات غیرقابل بازگشت است!</span>
            </div>
            <p className="text-xs text-rose-800 leading-relaxed font-medium">
              با اجرای این عملیات، کارگاه <strong className="font-extrabold text-rose-950">«{unit.name}»</strong> به همراه تمام محصولات، پیام‌ها، استعلام‌های قیمت (Quotes)، و لاگ‌های ثبت‌شده آن به طور کامل و ریشه‌ای از دیتابیس حذف شده و هیچ اثری از آن باقی نخواهد ماند.
            </p>
          </div>

          <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
            <div className="flex justify-between items-center text-slate-600">
              <span className="font-semibold text-slate-400">نام کارگاه:</span>
              <span className="font-bold text-slate-800">{unit.name}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span className="font-semibold text-slate-400">شناسه اختصاصی:</span>
              <span className="font-mono text-[11px] text-slate-500">{unit.id}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span className="font-semibold text-slate-400">شماره تماس:</span>
              <span className="font-mono text-slate-700 font-bold">{unit.phone || unit.mobile1 || "ثبت نشده"}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              جهت تایید نهایی حذف، نام کارگاه یعنی <span className="text-rose-600 font-extrabold select-all">«{unit.name}»</span> را در کادر زیر تایپ نمایید:
            </label>
            <input
              type="text"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={`نام دقیق کارگاه: ${unit.name}`}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all"
              disabled={isDeleting}
              autoFocus
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            انصراف
          </button>

          <button
            type="button"
            onClick={handleExecuteDelete}
            disabled={!isConfirmed || isDeleting}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              isConfirmed && !isDeleting
                ? "bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-200 cursor-pointer"
                : "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300"
            }`}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>در حال پاکسازی کامل دیتابیس...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                <span>حذف دائم و کامل کارگاه</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
