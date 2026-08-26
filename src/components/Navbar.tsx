import React, { useState, useEffect, useRef } from "react";
import { CustomUser } from "../lib/customAuth";
import { UserProfile, SiteContent, DEFAULT_SITE_CONTENT } from "../types";
import { 
  LogIn, 
  LogOut, 
  LayoutDashboard, 
  Home, 
  Factory, 
  User as UserIcon, 
  Package, 
  Briefcase, 
  Settings, 
  FileText, 
  MessageSquare, 
  Star, 
  ChevronDown, 
  MapPin, 
  ShieldCheck,
  Wrench
} from "lucide-react";
import { motion } from "motion/react";
import ThemeToggle from "./ThemeToggle";

interface NavbarProps {
  user: CustomUser | null;
  profile: UserProfile | null;
  isAdmin?: boolean;
  activeTab: "home" | "map" | "products" | "capacities" | "classifieds" | "dashboard" | "admin";
  setActiveTab: (tab: "home" | "map" | "products" | "capacities" | "classifieds" | "dashboard" | "admin") => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  siteContent?: SiteContent;
}

export default function Navbar({
  user,
  profile,
  isAdmin = false,
  activeTab,
  setActiveTab,
  onOpenAuth,
  onLogout,
  siteContent
}: NavbarProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showClassifiedsDropdown, setShowClassifiedsDropdown] = useState(false);
  const [showMobileServicesSheet, setShowMobileServicesSheet] = useState(false);
  const [dashboardTab, setDashboardTab] = useState("overview");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const classifiedsDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (classifiedsDropdownRef.current && !classifiedsDropdownRef.current.contains(event.target as Node)) {
        setShowClassifiedsDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleTabChange = (e: any) => setDashboardTab(e.detail);
    window.addEventListener('changeDashboardTab', handleTabChange);
    return () => window.removeEventListener('changeDashboardTab', handleTabChange);
  }, []);

  const dispatchDashboardTab = (tab: string) => {
    setDashboardTab(tab);
    window.dispatchEvent(new CustomEvent('changeDashboardTab', { detail: tab }));
    setShowDropdown(false);
  };

  const dashboardTabs = [
    { id: "overview", label: "اطلاعات کارگاه", icon: LayoutDashboard },
    { id: "products", label: "محصولات", icon: Package },
    { id: "capacities", label: "ظرفیت‌های خالی", icon: Wrench },
    { id: "quotes", label: "استعلام‌ها", icon: FileText },
    { id: "chats", label: "پیام‌ها", icon: MessageSquare },
    { id: "reviews", label: "نظرات", icon: Star },
    { id: "settings", label: "تنظیمات", icon: Settings },
  ];

  const desktopTabs = [
    { id: "home", label: "صفحه اصلی", icon: Home },
    { id: "map", label: "نقشه شهرک", icon: MapPin },
    { id: "products", label: "محصولات", icon: Package },
  ];

  // Mobile Bottom Navigation Tabs
  const mobileNavTabs = [
    { id: "home", label: "خانه", icon: Home },
    { id: "map", label: "نقشه", icon: MapPin },
    { id: "products", label: "محصولات", icon: Package },
    { 
      id: "services_group", 
      label: "استخدام و نیازمندی", 
      icon: Briefcase,
      isGroup: true
    },
    { 
      id: isAdmin ? "admin" : "dashboard", 
      label: user ? (isAdmin ? "مدیریت" : "کارگاه من") : "حساب من", 
      icon: isAdmin ? ShieldCheck : (user ? LayoutDashboard : UserIcon),
      requiresAuth: !user
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors" style={{ direction: "rtl" }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo / Branding */}
            <div className="flex items-center gap-2 sm:gap-2.5 cursor-pointer shrink-0" onClick={() => setActiveTab("home")}>
              <div className="p-1.5 sm:p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center">
                <Factory className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="flex flex-col">
                <h1 className="font-extrabold text-xs sm:text-sm text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
                  {siteContent?.headerTitle || DEFAULT_SITE_CONTENT.headerTitle}
                </h1>
                <p className="hidden sm:block text-[9.5px] text-slate-400 dark:text-slate-500 font-medium">
                  {siteContent?.headerSubtitle || DEFAULT_SITE_CONTENT.headerSubtitle}
                </p>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-1 lg:gap-1.5">
              {desktopTabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      if (tab.id === "dashboard" && !user) {
                        onOpenAuth();
                        return;
                      }
                      setActiveTab(tab.id as any);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 lg:px-3 lg:py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                      isActive
                        ? "bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/60 shadow-xs"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white border border-transparent"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}

              {/* Submenu for Classifieds & Services Marketplace */}
              <div className="relative" ref={classifiedsDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowClassifiedsDropdown(!showClassifiedsDropdown)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 lg:px-3 lg:py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                    activeTab === "classifieds" || activeTab === "capacities" || showClassifiedsDropdown
                      ? "bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/60 shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white border border-transparent"
                  }`}
                  aria-expanded={showClassifiedsDropdown}
                >
                  <Briefcase className="h-3.5 w-3.5" />
                  <span>استخدام و نیازمندی‌ها</span>
                  <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${showClassifiedsDropdown ? "rotate-180 text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`} />
                </button>

                {showClassifiedsDropdown && (
                  <div className="absolute right-0 top-full mt-1.5 w-76 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-1.5 z-50 text-right animate-in fade-in slide-in-from-top-1.5 duration-150 space-y-1">
                    <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-[10.5px] font-black text-slate-800 dark:text-slate-200">فرصت‌ها، خدمات و نیازمندی‌های شهرک</p>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">مشاهده و ثبت رایگان آگهی‌های صنعتی</p>
                    </div>

                    {/* Submenu Item 1: Classifieds & Jobs */}
                    <button
                      onClick={() => {
                        setActiveTab("classifieds");
                        setShowClassifiedsDropdown(false);
                      }}
                      className={`w-full flex items-start gap-2.5 p-2 rounded-xl transition-all cursor-pointer text-right ${
                        activeTab === "classifieds"
                          ? "bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800/60"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/70 border border-transparent"
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                        activeTab === "classifieds"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50"
                      }`}>
                        <Briefcase className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`text-[11.5px] font-bold ${activeTab === "classifieds" ? "text-indigo-900 dark:text-indigo-200 font-black" : "text-slate-800 dark:text-slate-200"}`}>
                            آگهی‌های استخدام و نیازمندی
                          </span>
                          {activeTab === "classifieds" && (
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
                          )}
                        </div>
                        <p className="text-[9.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          فرصت‌های شغلی، رهن و اجاره سوله، ماشین‌آلات کارکرده
                        </p>
                      </div>
                    </button>

                    {/* Submenu Item 2: Services & Industrial Capacities Marketplace */}
                    <button
                      onClick={() => {
                        setActiveTab("capacities");
                        setShowClassifiedsDropdown(false);
                      }}
                      className={`w-full flex items-start gap-2.5 p-2 rounded-xl transition-all cursor-pointer text-right ${
                        activeTab === "capacities"
                          ? "bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800/60"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/70 border border-transparent"
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                        activeTab === "capacities"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50"
                      }`}>
                        <Wrench className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`text-[11.5px] font-bold ${activeTab === "capacities" ? "text-indigo-900 dark:text-indigo-200 font-black" : "text-slate-800 dark:text-slate-200"}`}>
                            بازارگاه خدمات و ظرفیت‌های خالی
                          </span>
                          {activeTab === "capacities" && (
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
                          )}
                        </div>
                        <p className="text-[9.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          اشتراک‌گذاری و اجاره ظرفیت دستگاه‌ها (CNC، تزریق، تراشکاری)
                        </p>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Controls: Theme Toggle & Authentication Status */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Theme Toggle Button */}
              <ThemeToggle variant="button" />

              {user ? (
                <div className="flex items-center gap-1.5">
                  {/* User Avatar Dropdown Button */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setShowDropdown(!showDropdown)}
                      className={`flex items-center gap-1.5 h-8 sm:h-9 px-2 sm:px-3 rounded-xl border transition-all cursor-pointer text-xs ${
                        showDropdown || activeTab === "dashboard" || activeTab === "admin"
                          ? "bg-indigo-50 dark:bg-indigo-950/70 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                      }`}
                      title="حساب کاربری و منوی دسترسی"
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white ${isAdmin ? "bg-rose-600" : "bg-indigo-600"}`}>
                        {isAdmin ? <ShieldCheck className="h-3 w-3" /> : <UserIcon className="h-3 w-3" />}
                      </div>
                      <span className="hidden sm:inline text-xs font-bold text-slate-800 dark:text-slate-200">
                        {profile?.name || (isAdmin ? "مدیر ارشد سامانه" : "حساب کاربری")}
                      </span>
                      <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${showDropdown ? "rotate-180 text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`} />
                    </button>
                    
                    {showDropdown && (
                      <div className="absolute left-0 top-full mt-1.5 w-68 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden z-50 flex flex-col py-1.5 text-right animate-in fade-in slide-in-from-top-1.5 duration-150">
                        {/* Profile Header */}
                        <div className={`px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 mb-1 flex items-center justify-between ${isAdmin ? "bg-rose-50/80 dark:bg-rose-950/40" : "bg-slate-50/70 dark:bg-slate-800/40"}`}>
                          <div>
                            <p className="text-[11.5px] font-extrabold text-slate-800 dark:text-slate-100">{profile?.name || (isAdmin ? "مدیر ارشد سیستم" : user.email?.split("@")[0])}</p>
                            <p className="text-[9.5px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">{profile?.phone || user.email || "حساب دسترسی"}</p>
                          </div>
                          {isAdmin && (
                            <span className="text-[8.5px] font-extrabold bg-rose-600 text-white px-1.5 py-0.5 rounded shadow-xs">
                              Super Admin
                            </span>
                          )}
                        </div>
                        
                        {/* If Admin: Direct Admin Panel Controls */}
                        {isAdmin ? (
                          <div className="px-1.5 py-1 space-y-1">
                            <div className="px-2 py-1 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 rounded-xl mb-1.5">
                              <p className="text-[9.5px] font-bold text-amber-800 dark:text-amber-300 leading-relaxed">
                                🔒 دسترسی نظارتی فعال مدیر ارشد
                              </p>
                            </div>

                            <button
                              onClick={() => {
                                setActiveTab("admin");
                                setShowDropdown(false);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                activeTab === "admin"
                                  ? "bg-rose-600 text-white shadow-xs"
                                  : "bg-rose-50/50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 hover:bg-rose-100/70 dark:hover:bg-rose-900/40 border border-rose-100 dark:border-rose-900/30"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`p-1 rounded-lg ${activeTab === "admin" ? "bg-white/20 text-white" : "bg-rose-200 dark:bg-rose-800 text-rose-700 dark:text-rose-200"}`}>
                                  <Settings className="h-3.5 w-3.5" />
                                </div>
                                <div className="flex flex-col text-right">
                                  <span className="font-extrabold text-[11.5px]">ورود به پنل مدیریت ارشد</span>
                                </div>
                              </div>
                              <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded ${activeTab === "admin" ? "bg-white/20 text-white" : "bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"}`}>
                                مدیریت
                              </span>
                            </button>
                          </div>
                        ) : (
                          /* If Regular User: Workshop Management */
                          <>
                            <div className="px-1.5 py-1">
                              <button
                                onClick={() => {
                                  setActiveTab("dashboard");
                                  setShowDropdown(false);
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                  activeTab === "dashboard"
                                    ? "bg-indigo-600 text-white shadow-xs"
                                    : "text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-700 dark:hover:text-indigo-400"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <div className={`p-1 rounded-lg ${activeTab === "dashboard" ? "bg-white/20 text-white" : "bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400"}`}>
                                    <LayoutDashboard className="h-3.5 w-3.5" />
                                  </div>
                                  <div className="flex flex-col text-right">
                                    <span className="font-extrabold text-[11.5px]">کارگاه من</span>
                                  </div>
                                </div>
                                <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded ${activeTab === "dashboard" ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"}`}>
                                  ورود
                                </span>
                              </button>
                            </div>

                            {/* If dashboard is active for regular user, show quick sub-tabs shortcut */}
                            {activeTab === "dashboard" && (
                              <div className="mx-1.5 mb-1.5 p-1 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-0.5">
                                <p className="px-2 py-0.5 text-[8.5px] font-bold text-slate-400 dark:text-slate-500">بخش‌های پنل کارگاه:</p>
                                {dashboardTabs.map(tab => {
                                  const Icon = tab.icon;
                                  const isActive = dashboardTab === tab.id;
                                  return (
                                    <button
                                      key={tab.id}
                                      onClick={() => dispatchDashboardTab(tab.id)}
                                      className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10.5px] font-bold transition-colors cursor-pointer ${
                                        isActive 
                                          ? 'text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 shadow-xs border border-indigo-100 dark:border-indigo-900/50 font-extrabold' 
                                          : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                                      }`}
                                    >
                                      <Icon className="h-3 w-3" />
                                      <span>{tab.label}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        )}

                        <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                        {/* Logout Button */}
                        <div className="px-1.5">
                          <button
                            onClick={() => {
                              onLogout();
                              setShowDropdown(false);
                            }}
                            className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors font-bold text-[11px] cursor-pointer"
                          >
                            <LogOut className="h-3.5 w-3.5" />
                            <span>خروج از حساب</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs font-bold shadow-xs shadow-indigo-100 dark:shadow-none hover:shadow-sm transition-all duration-150 cursor-pointer"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>ورود / ثبت‌نام</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Redesigned Mobile Bottom Navigation Bar */}
      <nav 
        aria-label="ناوبری اصلی موبایل"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none pb-[calc(env(safe-area-inset-bottom,0px)+0.35rem)] pt-1 px-3"
        style={{ direction: "rtl" }}
      >
        <div className="pointer-events-auto max-w-md mx-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 rounded-2xl sm:rounded-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.5)] px-1.5 py-1.5 flex items-center justify-between transition-colors">
          {mobileNavTabs.map(tab => {
            const Icon = tab.icon;
            const isServicesGroup = tab.id === "services_group";
            const isActive = isServicesGroup
              ? (activeTab === "classifieds" || activeTab === "capacities")
              : (activeTab === tab.id || (tab.id === "dashboard" && activeTab === "dashboard") || (tab.id === "admin" && activeTab === "admin"));
            
            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.88 }}
                onClick={() => {
                  if (tab.requiresAuth) {
                    onOpenAuth();
                    return;
                  }
                  if (isServicesGroup) {
                    setShowMobileServicesSheet(true);
                    return;
                  }
                  setActiveTab(tab.id as any);
                }}
                className={`relative flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all duration-200 cursor-pointer min-h-[48px] select-none ${
                  isActive
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {/* Active Indicator Background Pill */}
                {isActive && (
                  <motion.div
                    layoutId="mobileNavActivePill"
                    className="absolute inset-0 bg-indigo-50/90 dark:bg-indigo-950/70 border border-indigo-100/90 dark:border-indigo-800/60 rounded-xl"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}

                {/* Tab Icon with micro-badge */}
                <div className="relative z-10 flex items-center justify-center">
                  <Icon 
                    className={`transition-all duration-200 ${
                      isActive 
                        ? "h-5 w-5 stroke-[2.4] scale-110 drop-shadow-[0_2px_8px_rgba(99,102,241,0.25)]" 
                        : "h-5 w-5 stroke-[1.8] opacity-80 group-hover:opacity-100"
                    }`} 
                  />
                  
                  {/* Status Indicator Dot for user tab */}
                  {(tab.id === "dashboard" || tab.id === "admin") && user && (
                    <span 
                      className={`absolute -top-0.5 -right-1 w-2 h-2 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                        isAdmin ? "bg-rose-500 animate-pulse" : "bg-emerald-500"
                      }`}
                      title={isAdmin ? "مدیر ارشد آنلاین" : "حساب متصل"}
                    />
                  )}
                </div>

                {/* Tab Label */}
                <span className={`relative z-10 text-[10px] mt-0.5 tracking-tight transition-all duration-150 leading-tight whitespace-nowrap ${
                  isActive 
                    ? "font-black text-indigo-700 dark:text-indigo-300" 
                    : "font-semibold text-slate-500 dark:text-slate-400"
                }`}>
                  {tab.label}
                </span>

                {/* Active Top Glow Line */}
                {isActive && (
                  <motion.span
                    layoutId="mobileNavActiveDot"
                    className="absolute -top-1 w-4 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full shadow-xs"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </nav>

      {/* Mobile Services & Classifieds Bottom Action Sheet */}
      {showMobileServicesSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150" style={{ direction: "rtl" }}>
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-2.5 animate-in slide-in-from-bottom duration-200 pb-7 sm:pb-5">
            {/* Sheet Handle */}
            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-1"></div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Briefcase className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                    استخدام، خدمات و نیازمندی‌ها
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    بخش مورد نظر خود را انتخاب نمایید
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMobileServicesSheet(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5 pt-0.5">
              {/* Option 1: Classifieds */}
              <button
                onClick={() => {
                  setActiveTab("classifieds");
                  setShowMobileServicesSheet(false);
                }}
                className={`w-full flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border transition-all text-right cursor-pointer ${
                  activeTab === "classifieds"
                    ? "bg-indigo-50 dark:bg-indigo-950/70 border-indigo-200 dark:border-indigo-800 shadow-xs"
                    : "bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${activeTab === "classifieds" ? "bg-indigo-600 text-white" : "bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400"}`}>
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-[11.5px] font-extrabold text-slate-900 dark:text-slate-100">
                      آگهی‌های استخدام و نیازمندی
                    </h4>
                    <p className="text-[9.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                      فرصت‌های شغلی، رهن/اجاره سوله، ماشین‌آلات و ابزارآلات
                    </p>
                  </div>
                </div>
                <div className="text-[10px] font-bold text-indigo-600">
                  {activeTab === "classifieds" ? "فعال ✓" : "مشاهده"}
                </div>
              </button>

              {/* Option 2: Capacities & Services */}
              <button
                onClick={() => {
                  setActiveTab("capacities");
                  setShowMobileServicesSheet(false);
                }}
                className={`w-full flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border transition-all text-right cursor-pointer ${
                  activeTab === "capacities"
                    ? "bg-indigo-50 dark:bg-indigo-950/70 border-indigo-200 dark:border-indigo-800 shadow-xs"
                    : "bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${activeTab === "capacities" ? "bg-indigo-600 text-white" : "bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400"}`}>
                    <Wrench className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-[11.5px] font-extrabold text-slate-900 dark:text-slate-100">
                      بازارگاه خدمات و ظرفیت‌های خالی
                    </h4>
                    <p className="text-[9.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                      اشتراک‌گذاری و اجاره ظرفیت دستگاه‌های صنعتی و کارگاهی
                    </p>
                  </div>
                </div>
                <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  {activeTab === "capacities" ? "فعال ✓" : "مشاهده"}
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

