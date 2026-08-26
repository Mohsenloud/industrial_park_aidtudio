import React, { useState, useEffect } from "react";
import { IndustrialCapacity, Unit, CAPACITY_MACHINE_TYPES } from "../../types";
import { CustomUser } from "../../lib/customAuth";
import CapacityFormModal from "../IndustrialCapacities/CapacityFormModal";
import { 
  Cpu, 
  Plus, 
  Edit3, 
  Trash2, 
  Power, 
  Loader2, 
  Clock, 
  Coins, 
  Building2, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import toast from "react-hot-toast";

interface CapacityManagerProps {
  user: CustomUser | null;
  userUnits: Unit[];
}

export default function CapacityManager({ user, userUnits }: CapacityManagerProps) {
  const [capacities, setCapacities] = useState<IndustrialCapacity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCapacity, setEditingCapacity] = useState<IndustrialCapacity | null>(null);
  const [itemToDelete, setItemToDelete] = useState<IndustrialCapacity | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchMyCapacities = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/capacities");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          // Filter capacities owned by this user or matching their unitIds
          const unitIds = userUnits.map(u => u.id);
          const myItems = data.filter(c => 
            (c.ownerId && c.ownerId === user?.uid) || 
            (c.unitId && unitIds.includes(c.unitId))
          );
          setCapacities(myItems);
        }
      }
    } catch (err) {
      console.warn("Notice loading user capacities:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyCapacities();
  }, [user, userUnits]);

  const handleToggleStatus = async (item: IndustrialCapacity) => {
    const nextStatus = item.status === "active" ? "busy" : item.status === "busy" ? "inactive" : "active";
    try {
      const savedUser = localStorage.getItem("custom_auth_user");
      let tokenHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed?.token) {
            tokenHeaders["Authorization"] = `Bearer ${parsed.token}`;
          }
        } catch (_) {}
      }

      const res = await fetch(`/api/capacities/${item.id}/status`, {
        method: "PUT",
        headers: tokenHeaders,
        body: JSON.stringify({ status: nextStatus })
      });

      if (res.ok) {
        toast.success("وضعیت پذیرش سفارش تغییر یافت.");
        setCapacities(prev => prev.map(c => c.id === item.id ? { ...c, status: nextStatus } : c));
      } else {
        toast.error("خطا در تغییر وضعیت.");
      }
    } catch (err) {
      toast.error("خطای شبکه.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    setDeleting(true);
    try {
      const savedUser = localStorage.getItem("custom_auth_user");
      let tokenHeaders: Record<string, string> = {};
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed?.token) {
            tokenHeaders["Authorization"] = `Bearer ${parsed.token}`;
          }
        } catch (_) {}
      }

      const res = await fetch(`/api/capacities/${itemToDelete.id}`, {
        method: "DELETE",
        headers: tokenHeaders
      });

      if (res.ok) {
        toast.success("آگهی ظرفیت با موفقیت حذف گردید.");
        setCapacities(prev => prev.filter(c => c.id !== itemToDelete.id));
        setItemToDelete(null);
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || "خطا در حذف آگهی.");
      }
    } catch (err) {
      toast.error("خطای شبکه.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6" style={{ direction: "rtl" }}>
      
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-100 dark:border-indigo-900/60">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">
              مدیریت ظرفیت‌های خالی ماشین‌آلات شما
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              ثبت و مدیریت ساعات آزاد دستگاه‌های CNC، برش، تزریق، پرس و خطوط تولید جهت دریافت سفارش از سایر واحدها
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setEditingCapacity(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-md shadow-indigo-200 dark:shadow-none cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>ثبت ظرفیت خالی دستگاه جدید</span>
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <span className="text-xs font-bold">در حال بارگذاری ظرفیت‌های شما...</span>
        </div>
      ) : capacities.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center space-y-3">
          <Cpu className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <h4 className="font-extrabold text-sm text-slate-700 dark:text-slate-200">شما هنوز هیچ ظرفیت دستگاهی ثبت نکرده‌اید</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            اگر در کارگاه خود دستگاه‌های صنعتی با ساعات آزاد دارید، با ثبت رایگان آن می‌توانید از سایر کارگاه‌ها سفارش‌های پیمانکاری و قطعه‌سازی دریافت کنید.
          </p>
          <button
            onClick={() => {
              setEditingCapacity(null);
              setIsModalOpen(true);
            }}
            className="mt-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>ثبت اولین دستگاه و ظرفیت خالی</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {capacities.map((item, idx) => (
            <div
              key={`${item.id || 'cap'}-${idx}`}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-900/60">
                    {item.machineTypeName}
                  </span>

                  <button
                    onClick={() => handleToggleStatus(item)}
                    className={`text-[11px] font-black px-2.5 py-1 rounded-xl border transition-all cursor-pointer ${
                      item.status === "active"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : item.status === "busy"
                        ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300"
                        : "bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {item.status === "active" ? "🟢 آماده پذیرش سفارش" : item.status === "busy" ? "🟡 در حال تکمیل" : "⚪ غیرفعال"}
                  </button>
                </div>

                <h3 className="font-black text-base text-slate-800 dark:text-slate-100">
                  {item.title}
                </h3>

                {item.modelSpecs && (
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    مشخصات: {item.modelSpecs}
                  </p>
                )}

                <div className="flex items-center gap-3 mt-3 text-xs text-slate-600 dark:text-slate-300 font-bold">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-indigo-600" />
                    {item.availableCapacity}
                  </span>
                  <span>|</span>
                  <span className="flex items-center gap-1">
                    <Coins className="h-3.5 w-3.5 text-emerald-600" />
                    {item.priceRate || "قیمت توافقی"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] text-slate-400">
                  تلفن تماس: {item.contactPhone}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setEditingCapacity(item);
                      setIsModalOpen(true);
                    }}
                    className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-all cursor-pointer"
                    title="ویرایش"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => setItemToDelete(item)}
                    className="p-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 rounded-xl transition-all cursor-pointer"
                    title="حذف"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 rounded-2xl">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                  حذف آگهی ظرفیت خالی
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  این عملیات غیرقابل بازگشت است.
                </p>
              </div>
            </div>

            <div className="bg-rose-50 dark:bg-rose-950/40 p-3.5 rounded-2xl border border-rose-100 dark:border-rose-900/50 space-y-1 text-xs">
              <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400">عنوان آگهی:</span>
              <p className="font-extrabold text-slate-800 dark:text-slate-200 line-clamp-2">
                {itemToDelete.title}
              </p>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              آیا از حذف دائم این آگهی ظرفیت خالی اطمینان دارید؟
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                انصراف
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-md shadow-rose-200 dark:shadow-none cursor-pointer disabled:opacity-50"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                <span>{deleting ? "در حال حذف..." : "بله، حذف کن"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for adding/editing */}
      <CapacityFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchMyCapacities}
        editingCapacity={editingCapacity}
        userUnits={userUnits}
        user={user}
      />

    </div>
  );
}
