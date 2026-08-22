import React, { useState, useEffect } from "react";
import { 
  FileText, 
  RefreshCw, 
  Trash2, 
  Download, 
  Copy, 
  Check, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Terminal,
  Activity
} from "lucide-react";
import toast from "react-hot-toast";

export interface LogEntry {
  id: string;
  timestamp: string;
  level: "ERROR" | "WARN" | "INFO" | "DEBUG";
  context: string;
  message: string;
  errorCode?: string;
  details?: any;
  stack?: string;
}

export default function SystemLogsViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [levelFilter, setLevelFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLogs = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const url = levelFilter === "ALL" 
        ? "/api/system/logs?limit=200" 
        : `/api/system/logs?limit=200&level=${levelFilter}`;
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      if (!silent) {
        toast.error("خطا در دریافت لاگ‌های سیستم");
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [levelFilter]);

  useEffect(() => {
    let interval: any = null;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchLogs(true);
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, levelFilter]);

  const confirmClearLogs = () => {
    toast((t) => (
      <div className="flex flex-col gap-3" style={{ direction: "rtl" }}>
        <p className="text-sm font-bold text-slate-800">آیا از پاکسازی تمام لاگ‌های ثبت‌شده مطمئن هستید؟</p>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              toast.dismiss(t.id);
              executeClearLogs();
            }}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            بله، پاکسازی شود
          </button>
          <button 
            onClick={() => toast.dismiss(t.id)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            انصراف
          </button>
        </div>
      </div>
    ), { duration: 6000, style: { border: '1px solid #fecdd3' } });
  };

  const executeClearLogs = async () => {
    try {
      let tokenHeaders: Record<string, string> = {};
      const savedUser = localStorage.getItem("custom_auth_user");
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed?.token) {
          tokenHeaders["Authorization"] = `Bearer ${parsed.token}`;
        }
      }
      const res = await fetch("/api/system/logs", {
        method: "DELETE",
        headers: tokenHeaders
      });
      if (res.ok) {
        toast.success("لاگ‌های سیستم با موفقیت پاکسازی شدند.");
        setLogs([]);
      } else {
        toast.error("خطا در پاکسازی لاگ‌ها (نیاز به دسترسی مدیر ارشد)");
      }
    } catch (err) {
      toast.error("خطا در ارتباط با سرور");
    }
  };

  const handleCopyLog = (log: LogEntry) => {
    const text = `[${log.timestamp}] [${log.level}] [${log.context}] ${log.message}\n${
      log.errorCode ? `Code: ${log.errorCode}\n` : ""
    }${log.details ? `Details: ${JSON.stringify(log.details, null, 2)}\n` : ""}${
      log.stack ? `Stack Trace:\n${log.stack}` : ""
    }`;

    navigator.clipboard.writeText(text);
    setCopiedId(log.id);
    toast.success("اطلاعات لاگ در حافظه کپی شد");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAll = async () => {
    try {
      const res = await fetch("/api/system/logs/raw");
      if (res.ok) {
        const raw = await res.text();
        navigator.clipboard.writeText(raw);
        toast.success("تمام متن لاگ سیستم کپی شد");
      }
    } catch (err) {
      toast.error("خطا در دریافت متن لاگ");
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.message?.toLowerCase().includes(q) ||
      log.context?.toLowerCase().includes(q) ||
      log.errorCode?.toLowerCase().includes(q) ||
      (log.stack && log.stack.toLowerCase().includes(q)) ||
      (log.details && JSON.stringify(log.details).toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-3xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-600/30 border border-indigo-500/30 rounded-2xl">
            <Terminal className="h-6 w-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-base font-black flex items-center gap-2">
              <span>گزارشات و لاگ‌های خطا و رویدادهای سیستم</span>
              <span className="text-[10px] px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full font-mono border border-indigo-500/30">
                {logs.length} رکورد
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              مشاهده و بررسی کدهای خطای دیتابیس، ثبت‌نام، ورود، پیامک‌ها و کوئری‌های اجرا شده
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              autoRefresh 
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" 
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
            }`}
          >
            <Activity className={`h-3.5 w-3.5 ${autoRefresh ? "animate-pulse text-emerald-400" : ""}`} />
            <span>{autoRefresh ? "بروزرسانی زنده (فعال)" : "بروزرسانی خودکار"}</span>
          </button>

          <button
            onClick={() => fetchLogs()}
            disabled={isLoading}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700 disabled:opacity-50"
            title="تازه سازی"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-indigo-400" : ""}`} />
            <span>تازه سازی</span>
          </button>

          <button
            onClick={handleCopyAll}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>کپی متن لاگ</span>
          </button>

          <a
            href="/api/system/logs/raw?download=true"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700"
          >
            <Download className="h-3.5 w-3.5" />
            <span>دانلود فایل</span>
          </a>

          <button
            onClick={confirmClearLogs}
            className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>پاکسازی</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        {/* Level Filters */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
          {[
            { key: "ALL", label: "همه لاگ‌ها" },
            { key: "ERROR", label: "خطاها (Error)" },
            { key: "WARN", label: "هشدارها (Warn)" },
            { key: "INFO", label: "اطلاعات (Info)" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setLevelFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                levelFilter === tab.key
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative flex-1 w-full">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="جستجو در پیام، کوئری، متد، کد خطا یا متن استک..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium"
          />
        </div>
      </div>

      {/* Log Entries List */}
      <div className="space-y-3">
        {filteredLogs.map((log, idx) => {
          const isExpanded = expandedLogId === log.id;
          const isError = log.level === "ERROR";
          const isWarn = log.level === "WARN";

          return (
            <div
              key={`${log.id}-${idx}`}
              className={`rounded-2xl border transition-all text-xs font-sans ${
                isError
                  ? "bg-rose-50/40 border-rose-200/80"
                  : isWarn
                  ? "bg-amber-50/40 border-amber-200/80"
                  : "bg-white border-slate-100 shadow-xs"
              }`}
            >
              <div 
                onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {isError ? (
                      <AlertCircle className="h-4 w-4 text-rose-600" />
                    ) : isWarn ? (
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    ) : (
                      <Info className="h-4 w-4 text-indigo-600" />
                    )}
                  </div>

                  <div className="space-y-1 text-right">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-black ${
                          isError
                            ? "bg-rose-600 text-white"
                            : isWarn
                            ? "bg-amber-500 text-white"
                            : "bg-indigo-600 text-white"
                        }`}
                      >
                        {log.level}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-200/70 text-slate-700 rounded-md font-mono text-[10px] font-bold">
                        {log.context}
                      </span>
                      {log.errorCode && (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-200 rounded-md font-mono text-[10px] font-bold">
                          کد: {log.errorCode}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 font-mono" dir="ltr">
                        {new Date(log.timestamp).toLocaleString("fa-IR")}
                      </span>
                    </div>

                    <p className="font-bold text-slate-800 text-xs leading-relaxed font-mono break-all" dir="ltr">
                      {log.message}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyLog(log);
                    }}
                    className="p-1.5 hover:bg-slate-200/60 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
                    title="کپی لاگ"
                  >
                    {copiedId === log.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>

                  <div className="text-slate-400">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-200/60 space-y-3">
                  {log.details && (
                    <div>
                      <div className="text-[11px] font-bold text-slate-600 mb-1">اطلاعات تکمیلی و پارامترها:</div>
                      <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl text-[11px] font-mono overflow-x-auto text-left" dir="ltr">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  )}

                  {log.stack && (
                    <div>
                      <div className="text-[11px] font-bold text-slate-600 mb-1">متن ردیابی خطا (Stack Trace):</div>
                      <pre className="p-3 bg-slate-900 text-rose-300 rounded-xl text-[11px] font-mono overflow-x-auto text-left whitespace-pre-wrap leading-relaxed" dir="ltr">
                        {log.stack}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredLogs.length === 0 && !isLoading && (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 space-y-3">
            <FileText className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-400 font-bold">هیچ لاگی با فیلترهای انتخابی یافت نشد.</p>
          </div>
        )}
      </div>
    </div>
  );
}
