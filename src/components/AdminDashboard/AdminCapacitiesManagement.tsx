import React, { useState, useEffect } from "react";
import { IndustrialCapacity, CAPACITY_MACHINE_TYPES, Unit } from "../../types";
import CapacityFormModal from "../IndustrialCapacities/CapacityFormModal";
import { 
  Cpu, 
  Plus, 
  Trash2, 
  Edit3, 
  Power, 
  Search, 
  Loader2, 
  RefreshCw, 
  Building2, 
  Clock, 
  Coins, 
  Phone, 
  CheckCircle2, 
  AlertTriangle 
} from "lucide-react";
import toast from "react-hot-toast";

interface AdminCapacitiesManagementProps {
  units?: Unit[];
}

export default function AdminCapacitiesManagement({ units = [] }: AdminCapacitiesManagementProps) {
  const [capacities, setCapacities] = useState<IndustrialCapacity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCapacity, setEditingCapacity] = useState<IndustrialCapacity | null>(null);
  const [itemToDelete, setItemToDelete] = useState<IndustrialCapacity | null>(null);
  const [deleting, setDeleting] = useState(false);

  const getAuthHeaders = (): Record<string, string> => {
    const savedUser = localStorage.getItem("custom_auth_user");
    if (!savedUser) return {};
    try {
      const parsed = JSON.parse(savedUser);
      if (parsed?.token) {
        return { Authorization: `Bearer ${parsed.token}` };
      }
    } catch (_) {}
    return {};
  };

  const fetchAllCapacities = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/capacities");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setCapacities(data);
        }
      }
    } catch (err) {
      console.warn("Notice loading admin capacities:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllCapacities();
  }, []);

  const handleToggleStatus = async (item: IndustrialCapacity) => {
    const nextStatus = item.status === "active" ? "busy" : item.status === "busy" ? "inactive" : "active";
    try {
      const headers = {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      };

      const res = await fetch(`/api/capacities/${item.id}/status`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status: nextStatus })
      });

      if (res.ok) {
        toast.success("وضعیت ظرفیت دستگاه تغییر یافت.");
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
      const headers = getAuthHeaders();
      const res = await fetch(`/api/capacities/${itemToDelete.id}`, {
        method: "DELETE",
        headers
      });

      if (res.ok) {
        toast.success("آگهی با موفقیت حذف گردید.");
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

  const filtered = capacities.filter(item => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch = !q || item.title?.toLowerCase().includes(q) || item.unitName?.toLowerCase().includes(q) || item.modelSpecs?.toLowerCase().includes(q);
    const matchCat = categoryFilter === "all" || item.machineType === categoryFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6" style={{ direction: "rtl" }}>
      
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-100 dark:border-indigo-900/60">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">
              مدیریت و نظارت بر بازارگاه ظرفیت‌های خالی ماشین‌آلات
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              مشاهده، ویرایش و نظارت بر تمام ساعات خالی دستگاه‌های ثبت شده توسط کارگاه‌های شهرک
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={fetchAllCapacities}
            className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all cursor-pointer"
            title="به‌روزرسانی"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => {
              setEditingCapacity(null);
              setIsModalOpen(true);
            }}
            className="flex-1 md:flex-none px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-200 dark:shadow-none cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>ثبت ظرفیت جدید</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="جستجو در عنوان دستگاه، کارگاه، مشخصات..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-9 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {CAPACITY_MACHINE_TYPES.slice(0, 6).map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                categoryFilter === cat.id
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <span className="text-xs font-bold">در حال بارگذاری اطلاعات ماشین‌آلات...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Cpu className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">هیچ ظرفیت ماشینی ثبت نشده است.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-extrabold">
                  <th className="py-3.5 px-4">عنوان خدمت / دستگاه</th>
                  <th className="py-3.5 px-4">کارگاه ارائه‌دهنده</th>
                  <th className="py-3.5 px-4">نوع دستگاه</th>
                  <th className="py-3.5 px-4">میزان ظرفیت</th>
                  <th className="py-3.5 px-4">نرخ / قیمت</th>
                  <th className="py-3.5 px-4 text-center">وضعیت</th>
                  <th className="py-3.5 px-4 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filtered.map((item, itemIdx) => (
                  <tr key={`${item.id || 'cap'}-${itemIdx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-850 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-black text-slate-800 dark:text-slate-100">{item.title}</div>
                      {item.modelSpecs && <div className="text-[11px] text-slate-400 mt-0.5">{item.modelSpecs}</div>}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-indigo-700 dark:text-indigo-300">
                      {item.unitName}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                      {item.machineTypeName}
                    </td>
                    <td className="py-3.5 px-4 font-black text-indigo-600 dark:text-indigo-400">
                      {item.availableCapacity}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">
                      {item.priceRate || "توافقی"}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(item)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                          item.status === "active"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : item.status === "busy"
                            ? "bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300"
                            : "bg-slate-100 text-slate-500 border border-slate-300 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {item.status === "active" ? "🟢 آماده سفارش" : item.status === "busy" ? "🟡 تکمیل" : "⚪ غیرفعال"}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingCapacity(item);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition-all cursor-pointer"
                          title="ویرایش"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setItemToDelete(item)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 rounded-lg transition-all cursor-pointer"
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
              آیا از حذف دائم و کامل این آگهی ظرفیت خالی ماشین‌آلات اطمینان دارید؟
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

      {/* Modal */}
      <CapacityFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchAllCapacities}
        editingCapacity={editingCapacity}
        userUnits={units}
        user={null}
      />

    </div>
  );
}
