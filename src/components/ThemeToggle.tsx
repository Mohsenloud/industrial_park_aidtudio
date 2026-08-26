import React, { useState, useRef, useEffect } from "react";
import { Sun, Moon, Laptop, ChevronDown, Check } from "lucide-react";
import { useTheme, Theme } from "../context/ThemeContext";
import { motion, AnimatePresence } from "motion/react";

interface ThemeToggleProps {
  variant?: "button" | "dropdown" | "segmented";
  className?: string;
}

export default function ThemeToggle({ variant = "button", className = "" }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Simple one-click Toggle Button
  if (variant === "button") {
    return (
      <button
        id="theme-toggle-btn"
        onClick={toggleTheme}
        className={`relative p-2 sm:p-2.5 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-center ${
          resolvedTheme === "dark"
            ? "bg-slate-800/80 hover:bg-slate-700/80 text-amber-300 border-slate-700 shadow-sm"
            : "bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200 shadow-xs"
        } ${className}`}
        title={resolvedTheme === "dark" ? "تغییر به تم روشن (روز)" : "تغییر به تم تاریک (شب)"}
        aria-label="تغییر حالت تم تاریک و روشن"
      >
        <AnimatePresence mode="wait" initial={false}>
          {resolvedTheme === "dark" ? (
            <motion.div
              key="moon"
              initial={{ rotate: -90, opacity: 0, scale: 0.7 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.2 }}
            >
              <Moon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
            </motion.div>
          ) : (
            <motion.div
              key="sun"
              initial={{ rotate: 90, opacity: 0, scale: 0.7 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: -90, opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.2 }}
            >
              <Sun className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-amber-500" />
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    );
  }

  // Segmented 3-Way Pill (Light / System / Dark)
  if (variant === "segmented") {
    const options: { id: Theme; label: string; icon: typeof Sun }[] = [
      { id: "light", label: "روشن", icon: Sun },
      { id: "system", label: "سیستم", icon: Laptop },
      { id: "dark", label: "تاریک", icon: Moon },
    ];

    return (
      <div 
        id="theme-segmented-group"
        className={`inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60 ${className}`}
        style={{ direction: "rtl" }}
      >
        {options.map((opt) => {
          const Icon = opt.icon;
          const isSelected = theme === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setTheme(opt.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isSelected
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Dropdown Mode
  return (
    <div className={`relative inline-block text-right ${className}`} ref={dropdownRef} style={{ direction: "rtl" }}>
      <button
        id="theme-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
      >
        {resolvedTheme === "dark" ? (
          <Moon className="h-4 w-4 text-amber-300" />
        ) : (
          <Sun className="h-4 w-4 text-amber-500" />
        )}
        <span className="hidden sm:inline">
          {theme === "system" ? "تم خودکار (سیستم)" : theme === "dark" ? "تم تاریک" : "تم روشن"}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 sm:right-0 top-full mt-2 w-44 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {[
            { id: "light" as Theme, label: "تم روشن (روز)", icon: Sun },
            { id: "dark" as Theme, label: "تم تاریک (شب)", icon: Moon },
            { id: "system" as Theme, label: "پیروی از سیستم", icon: Laptop },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = theme === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setTheme(item.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`h-3.5 w-3.5 ${item.id === "dark" ? "text-indigo-400" : item.id === "light" ? "text-amber-500" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
