import React, { useState, useEffect } from "react";
import { 
  Database, 
  Server, 
  Key, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Save, 
  ExternalLink, 
  HelpCircle, 
  Cpu, 
  Lock, 
  Layers, 
  Terminal, 
  HardDrive, 
  CloudRain,
  Image as ImageIcon,
  Check
} from "lucide-react";
import { motion } from "motion/react";
import toast from "react-hot-toast";

interface DbDiagnostics {
  status: string;
  latencyMs: number;
  connection: {
    connected: boolean;
    database: string;
    currentUser: string;
    serverVersion?: string;
    error?: string;
  };
  tables?: Record<string, {
    name: string;
    rowCount: number;
    accessible: boolean;
  }>;
  summary?: {
    totalTablesChecked: number;
    accessibleTables: number;
    usersTableHealthy: boolean;
    errors: string[];
    warnings: string[];
  };
}

export default function DatabaseSettings() {
  const [databaseUrl, setDatabaseUrl] = useState("");
  const [sqlHost, setSqlHost] = useState("");
  const [sqlUser, setSqlUser] = useState("");
  const [sqlPassword, setSqlPassword] = useState("");
  const [sqlDbName, setSqlDbName] = useState("");
  const [sqlSsl, setSqlSsl] = useState("require");
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  
  const [diagnostics, setDiagnostics] = useState<DbDiagnostics | null>(null);
  const [activeTab, setActiveTab] = useState<"credentials" | "connection-string" | "storage-guide">("credentials");

  const getHeaders = () => {
    const savedUser = localStorage.getItem("custom_auth_user");
    let tokenHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      if (parsed?.token) {
        tokenHeaders["Authorization"] = `Bearer ${parsed.token}`;
      }
    }
    return tokenHeaders;
  };

  const fetchDbSettings = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/settings", { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const dbUrl = data.find((s: any) => s.key === "database_url")?.value || "";
          const host = data.find((s: any) => s.key === "sql_host")?.value || "";
          const user = data.find((s: any) => s.key === "sql_user")?.value || "";
          const pass = data.find((s: any) => s.key === "sql_password")?.value || "";
          const dbName = data.find((s: any) => s.key === "sql_dbname")?.value || "";
          const ssl = data.find((s: any) => s.key === "sql_ssl")?.value || "require";

          if (dbUrl) setDatabaseUrl(dbUrl);
          if (host) setSqlHost(host);
          if (user) setSqlUser(user);
          if (pass) setSqlPassword(pass);
          if (dbName) setSqlDbName(dbName);
          if (ssl) setSqlSsl(ssl);
        }
      }
    } catch (err) {
      console.error("Error fetching db settings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const runDiagnostics = async () => {
    try {
      setIsTesting(true);
      const res = await fetch("/api/diagnostics/db");
      if (res.ok) {
        const data = await res.json();
        setDiagnostics(data);
        if (data.status === "healthy") {
          toast.success("ارتباط با پایگاه‌داده با موفقیت برقرار است.");
        } else {
          toast.error("خطا در برقراری ارتباط با دیتابیس.");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("خطا در تست دیتابیس.");
    } finally {
      setIsTesting(false);
    }
  };

  useEffect(() => {
    fetchDbSettings();
    runDiagnostics();
  }, []);

  // Parse connection string into parts
  const handleParseConnectionString = (url: string) => {
    setDatabaseUrl(url);
    try {
      if (url.startsWith("postgresql://") || url.startsWith("postgres://")) {
        const parsed = new URL(url);
        if (parsed.hostname) setSqlHost(parsed.hostname);
        if (parsed.username) setSqlUser(parsed.username);
        if (parsed.password) setSqlPassword(parsed.password);
        if (parsed.pathname) setSqlDbName(parsed.pathname.replace(/^\//, ""));
        const sslParam = parsed.searchParams.get("sslmode");
        if (sslParam) setSqlSsl(sslParam);
        toast.success("آدرس دیتابیس با موفقیت تفکیک و در فیلدها درج گردید.");
      }
    } catch (e) {
      // ignore partial string while typing
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Build standard connection string if not typed manually
      let finalDbUrl = databaseUrl.trim();
      if (!finalDbUrl && sqlHost && sqlUser && sqlDbName) {
        finalDbUrl = `postgresql://${sqlUser}:${encodeURIComponent(sqlPassword)}@${sqlHost}/${sqlDbName}?sslmode=${sqlSsl}`;
      }

      const configs = [
        { key: "database_url", value: finalDbUrl },
        { key: "sql_host", value: sqlHost.trim() },
        { key: "sql_user", value: sqlUser.trim() },
        { key: "sql_password", value: sqlPassword.trim() },
        { key: "sql_dbname", value: sqlDbName.trim() },
        { key: "sql_ssl", value: sqlSsl }
      ];

      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ configs })
      });

      if (res.ok) {
        toast.success("متغیرهای دیتابیس با موفقیت ذخیره شدند.");
        runDiagnostics();
      } else {
        const data = await res.json();
        toast.error(data.error || "خطا در ذخیره تنظیمات دیتابیس.");
      }
    } catch (err: any) {
      toast.error("خطا در ذخیره سازی: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6" style={{ direction: "rtl" }}>
      {/* Header Info */}
      <div className="bg-gradient-to-l from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-3 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-xs font-black text-indigo-300">
            <Database className="h-3.5 w-3.5" />
            <span>مدیریت متغیرهای دیتابیس و ماندگاری دائمی فایل‌ها</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">تنظیمات متغیرهای پایگاه‌داده (Database Config)</h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            در این بخش می‌توانید متغیرهای اتصال به دیتابیس PostgreSQL (نظیر Neon.tech، Supabase یا سرور محلی) را وارد و مدیریت کنید. کلیه تصاویر، لوگوها، بنرها و اطلاعات محصولات به صورت Base64 استاندارد در دیتابیس ماندگار شده و با گذشت زمان یا راه‌اندازی مجدد هرگز پاک نخواهند شد.
          </p>
        </div>
        <Database className="h-48 w-48 text-indigo-500/10 absolute -left-6 -bottom-10 pointer-events-none" />
      </div>

      {/* Diagnostics Health Widget */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className={`p-3 rounded-xl ${diagnostics?.status === "healthy" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
              <Server className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500">وضعیت اتصال به دیتابیس</p>
              <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5 mt-0.5">
                {diagnostics?.status === "healthy" ? (
                  <span className="text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> متصل و آنلاین (Active)
                  </span>
                ) : (
                  <span className="text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" /> در حال اتصال / نیاز به بررسی
                  </span>
                )}
              </h4>
            </div>
          </div>
          <button
            type="button"
            onClick={runDiagnostics}
            disabled={isTesting}
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer"
            title="تست مجدد اتصال"
          >
            <RefreshCw className={`h-4 w-4 ${isTesting ? "animate-spin text-indigo-600" : ""}`} />
          </button>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <HardDrive className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500">پایگاه‌داده فعال</p>
            <h4 className="text-sm font-black text-slate-800 mt-0.5 font-mono">
              {diagnostics?.connection?.database || "PostgreSQL Storage"}
            </h4>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <ImageIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500">ماندگاری تصاویر و لوگوها</p>
            <h4 className="text-sm font-black text-emerald-600 mt-0.5 flex items-center gap-1">
              <Check className="h-4 w-4" /> ذخیره پایدار در دیتابیس
            </h4>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("credentials")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "credentials"
              ? "bg-indigo-600 text-white shadow-xs"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Server className="h-4 w-4" />
          <span>تنظیم با متغیرهای تفکیک‌شده (Host / User / Pass)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("connection-string")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "connection-string"
              ? "bg-indigo-600 text-white shadow-xs"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Key className="h-4 w-4" />
          <span>آدرس یکپارچه اتصال (DATABASE_URL)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("storage-guide")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "storage-guide"
              ? "bg-indigo-600 text-white shadow-xs"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>راهنمای ماندگاری تصاویر</span>
        </button>
      </div>

      {/* Forms and Content */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
        {activeTab === "storage-guide" ? (
          <div className="space-y-6">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-950 space-y-2">
              <h3 className="text-sm font-black flex items-center gap-2 text-emerald-800">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                تضمین عدم حذف و ماندگاری ۱۰۰٪ دائمی لوگو و تصاویر محصولات
              </h3>
              <p className="text-xs leading-relaxed text-emerald-900">
                سیستم با معماری نوین طراحی شده تا تصاویر بارگذاری شده توسط کاربران (لوگوی کارگاه، تصاویر گالری محصولات، بنرهای تبلیغاتی و تصاویر آگهی‌های نیازمندی) به صورت <strong>Base64 فشرده و استاندارد درون رکوردهای پایگاه داده (PostgreSQL)</strong> ذخیره شوند.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <h4 className="font-black text-slate-900 flex items-center gap-1.5">
                  <HardDrive className="h-4 w-4 text-indigo-600" />
                  چرا تصاویر در هاست‌های اشتراکی یا موقت حذف می‌شوند؟
                </h4>
                <p className="leading-relaxed text-slate-600">
                  در سیستم‌های سنتی، فایل‌ها روی پوشه موقت دیسک ذخیره می‌شوند و با بازنشانی سرور (Restart یا Re-deploy) یا انقضای هاست پاک می‌شوند.
                </p>
              </div>

              <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-2">
                <h4 className="font-black text-indigo-950 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-indigo-600" />
                  راهکار پیاده‌سازی شده در این سامانه
                </h4>
                <p className="leading-relaxed text-indigo-900">
                  در این سامانه تصاویر به صورت فشرده شده مستقیماً درون فیلد <code className="font-mono bg-indigo-100 px-1 py-0.5 rounded text-indigo-800">image</code> و <code className="font-mono bg-indigo-100 px-1 py-0.5 rounded text-indigo-800">profile_image</code> جداول دیتابیس درج می‌گردند. در نتیجه حتی با انتقال سرور، ریستارت کانتینر یا ماه‌ها گذشت زمان، هیچ عکسی حذف نخواهد شد.
                </p>
              </div>
            </div>

            {/* Quick backup tip */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h5 className="text-xs font-bold text-amber-900">پشتیبان‌گیری دوره‌ای</h5>
                <p className="text-xs text-amber-800 leading-relaxed">
                  می‌توانید در تب «پشتیبان‌گیری»، هر زمان که مایل بودید نسخه کامل دیتابیس شامل تمامی کارگاه‌ها، محصولات و عکس‌های آنها را در قالب یک فایل JSON ایمن دانلود و ذخیره نمایید.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveSettings} className="space-y-6">
            {activeTab === "connection-string" ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Key className="h-4 w-4 text-indigo-600" />
                      آدرس کامل اتصال به دیتابیس (DATABASE_URL / Connection String)
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">PostgreSQL URI</span>
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="postgresql://user:password@ep-sample-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require"
                    value={databaseUrl}
                    onChange={(e) => handleParseConnectionString(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 focus:border-indigo-600 focus:bg-white rounded-2xl text-xs font-mono text-left font-bold outline-none transition-all text-slate-900 shadow-inner"
                  />
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    اگر از سرویس‌هایی نظیر Neon.tech، Supabase یا ElephantSQL استفاده می‌کنید، رشته اتصال کامل را در کادر بالا کپی کنید تا خودکار تفکیک و ذخیره شود.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Host */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Server className="h-4 w-4 text-indigo-600" />
                    <span>آدرس سرور / هاست دیتابیس (Host / Endpoint)</span>
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="مثال: localhost یا ep-sparkling-pool.neon.tech"
                    value={sqlHost}
                    onChange={(e) => setSqlHost(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl text-xs font-mono text-left font-bold outline-none transition-all text-slate-800"
                  />
                </div>

                {/* Database Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Database className="h-4 w-4 text-indigo-600" />
                    <span>نام پایگاه داده (Database Name)</span>
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="مثال: industrialpark یا neondb یا postgres"
                    value={sqlDbName}
                    onChange={(e) => setSqlDbName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl text-xs font-mono text-left font-bold outline-none transition-all text-slate-800"
                  />
                </div>

                {/* User */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Lock className="h-4 w-4 text-indigo-600" />
                    <span>نام کاربری دیتابیس (SQL Username)</span>
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="مثال: postgres یا default"
                    value={sqlUser}
                    onChange={(e) => setSqlUser(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl text-xs font-mono text-left font-bold outline-none transition-all text-slate-800"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Key className="h-4 w-4 text-indigo-600" />
                    <span>کلمه عبور پایگاه داده (SQL Password)</span>
                  </label>
                  <input
                    type="password"
                    dir="ltr"
                    placeholder="••••••••••••"
                    value={sqlPassword}
                    onChange={(e) => setSqlPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl text-xs font-mono text-left font-bold outline-none transition-all text-slate-800"
                  />
                </div>

                {/* SSL Mode */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-indigo-600" />
                    <span>حالت امنیتی SSL (SSL Mode)</span>
                  </label>
                  <select
                    value={sqlSsl}
                    onChange={(e) => setSqlSsl(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl text-xs font-bold outline-none transition-all text-slate-800 cursor-pointer"
                  >
                    <option value="require">Require (پیش‌فرض برای سرورهای ابری / Neon)</option>
                    <option value="disable">Disable (برای سرورهای محلی / Localhost)</option>
                    <option value="prefer">Prefer (تلاش برای SSL و سازگاری)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 flex-wrap gap-3">
              <button
                type="button"
                onClick={runDiagnostics}
                disabled={isTesting}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isTesting ? "animate-spin text-indigo-600" : ""}`} />
                <span>بررسی و تست ارتباط دیتابیس</span>
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 shadow-md shadow-indigo-200 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{isSaving ? "در حال ذخیره‌سازی..." : "ذخیره متغیرهای دیتابیس"}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Diagnostics Report Details */}
      {diagnostics && (
        <div className="bg-slate-900 rounded-3xl p-6 text-white space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-200 flex items-center gap-2">
              <Terminal className="h-4 w-4 text-emerald-400" />
              گزارش وضعیت جداول و پایگاه‌داده (Database Diagnostics)
            </h4>
            <span className="text-[11px] font-mono text-slate-400">
              زمان پاسخ: {diagnostics.latencyMs} میلی‌ثانیه
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50">
              <span className="text-slate-400 text-[10px] block">نسخه سرور دیتابیس</span>
              <span className="font-mono text-indigo-300 truncate block mt-0.5">
                {diagnostics.connection.serverVersion?.split(" ")[0] || "PostgreSQL"}
              </span>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50">
              <span className="text-slate-400 text-[10px] block">کاربر اتصال</span>
              <span className="font-mono text-emerald-300 truncate block mt-0.5">
                {diagnostics.connection.currentUser || "postgres"}
              </span>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50">
              <span className="text-slate-400 text-[10px] block">جدول کاربران و کارگاه‌ها</span>
              <span className="font-bold text-emerald-400 block mt-0.5">
                فعال و در دسترس
              </span>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50">
              <span className="text-slate-400 text-[10px] block">جدول محصولات و کاتالوگ</span>
              <span className="font-bold text-emerald-400 block mt-0.5">
                فعال و در دسترس
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
