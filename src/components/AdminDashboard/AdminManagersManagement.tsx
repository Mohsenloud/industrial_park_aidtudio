import React, { useState, useEffect } from "react";
import { 
  Users, 
  UserPlus, 
  KeyRound, 
  ShieldCheck, 
  Lock, 
  UserCheck, 
  UserX, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Search, 
  RefreshCw,
  Phone,
  Mail,
  Shield,
  Clock,
  Sparkles,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "react-hot-toast";

interface SystemManager {
  id: string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  role: "super_admin" | "executive_manager" | "unit_moderator" | "banner_manager" | "support_manager" | "manager";
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
}

export const AVAILABLE_PERMISSIONS = [
  { id: "units", label: "مدیریت و تایید کارگاه‌ها", desc: "بررسی، تایید، ویرایش و حذف واحدهای صنعتی و مشاهده هویت کاربران" },
  { id: "content", label: "ویرایش متون و صفحه اصلی", desc: "تغییر و مدیریت تیترها، پاراگراف‌ها و متون صفحه اول سامانه" },
  { id: "banners", label: "تبلیغات و بنرها", desc: "مدیریت بنرهای تبلیغاتی، اسلایدرها و تبلیغات صفحه اول" },
  { id: "sms", label: "پیامک و اطلاع‌رسانی", desc: "مشاهده لاگ‌ها، ارسال پیامک و پیکربندی درگاه پیامکی" },
  { id: "email", label: "تنظیمات ایمیل", desc: "پیکربندی سرور SMTP و قالب ایمیل‌های اطلاع‌رسانی" },
  { id: "database", label: "متغیرهای دیتابیس", desc: "مشاهده پارامترهای دیتابیس و وضعیت اتصالات سیستم" },
  { id: "backup", label: "پشتیبان‌گیری و بازیابی", desc: "تهیه فایل پشتیبان و بازگردانی اطلاعات" },
  { id: "logs", label: "لاگ‌های سیستم و خطاها", desc: "مشاهده گزارشات رخدادها و خطاهای پلتفرم" },
  { id: "managers", label: "تعیین و مدیریت مدیران", desc: "تعریف، ویرایش و مدیریت دسترسی سایر مدیران سامانه" },
  { id: "security", label: "تنظیمات امنیت و رمز ورود", desc: "پیکربندی امنیتی و تغییر مشخصات ورود مدیر" },
];

export default function AdminManagersManagement() {
  const [managers, setManagers] = useState<SystemManager[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal state for Add/Edit Manager
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingManager, setEditingManager] = useState<SystemManager | null>(null);

  // Modal state for Password Reset
  const [resetPassModalManager, setResetPassModalManager] = useState<SystemManager | null>(null);
  const [newDirectPassword, setNewDirectPassword] = useState("");
  const [showDirectPassword, setShowDirectPassword] = useState(false);

  // Form fields
  const [formName, setFormName] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formRole, setFormRole] = useState<string>("executive_manager");
  const [formPermissions, setFormPermissions] = useState<string[]>(["units", "banners", "sms"]);
  const [formShowPass, setFormShowPass] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getAuthHeaders = (): Record<string, string> => {
    let headers: Record<string, string> = { "Content-Type": "application/json" };
    const savedUser = localStorage.getItem("custom_auth_user");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed?.token) {
          headers["Authorization"] = `Bearer ${parsed.token}`;
        }
      } catch (_) {}
    }
    return headers;
  };

  const fetchManagers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/managers", {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json().catch(() => []);
        setManagers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error fetching managers:", err);
      toast.error("خطا در بارگذاری لیست مدیران");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchManagers();
  }, []);

  const handleOpenAddModal = () => {
    setEditingManager(null);
    setFormName("");
    setFormUsername("");
    setFormPassword("");
    setFormEmail("");
    setFormPhone("");
    setFormRole("executive_manager");
    setFormPermissions(["units", "banners", "sms"]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (m: SystemManager) => {
    setEditingManager(m);
    setFormName(m.name);
    setFormUsername(m.username);
    setFormPassword(""); // leave empty unless changing
    setFormEmail(m.email || "");
    setFormPhone(m.phone || "");
    setFormRole(m.role || "executive_manager");
    setFormPermissions(m.permissions || ["units", "banners", "sms"]);
    setIsModalOpen(true);
  };

  const handleRoleChange = (newRole: string) => {
    setFormRole(newRole);
    if (newRole === "super_admin") {
      setFormPermissions(AVAILABLE_PERMISSIONS.map(p => p.id));
    } else if (newRole === "executive_manager") {
      setFormPermissions(["units", "banners", "sms", "email", "logs"]);
    } else if (newRole === "unit_moderator") {
      setFormPermissions(["units", "logs"]);
    } else if (newRole === "banner_manager") {
      setFormPermissions(["banners"]);
    } else if (newRole === "support_manager") {
      setFormPermissions(["units", "sms", "email"]);
    }
  };

  const handleSelectAllPermissions = () => {
    setFormPermissions(AVAILABLE_PERMISSIONS.map(p => p.id));
  };

  const handleClearAllPermissions = () => {
    setFormPermissions([]);
  };

  const togglePermission = (permId: string) => {
    setFormPermissions(prev => 
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  const handleSubmitManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("وارد کردن نام و نام خانوادگی مدیر الزامی است.");
      return;
    }
    if (!formUsername.trim()) {
      toast.error("وارد کردن نام کاربری الزامی است.");
      return;
    }
    if (!editingManager && (!formPassword || formPassword.length < 6)) {
      toast.error("کلمه عبور برای مدیر جدید باید حداقل ۶ کاراکتر باشد.");
      return;
    }

    try {
      setIsSubmitting(true);

      if (editingManager) {
        // Update existing manager
        const res = await fetch(`/api/admin/managers/${editingManager.id}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            name: formName.trim(),
            username: formUsername.trim(),
            password: formPassword.trim() || undefined,
            email: formEmail.trim() || undefined,
            phone: formPhone.trim() || undefined,
            role: formRole,
            permissions: formPermissions
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "خطا در ویرایش مدیر");
        toast.success(data.message || "اطلاعات مدیر به‌روزرسانی شد.");
      } else {
        // Create new manager
        const res = await fetch("/api/admin/managers", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            name: formName.trim(),
            username: formUsername.trim(),
            password: formPassword.trim(),
            email: formEmail.trim() || undefined,
            phone: formPhone.trim() || undefined,
            role: formRole,
            permissions: formPermissions
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "خطا در تعریف مدیر جدید");
        toast.success(data.message || "مدیر جدید با موفقیت اضافه شد.");
      }

      setIsModalOpen(false);
      fetchManagers();
    } catch (err: any) {
      toast.error(err.message || "خطا در پردازش درخواست");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (m: SystemManager) => {
    try {
      const res = await fetch(`/api/admin/managers/${m.id}/toggle-status`, {
        method: "POST",
        headers: getAuthHeaders()
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(data.message || "وضعیت مدیر تغییر یافت.");
        setManagers(prev => prev.map(item => item.id === m.id ? { ...item, isActive: data.isActive } : item));
      } else {
        toast.error(data.error || "خطا در تغییر وضعیت");
      }
    } catch (err) {
      toast.error("خطا در برقراری ارتباط");
    }
  };

  const handleDeleteManager = async (m: SystemManager) => {
    if (!window.confirm(`آیا از حذف کامل دسترسی مدیریتی «${m.name}» (نام کاربری: ${m.username}) اطمینان دارید؟`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/managers/${m.id}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(data.message || "مدیر با موفقیت حذف شد.");
        setManagers(prev => prev.filter(item => item.id !== m.id));
      } else {
        toast.error(data.error || "خطا در حذف مدیر");
      }
    } catch (err) {
      toast.error("خطا در حذف مدیر");
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassModalManager) return;
    if (!newDirectPassword || newDirectPassword.length < 6) {
      toast.error("کلمه عبور جدید باید حداقل ۶ کاراکتر باشد.");
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/admin/managers/${resetPassModalManager.id}/reset-password`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ newPassword: newDirectPassword.trim() })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(data.message || "کلمه عبور مدیر با موفقیت تغییر کرد.");
        setResetPassModalManager(null);
        setNewDirectPassword("");
      } else {
        toast.error(data.error || "خطا در بازنشانی کلمه عبور");
      }
    } catch (err) {
      toast.error("خطا در برقراری ارتباط با سرور");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredManagers = managers.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.phone && m.phone.includes(searchQuery))
  );

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="flex items-start sm:items-center gap-4 relative z-10">
          <div className="p-4 bg-gradient-to-br from-rose-500 to-rose-600 text-white rounded-2xl shadow-md shadow-rose-200">
            <Users className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-black text-slate-800">تعریف و مدیریت مدیران سامانه</h3>
              <span className="bg-rose-100 text-rose-700 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">
                سطح اختیارات مدیر ارشد
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed max-w-2xl">
              شما به عنوان مدیریت ارشد سامانه می‌توانید مدیران جدید با نام، نام کاربری اختصاصی، کلمه عبور و سطح دسترسی معین تعیین نمایید تا با حساب خود وارد پنل مدیریت شوند.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={fetchManagers}
            disabled={isLoading}
            className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 transition-all cursor-pointer"
            title="به‌روزرسانی لیست"
          >
            <RefreshCw className={`h-5 w-5 ${isLoading ? "animate-spin text-rose-600" : ""}`} />
          </button>
          
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs sm:text-sm font-extrabold shadow-md shadow-rose-200 transition-all cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>تعریف مدیر جدید</span>
          </button>
        </div>
      </div>

      {/* Info helper note */}
      <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3 text-amber-900 text-xs leading-relaxed">
        <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">نکته امنیتی:</span> مدیران تعریف شده توسط شما، می‌توانند از طریق صفحه <strong>ورود به پنل مدیریت (/admin-login)</strong> با نام کاربری و رمز عبوری که برایشان مشخص کرده‌اید وارد شوند و بخش‌های مجاز را مدیریت کنند. مدیران فاقد کارگاه شخصی هستند و صرفاً نقش نظارتی و ستادی دارند.
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="h-4 w-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در نام، نام کاربری یا شماره همراه مدیر..."
            className="w-full bg-white border border-slate-200 focus:border-rose-500 rounded-2xl pr-10 pl-4 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none transition-all shadow-xs"
          />
        </div>

        <div className="text-xs font-bold text-slate-500">
          تعداد کل مدیران تعریف‌شده: <span className="text-rose-600 font-black">{managers.length} نفر</span>
        </div>
      </div>

      {/* Managers Table / Cards */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        {filteredManagers.length === 0 ? (
          <div className="py-16 px-4 text-center space-y-3">
            <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-3xl flex items-center justify-center mx-auto border border-slate-100">
              <Users className="h-8 w-8" />
            </div>
            <h4 className="text-sm font-bold text-slate-700">هیچ مدیری یافت نشد</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              هنوز مدیری تعریف نکرده‌اید یا با عبارت جستجوی شما مطابقت ندارد.
            </p>
            <button
              onClick={handleOpenAddModal}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>ایجاد اولین مدیر</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold text-[11px] sm:text-xs">
                  <th className="py-4 px-5">نام و مشخصات مدیر</th>
                  <th className="py-4 px-4">نام کاربری اختصاصی</th>
                  <th className="py-4 px-4">نقش سازمانی</th>
                  <th className="py-4 px-4">وضعیت حساب</th>
                  <th className="py-4 px-4">آخرین ورود</th>
                  <th className="py-4 px-5 text-center">عملیات و مدیریت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredManagers.map((m, mIdx) => (
                  <tr key={`${m.id || 'mgr'}-${mIdx}`} className="hover:bg-slate-50/60 transition-colors">
                    {/* Name & Contact */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
                          m.isActive ? "bg-rose-50 text-rose-700 border border-rose-100" : "bg-slate-100 text-slate-400"
                        }`}>
                          {m.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900">{m.name}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            {m.phone && <span>{m.phone}</span>}
                            {m.email && <span>{m.email}</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Username */}
                    <td className="py-4 px-4">
                      <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg border border-slate-200/60">
                        {m.username}
                      </span>
                    </td>

                    {/* Role / Permissions */}
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {m.role === "executive_manager" ? "مدیر اجرایی" :
                           m.role === "unit_moderator" ? "ناظر کارگاه‌ها" :
                           m.role === "banner_manager" ? "مدیر تبلیغات" :
                           m.role === "support_manager" ? "مدیر پشتیبانی" : "مدیر سامانه"}
                        </span>
                        <div className="text-[10px] text-slate-400">
                          {m.permissions?.length || 0} دسترسی فعال
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      {m.isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          فعال
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          مسدود / غیرفعال
                        </span>
                      )}
                    </td>

                    {/* Last Login */}
                    <td className="py-4 px-4 text-[11px] text-slate-500">
                      {m.lastLoginAt ? (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          <span>{new Date(m.lastLoginAt).toLocaleDateString("fa-IR")}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">هنوز وارد نشده</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Reset password button */}
                        <button
                          onClick={() => {
                            setResetPassModalManager(m);
                            setNewDirectPassword("");
                          }}
                          className="p-2 rounded-xl text-amber-600 hover:bg-amber-50 hover:text-amber-700 transition-colors cursor-pointer border border-transparent hover:border-amber-200"
                          title="تغییر کلمه عبور این مدیر"
                        >
                          <KeyRound className="h-4 w-4" />
                        </button>

                        {/* Edit button */}
                        <button
                          onClick={() => handleOpenEditModal(m)}
                          className="p-2 rounded-xl text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors cursor-pointer border border-transparent hover:border-indigo-200"
                          title="ویرایش مشخصات و دسترسی‌ها"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>

                        {/* Toggle active button */}
                        <button
                          onClick={() => handleToggleStatus(m)}
                          className={`p-2 rounded-xl transition-colors cursor-pointer border border-transparent ${
                            m.isActive 
                              ? "text-slate-500 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200" 
                              : "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                          }`}
                          title={m.isActive ? "غیرفعال کردن دسترسی مدیر" : "فعال کردن مجدد حساب مدیر"}
                        >
                          {m.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </button>

                        {/* Delete button */}
                        <button
                          onClick={() => handleDeleteManager(m)}
                          className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                          title="حذف کامل مدیر"
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

      {/* MODAL 1: Add/Edit Manager */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 w-full max-w-xl shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                    {editingManager ? <Edit3 className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-800">
                      {editingManager ? `ویرایش اطلاعات مدیر «${editingManager.name}»` : "تعریف مدیر جدید برای سامانه"}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      تعیین نام، نام کاربری، کلمه عبور و دسترسی‌های اختصاصی
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmitManager} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      نام و نام خانوادگی مدیر <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="مثال: مهندس حسینی"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 focus:bg-white text-slate-900 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm outline-none transition-all"
                      required
                    />
                  </div>

                  {/* Username */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      نام کاربری اختصاصی ورود <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                      placeholder="مثال: hosseini"
                      dir="ltr"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 focus:bg-white text-slate-900 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm outline-none transition-all font-mono"
                      required
                    />
                  </div>
                </div>

                {/* Password (Required for create, optional for edit) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">
                      {editingManager ? "کلمه عبور جدید (اختیاری)" : "کلمه عبور ورود به پنل"} <span className="text-rose-500">*</span>
                    </label>
                    {editingManager && (
                      <span className="text-[10px] text-slate-400">در صورت عدم تمایل به تغییر، خالی بگذارید</span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={formShowPass ? "text" : "password"}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder={editingManager ? "••••••••" : "حداقل ۶ کاراکتر"}
                      dir="ltr"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 focus:bg-white text-slate-900 rounded-xl pr-3.5 pl-10 py-2.5 text-xs sm:text-sm outline-none transition-all font-mono"
                      required={!editingManager}
                    />
                    <button
                      type="button"
                      onClick={() => setFormShowPass(!formShowPass)}
                      className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {formShowPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Phone */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      شماره تماس همراه (اختیاری)
                    </label>
                    <input
                      type="tel"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="0912..."
                      dir="ltr"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 focus:bg-white text-slate-900 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm outline-none transition-all font-mono"
                    />
                  </div>

                  {/* Role */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      نقش و سمت مدیریتی
                    </label>
                    <select
                      value={formRole}
                      onChange={(e) => handleRoleChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 focus:bg-white text-slate-900 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm outline-none transition-all cursor-pointer font-bold"
                    >
                      <option value="executive_manager">مدیر اجرایی سامانه (پیشنهادی)</option>
                      <option value="unit_moderator">ناظر و بازرس کارگاه‌ها</option>
                      <option value="banner_manager">مدیر تبلیغات و بنرها</option>
                      <option value="support_manager">مدیر پشتیبانی و پیام‌رسانی</option>
                      <option value="super_admin">دسترسی کامل (مدیر ارشد)</option>
                    </select>
                  </div>
                </div>

                {/* Permissions selection */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-800">
                      تعیین میزان دسترسی‌ها و بخش‌های مجاز ({formPermissions.length} از {AVAILABLE_PERMISSIONS.length} انتخاب شده):
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllPermissions}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                      >
                        انتخاب همه
                      </button>
                      <span className="text-slate-300 text-xs">•</span>
                      <button
                        type="button"
                        onClick={handleClearAllPermissions}
                        className="text-[11px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                      >
                        لغو همه
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {AVAILABLE_PERMISSIONS.map((perm) => {
                      const isChecked = formPermissions.includes(perm.id);
                      return (
                        <div
                          key={perm.id}
                          onClick={() => togglePermission(perm.id)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-2.5 select-none ${
                            isChecked
                              ? "bg-rose-50/70 border-rose-200 text-rose-950"
                              : "bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100/70"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                          />
                          <div>
                            <div className="text-xs font-bold">{perm.label}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{perm.desc}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-200 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? "در حال ذخیره..." : editingManager ? "ذخیره تغییرات" : "ایجاد و فعال‌سازی مدیر"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Reset Password Dialog */}
      <AnimatePresence>
        {resetPassModalManager && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">
                    تغییر کلمه عبور مدیر «{resetPassModalManager.name}»
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    نام کاربری: <span className="font-mono text-slate-700 font-bold">{resetPassModalManager.username}</span>
                  </p>
                </div>
              </div>

              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    کلمه عبور جدید
                  </label>
                  <div className="relative">
                    <input
                      type={showDirectPassword ? "text" : "password"}
                      value={newDirectPassword}
                      onChange={(e) => setNewDirectPassword(e.target.value)}
                      placeholder="حداقل ۶ کاراکتر"
                      dir="ltr"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 focus:bg-white text-slate-900 rounded-xl pr-3.5 pl-10 py-2.5 text-sm outline-none transition-all font-mono"
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowDirectPassword(!showDirectPassword)}
                      className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showDirectPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setResetPassModalManager(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-200 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? "در حال ثبت..." : "تغییر و ثبت کلمه عبور"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
