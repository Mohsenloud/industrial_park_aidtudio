import React, { useState } from "react";
import { Trash2, Megaphone, MessageSquare, AlertTriangle } from "lucide-react";
import { motion } from "motion/react";
import toast from "react-hot-toast";
import { Unit } from "../../types";

interface AdminPanelProps {
  isAdmin: boolean;
  allUnitsForAdmin: Unit[];
  selectedAdminUnitId: string;
  onSelectAdminUnitId: (id: string) => void;
  currentUnit?: Unit | null;
  onDeleteSuccess: () => void;
  showAdManager: boolean;
  onToggleAdManager: () => void;
  showSmsSettings: boolean;
  onToggleSmsSettings: () => void;
}

export default function AdminPanel({
  isAdmin,
  allUnitsForAdmin,
  selectedAdminUnitId,
  onSelectAdminUnitId,
  currentUnit,
  onDeleteSuccess,
  showAdManager,
  onToggleAdManager,
  showSmsSettings,
  onToggleSmsSettings,
}: AdminPanelProps) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isAdmin) return null;

  const handleDeleteUnit = () => {
    if (!selectedAdminUnitId) return;
    setShowConfirmDelete(true);
  };

  const handleExecuteDelete = async () => {
    if (!selectedAdminUnitId) return;
    setIsDeleting(true);
    try {
      const savedUser = localStorage.getItem("custom_auth_user");
      let tokenHeaders = {};
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed) {
          const token = parsed.token;
          if (token) {
            tokenHeaders = { "Authorization": `Bearer ${token}` };
          }
        }
      }
      const response = await fetch(`/api/units/${selectedAdminUnitId}`, {
        method: "DELETE",
        headers: tokenHeaders
      });
      if (response.ok) {
        toast.success("واحد تولیدی با موفقیت حذف شد.");
        setShowConfirmDelete(false);
        onDeleteSuccess();
      } else {
        toast.error("خطا در حذف واحد تولیدی.");
      }
    } catch (err) {
      console.error(err);
      toast.error("خطا در برقراری ارتباط با سرور.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-amber-500/10 to-indigo-500/10 border border-indigo-200 p-5 rounded-3xl mb-6 space-y-4 text-right" style={{ direction: "rtl" }}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-indigo-100/50">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-indigo-600 animate-pulse" />
          <h2 className="text-xs font-black text-indigo-900">پنل دسترسی مدیریت ارشد سایت (Admin Portal)</h2>
        </div>
        <span className="text-[10px] font-black bg-indigo-600 text-white px-3 py-1 rounded-full">
          مدیر ارشد سیستم
        </span>
      </div>
      <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
        شما به عنوان مدیر کل سیستم دسترسی کامل دارید تا مشخصات هر یک از واحدهای تولیدی شهرک صنعتی را ویرایش کنید، محصولات آن‌ها را اضافه/حذف/ویرایش نمایید یا در صورت نیاز کارگاه را حذف کنید.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">انتخاب واحد تولیدی جهت مدیریت:</span>
          <select
            value={selectedAdminUnitId}
            onChange={(e) => onSelectAdminUnitId(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all cursor-pointer"
          >
            <option value="">مدیریت واحد تولیدی خودتان ({currentUnit?.name || "هنوز ثبت نشده"})</option>
            {allUnitsForAdmin.map((u, index) => (
              <option key={`${u.id}-${index}`} value={u.id}>
                {u.name} (متعلق به: {u.phone})
              </option>
            ))}
          </select>
        </div>
        {selectedAdminUnitId && (
          <button
            onClick={handleDeleteUnit}
            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 border border-rose-200"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>حذف کامل این کارگاه</span>
          </button>
        )}

        <button
          type="button"
          onClick={onToggleAdManager}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border ${
            showAdManager 
              ? "bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700 shadow-sm" 
              : "bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50"
          }`}
        >
          <Megaphone className="h-3.5 w-3.5" />
          <span>{showAdManager ? "بستن پنل بنرهای تبلیغاتی" : "مدیریت بنرهای تبلیغاتی سایت"}</span>
        </button>

        <button
          type="button"
          onClick={onToggleSmsSettings}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border ${
            showSmsSettings 
              ? "bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700 shadow-sm" 
              : "bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50"
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>{showSmsSettings ? "بستن پنل تنظیمات پیامک" : "تنظیمات ارسال پیامک (OTP)"}</span>
        </button>
      </div>

      {showConfirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-slate-100 max-w-md w-full p-6 shadow-xl text-center space-y-4"
          >
            <div className="mx-auto h-12 w-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center border border-rose-100">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-slate-800 text-sm">حذف کامل واحد تولیدی</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                آیا مطمئن هستید که می‌خواهید واحد تولیدی "{allUnitsForAdmin.find(u => u.id === selectedAdminUnitId)?.name || currentUnit?.name || "این کارگاه"}" را همراه با تمامی محصولات آن به صورت دائم حذف کنید؟ این عمل غیرقابل بازگشت است.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleExecuteDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-rose-100 cursor-pointer disabled:bg-slate-300"
              >
                {isDeleting ? "در حال حذف..." : "بله، کاملاً حذف شود"}
              </button>
              <button
                onClick={() => setShowConfirmDelete(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                انصراف
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
