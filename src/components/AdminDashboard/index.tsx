import React, { useState, useEffect } from "react";
import { CustomUser } from "../../lib/customAuth";
import { UserProfile, Unit, CATEGORIES, RegisteredUserItem, SiteContent } from "../../types";
import Dashboard from "../Dashboard";
import SmsSettings from "../Dashboard/SmsSettings";
import BannerManager from "../Dashboard/BannerManager";
import EmailSettings from "../Dashboard/EmailSettings";
import DatabaseSettings from "../Dashboard/DatabaseSettings";
import BackupRestore from "../BackupRestore";
import SystemLogsViewer from "../Dashboard/SystemLogsViewer";
import AdminSecuritySettings from "./AdminSecuritySettings";
import AdminManagersManagement from "./AdminManagersManagement";
import AdminSiteContentManagement from "./AdminSiteContentManagement";
import UnitUserDetailsModal from "./UnitUserDetailsModal";
import UserAccountDetailsModal from "./UserAccountDetailsModal";
import EmergencyAlertsManager from "./EmergencyAlertsManager";
import AdminCapacitiesManagement from "./AdminCapacitiesManagement";
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
  Globe,
  FileText,
  UserX,
  UserCheck,
  PlusCircle,
  Copy,
  Check,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  AlertOctagon,
  Wrench
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";
import HardDeleteModal from "./HardDeleteModal";
import DeleteUserModal from "./DeleteUserModal";
import AdminEditUnitModal from "./AdminEditUnitModal";

interface AdminDashboardProps {
  user: CustomUser;
  profile: UserProfile | null;
  onAdminLogout?: () => void;
  onNavigateHome?: () => void;
  onContentSaved?: (content: SiteContent) => void;
}

