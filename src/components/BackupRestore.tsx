import React, { useState, useEffect, useRef } from "react";
import { Unit, Product } from "../types";
import { 
  Download, 
  Upload, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  FileJson, 
  Database, 
  Server, 
  ShieldCheck, 
  Layers, 
  RefreshCw, 
  FileSpreadsheet, 
  Users, 
  Package, 
  ShoppingBag, 
  Building2, 
  Megaphone, 
  MessageSquare, 
  FileText, 
  Settings, 
  Check, 
  Info,
  Clock,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";

interface BackupRestoreProps {
  userUid: string;
  unit: Unit | null;
  products: Product[];
  onRefresh: () => void;
  isAdmin?: boolean;
}

interface DbStats {
  units: number;
  products: number;
  users: number;
  banners: number;
  classifieds: number;
  reviews: number;
  quotes: number;
  settings: number;
  lastCheck?: string;
}

interface BackupPreview {
  system?: string;
  backupVersion?: string;
  exportDate?: string;
  exportedBy?: string;
  stats?: Record<string, number>;
  rawJson: any;
  isValid: boolean;
  type: "full_system" | "single_unit" | "unknown";
}

export default function BackupRestore({ 
  userUid, 
  unit, 
  products, 
  onRefresh, 
  isAdmin = false 
}: BackupRestoreProps) {
  // Determine if acting as admin (explicit prop or no single unit)
  const isSystemAdmin = isAdmin || !unit;

  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [dbStats, setDbStats] = useState<DbStats | null>(null);
  
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [dragActive, setDragActive] = useState(false);
  
  const [restoreMode, setRestoreMode] = useState<"merge" | "replace">("merge");
  const [backupPreview, setBackupPreview] = useState<BackupPreview | null>(null);
  const [restoreReport, setRestoreReport] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const getHeaders = () => {
    let headers: Record<string, string> = { "Content-Type": "application/json" };
    const savedUser = localStorage.getItem("custom_auth_user");
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      if (parsed?.token) {
        headers["Authorization"] = `Bearer ${parsed.token}`;
      }
    }
    return headers;
  };

  // Fetch admin database stats
  const fetchStats = async () => {
    if (!isSystemAdmin) return;
    try {
      setStatsLoading(true);
      const res = await fetch("/api/admin/backup/stats", { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setDbStats(data);
      }
    } catch (err) {
      console.error("Error fetching db backup stats:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (isSystemAdmin) {
      fetchStats();
    }
  }, [isSystemAdmin]);

  // 1. Admin Full Database Backup Download
  const handleAdminFullBackup = async () => {
    setDownloading(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const res = await fetch("/api/admin/backup", { headers: getHeaders() });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "خطا در استخراج نسخه پشتیبان کل سیستم.");
      }

      const backupData = await res.json().catch(() => ({}));
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(backupData, null, 2)
      )}`;

      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", jsonString);
      const dateStr = new Date().toISOString().split("T")[0];
      downloadAnchor.setAttribute(
        "download",
        `industrial_park_full_backup_${dateStr}.json`
      );

      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      toast.success("نسخه پشتیبان جامع کل پایگاه‌داده با موفقیت دانلود شد.");
      setSuccessMessage("نسخه پشتیبان جامع سیستم با موفقیت تولید و دانلود گردید.");
      setTimeout(() => setSuccessMessage(""), 6000);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "خطا در دانلود نسخه پشتیبان");
      setErrorMessage(err.message);
    } finally {
      setDownloading(false);
    }
  };

  // 2. Export CSV for Units & Products
  const handleExportCSV = async (type: "units" | "products") => {
    try {
      const res = await fetch(type === "units" ? "/api/units" : "/api/products", {
        headers: getHeaders()
      });
      if (!res.ok) throw new Error("خطا در دریافت لیست داده‌ها.");
      const items = await res.json();

      if (!Array.isArray(items) || items.length === 0) {
        toast.error("داده‌ای برای صدور خروجی یافت نشد.");
        return;
      }

      // Convert JSON array to CSV format
      const keys = Object.keys(items[0]).filter(k => k !== "profileImage" && k !== "image");
      const csvHeader = keys.join(",") + "\n";
      const csvRows = items.map(item => {
        return keys.map(k => {
          const val = item[k] === null || item[k] === undefined ? "" : String(item[k]).replace(/"/g, '""');
          return `"${val}"`;
        }).join(",");
      }).join("\n");

      const blob = new Blob(["\uFEFF" + csvHeader + csvRows], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `export_${type}_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`فایل اکسل/CSV مربوط به ${type === "units" ? "کارگاه‌ها" : "محصولات"} دانلود شد.`);
    } catch (err: any) {
      toast.error("خطا در صدور فایل اکسل: " + err.message);
    }
  };

  // 3. Workshop Owner Backup Download (Single Unit)
  const handleUnitBackup = () => {
    try {
      if (!unit) {
        setErrorMessage("ابتدا اطلاعات غرفه خود را ثبت کنید تا امکان پشتیبان‌گیری فراهم شود.");
        return;
      }

      const backupData = {
        system: "سامانه جامع شهرک صنعتی",
        backupVersion: "2.0",
        backupType: "single_unit",
        backupDate: new Date().toISOString(),
        unit: unit,
        products: products,
      };

      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(backupData, null, 2)
      )}`;

      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", jsonString);

      const safeUnitName = unit.name.replace(/[^a-zA-Z0-9آ-ی]/g, "_");
      downloadAnchor.setAttribute(
        "download",
        `backup_unit_${safeUnitName}_${new Date().toISOString().split("T")[0]}.json`
      );

      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      toast.success("فایل پشتیبان غرفه با موفقیت دانلود شد.");
      setSuccessMessage("فایل پشتیبان غرفه با موفقیت تولید و دانلود شد.");
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err: any) {
      console.error(err);
      setErrorMessage("خطا در تهیه نسخه پشتیبان: " + err.message);
    }
  };

  // 4. File reading and pre-validation
  const handleFileSelect = (file: File) => {
    if (!file) return;
    setErrorMessage("");
    setSuccessMessage("");
    setRestoreReport(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);

        // Analyze file structure
        if (data.data && typeof data.data === "object") {
          // Full Database Backup
          setBackupPreview({
            system: data.system || "سامانه شهرک صنعتی",
            backupVersion: data.backupVersion || "2.0",
            exportDate: data.exportDate || data.backupDate,
            exportedBy: data.exportedBy || "نامشخص",
            stats: data.stats || {
              unitsCount: data.data.units?.length || 0,
              productsCount: data.data.products?.length || 0,
              usersCount: data.data.users?.length || 0,
              bannersCount: data.data.banners?.length || 0,
              classifiedsCount: data.data.classifieds?.length || 0
            },
            rawJson: data,
            isValid: true,
            type: "full_system"
          });
          toast.success("فایل پشتیبان جامع شناسایی شد و آماده بازیابی است.");
        } else if (data.unit && Array.isArray(data.products)) {
          // Single Unit Backup
          setBackupPreview({
            system: data.system || "غرفه شهرک صنعتی",
            backupVersion: data.backupVersion || "1.0",
            exportDate: data.backupDate,
            stats: {
              unitsCount: 1,
              productsCount: data.products.length
            },
            rawJson: data,
            isValid: true,
            type: "single_unit"
          });
          toast.success(`فایل غرفه «${data.unit.name}» با ${data.products.length} محصول شناسایی شد.`);
        } else {
          throw new Error("قالب فایل انتخاب‌شده معتبر نیست. ساختار دیتابیس یا غرفه یافت نشد.");
        }
      } catch (err: any) {
        console.error("Backup parse error:", err);
        setErrorMessage("خطا در خواندن فایل: " + err.message);
        toast.error("فایل JSON نامعتبر است.");
        setBackupPreview(null);
      }
    };
    reader.readAsText(file);
  };

  // 5. Execute Restore based on preview
  const handleExecuteRestore = async () => {
    if (!backupPreview || !backupPreview.isValid) {
      toast.error("ابتدا یک فایل پشتیبان معتبر انتخاب کنید.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    setRestoreReport(null);

    try {
      if (backupPreview.type === "full_system") {
        // Admin Full Restore
        const res = await fetch("/api/admin/restore", {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            backupData: backupPreview.rawJson,
            mode: restoreMode
          })
        });

        const resData = await res.json();
        if (!res.ok) {
          throw new Error(resData.error || "خطا در بازیابی اطلاعات دیتابیس.");
        }

        setRestoreReport(resData.report);
        setSuccessMessage("کل اطلاعات پایگاه‌داده با موفقیت بازنشانی و به‌روزرسانی شد.");
        toast.success("عملیات بازیابی دیتابیس با موفقیت به اتمام رسید.");
        setBackupPreview(null);
        fetchStats();
        onRefresh();
      } else {
        // Single Unit Restore
        const data = backupPreview.rawJson;
        const backupUnit = data.unit as Unit;
        const backupProducts = data.products as Product[];

        const tokenHeaders = getHeaders();
        const restoredUnit: Unit = {
          ...backupUnit,
          ownerId: userUid,
          updatedAt: new Date().toISOString(),
        };

        const unitRes = await fetch("/api/units", {
          method: "POST",
          headers: tokenHeaders,
          body: JSON.stringify(restoredUnit),
        });

        if (!unitRes.ok) {
          const errData = await unitRes.json();
          throw new Error(errData.error || "خطا در بازیابی اطلاعات اصلی کارگاه.");
        }

        let savedCount = 0;
        for (const prod of backupProducts) {
          const restoredProduct: Product = {
            ...prod,
            unitId: restoredUnit.id,
            ownerId: userUid,
          };

          const prodRes = await fetch("/api/products", {
            method: "POST",
            headers: tokenHeaders,
            body: JSON.stringify(restoredProduct),
          });

          if (prodRes.ok) savedCount++;
        }

        setSuccessMessage(`اطلاعات غرفه "${restoredUnit.name}" و ${savedCount} محصول با موفقیت بازیابی شد.`);
        toast.success("غرفه شما با موفقیت بازیابی شد.");
        setBackupPreview(null);
        onRefresh();
      }
    } catch (err: any) {
      console.error("Restore error:", err);
      setErrorMessage(err.message || "خطا در بازیابی اطلاعات.");
      toast.error(err.message || "خطا در فرآیند بازیابی");
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-6 text-right" style={{ direction: "rtl" }}>
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-3 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-xs font-black text-indigo-300">
            <Database className="h-3.5 w-3.5" />
            <span>
              {isSystemAdmin 
                ? "سامانه جامع پشتیبان‌گیری و بازیابی پایگاه‌داده (Database Backup & Disaster Recovery)" 
                : "پشتیبان‌گیری و بازیابی اطلاعات غرفه و محصولات"}
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">
            {isSystemAdmin ? "پشتیبان‌گیری و بازیابی جامع پایگاه‌داده" : "پشتیبان‌گیری آفلاین و بازیابی غرفه"}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {isSystemAdmin 
              ? "دریافت نسخه کامل از تمامی جداول دیتابیس (واحدهای صنعتی، کاتالوگ محصولات با عکس‌ها، بنرها، نیازمندی‌ها، تنظیمات و کاربران) با امکان بازنشانی ایمن و تحلیل فایل قبل از اعمال."
              : "تهیه نسخه پشتیبان آفلاین با فرمت استاندارد JSON از مشخصات کارگاه و گالری محصولات با امکان بازنشانی در هر زمان."}
          </p>
        </div>
        <Database className="h-44 w-44 text-indigo-500/10 absolute -left-6 -bottom-8 pointer-events-none" />
      </div>

      {/* Admin Live Database Stats Bar */}
      {isSystemAdmin && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-600" />
              <h3 className="text-xs font-black text-slate-800">وضعیت رکوردهای فعال در پایگاه‌داده (Live Records)</h3>
            </div>
            <button
              type="button"
              onClick={fetchStats}
              disabled={statsLoading}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition-colors"
              title="به‌روزرسانی آمار"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${statsLoading ? "animate-spin" : ""}`} />
              <span>به‌روزرسانی آمار</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 pt-1">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
              <span className="text-[10px] text-slate-500 block font-bold">واحدهای صنعتی</span>
              <span className="text-base font-black text-slate-900 font-mono mt-0.5 block">{dbStats?.units ?? 0}</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
              <span className="text-[10px] text-slate-500 block font-bold">محصولات</span>
              <span className="text-base font-black text-indigo-600 font-mono mt-0.5 block">{dbStats?.products ?? 0}</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
              <span className="text-[10px] text-slate-500 block font-bold">کاربران</span>
              <span className="text-base font-black text-emerald-600 font-mono mt-0.5 block">{dbStats?.users ?? 0}</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
              <span className="text-[10px] text-slate-500 block font-bold">بنرهای تبلیغاتی</span>
              <span className="text-base font-black text-amber-600 font-mono mt-0.5 block">{dbStats?.banners ?? 0}</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
              <span className="text-[10px] text-slate-500 block font-bold">نیازمندی‌ها</span>
              <span className="text-base font-black text-purple-600 font-mono mt-0.5 block">{dbStats?.classifieds ?? 0}</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
              <span className="text-[10px] text-slate-500 block font-bold">دیدگاه‌ها</span>
              <span className="text-base font-black text-blue-600 font-mono mt-0.5 block">{dbStats?.reviews ?? 0}</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
              <span className="text-[10px] text-slate-500 block font-bold">استعلام قیمت</span>
              <span className="text-base font-black text-teal-600 font-mono mt-0.5 block">{dbStats?.quotes ?? 0}</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
              <span className="text-[10px] text-slate-500 block font-bold">تنظیمات سیستم</span>
              <span className="text-base font-black text-rose-600 font-mono mt-0.5 block">{dbStats?.settings ?? 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2.5 shadow-xs"
        >
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </motion.div>
      )}

      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl text-xs font-bold flex items-center gap-2.5 shadow-xs"
        >
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </motion.div>
      )}

      {/* Main Dual Grid: Backup Column & Restore Column */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Backup Actions (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Download className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-black text-slate-800">
                {isSystemAdmin ? "۱. تهیه نسخه پشتیبان دیتابیس (Export)" : "۱. دانلود نسخه پشتیبان غرفه"}
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {isSystemAdmin 
                ? "خروجی کامل از کلیه رکوردهای دیتابیس شامل تصاویر Base64، حساب‌های کاربری، مشخصات کارگاه‌ها، محصولات و تنظیمات سیستمی به صورت یک فایل JSON استاندارد و ایمن دریافت می‌شود."
                : "اطلاعات کامل غرفه، کاتالوگ محصولات، عکس‌ها و اطلاعات تماس شما به صورت یک فایل JSON آفلاین دانلود خواهد شد."}
            </p>

            <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-indigo-950 font-bold text-xs">
                <ShieldCheck className="h-4 w-4 text-indigo-600" />
                <span>ضمانت حفظ ۱۰۰٪ اطلاعات و تصاویر</span>
              </div>
              <p className="text-[11px] text-indigo-900 leading-relaxed">
                تمامی عکس‌ها مستقیماً درون ساختار دیتابیس و فایل پشتیبان ذخیره شده‌اند و در هر شرایطی بدون نیاز به اینترنت نیز قابل استخراج و نگهداری هستند.
              </p>
            </div>
          </div>

          <div className="space-y-2.5 pt-2">
            {isSystemAdmin ? (
              <>
                <button
                  type="button"
                  onClick={handleAdminFullBackup}
                  disabled={downloading}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black shadow-md shadow-indigo-200 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {downloading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>در حال تولید فایل پشتیبان جامع...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span>دانلود فایل جامع دیتابیس (Full JSON Backup)</span>
                    </>
                  )}
                </button>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleExportCSV("units")}
                    className="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                    <span>اکسل کارگاه‌ها (CSV)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportCSV("products")}
                    className="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-blue-600" />
                    <span>اکسل محصولات (CSV)</span>
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={handleUnitBackup}
                disabled={!unit || loading}
                className={`w-full py-3 px-4 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  unit
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100"
                    : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                }`}
              >
                <Download className="h-4 w-4" />
                <span>دانلود فایل پشتیبان غرفه (JSON)</span>
              </button>
            )}
          </div>
        </div>

        {/* Restore Actions (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-800">
                  {isSystemAdmin ? "۲. بارگذاری و بازیابی هوشمند (Restore)" : "۲. بازیابی اطلاعات پشتیبان غرفه"}
                </h3>
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold">
                تحلیل و اعتبارسنجی خودکار
              </span>
            </div>

            {/* Drag and drop box */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                dragActive
                  ? "border-indigo-600 bg-indigo-50/50"
                  : "border-slate-300 hover:border-indigo-400 bg-slate-50/60"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
                accept=".json"
                className="hidden"
              />
              <div className="flex flex-col items-center gap-2">
                <div className="p-3 bg-indigo-100/70 text-indigo-600 rounded-2xl">
                  <FileJson className="h-6 w-6" />
                </div>
                <h4 className="text-xs font-black text-slate-800">فایل پشتیبان JSON را اینجا بکشید و رها کنید</h4>
                <p className="text-[11px] text-slate-500">یا برای انتخاب فایل از روی سیستم کلیک نمایید</p>
              </div>
            </div>

            {/* Preview Box if file analyzed */}
            {backupPreview && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl text-emerald-950 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                  <span className="text-xs font-black flex items-center gap-1.5 text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    فایل پشتیبان معتبر شناسایی شد
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono font-bold">
                    نسخه {backupPreview.backupVersion}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {backupPreview.stats && Object.entries(backupPreview.stats).map(([k, v]) => (
                    <div key={k} className="bg-white/80 border border-emerald-100 p-2 rounded-xl text-center">
                      <span className="text-[10px] text-slate-500 block truncate">
                        {k === "unitsCount" ? "واحدهای صنعتی" :
                         k === "productsCount" ? "محصولات" :
                         k === "usersCount" ? "کاربران" :
                         k === "bannersCount" ? "بنرها" :
                         k === "classifiedsCount" ? "نیازمندی‌ها" : k}
                      </span>
                      <span className="font-mono font-black text-emerald-700 text-sm mt-0.5 block">{v}</span>
                    </div>
                  ))}
                </div>

                {/* Mode Selector for Admin */}
                {isSystemAdmin && (
                  <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-900">روش بازیابی:</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setRestoreMode("merge")}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all ${
                          restoreMode === "merge"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-white text-slate-700 border border-slate-200"
                        }`}
                      >
                        ادغام هوشمند و به‌روزرسانی (Smart Merge)
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Final Report if restore executed */}
            {restoreReport && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl text-indigo-950 space-y-2 text-xs"
              >
                <h4 className="font-black flex items-center gap-1.5 text-indigo-900">
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                  گزارش خروجی عملیات بازیابی دیتابیس:
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="bg-white p-2 rounded-xl border border-indigo-100 text-center">
                    <span className="text-[10px] text-slate-500 block">کارگاه‌های بازنشانی‌شده</span>
                    <span className="font-mono font-bold text-indigo-700">{restoreReport.unitsRestored}</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-indigo-100 text-center">
                    <span className="text-[10px] text-slate-500 block">محصولات بازیابی‌شده</span>
                    <span className="font-mono font-bold text-indigo-700">{restoreReport.productsRestored}</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-indigo-100 text-center">
                    <span className="text-[10px] text-slate-500 block">کاربران بازیابی‌شده</span>
                    <span className="font-mono font-bold text-indigo-700">{restoreReport.usersRestored}</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-indigo-100 text-center">
                    <span className="text-[10px] text-slate-500 block">بنرهای بازیابی‌شده</span>
                    <span className="font-mono font-bold text-indigo-700">{restoreReport.bannersRestored}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Confirm / Execute Restore button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleExecuteRestore}
              disabled={!backupPreview || loading}
              className={`w-full py-3 px-4 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                backupPreview && !loading
                  ? "bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-300"
                  : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                  <span>در حال بازنویسی و تزریق اطلاعات به دیتابیس...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>
                    {backupPreview ? "تایید نهایی و اعمال اطلاعات بازیابی به دیتابیس" : "انتخاب فایل پشتیبان جهت فعال‌سازی"}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
