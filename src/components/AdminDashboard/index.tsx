import React, { useState, useEffect } from "react";
import { CustomUser } from "../../lib/customAuth";
import { UserProfile, Unit, CATEGORIES } from "../../types";
import Dashboard from "../Dashboard";
import SmsSettings from "../Dashboard/SmsSettings";
import BannerManager from "../Dashboard/BannerManager";
import EmailSettings from "../Dashboard/EmailSettings";
import DatabaseSettings from "../Dashboard/DatabaseSettings";
import BackupRestore from "../BackupRestore";
import SystemLogsViewer from "../Dashboard/SystemLogsViewer";
import AdminSecuritySettings from "./AdminSecuritySettings";
import AdminManagersManagement from "./AdminManagersManagement";
import UnitUserDetailsModal from "./UnitUserDetailsModal";
import { 
  Database, 
  Server,
  MessageSquare, 
  Image as ImageIcon, 
  Users, 
  ShieldAlert, 
  LayoutDashboard, 
  Search, 
  Trash2, 
  Edit3, 
  ArrowRight, 
  Terminal, 
  Mail, 
  Eye, 
  Phone, 
  User, 
  Building2, 
  CheckCircle2, 
  Clock, 
  Filter, 
  Calendar, 
  Smartphone, 
  ShieldCheck,
  AlertTriangle,
  KeyRound,
  LogOut,
  Globe
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";
import HardDeleteModal from "./HardDeleteModal";

interface AdminDashboardProps {
  user: CustomUser;
  profile: UserProfile | null;
  onAdminLogout?: () => void;
  onNavigateHome?: () => void;
}

export default function AdminDashboard({ user, profile, onAdminLogout, onNavigateHome }: AdminDashboardProps) {
  const [activeAdminTab, setActiveAdminTab] = useState<"units" | "managers" | "banners" | "sms" | "email" | "database" | "backup" | "logs" | "security">("units");
  const [allUnits, setAllUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "pending" | "rejected">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  
  // Selected unit for viewing full user and workshop details
  const [selectedUnitForDetails, setSelectedUnitForDetails] = useState<Unit | null>(null);

  // Selected unit for complete hard delete wipe
  const [unitToHardDelete, setUnitToHardDelete] = useState<Unit | null>(null);

  // When a unit is selected for management, we render the Dashboard for it
  const [managingUnitId, setManagingUnitId] = useState<string | null>(null);

  const fetchUnits = async () => {
    try {
      setIsLoading(true);
      let tokenHeaders = {};
      const savedUser = localStorage.getItem("custom_auth_user");
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed?.token) {
          tokenHeaders = { "Authorization": `Bearer ${parsed.token}` };
        }
      }
      const res = await fetch("/api/admin/units", { headers: tokenHeaders });
      if (res.ok) {
        const data = await res.json();
        setAllUnits(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'approved' ? 'pending' : 'approved';
    try {
      let tokenHeaders: Record<string, string> = { "Content-Type": "application/json" };
      const savedUser = localStorage.getItem("custom_auth_user");
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed?.token) {
          tokenHeaders["Authorization"] = `Bearer ${parsed.token}`;
        }
      }
      const response = await fetch(`/api/units/${id}/status`, {
        method: "PUT",
        headers: tokenHeaders,
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        toast.success(newStatus === 'approved' ? "کارگاه تایید شد." : "کارگاه به حالت در انتظار تغییر یافت.");
        fetchUnits();
        if (selectedUnitForDetails && selectedUnitForDetails.id === id) {
          setSelectedUnitForDetails(prev => prev ? { ...prev, status: newStatus as any } : null);
        }
      } else {
        toast.error("خطا در تغییر وضعیت.");
      }
    } catch (err) {
      toast.error("خطا در برقراری ارتباط.");
    }
  };

  const handleHardDeleteConfirm = async (unitId: string) => {
    try {
      const savedUser = localStorage.getItem("custom_auth_user");
      let tokenHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed?.token) {
          tokenHeaders["Authorization"] = `Bearer ${parsed.token}`;
        }
      }
      const response = await fetch(`/api/units/${unitId}`, {
        method: "DELETE",
        headers: tokenHeaders
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        toast.success(data.message || "کارگاه و کلیه اطلاعات مربوطه به طور کامل از دیتابیس حذف گردید.");
        fetchUnits();
        if (selectedUnitForDetails?.id === unitId) {
          setSelectedUnitForDetails(null);
        }
        setUnitToHardDelete(null);
      } else {
        toast.error(data.error || "خطا در حذف کامل کارگاه.");
      }
    } catch (err) {
      toast.error("خطا در برقراری ارتباط با سرور.");
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "ثبت نشده";
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat("fa-IR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  // If a specific unit is being managed, render the Dashboard in "admin mode"
  if (managingUnitId) {
    return (
      <div className="w-full space-y-4" style={{ direction: "rtl" }}>
        <div>
          <button
            onClick={() => setManagingUnitId(null)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-all font-bold text-xs shadow-sm cursor-pointer"
          >
            <ArrowRight className="h-4 w-4" />
            <span>بازگشت به لیست کارگاه‌ها</span>
          </button>
        </div>
        <Dashboard 
          user={user} 
          profile={profile} 
          isAdmin={true} 
          adminSelectedUnitId={managingUnitId || undefined} 
          key={managingUnitId}
        />
      </div>
    );
  }

  // Filter units according to search, status, and category
  const filteredUnits = allUnits.filter(u => {
    const q = searchQuery.toLowerCase().trim();
    const owner = u.ownerUser;

    const matchesSearch = !q || (
      u.name.toLowerCase().includes(q) ||
      (u.phone && u.phone.includes(q)) ||
      (u.mobile1 && u.mobile1.includes(q)) ||
      (u.mobile2 && u.mobile2.includes(q)) ||
      (u.address && u.address.toLowerCase().includes(q)) ||
      (u.category && u.category.toLowerCase().includes(q)) ||
      (u.ownerId && u.ownerId.toLowerCase().includes(q)) ||
      (owner?.name && owner.name.toLowerCase().includes(q)) ||
      (owner?.phone && owner.phone.includes(q)) ||
      (owner?.email && owner.email.toLowerCase().includes(q)) ||
      (owner?.uid && owner.uid.toLowerCase().includes(q))
    );

    const matchesStatus = statusFilter === "all" || (u.status || "pending") === statusFilter;
    const matchesCategory = categoryFilter === "all" || u.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const totalUnits = allUnits.length;
  const approvedCount = allUnits.filter(u => u.status === 'approved').length;
  const pendingCount = allUnits.filter(u => !u.status || u.status === 'pending').length;
  const uniqueUsersCount = new Set(allUnits.map(u => u.ownerId)).size;

  return (
    <div className="w-full space-y-6 pb-20" style={{ direction: "rtl" }}>
      {/* Top Banner */}
      <div className="bg-gradient-to-l from-rose-600 via-rose-700 to-rose-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              پنل نظارت و مدیریت ارشد (Super Admin)
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black">مدیریت جامع سامانه شهرک صنعتی</h2>
          <p className="text-rose-100 text-xs sm:text-sm font-medium leading-relaxed">
            مدیر و مدیر ارشد هیچکدام کارگاه شخصی ندارند؛ این پنل صرفاً جهت مدیریت، نظارت، بررسی هویت کاربران و کنترل پلتفرم است.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="relative z-10 flex flex-wrap items-center gap-2.5 shrink-0">
          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 transition-all cursor-pointer"
            >
              <Globe className="h-4 w-4" />
              <span>مشاهده سامانه عمومی</span>
            </button>
          )}

          {onAdminLogout && (
            <button
              onClick={onAdminLogout}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-rose-950/80 hover:bg-rose-950 text-rose-200 border border-rose-800/80 transition-all cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>خروج از پنل مدیریت</span>
            </button>
          )}
        </div>

        <ShieldAlert className="h-32 w-32 text-white/10 absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/4 pointer-events-none" />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveAdminTab("units")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeAdminTab === "units"
              ? "bg-rose-600 text-white shadow-md shadow-rose-200"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>مدیریت کارگاه‌ها و کاربران ({allUnits.length})</span>
        </button>
        <button
          onClick={() => setActiveAdminTab("managers")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeAdminTab === "managers"
              ? "bg-rose-600 text-white shadow-md shadow-rose-200"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>تعیین و مدیریت مدیران</span>
        </button>
        <button
          onClick={() => setActiveAdminTab("banners")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeAdminTab === "banners"
              ? "bg-rose-600 text-white shadow-md shadow-rose-200"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <ImageIcon className="h-4 w-4" />
          <span>تبلیغات و بنرها</span>
        </button>
        <button
          onClick={() => setActiveAdminTab("sms")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeAdminTab === "sms"
              ? "bg-rose-600 text-white shadow-md shadow-rose-200"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          <span>تنظیمات و لاگ پیامک</span>
        </button>
        <button
          onClick={() => setActiveAdminTab("email")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeAdminTab === "email"
              ? "bg-rose-600 text-white shadow-md shadow-rose-200"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <Mail className="h-4 w-4" />
          <span>تنظیمات ایمیل</span>
        </button>
        <button
          onClick={() => setActiveAdminTab("database")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeAdminTab === "database"
              ? "bg-rose-600 text-white shadow-md shadow-rose-200"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <Server className="h-4 w-4" />
          <span>متغیرهای دیتابیس</span>
        </button>
        <button
          onClick={() => setActiveAdminTab("backup")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeAdminTab === "backup"
              ? "bg-rose-600 text-white shadow-md shadow-rose-200"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <Database className="h-4 w-4" />
          <span>پشتیبان‌گیری</span>
        </button>
        <button
          onClick={() => setActiveAdminTab("logs")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeAdminTab === "logs"
              ? "bg-rose-600 text-white shadow-md shadow-rose-200"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <Terminal className="h-4 w-4" />
          <span>لاگ‌های خطا و سیستم</span>
        </button>
        <button
          onClick={() => setActiveAdminTab("security")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeAdminTab === "security"
              ? "bg-rose-600 text-white shadow-md shadow-rose-200"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <KeyRound className="h-4 w-4" />
          <span>امنیت و رمز ورود مدیر</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeAdminTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeAdminTab === "units" && (
            <div className="space-y-6">
              
              {/* Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-3">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xl font-black text-slate-800">{totalUnits}</div>
                    <div className="text-slate-400 text-xs font-medium">کل کارگاه‌های ثبت شده</div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-3">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xl font-black text-emerald-600">{approvedCount}</div>
                    <div className="text-slate-400 text-xs font-medium">تایید و منتشر شده</div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-3">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xl font-black text-amber-600">{pendingCount}</div>
                    <div className="text-slate-400 text-xs font-medium">در انتظار بررسی</div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-3">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xl font-black text-blue-600">{uniqueUsersCount}</div>
                    <div className="text-slate-400 text-xs font-medium">کاربران ثبت‌کننده</div>
                  </div>
                </div>
              </div>

              {/* Units Table Container */}
              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-6">
                
                {/* Search and Filters Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-extrabold text-slate-900 flex items-center gap-2 text-base">
                      <Users className="h-5 w-5 text-indigo-600" />
                      <span>لیست کارگاه‌ها و مشخصات کامل کاربران ثبت‌کننده</span>
                    </h3>
                    <p className="text-slate-400 text-xs mt-1">
                      مشاهده اطلاعات هویتی صاحب حساب، شماره موبایل، ایمیل و مدیریت کامل دسترسی‌ها
                    </p>
                  </div>

                  {/* Filter Controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status Tabs */}
                    <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
                      <button
                        onClick={() => setStatusFilter("all")}
                        className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                      >
                        همه ({allUnits.length})
                      </button>
                      <button
                        onClick={() => setStatusFilter("approved")}
                        className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === "approved" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                      >
                        تایید شده ({approvedCount})
                      </button>
                      <button
                        onClick={() => setStatusFilter("pending")}
                        className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === "pending" ? "bg-white text-amber-700 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                      >
                        در انتظار ({pendingCount})
                      </button>
                    </div>

                    {/* Category Dropdown */}
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="all">همه دسته‌بندی‌ها</option>
                      {CATEGORIES.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>

                    {/* Search Input */}
                    <div className="relative w-full sm:w-80">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="جستجو در کارگاه، نام کاربر، موبایل یا ایمیل..."
                        className="w-full pl-4 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {isLoading ? (
                  <div className="text-center py-16 text-slate-400 text-sm flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>در حال بارگذاری اطلاعات کارگاه‌ها...</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-100">
                    <table className="w-full text-right text-sm">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 text-xs font-bold">
                          <th className="py-3.5 pr-4 w-12 text-center">ردیف</th>
                          <th className="py-3.5">نام کارگاه</th>
                          <th className="py-3.5">دسته‌بندی</th>
                          <th className="py-3.5">کاربر ثبت‌کننده</th>
                          <th className="py-3.5">تلفن ثبت‌نامی</th>
                          <th className="py-3.5 text-center">وضعیت انتشار</th>
                          <th className="py-3.5 text-center pl-4">عملیات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredUnits.map((u, idx) => {
                          const owner = u.ownerUser;
                          const categoryName = CATEGORIES.find(c => c.id === u.category)?.name || u.category;
                          const userDisplayName = owner?.name || owner?.phone || u.mobile1 || u.phone || "کاربر ثبت‌نامی";

                          return (
                            <tr key={`${u.id}-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                              {/* Row Number */}
                              <td className="py-3.5 pr-4 text-slate-400 font-mono text-xs text-center">
                                {idx + 1}
                              </td>

                              {/* Workshop Info */}
                              <td className="py-3.5">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={u.profileImage || "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=100"}
                                    alt={u.name}
                                    className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                                  />
                                  <span className="font-bold text-slate-900 text-sm">
                                    {u.name}
                                  </span>
                                </div>
                              </td>

                              {/* Category */}
                              <td className="py-3.5">
                                <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-medium inline-block">
                                  {categoryName}
                                </span>
                              </td>

                              {/* User Info (Concise) */}
                              <td className="py-3.5">
                                <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                                  <User className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                                  <span className="truncate max-w-[150px]">
                                    {userDisplayName}
                                  </span>
                                </div>
                              </td>

                              {/* Registrant Phone */}
                              <td className="py-3.5 text-xs">
                                {owner?.phone || u.mobile1 || u.phone ? (
                                  <a 
                                    href={`tel:${owner?.phone || u.mobile1 || u.phone}`} 
                                    className="text-slate-800 hover:text-indigo-600 font-mono font-bold inline-flex items-center gap-1 transition-colors"
                                    style={{ direction: "ltr" }}
                                    title="تماس با شماره ثبت‌نامی"
                                  >
                                    <Smartphone className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                                    <span>{owner?.phone || u.mobile1 || u.phone}</span>
                                  </a>
                                ) : (
                                  <span className="text-slate-400 font-mono">—</span>
                                )}
                              </td>

                              {/* Status */}
                              <td className="py-3.5 text-center">
                                <button
                                  onClick={() => handleToggleStatus(u.id, u.status || 'pending')}
                                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                                    u.status === 'approved'
                                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                      : u.status === 'rejected'
                                      ? 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                                      : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                  }`}
                                  title="برای تغییر وضعیت کلیک کنید"
                                >
                                  {u.status === 'approved' ? 'تایید شده' : u.status === 'rejected' ? 'رد شده' : 'در انتظار تایید'}
                                </button>
                              </td>

                              {/* Actions */}
                              <td className="py-3.5 pl-4">
                                <div className="flex items-center justify-center gap-1.5">
                                  {/* View Full User and Workshop Details Modal Button */}
                                  <button
                                    onClick={() => setSelectedUnitForDetails(u)}
                                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs border border-indigo-100"
                                    title="مشاهده شناسنامه و مشخصات کامل"
                                  >
                                    <Eye className="h-3.5 w-3.5 text-indigo-600" />
                                    <span>مشخصات کامل</span>
                                  </button>

                                  {/* Manage Panel */}
                                  <button
                                    onClick={() => setManagingUnitId(u.id)}
                                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                                    title="مدیریت مستقیم پنل کارگاه"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                    <span>مدیریت</span>
                                  </button>

                                  {/* Delete Unit Completely */}
                                  <button
                                    onClick={() => setUnitToHardDelete(u)}
                                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border border-rose-200"
                                    title="حذف کامل و دائمی از پایگاه داده"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                                    <span>حذف کامل</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                        {filteredUnits.length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                              هیچ کارگاهی مطابق با جستجو یا فیلتر انتخاب شده یافت نشد.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {activeAdminTab === "managers" && (
            <AdminManagersManagement />
          )}

          {activeAdminTab === "banners" && (
            <BannerManager isAdmin={true} onClose={() => {}} />
          )}

          {activeAdminTab === "sms" && (
            <SmsSettings isAdmin={true} onClose={() => {}} />
          )}

          {activeAdminTab === "email" && (
            <EmailSettings onClose={() => {}} />
          )}

          {activeAdminTab === "database" && (
            <DatabaseSettings />
          )}

          {activeAdminTab === "backup" && (
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
              <BackupRestore userUid={user.uid} unit={null} products={[]} onRefresh={() => {}} isAdmin={true} />
            </div>
          )}

          {activeAdminTab === "logs" && (
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
              <SystemLogsViewer />
            </div>
          )}

          {activeAdminTab === "security" && (
            <AdminSecuritySettings />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Full Details Modal for Selected Unit and Registrant User */}
      {selectedUnitForDetails && (
        <UnitUserDetailsModal
          unit={selectedUnitForDetails}
          onClose={() => setSelectedUnitForDetails(null)}
          onManage={(id) => {
            setSelectedUnitForDetails(null);
            setManagingUnitId(id);
          }}
          onToggleStatus={handleToggleStatus}
          onDelete={(targetUnit) => {
            setSelectedUnitForDetails(null);
            setUnitToHardDelete(targetUnit);
          }}
        />
      )}

      {/* Complete Hard Delete Wipe Modal */}
      {unitToHardDelete && (
        <HardDeleteModal
          unit={unitToHardDelete}
          onClose={() => setUnitToHardDelete(null)}
          onConfirm={handleHardDeleteConfirm}
        />
      )}
    </div>
  );
}
