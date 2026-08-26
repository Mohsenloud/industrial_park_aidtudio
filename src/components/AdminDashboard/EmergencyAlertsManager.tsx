import React, { useState, useEffect } from "react";
import { EmergencyAlert } from "../../types";
import { 
  BellRing, 
  Plus, 
  Trash2, 
  Edit3, 
  Power, 
  Zap, 
  Flame, 
  Droplet, 
  CloudLightning, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  PhoneCall, 
  Loader2, 
  RefreshCw, 
  X,
  Search,
  SlidersHorizontal
} from "lucide-react";
import toast from "react-hot-toast";

export default function EmergencyAlertsManager() {
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Modal states for Create / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<EmergencyAlert | null>(null);
  const [saving, setSaving] = useState(false);

  // Deletion Modal state (prevents iframe window.confirm blocking)
  const [alertToDelete, setAlertToDelete] = useState<EmergencyAlert | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form Fields
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"critical" | "warning" | "info" | "urgent">("warning");
  const [category, setCategory] = useState<"power" | "gas" | "water" | "weather" | "security" | "general">("power");
  const [isActive, setIsActive] = useState(true);
  const [affectedAreas, setAffectedAreas] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [phoneContact, setPhoneContact] = useState("");

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

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      const res = await fetch("/api/admin/emergency-alerts", { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setAlerts(data);
        }
      }
    } catch (err) {
      console.warn("Notice loading alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const openCreateModal = () => {
    setEditingAlert(null);
    setTitle("");
    setMessage("");
    setType("warning");
    setCategory("power");
    setIsActive(true);
    setAffectedAreas("فاز ۱ و ۲ - خیابان‌های تلاش و صنعت");
    setStartDate("۱۴۰۳/۰۶/۰۱ ساعت ۱۳:۰۰");
    setEndDate("۱۴۰۳/۰۶/۰۱ ساعت ۱۸:۰۰");
    setPhoneContact("۰۲۱-۵۶۰۰۰۰");
    setModalOpen(true);
  };

  const openEditModal = (alert: EmergencyAlert) => {
    setEditingAlert(alert);
    setTitle(alert.title || "");
    setMessage(alert.message || "");
    setType(alert.type || "warning");
    setCategory(alert.category || "power");
    setIsActive(alert.isActive ?? true);
    setAffectedAreas(alert.affectedAreas || "");
    setStartDate(alert.startDate || "");
    setEndDate(alert.endDate || "");
    setPhoneContact(alert.phoneContact || "");
    setModalOpen(true);
  };

  const handleSaveAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error("لطفاً عنوان و متن کامل اعلان را وارد فرمایید.");
      return;
    }

    setSaving(true);
    try {
      const headers = {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      };

      const payload = {
        title,
        message,
        type,
        category,
        isActive,
        affectedAreas,
        startDate,
        endDate,
        phoneContact
      };

      const url = editingAlert 
        ? `/api/admin/emergency-alerts/${editingAlert.id}`
        : "/api/admin/emergency-alerts";
      
      const method = editingAlert ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(editingAlert ? "اعلان اضطراری با موفقیت ویرایش شد." : "اعلان اضطراری جدید ثبت و منتشر گردید.");
        setModalOpen(false);
        fetchAlerts();
        window.dispatchEvent(new CustomEvent("emergencyAlertsUpdated"));
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || "خطا در ذخیره اطلاعات.");
      }
    } catch (err) {
      toast.error("خطا در برقراری ارتباط با سرور.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (alert: EmergencyAlert) => {
    try {
      const headers = {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      };

      const res = await fetch(`/api/admin/emergency-alerts/${alert.id}/toggle`, {
        method: "PUT",
        headers
      });

      if (res.ok) {
        const newStatus = !alert.isActive;
        toast.success(newStatus ? "اعلان اضطراری فعال و در صفحه اصلی نمایش داده شد." : "اعلان اضطراری غیرفعال شد.");
        setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, isActive: newStatus } : a));
        window.dispatchEvent(new CustomEvent("emergencyAlertsUpdated"));
      } else {
        toast.error("خطا در تغییر وضعیت اعلان.");
      }
    } catch (err) {
      toast.error("خطای شبکه.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!alertToDelete) return;

    setDeleting(true);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`/api/admin/emergency-alerts/${alertToDelete.id}`, {
        method: "DELETE",
        headers
      });

      if (res.ok) {
        toast.success("اعلان اضطراری با موفقیت حذف گردید.");
        setAlerts(prev => prev.filter(a => a.id !== alertToDelete.id));
        setAlertToDelete(null);
        window.dispatchEvent(new CustomEvent("emergencyAlertsUpdated"));
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || "خطا در حذف اعلان.");
      }
    } catch (err) {
      toast.error("خطای شبکه در ارتباط با سرور.");
    } finally {
      setDeleting(false);
    }
  };

  const filteredAlerts = alerts.filter(a => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch = !q || a.title?.toLowerCase().includes(q) || a.message?.toLowerCase().includes(q) || a.affectedAreas?.toLowerCase().includes(q);
    const matchCat = categoryFilter === "all" || a.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case "power": return <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[11px] font-bold flex items-center gap-1"><Zap className="h-3 w-3" /> قطعی برق</span>;
      case "gas": return <span className="px-2 py-0.5 bg-orange-50 text-orange-700 border border-orange-200 rounded-md text-[11px] font-bold flex items-center gap-1"><Flame className="h-3 w-3" /> قطعی گاز</span>;
      case "water": return <span className="px-2 py-0.5 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-md text-[11px] font-bold flex items-center gap-1"><Droplet className="h-3 w-3" /> قطعی آب</span>;
      case "weather": return <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[11px] font-bold flex items-center gap-1"><CloudLightning className="h-3 w-3" /> هشدار هوا</span>;
      case "security": return <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-md text-[11px] font-bold flex items-center gap-1"><ShieldAlert className="h-3 w-3" /> ایمنی و حوادث</span>;
      default: return <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md text-[11px] font-bold flex items-center gap-1"><BellRing className="h-3 w-3" /> عمومی</span>;
    }
  };

  return (
    <div className="space-y-6" style={{ direction: "rtl" }}>
      
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 rounded-2xl border border-rose-100 dark:border-rose-900/60">
            <BellRing className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">
              مدیریت اعلانات اضطراری و قطعی‌های شهرک صنعتی
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              اطلاع‌رسانی بلادرنگ قطعی گاز، برق، آب، شرایط اضطراری و حوادث در صفحه اصلی شهرک
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={fetchAlerts}
            className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all cursor-pointer"
            title="به‌روزرسانی لیست"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={openCreateModal}
            className="flex-1 md:flex-none px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-md shadow-rose-200 dark:shadow-none cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>ثبت اعلان اضطراری جدید</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="جستجو در عنوان، فازها یا متن اعلان..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-9 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-rose-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "همه دسته‌ها" },
            { id: "power", label: "برق" },
            { id: "gas", label: "گاز" },
            { id: "water", label: "آب" },
            { id: "weather", label: "هواشناسی" },
            { id: "security", label: "ایمنی" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setCategoryFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                categoryFilter === tab.id
                  ? "bg-rose-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
            <span className="text-xs font-bold">در حال بارگذاری اعلانات اضطراری...</span>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <AlertTriangle className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">هیچ اعلان اضطراری ثبت نشده است.</p>
            <p className="text-xs text-slate-400">جهت ثبت برنامه قطعی گاز، برق یا اطلاعیه بحران از دکمه بالا استفاده کنید.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs font-extrabold">
                  <th className="py-3.5 px-4">عنوان و موضوع اعلان</th>
                  <th className="py-3.5 px-4">دسته</th>
                  <th className="py-3.5 px-4">مناطق تحت تاثیر</th>
                  <th className="py-3.5 px-4">بازه زمانی</th>
                  <th className="py-3.5 px-4 text-center">وضعیت انتشار</th>
                  <th className="py-3.5 px-4 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredAlerts.map((alert, aIdx) => (
                  <tr key={`${alert.id || 'alert'}-${aIdx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-850 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-black text-slate-800 dark:text-slate-100">{alert.title}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 max-w-xs">{alert.message}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {getCategoryBadge(alert.category)}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                      {alert.affectedAreas || "کل شهرک صنعتی"}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-600 dark:text-slate-400">
                      {alert.startDate ? `${alert.startDate} ${alert.endDate ? `تا ${alert.endDate}` : ""}` : "ثبت نشده"}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleActive(alert)}
                        className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                          alert.isActive
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                            : "bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                        }`}
                      >
                        <Power className="h-3 w-3" />
                        <span>{alert.isActive ? "فعال در صفحه اصلی" : "غیرفعال"}</span>
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditModal(alert)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition-all cursor-pointer"
                          title="ویرایش اعلان"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setAlertToDelete(alert)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 rounded-lg transition-all cursor-pointer"
                          title="حذف کامل اعلان"
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

      {/* Modal for Create/Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 animate-in fade-in zoom-in duration-150">
            <div className="bg-gradient-to-l from-rose-700 to-slate-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BellRing className="h-5 w-5" />
                <h3 className="font-black text-base">
                  {editingAlert ? "ویرایش اعلان اضطراری شهرک" : "ثبت اعلان اضطراری و قطعی جدید"}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAlert} className="p-6 space-y-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
              
              <div>
                <label className="block mb-1 font-bold text-slate-800 dark:text-slate-100">عنوان اعلان اضطراری *</label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً: برنامه قطعی گاز به علت نوسازی خطوط انتقال فاز ۲"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-rose-500 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-bold text-slate-800 dark:text-slate-100">دسته و موضوع</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-rose-500 text-slate-900 dark:text-slate-100"
                  >
                    <option value="power">⚡ قطعی و مدیریت بار برق</option>
                    <option value="gas">🔥 افت فشار و قطعی گاز</option>
                    <option value="water">💧 قطعی و شبکه آبرسانی</option>
                    <option value="weather">🌪️ هشدار هواشناسی و برودت هوا</option>
                    <option value="security">🚨 ایمنی، حوادث و آتش‌نشانی</option>
                    <option value="general">📢 اطلاعیه عمومی شهرک</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-bold text-slate-800 dark:text-slate-100">سطح هشدار</label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-rose-500 text-slate-900 dark:text-slate-100"
                  >
                    <option value="critical">🔴 بحرانی (قرمز - اولویت فوق‌العاده)</option>
                    <option value="warning">🟠 هشدار (نارنجی)</option>
                    <option value="urgent">🟣 فوری (بنفش)</option>
                    <option value="info">🔵 اطلاع‌رسانی معمولی (آبی)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1 font-bold text-slate-800 dark:text-slate-100">مناطق و فازهای تحت تاثیر</label>
                <input
                  type="text"
                  placeholder="مثلاً: فاز ۱ و ۲ - بلوک فلزی و ریخته‌گری"
                  value={affectedAreas}
                  onChange={e => setAffectedAreas(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-rose-500 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-bold text-slate-800 dark:text-slate-100">زمان شروع</label>
                  <input
                    type="text"
                    placeholder="مثلاً: شنبه ۱۴۰۳/۰۶/۰۱ - ساعت ۰۸:۰۰"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-rose-500 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-bold text-slate-800 dark:text-slate-100">زمان پایان</label>
                  <input
                    type="text"
                    placeholder="مثلاً: شنبه ۱۴۰۳/۰۶/۰۱ - ساعت ۱۸:۰۰"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-rose-500 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-bold text-slate-800 dark:text-slate-100">شماره تماس فوری / اتفاقات</label>
                <input
                  type="text"
                  placeholder="مثلاً: ۰۲۱-۵۶۰۰۰۰ یا ۱۲۱"
                  value={phoneContact}
                  onChange={e => setPhoneContact(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-rose-500 font-mono text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block mb-1 font-bold text-slate-800 dark:text-slate-100">متن کامل اطلاعیه و نکات ایمنی *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="توضیحات دقیق عملیات، توصیه‌های ایمنی برای خاموش کردن مشعل‌ها یا ژنراتورها و هماهنگی‌های لازم..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-rose-500 text-slate-900 dark:text-slate-100 leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-0 h-4 w-4"
                />
                <label htmlFor="isActiveToggle" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                  اعلان فعال باشد و بلافاصله در بالای صفحه اصلی نمایش داده شود
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  انصراف
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-md shadow-rose-200 dark:shadow-none cursor-pointer disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{editingAlert ? "ذخیره تغییرات" : "ثبت و انتشار اعلان"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Native In-App UI, Never blocked by iframe sandboxes) */}
      {alertToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 rounded-2xl">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                  حذف کامل اعلان اضطراری
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  این عملیات غیرقابل بازگشت است.
                </p>
              </div>
            </div>

            <div className="bg-rose-50 dark:bg-rose-950/40 p-3.5 rounded-2xl border border-rose-100 dark:border-rose-900/50 space-y-1 text-xs">
              <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400">عنوان اعلان:</span>
              <p className="font-extrabold text-slate-800 dark:text-slate-200 line-clamp-2">
                {alertToDelete.title}
              </p>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              آیا از حذف دائم و کامل این اعلان از دیتابیس و حذف آن از صفحه اول شهرک اطمینان دارید؟
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setAlertToDelete(null)}
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

    </div>
  );
}
