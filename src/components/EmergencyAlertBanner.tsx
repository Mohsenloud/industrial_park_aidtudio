import React, { useState, useEffect } from "react";
import { EmergencyAlert } from "../types";
import { 
  Zap, 
  Flame, 
  Droplet, 
  CloudLightning, 
  ShieldAlert, 
  AlertTriangle, 
  BellRing, 
  PhoneCall, 
  MapPin, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  X, 
  Info,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function EmergencyAlertBanner() {
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);

  const fetchActiveAlerts = async () => {
    try {
      const res = await fetch("/api/emergency-alerts");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setAlerts(data.filter(a => a.isActive));
        }
      }
    } catch (err) {
      console.warn("Notice: could not load emergency alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveAlerts();

    const handleUpdate = () => {
      fetchActiveAlerts();
    };

    window.addEventListener("emergencyAlertsUpdated", handleUpdate);
    return () => {
      window.removeEventListener("emergencyAlertsUpdated", handleUpdate);
    };
  }, []);

  const activeVisibleAlerts = alerts.filter(a => !dismissedAlerts.includes(a.id));

  if (loading || activeVisibleAlerts.length === 0) {
    return null;
  }

  const handleDismiss = (id: string) => {
    setDismissedAlerts(prev => [...prev, id]);
  };

  const getCategoryTheme = (category: string, type: string) => {
    if (type === "critical") {
      return {
        bg: "bg-rose-50 dark:bg-rose-950/80",
        border: "border-rose-300 dark:border-rose-800",
        text: "text-rose-900 dark:text-rose-100",
        badgeBg: "bg-rose-600 text-white",
        iconColor: "text-rose-600 dark:text-rose-400",
        icon: type === "critical" ? Zap : AlertTriangle,
        accentBar: "bg-rose-600"
      };
    }

    switch (category) {
      case "power":
        return {
          bg: "bg-amber-50 dark:bg-amber-950/80",
          border: "border-amber-300 dark:border-amber-800",
          text: "text-amber-950 dark:text-amber-100",
          badgeBg: "bg-amber-600 text-white",
          iconColor: "text-amber-600 dark:text-amber-400",
          icon: Zap,
          accentBar: "bg-amber-500"
        };
      case "gas":
        return {
          bg: "bg-orange-50 dark:bg-orange-950/80",
          border: "border-orange-300 dark:border-orange-800",
          text: "text-orange-950 dark:text-orange-100",
          badgeBg: "bg-orange-600 text-white",
          iconColor: "text-orange-600 dark:text-orange-400",
          icon: Flame,
          accentBar: "bg-orange-500"
        };
      case "water":
        return {
          bg: "bg-cyan-50 dark:bg-cyan-950/80",
          border: "border-cyan-300 dark:border-cyan-800",
          text: "text-cyan-950 dark:text-cyan-100",
          badgeBg: "bg-cyan-600 text-white",
          iconColor: "text-cyan-600 dark:text-cyan-400",
          icon: Droplet,
          accentBar: "bg-cyan-500"
        };
      case "weather":
        return {
          bg: "bg-blue-50 dark:bg-blue-950/80",
          border: "border-blue-300 dark:border-blue-800",
          text: "text-blue-950 dark:text-blue-100",
          badgeBg: "bg-blue-600 text-white",
          iconColor: "text-blue-600 dark:text-blue-400",
          icon: CloudLightning,
          accentBar: "bg-blue-500"
        };
      case "security":
        return {
          bg: "bg-purple-50 dark:bg-purple-950/80",
          border: "border-purple-300 dark:border-purple-800",
          text: "text-purple-950 dark:text-purple-100",
          badgeBg: "bg-purple-600 text-white",
          iconColor: "text-purple-600 dark:text-purple-400",
          icon: ShieldAlert,
          accentBar: "bg-purple-500"
        };
      default:
        return {
          bg: "bg-indigo-50 dark:bg-indigo-950/80",
          border: "border-indigo-300 dark:border-indigo-800",
          text: "text-indigo-950 dark:text-indigo-100",
          badgeBg: "bg-indigo-600 text-white",
          iconColor: "text-indigo-600 dark:text-indigo-400",
          icon: BellRing,
          accentBar: "bg-indigo-500"
        };
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "power": return "قطعی و مدیریت بار برق";
      case "gas": return "افت فشار و قطعی گاز";
      case "water": return "قطعی و آبرسانی صنعتی";
      case "weather": return "هشدار هواشناسی و برودت";
      case "security": return "ایمنی، حوادث و آتش‌نشانی";
      default: return "اطلاعیه اضطراری شهرک";
    }
  };

  return (
    <div className="w-full space-y-3 mb-6" style={{ direction: "rtl" }}>
      <AnimatePresence>
        {activeVisibleAlerts.map((alert, aIdx) => {
          const theme = getCategoryTheme(alert.category, alert.type);
          const Icon = theme.icon;
          const isExpanded = expandedAlertId === alert.id;

          return (
            <motion.div
              key={`${alert.id || 'alert'}-${aIdx}`}
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, height: 0, margin: 0 }}
              transition={{ duration: 0.2 }}
              className={`rounded-2xl border-2 shadow-sm overflow-hidden relative ${theme.bg} ${theme.border}`}
            >
              {/* Top Accent Stripe */}
              <div className={`h-1.5 w-full ${theme.accentBar}`} />

              <div className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  
                  {/* Left (in RTL right) Icon and Title */}
                  <div className="flex items-start gap-3 flex-1">
                    <div className="relative shrink-0 mt-0.5 sm:mt-0">
                      <div className={`p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 shadow-xs border border-white/60 dark:border-slate-800 ${theme.iconColor}`}>
                        <Icon className="h-5 w-5 animate-pulse" />
                      </div>
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                      </span>
                    </div>

                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${theme.badgeBg}`}>
                          {getCategoryLabel(alert.category)}
                        </span>
                        
                        {alert.type === "critical" && (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 rounded-full text-[10px] font-extrabold border border-rose-300">
                            وضعیت بحرانی
                          </span>
                        )}

                        {alert.startDate && (
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                            <Clock className="h-3 w-3 inline text-slate-400" />
                            {alert.startDate}
                            {alert.endDate ? ` الی ${alert.endDate}` : ""}
                          </span>
                        )}
                      </div>

                      <h3 className={`font-black text-sm sm:text-base ${theme.text} leading-snug`}>
                        {alert.title}
                      </h3>
                    </div>
                  </div>

                  {/* Right Actions & Details Trigger */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {alert.phoneContact && (
                      <a
                        href={`tel:${alert.phoneContact}`}
                        className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-2xs"
                      >
                        <PhoneCall className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="font-mono">{alert.phoneContact}</span>
                      </a>
                    )}

                    <button
                      onClick={() => setExpandedAlertId(isExpanded ? null : alert.id)}
                      className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span>{isExpanded ? "بستن متن" : "جزئیات کامل"}</span>
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>

                    <button
                      onClick={() => handleDismiss(alert.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-white/60 dark:hover:bg-slate-800 transition-all cursor-pointer"
                      title="بستن موقت این اعلان"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Affected Areas Pill */}
                {alert.affectedAreas && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                    <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                    <span>مناطق و فازهای تحت تاثیر:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{alert.affectedAreas}</span>
                  </div>
                )}

                {/* Expanded Full Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed"
                    >
                      <p className="whitespace-pre-line bg-white/70 dark:bg-slate-900/70 p-3.5 rounded-xl border border-white/60 dark:border-slate-800">
                        {alert.message}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
