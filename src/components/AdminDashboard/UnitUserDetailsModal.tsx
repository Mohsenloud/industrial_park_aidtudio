import React, { useState, useEffect } from "react";
import { Unit, CATEGORIES, ActivityLog, OFFICIAL_BADGES } from "../../types";
import BadgePill from "../BadgePill";
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  MapPin, 
  Building2, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Copy, 
  Check, 
  ExternalLink, 
  Edit3, 
  Trash2, 
  Smartphone, 
  Layers, 
  Globe, 
  Tag, 
  FileText,
  Activity,
  History,
  RefreshCw,
  Search,
  Plus,
  LogIn,
  PackagePlus,
  Package,
  Star,
  FileSpreadsheet,
  PhoneCall,
  Shield,
  Download,
  Filter,
  CheckCircle,
  AlertTriangle,
  Monitor,
  Award
} from "lucide-react";
import toast from "react-hot-toast";

interface UnitUserDetailsModalProps {
  unit: Unit;
  onClose: () => void;
  onManage: (unitId: string) => void;
  onToggleStatus: (unitId: string, currentStatus: string) => void;
  onDelete: (unit: Unit) => void;
  onEdit?: (unit: Unit) => void;
}

export default function UnitUserDetailsModal({
  unit,
  onClose,
  onManage,
  onToggleStatus,
  onDelete,
  onEdit
}: UnitUserDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<"details" | "activity">("details");
  const [copiedUid, setCopiedUid] = useState(false);

  // Activity Logs States
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logFilter, setLogFilter] = useState<string>("all");
  const [logSearch, setLogSearch] = useState<string>("");
  
  // New Admin Note state
  const [showAddNoteForm, setShowAddNoteForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteDescription, setNoteDescription] = useState("");
  const [noteCategory, setNoteCategory] = useState("تماس تلفنی و پیگیری");
  const [submittingNote, setSubmittingNote] = useState(false);

  // Verified Badges state
  const [unitBadges, setUnitBadges] = useState<string[]>(unit.badges || []);
  const [savingBadges, setSavingBadges] = useState(false);

  const handleToggleBadge = async (badgeId: string) => {
    const nextBadges = unitBadges.includes(badgeId)
      ? unitBadges.filter(b => b !== badgeId)
      : [...unitBadges, badgeId];
    
    setUnitBadges(nextBadges);
    setSavingBadges(true);
    try {
      const res = await fetch(`/api/admin/units/${unit.id}/badges`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify({ badges: nextBadges })
      });
      if (res.ok) {
        toast.success("نشان‌های تاییدیه کارگاه به‌روزرسانی شدند.");
        unit.badges = nextBadges;
      } else {
        toast.error("خطا در به‌روزرسانی نشان‌ها");
      }
    } catch (e) {
      toast.error("خطا در برقراری ارتباط با سرور");
    } finally {
      setSavingBadges(false);
    }
  };

  const categoryName = CATEGORIES.find(c => c.id === unit.category)?.name || unit.category;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUid(true);
    toast.success("شناسه کاربری کپی شد.");
    setTimeout(() => setCopiedUid(false), 2000);
  };

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

  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 2) return "لحظاتی پیش";
      if (diffMins < 60) return `${diffMins} دقیقه پیش`;
      if (diffHours < 24) return `${diffHours} ساعت پیش`;
      if (diffDays === 1) return "دیروز";
      if (diffDays < 30) return `${diffDays} روز پیش`;
      return formatDate(dateStr);
    } catch {
      return dateStr || "";
    }
  };

  // Helper to extract authorization header from saved auth user
  const getAuthHeaders = (): Record<string, string> => {
    try {
      const savedUser = localStorage.getItem("custom_auth_user");
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed?.token) {
          return { "Authorization": `Bearer ${parsed.token}` };
        }
      }
    } catch (e) {
      console.warn("Could not read auth token:", e);
    }
    return {};
  };

  // Fetch Activity Logs
  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`/api/units/${unit.id}/activity-logs`, {
        headers,
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setLogs(data.logs || []);
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.warn("Error fetching logs response:", errorData);
        toast.error(errorData.error || "خطا در دریافت لیست لاگ‌های فعالیت.");
      }
    } catch (err) {
      console.error("Error fetching logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [unit.id]);

  // Handle Add Admin Audit Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) {
      toast.error("لطفاً عنوان یادداشت یا اقدام را وارد کنید.");
      return;
    }

    setSubmittingNote(true);
    try {
      const headers = {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      };
      const res = await fetch(`/api/units/${unit.id}/activity-logs`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          title: `[${noteCategory}] ${noteTitle.trim()}`,
          description: noteDescription.trim() || undefined,
          action: "admin_note"
        })
      });

      if (res.ok) {
        const result = await res.json().catch(() => ({}));
        toast.success(result.message || "یادداشت نظارتی با موفقیت ثبت شد.");
        setNoteTitle("");
        setNoteDescription("");
        setShowAddNoteForm(false);
        fetchLogs();
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || "خطا در ثبت یادداشت.");
      }
    } catch (err) {
      toast.error("خطا در ارتباط با سرور.");
    } finally {
      setSubmittingNote(false);
    }
  };

  // Handle Delete a Log
  const handleDeleteLog = async (logId: string) => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`/api/admin/activity-logs/${logId}`, {
        method: "DELETE",
        headers,
        credentials: "include"
      });
      if (res.ok) {
        toast.success("لاگ با موفقیت حذف شد.");
        setLogs(prev => prev.filter(l => l.id !== logId));
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || "خطا در حذف لاگ.");
      }
    } catch (err) {
      toast.error("خطای شبکه.");
    }
  };

  // Export logs to JSON
  const handleExportLogs = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `activity_logs_${unit.id}_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success("فایل لاگ فعالیت‌ها دانلود شد.");
  };

  // Filter and search logs
  const filteredLogs = logs.filter(l => {
    // Category filter
    if (logFilter === "auth" && !["login", "user_registered"].includes(l.action)) return false;
    if (logFilter === "unit" && !["unit_created", "unit_updated", "status_changed"].includes(l.action)) return false;
    if (logFilter === "products" && !["product_added", "product_updated", "product_deleted"].includes(l.action)) return false;
    if (logFilter === "interactions" && !["quote_received", "review_added", "classified_added"].includes(l.action)) return false;
    if (logFilter === "admin" && l.action !== "admin_note" && l.performedBy !== "admin") return false;

    // Search query
    if (logSearch.trim()) {
      const q = logSearch.toLowerCase().trim();
      const matchTitle = l.title?.toLowerCase().includes(q);
      const matchDesc = l.description?.toLowerCase().includes(q);
      const matchAction = l.action?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchAction) return false;
    }

    return true;
  });

  const getLogIcon = (action: string, performedBy?: string) => {
    if (performedBy === "admin" || action === "admin_note") {
      return <Shield className="w-4 h-4 text-indigo-600" />;
    }
    switch (action) {
      case "user_registered":
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case "login":
        return <LogIn className="w-4 h-4 text-blue-600" />;
      case "unit_created":
        return <Building2 className="w-4 h-4 text-indigo-600" />;
      case "unit_updated":
        return <Edit3 className="w-4 h-4 text-sky-600" />;
      case "status_changed":
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case "product_added":
      case "product_updated":
        return <PackagePlus className="w-4 h-4 text-purple-600" />;
      case "product_deleted":
        return <Trash2 className="w-4 h-4 text-rose-600" />;
      case "quote_received":
        return <FileSpreadsheet className="w-4 h-4 text-teal-600" />;
      case "review_added":
        return <Star className="w-4 h-4 text-amber-500" />;
      default:
        return <Activity className="w-4 h-4 text-slate-600" />;
    }
  };

  const getLogBadge = (action: string, performedBy?: string) => {
    if (performedBy === "admin" || action === "admin_note") {
      return <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md text-[10px] font-bold">مدیریت سیستم</span>;
    }
    if (performedBy === "system") {
      return <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md text-[10px] font-bold">سیستم خودکار</span>;
    }
    return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-bold">کاربر / صاحب کارگاه</span>;
  };

  const owner = unit.ownerUser;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto" style={{ direction: "rtl" }}>
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-4 sm:my-8 max-h-[92vh] flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-l from-slate-900 via-indigo-950 to-slate-900 p-5 sm:p-6 text-white flex items-center justify-between relative shadow-sm border-b border-indigo-900/50">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <img 
              src={unit.profileImage || "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=200"} 
              alt={unit.name}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border-2 border-white/20 shadow-md"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black">{unit.name}</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  unit.status === 'approved' 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                    : unit.status === 'rejected'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {unit.status === 'approved' ? 'تایید و منتشر شده' : unit.status === 'rejected' ? 'رد شده' : 'در انتظار بررسی'}
                </span>
              </div>
              <p className="text-slate-300 text-xs mt-1 flex items-center gap-2 flex-wrap font-medium">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>{categoryName}</span>
                <span className="text-slate-500">•</span>
                <span className="font-mono text-[11px]">شناسه: {unit.id}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-2xl transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 pt-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("details")}
              className={`py-2.5 px-4 text-xs font-extrabold flex items-center gap-2 rounded-t-xl transition-all cursor-pointer ${
                activeTab === "details"
                  ? "bg-white text-indigo-700 shadow-xs border-t-2 border-indigo-600"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <User className="w-4 h-4" />
              <span>مشخصات و شناسنامه کارگاه</span>
            </button>

            <button
              onClick={() => setActiveTab("activity")}
              className={`py-2.5 px-4 text-xs font-extrabold flex items-center gap-2 rounded-t-xl transition-all cursor-pointer ${
                activeTab === "activity"
                  ? "bg-white text-indigo-700 shadow-xs border-t-2 border-indigo-600"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <History className="w-4 h-4" />
              <span>لاگ و تاریخچه فعالیت‌ها</span>
              <span className="px-2 py-0.2 bg-indigo-100 text-indigo-800 rounded-full text-[10px] font-black font-mono">
                {logs.length}
              </span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-500 pb-2">
            <span>مالک: {owner?.name || owner?.phone || "کاربر سامانه"}</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 bg-slate-50/50">
          
          {/* TAB 1: WORKSHOP & USER DETAILS */}
          {activeTab === "details" && (
            <div className="space-y-6">
              {/* Top User Profile Card */}
              <div className="bg-gradient-to-br from-indigo-50/90 via-blue-50/50 to-white p-5 rounded-2xl border border-indigo-100 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-indigo-100/80 pb-3">
                  <div className="flex items-center gap-2 text-indigo-950 font-black text-sm">
                    <User className="h-5 w-5 text-indigo-600" />
                    <span>مشخصات کاربر ثبت‌نام‌کننده (صاحب حساب کاربری)</span>
                  </div>
                  <span className="text-[11px] bg-indigo-600 text-white font-bold px-2.5 py-0.5 rounded-full">
                    اطلاعات کاربر
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                  {/* Name */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-2xs space-y-1">
                    <span className="text-slate-400 font-medium text-[11px] flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      نام و نام خانوادگی کاربر:
                    </span>
                    <p className="font-bold text-slate-900 text-sm">
                      {owner?.name || "ثبت نشده در پروفایل"}
                    </p>
                  </div>

                  {/* Mobile / Phone */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-2xs space-y-1">
                    <span className="text-slate-400 font-medium text-[11px] flex items-center gap-1.5">
                      <Smartphone className="h-3.5 w-3.5 text-indigo-500" />
                      شماره موبایل حساب (ثبت‌نامی):
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 font-mono text-sm" style={{ direction: "ltr" }}>
                        {owner?.phone || unit.mobile1 || unit.phone || "ثبت نشده"}
                      </span>
                      {(owner?.phone || unit.mobile1 || unit.phone) && (
                        <a 
                          href={`tel:${owner?.phone || unit.mobile1 || unit.phone}`}
                          className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold transition-colors"
                        >
                          تماس تلفنی
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-2xs space-y-1">
                    <span className="text-slate-400 font-medium text-[11px] flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-amber-500" />
                      ایمیل حساب کاربری:
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 font-mono text-xs truncate max-w-[150px]" title={owner?.email || unit.email || "ثبت نشده"}>
                        {owner?.email || unit.email || "ثبت نشده"}
                      </span>
                      {(owner?.email || unit.email) && (
                        <a 
                          href={`mailto:${owner?.email || unit.email}`}
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold transition-colors"
                        >
                          ارسال ایمیل
                        </a>
                      )}
                    </div>
                  </div>

                  {/* UID */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-2xs space-y-1 sm:col-span-2 lg:col-span-1">
                    <span className="text-slate-400 font-medium text-[11px] flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                      شناسه کاربری دیتابیس (UID):
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] text-slate-600 truncate max-w-[160px]" title={owner?.uid || unit.ownerId}>
                        {owner?.uid || unit.ownerId}
                      </span>
                      <button 
                        onClick={() => copyToClipboard(owner?.uid || unit.ownerId)}
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                        title="کپی شناسه"
                      >
                        {copiedUid ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Registered At */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-2xs space-y-1">
                    <span className="text-slate-400 font-medium text-[11px] flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-teal-500" />
                      تاریخ عضویت کاربر در سامانه:
                    </span>
                    <p className="font-bold text-slate-800 text-xs">
                      {formatDate(owner?.createdAt || unit.createdAt)}
                    </p>
                  </div>

                  {/* Last Login / Activity */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-2xs space-y-1">
                    <span className="text-slate-400 font-medium text-[11px] flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-purple-500" />
                      آخرین ورود به حساب:
                    </span>
                    <p className="font-bold text-slate-800 text-xs">
                      {owner?.lastLoginAt ? formatDate(owner.lastLoginAt) : "همزمان با ثبت اطلاعات"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Workshop Details Section */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-slate-900 font-black text-sm border-b border-slate-200 pb-3">
                  <Building2 className="h-5 w-5 text-slate-700" />
                  <span>مشخصات تفصیلی واحد صنعتی و کارگاه</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Phones */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                    <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Phone className="h-4 w-4 text-indigo-500" />
                      شماره‌های تماس ثبت شده برای کارگاه
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-slate-600">
                        <span>تلفن ثابت کارگاه:</span>
                        <span className="font-bold font-mono text-slate-900">{unit.phone || "ثبت نشده"}</span>
                      </div>
                      {unit.mobile1 && (
                        <div className="flex justify-between items-center text-slate-600">
                          <span>شماره همراه اول:</span>
                          <span className="font-bold font-mono text-slate-900">{unit.mobile1}</span>
                        </div>
                      )}
                      {unit.mobile2 && (
                        <div className="flex justify-between items-center text-slate-600">
                          <span>شماره همراه دوم:</span>
                          <span className="font-bold font-mono text-slate-900">{unit.mobile2}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Website & Email */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                    <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Globe className="h-4 w-4 text-blue-500" />
                      ارتباطات آنلاین و وب‌سایت
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-slate-600">
                        <span>ایمیل اختصاصی کارگاه:</span>
                        <span className="font-bold text-slate-900 font-mono">{unit.email || "ثبت نشده"}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-600">
                        <span>وب‌سایت کارگاه:</span>
                        {unit.website ? (
                          <a href={unit.website.startsWith("http") ? unit.website : `https://${unit.website}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1 font-bold">
                            <span>مشاهده سایت</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400">ثبت نشده</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Address & Location */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2 md:col-span-2">
                    <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-rose-500" />
                      موقعیت مکانی و آدرس دقیق
                    </h4>
                    <p className="text-slate-700 text-xs leading-relaxed font-medium">
                      {unit.address || "آدرس دقیق ثبت نشده است."}
                    </p>
                    {(unit.latitude && unit.longitude) || unit.mapUrl ? (
                      <div className="pt-2 flex items-center gap-3">
                        {unit.mapUrl && (
                          <a 
                            href={unit.mapUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-colors"
                          >
                            <MapPin className="h-3.5 w-3.5" />
                            <span>مسیریابی روی نقشه</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        {unit.latitude && unit.longitude && (
                          <span className="text-[11px] text-slate-400 font-mono">
                            مختصات: {unit.latitude.toFixed(4)}, {unit.longitude.toFixed(4)}
                          </span>
                        )}
                      </div>
                    ) : null}
                  </div>

                  {/* Description */}
                  {unit.description && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2 md:col-span-2">
                      <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-indigo-500" />
                        درباره و شرح فعالیت واحد صنعتی
                      </h4>
                      <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-wrap">
                        {unit.description}
                      </p>
                    </div>
                  )}

                  {/* Verified Industrial Badges Management */}
                  <div className="bg-gradient-to-br from-amber-50/60 to-white p-4.5 rounded-xl border border-amber-200/70 shadow-xs space-y-3 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                        <Award className="h-4 w-4 text-amber-600" />
                        نشان‌ها و بج‌های تاییدیه صنعتی (Verified Badges)
                      </h4>
                      <span className="text-[11px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full">
                        {unitBadges.length} نشان فعال
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      مدیر گرامی، شما می‌توانید نشان‌های اصالت، پروانه و مدارک معتبر این واحد صنعتی را جهت نمایش در کارت واحد و صفحه اختصاصی فعال یا غیرفعال فرمایید:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                      {OFFICIAL_BADGES.map((b, bIndex) => {
                        const isSelected = unitBadges.includes(b.id);
                        return (
                          <button
                            key={`official-badge-${b.id}-${bIndex}`}
                            type="button"
                            onClick={() => handleToggleBadge(b.id)}
                            disabled={savingBadges}
                            className={`p-2.5 rounded-xl text-right transition-all flex items-start justify-between gap-2 border text-xs cursor-pointer ${
                              isSelected
                                ? "bg-amber-50/90 border-amber-300 shadow-xs"
                                : "bg-white border-slate-200 hover:border-slate-300 opacity-60 hover:opacity-100"
                            }`}
                          >
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-900 block">{b.name}</span>
                              <span className="text-[10px] text-slate-500 line-clamp-1">{b.description}</span>
                            </div>

                            <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold ${
                              isSelected ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-400"
                            }`}>
                              {isSelected ? "✓" : "+"}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {unitBadges.length > 0 && (
                      <div className="pt-2 border-t border-amber-100 flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-semibold text-slate-500">پیش‌نمایش در سامانه:</span>
                        {unitBadges.map((bId, bIdx) => (
                          <BadgePill key={`modal-badge-${bId}-${bIdx}`} badgeId={bId} size="sm" showLabel />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* SEO Tags */}

                  {(unit.seoKeywords || unit.seoDescription) && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2 md:col-span-2">
                      <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <Tag className="h-4 w-4 text-amber-500" />
                        تنظیمات سئو و کلمات کلیدی ثبت شده
                      </h4>
                      {unit.seoKeywords && (
                        <div className="flex flex-wrap gap-1.5">
                          {unit.seoKeywords.split(",").map((k, i) => (
                            <span key={`seo-${k.trim()}-${i}`} className="px-2 py-0.5 bg-white border border-slate-200 text-slate-600 rounded text-[10px] font-medium">
                              {k.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                      {unit.seoDescription && (
                        <p className="text-[11px] text-slate-500 italic mt-1">{unit.seoDescription}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USER & WORKSHOP ACTIVITY LOGS */}
          {activeTab === "activity" && (
            <div className="space-y-5">
              
              {/* Top Controls Bar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-indigo-600" />
                    <h4 className="font-black text-slate-900 text-sm">
                      تایم‌لاین و لاگ جامع فعالیت‌های کاربر و کارگاه
                    </h4>
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-xs font-bold font-mono">
                      {filteredLogs.length} از {logs.length} رویداد
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Add Note Button */}
                    <button
                      onClick={() => setShowAddNoteForm(!showAddNoteForm)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>ثبت یادداشت نظارتی / پیگیری</span>
                    </button>

                    {/* Refresh Logs Button */}
                    <button
                      onClick={fetchLogs}
                      disabled={loadingLogs}
                      className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 cursor-pointer"
                      title="به‌روزرسانی لاگ‌ها"
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingLogs ? "animate-spin text-indigo-600" : ""}`} />
                    </button>

                    {/* Export Logs Button */}
                    <button
                      onClick={handleExportLogs}
                      className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 cursor-pointer"
                      title="دانلود خروجی JSON لاگ‌ها"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Filters and Search */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                  {/* Category Filter Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                    <button
                      onClick={() => setLogFilter("all")}
                      className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer ${
                        logFilter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      همه رویدادها
                    </button>
                    <button
                      onClick={() => setLogFilter("auth")}
                      className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer ${
                        logFilter === "auth" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      ورود و احراز هویت
                    </button>
                    <button
                      onClick={() => setLogFilter("unit")}
                      className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer ${
                        logFilter === "unit" ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      تغییرات کارگاه
                    </button>
                    <button
                      onClick={() => setLogFilter("products")}
                      className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer ${
                        logFilter === "products" ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      محصولات و کاتالوگ
                    </button>
                    <button
                      onClick={() => setLogFilter("interactions")}
                      className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer ${
                        logFilter === "interactions" ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      استعلام‌ها و نظرات
                    </button>
                    <button
                      onClick={() => setLogFilter("admin")}
                      className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer ${
                        logFilter === "admin" ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      یادداشت‌های مدیر
                    </button>
                  </div>

                  {/* Search box */}
                  <div className="relative min-w-[200px]">
                    <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                      placeholder="جستجو در لاگ‌ها..."
                      className="w-full pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Admin Add Audit Note Form */}
              {showAddNoteForm && (
                <form onSubmit={handleAddNote} className="bg-gradient-to-br from-indigo-50/80 to-blue-50/40 p-4 rounded-2xl border border-indigo-200 shadow-sm space-y-3 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-xs text-indigo-950 flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-indigo-600" />
                      <span>ثبت یادداشت نظارتی و سابقه پیگیری توسط مدیریت</span>
                    </h5>
                    <button
                      type="button"
                      onClick={() => setShowAddNoteForm(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs"
                    >
                      انصراف
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">نوع اقدام / دسته‌بندی:</label>
                      <select
                        value={noteCategory}
                        onChange={(e) => setNoteCategory(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="تماس تلفنی و پیگیری">تماس تلفنی و پیگیری</option>
                        <option value="بررسی و احراز مدارک">بررسی و احراز مدارک پروانه</option>
                        <option value="بازرسی حضوری کارگاه">بازرسی حضوری کارگاه</option>
                        <option value="اخطار عدم تطابق">اخطار و هشدار سامانه</option>
                        <option value="تایید ویژه مدیریت">تایید ویژه مدیریت</option>
                        <option value="یادداشت عمومی">یادداشت و گزارش عمومی</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-slate-600 font-bold mb-1">عنوان خلاصه رویداد:</label>
                      <input
                        type="text"
                        value={noteTitle}
                        onChange={(e) => setNoteTitle(e.target.value)}
                        placeholder="مثال: تماس با مدیر کارگاه جهت هماهنگی بازرسی"
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1 text-xs">توضیحات و جزئیات پیگیری (اختیاری):</label>
                    <textarea
                      value={noteDescription}
                      onChange={(e) => setNoteDescription(e.target.value)}
                      placeholder="جزئیات گفتگو، نتایج بازرسی یا دستورات صادره..."
                      rows={2}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingNote}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                    >
                      {submittingNote ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>ثبت نهایی در تاریخچه فعالیت‌ها</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Logs Timeline List */}
              {loadingLogs ? (
                <div className="bg-white p-12 rounded-2xl border border-slate-200 flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                  <p className="text-xs text-slate-500 font-bold">در حال بارگذاری سوابق و لاگ‌های فعالیت...</p>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
                  <Activity className="w-10 h-10 text-slate-300 mx-auto" />
                  <h5 className="font-bold text-slate-700 text-sm">رویدادی با مشخصات جستجوشده یافت نشد</h5>
                  <p className="text-xs text-slate-400">
                    فعالیت‌های کاربر به محض انجام در این پنجره ذخیره و نمایش داده می‌شوند.
                  </p>
                </div>
              ) : (
                <div className="relative pl-2 pr-4 space-y-4 before:absolute before:right-7 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-200">
                  {filteredLogs.map((log, index) => {
                    const isNewEvent = index === 0;
                    return (
                      <div 
                        key={`modal-log-${log.id || 'entry'}-${index}`}
                        className={`relative flex items-start gap-4 p-4 rounded-2xl border transition-all duration-150 ${
                          log.action === "admin_note"
                            ? "bg-indigo-50/40 border-indigo-100 hover:bg-indigo-50/70"
                            : isNewEvent
                            ? "bg-white border-indigo-200/80 shadow-xs"
                            : "bg-white border-slate-200/70 hover:border-slate-300"
                        }`}
                      >
                        {/* Timeline Node Icon */}
                        <div className="relative z-10 p-2 rounded-xl bg-white border border-slate-200 shadow-2xs flex-shrink-0">
                          {getLogIcon(log.action, log.performedBy)}
                        </div>

                        {/* Log Content */}
                        <div className="flex-1 space-y-1.5 text-xs min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="font-bold text-slate-900 text-xs sm:text-sm">
                                {log.title}
                              </h5>
                              {getLogBadge(log.action, log.performedBy)}
                              {isNewEvent && (
                                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[9px] font-black">
                                  آخرین رویداد
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                              <span className="font-medium text-slate-500 font-mono">
                                {formatRelativeTime(log.createdAt)}
                              </span>
                              <span>•</span>
                              <span>{formatDate(log.createdAt)}</span>
                              
                              {log.id && log.id.startsWith("log-") && (
                                <button
                                  onClick={() => handleDeleteLog(log.id)}
                                  className="text-slate-300 hover:text-rose-600 p-1 rounded transition-colors"
                                  title="حذف لاگ"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {log.description && (
                            <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-wrap bg-slate-50/60 p-2 rounded-lg border border-slate-100/80">
                              {log.description}
                            </p>
                          )}

                          {/* Technical metadata if available */}
                          {(log.ipAddress || log.userAgent) && (
                            <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-1 font-mono">
                              {log.ipAddress && (
                                <span className="flex items-center gap-1">
                                  <span>IP:</span>
                                  <span>{log.ipAddress}</span>
                                </span>
                              )}
                              {log.userAgent && (
                                <span className="flex items-center gap-1 truncate max-w-[250px]" title={log.userAgent}>
                                  <Monitor className="w-3 h-3" />
                                  <span className="truncate">{log.userAgent}</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Action Footer for Administrator */}
        <div className="bg-slate-100/80 p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onToggleStatus(unit.id, unit.status || 'pending')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                unit.status === 'approved'
                  ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
              }`}
            >
              {unit.status === 'approved' ? (
                <>
                  <Clock className="h-3.5 w-3.5" />
                  <span>تغییر وضعیت به در انتظار تایید</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>تایید و انتشار رسمی کارگاه</span>
                </>
              )}
            </button>
            {onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(unit);
                }}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                title="ویرایش مستقیم مشخصات و اطلاعات کارگاه"
              >
                <Edit3 className="h-3.5 w-3.5 text-indigo-600" />
                <span>ویرایش مشخصات</span>
              </button>
            )}
            <button
              onClick={() => {
                onClose();
                onManage(unit.id);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm shadow-indigo-200"
            >
              <span>ورود به مدیریت پنل کارگاه</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onDelete(unit);
              }}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              title="حذف کامل و دائمی از پایگاه داده"
            >
              <Trash2 className="h-3.5 w-3.5 text-rose-600" />
              <span>حذف کامل از دیتابیس</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              بستن پنجره
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