export default function AdminDashboard({ user, profile, onAdminLogout, onNavigateHome, onContentSaved }: AdminDashboardProps) {
  const [activeAdminTab, setActiveAdminTab] = useState<"units" | "content" | "alerts" | "capacities" | "managers" | "banners" | "sms" | "email" | "database" | "backup" | "logs" | "security">(() => {
    try {
      const savedAdminTab = localStorage.getItem("custom_admin_tab");
      const validTabs = ["units", "content", "alerts", "capacities", "managers", "banners", "sms", "email", "database", "backup", "logs", "security"];
      if (savedAdminTab && validTabs.includes(savedAdminTab)) {
        return savedAdminTab as any;
      }
    } catch (_) {}
    return "units";
  });

  useEffect(() => {
    try {
      localStorage.setItem("custom_admin_tab", activeAdminTab);
    } catch (_) {}
  }, [activeAdminTab]);

  const [activeTabCategory, setActiveTabCategory] = useState<"all" | "core" | "communication" | "system">("all");
  const [unitsViewMode, setUnitsViewMode] = useState<"workshops" | "users_without_workshop" | "all_users">("workshops");
  const [allUnits, setAllUnits] = useState<Unit[]>([]);
  const [allUsers, setAllUsers] = useState<RegisteredUserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "pending" | "rejected">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Permissions & Role State
  const isDirectSuperAdmin = 
    user?.role === "super_admin" || 
    user?.uid === "usr_direct_admin" || 
    user?.uid === "admin" || 
    user?.email === "manamalat@gmail.com" || 
    user?.email === "admin@industrialpark.ir" ||
    (Array.isArray(user?.permissions) && user.permissions.includes("*"));

  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(isDirectSuperAdmin);
  const [userPermissions, setUserPermissions] = useState<string[]>(
    isDirectSuperAdmin
      ? ["units", "content", "alerts", "capacities", "managers", "banners", "sms", "email", "database", "backup", "logs", "security"]
      : (Array.isArray(user?.permissions) && user.permissions.length > 0 ? user.permissions : ["units", "content", "alerts", "capacities", "banners", "sms"])
  );
  const [managerRoleTitle, setManagerRoleTitle] = useState<string>(
    isDirectSuperAdmin 
      ? "مدیر ارشد سامانه (Super Admin)" 
      : (user?.role === "executive_manager" ? "مدیر اجرایی سامانه" : (user?.name || "مدیر سامانه"))
  );
  const [isPermissionsLoading, setIsPermissionsLoading] = useState(true);
  
  // Selected unit for viewing full user and workshop details
  const [selectedUnitForDetails, setSelectedUnitForDetails] = useState<Unit | null>(null);

  // Selected user for viewing account details
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<RegisteredUserItem | null>(null);

  // Selected unit for complete hard delete wipe
  const [unitToHardDelete, setUnitToHardDelete] = useState<Unit | null>(null);

  // Selected unit for direct modal editing
  const [unitToEdit, setUnitToEdit] = useState<Unit | null>(null);

  // Selected user for account deletion
  const [userToDelete, setUserToDelete] = useState<RegisteredUserItem | null>(null);

  // When a unit is selected for management, we render the Dashboard for it
  const [managingUnitId, setManagingUnitId] = useState<string | null>(null);

  const fetchMyPermissions = async () => {
    try {
      setIsPermissionsLoading(true);
      let tokenHeaders: Record<string, string> = {};
      const savedUser = localStorage.getItem("custom_auth_user");
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed?.token) {
            tokenHeaders["Authorization"] = `Bearer ${parsed.token}`;
          }
        } catch (_) {}
      }

      const res = await fetch("/api/admin/my-permissions", { headers: tokenHeaders });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.isSuperAdmin) {
          setIsSuperAdmin(true);
          setUserPermissions(["units", "content", "managers", "banners", "sms", "email", "database", "backup", "logs", "security"]);
          setManagerRoleTitle("مدیر ارشد سامانه (Super Admin)");
        } else {
          setIsSuperAdmin(false);
          const perms = Array.isArray(data.permissions) ? data.permissions : [];
          setUserPermissions(perms);
          const roleMap: Record<string, string> = {
            "executive_manager": "مدیر اجرایی سامانه",
            "unit_moderator": "ناظر و بازرس کارگاه‌ها",
            "banner_manager": "مدیر تبلیغات و بنرها",
            "support_manager": "مدیر پشتیبانی و پیام‌رسانی",
            "super_admin": "مدیر ارشد سامانه",
            "manager": "مدیر سامانه"
          };
          setManagerRoleTitle(roleMap[data.role] || data.name || "مدیر سامانه");
        }
      }
    } catch (err) {
      console.warn("Could not fetch my permissions:", err);
    } finally {
      setIsPermissionsLoading(false);
    }
  };

  const fetchUnitsAndUsers = async () => {
    try {
      setIsLoading(true);
      let tokenHeaders: Record<string, string> = {};
      const savedUser = localStorage.getItem("custom_auth_user");
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed?.token) {
          tokenHeaders = { "Authorization": `Bearer ${parsed.token}` };
        }
      }

      // Fetch units and users in parallel
      const [unitsRes, usersRes] = await Promise.all([
        fetch("/api/admin/units", { headers: tokenHeaders }),
        fetch("/api/admin/users", { headers: tokenHeaders })
      ]);

      if (unitsRes.ok) {
        const unitsData = await unitsRes.json().catch(() => []);
        setAllUnits(unitsData || []);
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json().catch(() => []);
        setAllUsers(usersData || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyPermissions();
    fetchUnitsAndUsers();
  }, []);

  // All Admin Tabs with corresponding permission keys & logical grouping
  const ALL_ADMIN_TABS: { 
    id: "units" | "content" | "alerts" | "capacities" | "managers" | "banners" | "sms" | "email" | "database" | "backup" | "logs" | "security"; 
    group: "core" | "communication" | "system";
    permission: string; 
    label: string; 
    shortLabel: string;
    icon: any;
    badge?: string | number;
  }[] = [
    { id: "units", group: "core", permission: "units", label: `کارگاه‌ها و کاربران (${allUnits.length})`, shortLabel: "کارگاه‌ها و کاربران", icon: LayoutDashboard, badge: allUnits.length },
    { id: "alerts", group: "core", permission: "alerts", label: "اعلانات اضطراری و قطعی‌ها", shortLabel: "اعلانات اضطراری", icon: AlertOctagon },
    { id: "capacities", group: "core", permission: "capacities", label: "بازارگاه ظرفیت‌های خالی", shortLabel: "ظرفیت‌های خالی", icon: Wrench },
    { id: "content", group: "core", permission: "content", label: "متون و صفحات اصلی", shortLabel: "متون و صفحات", icon: FileText },
    { id: "managers", group: "core", permission: "managers", label: "سطوح دسترسی و مدیران", shortLabel: "مدیریت مدیران", icon: Users },
    { id: "banners", group: "communication", permission: "banners", label: "تبلیغات و بنرها", shortLabel: "بنرها و تبلیغات", icon: ImageIcon },
    { id: "sms", group: "communication", permission: "sms", label: "تنظیمات و پیامک", shortLabel: "سامانه پیامک", icon: MessageSquare },
    { id: "email", group: "communication", permission: "email", label: "تنظیمات ایمیل", shortLabel: "ایمیل مارکتینگ", icon: Mail },
    { id: "security", group: "system", permission: "security", label: "امنیت و دیواره آتش", shortLabel: "امنیت و WAF", icon: KeyRound },
    { id: "database", group: "system", permission: "database", label: "متغیرهای دیتابیس", shortLabel: "دیتابیس", icon: Server },
    { id: "backup", group: "system", permission: "backup", label: "پشتیبان‌گیری", shortLabel: "بک‌آپ گیری", icon: Database },
    { id: "logs", group: "system", permission: "logs", label: "لاگ‌های سیستم", shortLabel: "لاگ‌ها", icon: Terminal },
  ];

  const hasPermission = (permId: string) => {
    if (isSuperAdmin) return true;
    return userPermissions.includes(permId) || userPermissions.includes("*");
  };

  const accessibleTabs = ALL_ADMIN_TABS.filter(t => hasPermission(t.permission));

  const displayedTabs = accessibleTabs.filter(t => {
    if (activeTabCategory === "all") return true;
    return t.group === activeTabCategory;
  });

  // Ensure active tab is accessible
  useEffect(() => {
    if (!isPermissionsLoading && accessibleTabs.length > 0) {
      if (!accessibleTabs.some(t => t.id === activeAdminTab)) {
        setActiveAdminTab(accessibleTabs[0].id);
      }
    }
  }, [accessibleTabs, activeAdminTab, isPermissionsLoading]);

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
        toast.success(newStatus === 'approved' ? "کارگاه با موفقیت تایید و منتشر شد." : "کارگاه به حالت در انتظار بررسی تغییر یافت.");
        fetchUnitsAndUsers();
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
        fetchUnitsAndUsers();
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

  const handleDeleteUserAccount = (targetUser: RegisteredUserItem) => {
    setSelectedUserForDetails(null);
    setUserToDelete(targetUser);
  };

  const handleConfirmDeleteUser = async (targetUser: RegisteredUserItem) => {
    try {
      const savedUser = localStorage.getItem("custom_auth_user");
      let tokenHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed?.token) {
          tokenHeaders["Authorization"] = `Bearer ${parsed.token}`;
        }
      }

      const res = await fetch(`/api/admin/users/${targetUser.uid}`, {
        method: "DELETE",
        headers: tokenHeaders
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(data.message || "حساب کاربر با موفقیت حذف گردید.");
        setUserToDelete(null);
        setSelectedUserForDetails(null);
        fetchUnitsAndUsers();
      } else {
        toast.error(data.error || "خطا در حذف کاربر.");
      }
    } catch (err) {
      toast.error("خطا در ارتباط با سرور.");
    }
  };

  const handleCreateWorkshopForUser = (targetUser: RegisteredUserItem) => {
    setSelectedUserForDetails(null);
    toast.success(`در حال انتقال به فرم ایجاد کارگاه برای کاربر ${targetUser.name || targetUser.phone}...`);
    // Create a temporary unit for this user or enter management mode
    setManagingUnitId(`new_${targetUser.uid}`);
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
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <button
            onClick={() => setManagingUnitId(null)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-xl transition-all font-bold text-xs shadow-xs cursor-pointer"
          >
            <ArrowRight className="h-4 w-4" />
            <span>بازگشت به پیشخوان اصلی مدیریت</span>
          </button>
          <span className="text-xs font-bold text-slate-500">
            در حال مدیریت کارگاه شناسه: {managingUnitId}
          </span>
        </div>
        <Dashboard 
          user={user} 
          profile={profile} 
          isAdmin={true} 
          adminSelectedUnitId={managingUnitId.startsWith("new_") ? undefined : managingUnitId} 
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

  // Users without workshop
  const usersWithoutWorkshop = allUsers.filter(u => !u.hasUnit);

  // Filter users according to search query
  const filteredUsers = allUsers.filter(u => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.phone && u.phone.includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.uid && u.uid.toLowerCase().includes(q)) ||
      (u.units && u.units.some(un => un.name.toLowerCase().includes(q)))
    );
  });

  const filteredUsersWithoutWorkshop = usersWithoutWorkshop.filter(u => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.phone && u.phone.includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.uid && u.uid.toLowerCase().includes(q))
    );
  });

  const totalUnits = allUnits.length;
  const approvedCount = allUnits.filter(u => u.status === 'approved').length;
  const pendingCount = allUnits.filter(u => !u.status || u.status === 'pending').length;
  const totalRegisteredUsersCount = allUsers.length;
  const usersWithoutWorkshopCount = usersWithoutWorkshop.length;

  return (
    <div className="w-full space-y-6 pb-20" style={{ direction: "rtl" }}>
      {/* Top Banner Header */}
      <div className="bg-gradient-to-l from-rose-700 via-rose-800 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-md relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 border border-rose-600/30">
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="bg-white/15 px-3 py-1 rounded-full text-xs font-black backdrop-blur-sm flex items-center gap-1.5 border border-white/10">
              <ShieldCheck className="h-3.5 w-3.5 text-rose-300" />
              {isSuperAdmin ? "پنل نظارت و مدیریت ارشد (Super Admin)" : `پنل مدیریت: ${managerRoleTitle}`}
            </span>
            <span className="bg-rose-950/70 border border-rose-400/20 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-rose-200">
              {accessibleTabs.length} ماژول فعال
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            {isSuperAdmin ? "پیشخوان کنترل و مدیریت جامع سامانه" : `سامانه مدیریت • ${user.name || managerRoleTitle}`}
          </h2>
          <p className="text-rose-100/90 text-xs sm:text-sm font-medium leading-relaxed">
            {isSuperAdmin
              ? "مرکز پایش، تایید صلاحیت، مدیریت کارگاه‌ها و کاربران بدون واحد صنعتی، لاگ‌های امنیتی و پیکربندی ماژول‌های سامانه"
              : `شما به ${accessibleTabs.length} بخش مجاز تعریف‌شده توسط مدیر ارشد دسترسی دارید.`}
          </p>
        </div>

        {/* Quick Actions Header Buttons */}
        <div className="relative z-10 flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => {
              fetchUnitsAndUsers();
              toast.success("اطلاعات کارگاه‌ها و کاربران به‌روزرسانی شد.");
            }}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 transition-all cursor-pointer shadow-2xs"
            title="به‌روزرسانی داده‌ها"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>تازه‌سازی</span>
          </button>

          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white/15 hover:bg-white/25 text-white backdrop-blur-md border border-white/20 transition-all cursor-pointer shadow-2xs"
            >
              <Globe className="h-4 w-4" />
              <span>مشاهده پرتال عمومی</span>
            </button>
          )}

          {onAdminLogout && (
            <button
              onClick={onAdminLogout}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-rose-950 hover:bg-black text-rose-200 border border-rose-800/80 transition-all cursor-pointer shadow-2xs"
            >
              <LogOut className="h-4 w-4" />
              <span>خروج از حساب</span>
            </button>
          )}
        </div>

        <ShieldAlert className="h-40 w-40 text-white/5 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {/* Categorized and Optimized Tabs Navigation */}
      {accessibleTabs.length > 0 ? (
        <div className="space-y-3">
          {/* Tab Categories Filter Bar */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
              <button
                onClick={() => setActiveTabCategory("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTabCategory === "all"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                همه تب‌ها ({accessibleTabs.length})
              </button>
              <button
                onClick={() => setActiveTabCategory("core")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTabCategory === "core"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                مدیریت پایه و کارگاه‌ها
              </button>
              <button
                onClick={() => setActiveTabCategory("communication")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTabCategory === "communication"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                ارتباطات، پیامک و تبلیغات
              </button>
              <button
                onClick={() => setActiveTabCategory("system")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTabCategory === "system"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                امنیت، دیتابیس و لاگ‌ها
              </button>
            </div>

            <span className="text-[11px] font-bold text-slate-400">
              تب فعال: {ALL_ADMIN_TABS.find(t => t.id === activeAdminTab)?.shortLabel}
            </span>
          </div>

          {/* Tab Button Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5 gap-2">
            {displayedTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeAdminTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveAdminTab(tab.id)}
                  className={`flex items-center justify-between p-3 rounded-2xl text-xs font-extrabold transition-all cursor-pointer border ${
                    isActive
                      ? "bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-300"
                      : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200/90 shadow-2xs hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className={`p-1.5 rounded-xl shrink-0 ${
                      isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="truncate">{tab.shortLabel}</span>
                  </div>

                  {tab.badge !== undefined && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black font-mono shrink-0 ${
                      isActive ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-700 border border-slate-200"
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 text-amber-900 text-center my-6">
          <AlertTriangle className="h-8 w-8 text-amber-600 mx-auto mb-2" />
          <h3 className="font-black text-base">سطح دسترسی محدود شده است</h3>
          <p className="text-xs sm:text-sm text-amber-800 mt-1">
            در حال حاضر هیچ بخش فعالی توسط مدیر ارشد سامانه به این حساب کاربری اختصاص داده نشده است. جهت تعیین دسترسی‌ها لطفاً با مدیر ارشد تماس حاصل فرمایید.
          </p>
        </div>
      )}

      {/* Tab Contents */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeAdminTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {activeAdminTab === "units" && (
            <div className="space-y-6">
              
              {/* Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                
                {/* Total Units */}
                <div 
                  onClick={() => setUnitsViewMode("workshops")}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                    unitsViewMode === "workshops" ? "bg-indigo-50/80 border-indigo-200 shadow-xs ring-2 ring-indigo-300/40" : "bg-white border-slate-200/90 hover:bg-slate-50"
                  }`}
                >
                  <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl shrink-0">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xl font-black text-slate-900">{totalUnits}</div>
                    <div className="text-slate-500 text-xs font-bold">کارگاه‌های ثبت شده</div>
                  </div>
                </div>

                {/* Approved Units */}
                <div 
                  onClick={() => {
                    setUnitsViewMode("workshops");
                    setStatusFilter("approved");
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                    unitsViewMode === "workshops" && statusFilter === "approved"
                      ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-300/50 shadow-xs"
                      : "bg-white border-slate-200/90 hover:bg-slate-50"
                  }`}
                >
                  <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl shrink-0">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xl font-black text-emerald-700">{approvedCount}</div>
                    <div className="text-slate-500 text-xs font-bold">تایید و منتشر شده</div>
                  </div>
                </div>

                {/* Pending Units */}
                <div 
                  onClick={() => {
                    setUnitsViewMode("workshops");
                    setStatusFilter("pending");
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                    unitsViewMode === "workshops" && statusFilter === "pending"
                      ? "bg-amber-50 border-amber-300 ring-2 ring-amber-300/50 shadow-xs"
                      : "bg-white border-slate-200/90 hover:bg-slate-50"
                  }`}
                >
                  <div className="p-3 bg-amber-100 text-amber-700 rounded-xl shrink-0">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xl font-black text-amber-700">{pendingCount}</div>
                    <div className="text-slate-500 text-xs font-bold">در انتظار بررسی</div>
                  </div>
                </div>

                {/* Users Without Workshop */}
                <div 
                  onClick={() => setUnitsViewMode("users_without_workshop")}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                    unitsViewMode === "users_without_workshop" 
                      ? "bg-amber-100/70 border-amber-300 ring-2 ring-amber-400/50 shadow-xs" 
                      : "bg-white border-amber-200 hover:bg-amber-50/50"
                  }`}
                  title="مشاهده کاربرانی که ثبت نام کرده‌اند ولی هنوز کارگاهی ثبت نکرده‌اند"
                >
                  <div className="p-3 bg-amber-200/80 text-amber-800 rounded-xl shrink-0">
                    <UserX className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xl font-black text-amber-800">{usersWithoutWorkshopCount}</div>
                    <div className="text-amber-900 text-xs font-extrabold">کاربران بدون کارگاه</div>
                  </div>
                </div>

                {/* Total Registered Users */}
                <div 
                  onClick={() => setUnitsViewMode("all_users")}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                    unitsViewMode === "all_users" ? "bg-blue-50 border-blue-200 shadow-xs ring-2 ring-blue-300/40" : "bg-white border-slate-200/90 hover:bg-slate-50"
                  }`}
                  title="مشاهده همه کاربران عضو در سامانه"
                >
                  <div className="p-3 bg-blue-100 text-blue-700 rounded-xl shrink-0">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xl font-black text-blue-700">{totalRegisteredUsersCount}</div>
                    <div className="text-slate-500 text-xs font-bold">کل کاربران عضو</div>
                  </div>
                </div>
              </div>

              {/* Units and Users Table Container */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-6">
                
                {/* View Selection Segmented Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100">
                  <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/60">
                    
                    {/* Workshops Tab */}
                    <button
                      onClick={() => setUnitsViewMode("workshops")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                        unitsViewMode === "workshops"
                          ? "bg-white text-indigo-700 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Building2 className="h-4 w-4 text-indigo-600" />
                      <span>کارگاه‌های صنعتی ثبت‌شده ({allUnits.length})</span>
                    </button>

                    {/* Users Without Workshop Tab */}
                    <button
                      onClick={() => setUnitsViewMode("users_without_workshop")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                        unitsViewMode === "users_without_workshop"
                          ? "bg-amber-600 text-white shadow-sm"
                          : "text-amber-800 hover:bg-amber-100/60"
                      }`}
                    >
                      <UserX className="h-4 w-4" />
                      <span>کاربران بدون کارگاه ({usersWithoutWorkshopCount})</span>
                      {usersWithoutWorkshopCount > 0 && (
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                          unitsViewMode === "users_without_workshop" ? "bg-amber-800 text-white" : "bg-amber-200 text-amber-900"
                        }`}>
                          نیاز به پیگیری
                        </span>
                      )}
                    </button>

                    {/* All Users Tab */}
                    <button
                      onClick={() => setUnitsViewMode("all_users")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                        unitsViewMode === "all_users"
                          ? "bg-white text-blue-700 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Users className="h-4 w-4 text-blue-600" />
                      <span>همه کاربران ثبت‌نامی ({allUsers.length})</span>
                    </button>
                  </div>

                  <div className="text-xs font-bold text-slate-400">
                    نمایش: {unitsViewMode === "workshops" ? filteredUnits.length : (unitsViewMode === "users_without_workshop" ? filteredUsersWithoutWorkshop.length : filteredUsers.length)} ردیف
                  </div>
                </div>

                {/* Search and Filters Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-black text-slate-900 flex items-center gap-2 text-base">
                      {unitsViewMode === "workshops" ? (
                        <>
                          <Building2 className="h-5 w-5 text-indigo-600" />
                          <span>لیست کارگاه‌های صنعتی ثبت‌شده</span>
                        </>
                      ) : unitsViewMode === "users_without_workshop" ? (
                        <>
                          <UserX className="h-5 w-5 text-amber-600" />
                          <span>کاربرانی که ثبت‌نام کرده‌اند اما هنوز کارگاهی ثبت نکرده‌اند</span>
                        </>
                      ) : (
                        <>
                          <Users className="h-5 w-5 text-blue-600" />
                          <span>فهرست یکپارچه کلیه کاربران ثبت‌نامی سامانه</span>
                        </>
                      )}
                    </h3>
                    <p className="text-slate-400 text-xs mt-1">
                      {unitsViewMode === "workshops"
                        ? "مدیریت وضعیت تایید، مشاهده شناسنامه، ویرایش مشخصات و مدیریت پنل هر کارگاه"
                        : unitsViewMode === "users_without_workshop"
                        ? "افرادی که در سامانه حساب باز کرده‌اند ولی هنوز فرم معرفی واحد صنعتی را ارسال نکرده‌اند"
                        : "مشاهده تمام اشخاص عضو به همراه وضعیت کارگاه و امکان تماس و پیگیری مستقیم"}
                    </p>
                  </div>

                  {/* Filter Controls Toolbar */}
                  <div className="flex flex-wrap items-center gap-2">
                    
                    {/* Workshops Only: Status Filter & Category Dropdown */}
                    {unitsViewMode === "workshops" && (
                      <>
                        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200/60">
                          <button
                            onClick={() => setStatusFilter("all")}
                            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${statusFilter === "all" ? "bg-white text-slate-900 shadow-2xs font-extrabold" : "text-slate-600 hover:text-slate-900"}`}
                          >
                            همه ({allUnits.length})
                          </button>
                          <button
                            onClick={() => setStatusFilter("approved")}
                            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${statusFilter === "approved" ? "bg-white text-emerald-700 shadow-2xs font-extrabold" : "text-slate-600 hover:text-slate-900"}`}
                          >
                            تایید شده ({approvedCount})
                          </button>
                          <button
                            onClick={() => setStatusFilter("pending")}
                            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${statusFilter === "pending" ? "bg-white text-amber-700 shadow-2xs font-extrabold" : "text-slate-600 hover:text-slate-900"}`}
                          >
                            در انتظار ({pendingCount})
                          </button>
                        </div>

                        <select
                          value={categoryFilter}
                          onChange={(e) => setCategoryFilter(e.target.value)}
                          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                        >
                          <option value="all">همه دسته‌بندی‌ها</option>
                          {CATEGORIES.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </>
                    )}

                    {/* Search Input */}
                    <div className="relative w-full sm:w-72">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={
                          unitsViewMode === "workshops"
                            ? "جستجو در نام کارگاه، کاربر، موبایل..."
                            : "جستجو در نام کاربر، موبایل، ایمیل..."
                        }
                        className="w-full pl-4 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {isLoading ? (
                  <div className="text-center py-16 text-slate-400 text-sm flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>در حال بارگذاری اطلاعات...</span>
                  </div>
                ) : unitsViewMode === "workshops" ? (
                  
                  /* VIEW 1: WORKSHOPS TABLE */
                  <div className="overflow-x-auto rounded-2xl border border-slate-200/90">
                    <table className="w-full text-right text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-xs font-extrabold">
                          <th className="py-3.5 pr-4 w-12 text-center">ردیف</th>
                          <th className="py-3.5">نام کارگاه صنعتی</th>
                          <th className="py-3.5">دسته‌بندی</th>
                          <th className="py-3.5">صاحب حساب</th>
                          <th className="py-3.5">شماره همراه</th>
                          <th className="py-3.5 text-center">وضعیت انتشار</th>
                          <th className="py-3.5 text-center pl-4">عملیات مدیریت</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredUnits.map((u, idx) => {
                          const owner = u.ownerUser;
                          const categoryName = CATEGORIES.find(c => c.id === u.category)?.name || u.category;
                          const userDisplayName = owner?.name || owner?.phone || u.mobile1 || u.phone || "کاربر ثبت‌نامی";

                          return (
                            <tr key={`${u.id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                              {/* Row Number */}
                              <td className="py-3.5 pr-4 text-slate-400 font-mono text-xs text-center font-bold">
                                {idx + 1}
                              </td>

                              {/* Workshop Info */}
                              <td className="py-3.5">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={u.profileImage || "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=100"}
                                    alt={u.name}
                                    className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                                  />
                                  <div>
                                    <span className="font-extrabold text-slate-900 text-sm block">
                                      {u.name}
                                    </span>
                                    <span className="text-[11px] text-slate-400 font-mono">
                                      ID: {u.id}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Category */}
                              <td className="py-3.5">
                                <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-bold inline-block border border-slate-200/50">
                                  {categoryName}
                                </span>
                              </td>

                              {/* User Info */}
                              <td className="py-3.5">
                                <div className="flex items-center gap-1.5 text-xs text-slate-800 font-bold">
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

                              {/* Status Toggle Button */}
                              <td className="py-3.5 text-center">
                                <button
                                  onClick={() => handleToggleStatus(u.id, u.status || 'pending')}
                                  className={`px-3 py-1 rounded-xl text-xs font-extrabold cursor-pointer transition-all border ${
                                    u.status === 'approved'
                                      ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200'
                                      : u.status === 'rejected'
                                      ? 'bg-rose-50 text-rose-800 hover:bg-rose-100 border-rose-200'
                                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border-amber-200'
                                  }`}
                                  title="برای تغییر وضعیت انتشار کلیک کنید"
                                >
                                  {u.status === 'approved' ? 'تایید و منتشر' : u.status === 'rejected' ? 'رد شده' : 'در انتظار بررسی'}
                                </button>
                              </td>

                              {/* Clean Grouped Action Buttons */}
                              <td className="py-3.5 pl-4">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => setSelectedUnitForDetails(u)}
                                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs border border-indigo-200/60"
                                    title="مشاهده شناسنامه و مشخصات کامل"
                                  >
                                    <Eye className="h-3.5 w-3.5 text-indigo-600" />
                                    <span>شناسنامه</span>
                                  </button>

                                  <button
                                    onClick={() => setUnitToEdit(u)}
                                    className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border border-slate-200"
                                    title="ویرایش مستقیم مشخصات کارگاه"
                                  >
                                    <Edit3 className="h-3.5 w-3.5 text-slate-600" />
                                    <span>ویرایش</span>
                                  </button>

                                  <button
                                    onClick={() => setManagingUnitId(u.id)}
                                    className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                                    title="مدیریت مستقیم پنل کارگاه"
                                  >
                                    <span>پنل کارگاه</span>
                                  </button>

                                  <button
                                    onClick={() => setUnitToHardDelete(u)}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl transition-all cursor-pointer border border-rose-200"
                                    title="حذف کامل و دائمی از پایگاه داده"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-rose-600" />
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
                ) : (
                  
                  /* VIEW 2 & 3: REGISTERED USERS TABLE */
                  <div className="overflow-x-auto rounded-2xl border border-slate-200/90">
                    <table className="w-full text-right text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-xs font-extrabold">
                          <th className="py-3.5 pr-4 w-12 text-center">ردیف</th>
                          <th className="py-3.5">نام و مشخصات کاربر</th>
                          <th className="py-3.5">شماره همراه</th>
                          <th className="py-3.5">پست الکترونیک (ایمیل)</th>
                          <th className="py-3.5 text-center">وضعیت ثبت کارگاه</th>
                          <th className="py-3.5 text-center">تاریخ عضویت</th>
                          <th className="py-3.5 text-center pl-4">عملیات مدیریت</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(unitsViewMode === "users_without_workshop" ? filteredUsersWithoutWorkshop : filteredUsers).map((usr, idx) => {
                          return (
                            <tr key={`${usr.uid}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                              {/* Row Number */}
                              <td className="py-3.5 pr-4 text-slate-400 font-mono text-xs text-center font-bold">
                                {idx + 1}
                              </td>

                              {/* User Info */}
                              <td className="py-3.5">
                                <div className="flex items-center gap-2.5">
                                  <div className={`p-2 rounded-xl shrink-0 ${
                                    usr.hasUnit ? "bg-indigo-100 text-indigo-700" : "bg-amber-100 text-amber-700"
                                  }`}>
                                    <User className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <div className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                                      <span>{usr.name || "کاربر گرامی"}</span>
                                      {usr.role === "super_admin" && (
                                        <span className="bg-rose-100 text-rose-700 px-2 py-0.2 rounded-md text-[10px] font-bold">
                                          مدیر ارشد
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-slate-400 text-[11px] font-mono">
                                      UID: {usr.uid.substring(0, 14)}...
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Phone */}
                              <td className="py-3.5 text-xs">
                                {usr.phone ? (
                                  <a 
                                    href={`tel:${usr.phone}`} 
                                    className="text-slate-800 hover:text-indigo-600 font-mono font-bold inline-flex items-center gap-1 transition-colors"
                                    style={{ direction: "ltr" }}
                                    title="تماس با کاربر"
                                  >
                                    <Smartphone className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                                    <span>{usr.phone}</span>
                                  </a>
                                ) : (
                                  <span className="text-slate-400 font-mono">—</span>
                                )}
                              </td>

                              {/* Email */}
                              <td className="py-3.5 text-xs">
                                {usr.email ? (
                                  <span className="text-slate-700 font-mono text-xs truncate max-w-[180px] inline-block font-bold">
                                    {usr.email}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-mono">—</span>
                                )}
                              </td>

                              {/* Workshop Status Badge */}
                              <td className="py-3.5 text-center">
                                {usr.hasUnit ? (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                    <span>دارای {usr.unitCount} کارگاه</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-300 rounded-full text-xs font-bold">
                                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                                    <span>فاقد کارگاه ثبت‌شده</span>
                                  </span>
                                )}
                              </td>

                              {/* Date */}
                              <td className="py-3.5 text-center text-xs text-slate-500 font-mono font-bold">
                                {formatDate(usr.createdAt)}
                              </td>

                              {/* Actions */}
                              <td className="py-3.5 pl-4">
                                <div className="flex items-center justify-center gap-1.5">
                                  
                                  {/* View User Details Modal */}
                                  <button
                                    onClick={() => setSelectedUserForDetails(usr)}
                                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs border border-indigo-200/60"
                                    title="مشاهده شناسنامه کامل حساب کاربری"
                                  >
                                    <Eye className="h-3.5 w-3.5 text-indigo-600" />
                                    <span>شناسنامه حساب</span>
                                  </button>

                                  {/* Create Workshop For this User (If no workshop) */}
                                  {!usr.hasUnit && (
                                    <button
                                      onClick={() => handleCreateWorkshopForUser(usr)}
                                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                                      title="ثبت و ایجاد کارگاه به نام این کاربر"
                                    >
                                      <PlusCircle className="h-3.5 w-3.5" />
                                      <span>ثبت کارگاه</span>
                                    </button>
                                  )}

                                  {/* Delete User */}
                                  <button
                                    onClick={() => handleDeleteUserAccount(usr)}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl transition-all cursor-pointer border border-rose-200"
                                    title="حذف حساب کاربر"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                        {(unitsViewMode === "users_without_workshop" ? filteredUsersWithoutWorkshop : filteredUsers).length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                              {unitsViewMode === "users_without_workshop"
                                ? "هیچ کاربری بدون کارگاه یافت نشد؛ تمام کاربران عضو دارای کارگاه ثبت‌شده هستند."
                                : "هیچ کاربری مطابق با جستجوی شما یافت نشد."}
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
          
          {activeAdminTab === "alerts" && (
            <EmergencyAlertsManager />
          )}

          {activeAdminTab === "capacities" && (
            <AdminCapacitiesManagement units={allUnits} />
          )}


          {activeAdminTab === "content" && (
            <AdminSiteContentManagement onContentSaved={onContentSaved} />
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
          onEdit={(targetUnit) => {
            setSelectedUnitForDetails(null);
            setUnitToEdit(targetUnit);
          }}
          onToggleStatus={handleToggleStatus}
          onDelete={(targetUnit) => {
            setSelectedUnitForDetails(null);
            setUnitToHardDelete(targetUnit);
          }}
        />
      )}

      {/* Account Details Modal for Registered User */}
      {selectedUserForDetails && (
        <UserAccountDetailsModal
          userItem={selectedUserForDetails}
          onClose={() => setSelectedUserForDetails(null)}
          onCreateUnitForUser={handleCreateWorkshopForUser}
          onDeleteUser={handleDeleteUserAccount}
          onManageUnit={(unitId) => {
            setSelectedUserForDetails(null);
            setManagingUnitId(unitId);
          }}
          onEditUnit={(unit) => {
            setSelectedUserForDetails(null);
            setUnitToEdit(unit);
          }}
          onDeleteUnit={(unit) => {
            setSelectedUserForDetails(null);
            setUnitToHardDelete(unit);
          }}
          onToggleUnitStatus={(unitId, status) => {
            handleToggleStatus(unitId, status);
          }}
          onViewUnitDetails={(unit) => {
            setSelectedUserForDetails(null);
            setSelectedUnitForDetails(unit);
          }}
        />
      )}

      {/* Admin Edit Unit Modal */}
      {unitToEdit && (
        <AdminEditUnitModal
          unit={unitToEdit}
          user={user}
          profile={profile}
          onClose={() => setUnitToEdit(null)}
          onSaveSuccess={(updatedUnit) => {
            fetchUnitsAndUsers();
            toast.success(`کارگاه «${updatedUnit.name}» با موفقیت به‌روزرسانی شد.`);
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

      {/* Account Deletion Confirmation Modal */}
      {userToDelete && (
        <DeleteUserModal
          userItem={userToDelete}
          onClose={() => setUserToDelete(null)}
          onConfirm={handleConfirmDeleteUser}
        />
      )}
    </div>
  );
}
