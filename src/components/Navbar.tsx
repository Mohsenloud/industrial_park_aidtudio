import React, { useState, useEffect, useRef } from "react";
import { CustomUser } from "../lib/customAuth";
import { UserProfile } from "../types";
import { LogIn, LogOut, LayoutDashboard, Home, Factory, User as UserIcon, Package, Briefcase, Settings, FileText, MessageSquare, Star, ChevronDown, MapPin } from "lucide-react";

interface NavbarProps {
  user: CustomUser | null;
  profile: UserProfile | null;
  isAdmin?: boolean;
  activeTab: "home" | "map" | "products" | "classifieds" | "dashboard" | "admin";
  setActiveTab: (tab: "home" | "map" | "products" | "classifieds" | "dashboard" | "admin") => void;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export default function Navbar({

  user,
  profile,
  isAdmin = false,
  activeTab,
  setActiveTab,
  onOpenAuth,
  onLogout
}: NavbarProps) {


  const [showDropdown, setShowDropdown] = useState(false);
  const [dashboardTab, setDashboardTab] = useState("overview");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
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
    { id: "quotes", label: "استعلام‌ها", icon: FileText },
    { id: "chats", label: "پیام‌ها", icon: MessageSquare },
    { id: "reviews", label: "نظرات", icon: Star },
    { id: "settings", label: "تنظیمات", icon: Settings },
  ];

  const tabs = [
    { id: "home", label: "صفحه اصلی", icon: Home, show: true },
    { id: "map", label: "نقشه شهرک", icon: MapPin, show: true },
    { id: "products", label: "محصولات", icon: Package, show: true },
    { id: "classifieds", label: "استخدام", icon: Briefcase, show: true },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm" style={{ direction: "rtl" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo / Branding */}
            <div className="flex items-center gap-2 sm:gap-3 cursor-pointer shrink-0" onClick={() => setActiveTab("home")}>
              <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 border border-indigo-100 flex items-center justify-center">
                <Factory className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="flex flex-col">
                <h1 className="font-bold text-sm sm:text-lg text-slate-800 tracking-tight leading-tight">
                  بانک اطلاعات شهرک صنعتی
                </h1>
                <p className="hidden sm:block text-[10px] text-slate-400 font-medium mt-0.5">
                  سامانه آنلاین معرفی واحدهای تولیدی و محصولات
                </p>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-1 lg:gap-2">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 lg:gap-2 px-3 py-2 lg:px-4 lg:py-2.5 rounded-xl text-xs lg:text-sm font-bold transition-all duration-200 cursor-pointer ${
                      isActive
                        ? "bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden lg:inline">{tab.label}</span>
                    <span className="lg:hidden">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Authentication Status */}
            <div className="flex items-center gap-3 shrink-0">
              {user ? (
                <div className="flex items-center gap-2">
                  {/* User Avatar Dropdown Button */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setShowDropdown(!showDropdown)}
                      className={`flex items-center gap-1.5 sm:gap-2 h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-2xl border transition-all cursor-pointer ${
                        showDropdown || activeTab === "dashboard" || activeTab === "admin"
                          ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                      }`}
                      title="حساب کاربری و منوی دسترسی"
                    >
                      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-black">
                        <UserIcon className="h-3.5 w-3.5" />
                      </div>
                      <span className="hidden sm:inline text-xs font-bold text-slate-800">
                        {profile?.name || "حساب کاربری"}
                      </span>
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${showDropdown ? "rotate-180 text-indigo-600" : "text-slate-400"}`} />
                    </button>
                    
                    {showDropdown && (
                      <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 flex flex-col py-2 text-right animate-in fade-in slide-in-from-top-2 duration-150">
                        {/* Profile Header */}
                        <div className="px-4 py-3 border-b border-slate-100 mb-1 bg-slate-50/70 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-extrabold text-slate-800">{profile?.name || user.email?.split("@")[0]}</p>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">{profile?.phone || user.email || "کاربر گرامی"}</p>
                          </div>
                          {isAdmin && (
                            <span className="text-[9px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-md border border-rose-200">
                              مدیر سامانه
                            </span>
                          )}
                        </div>
                        
                        {/* Workshop Management Button */}
                        <div className="px-2 py-1">
                          <button
                            onClick={() => {
                              setActiveTab("dashboard");
                              setShowDropdown(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              activeTab === "dashboard"
                                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-100"
                                : "text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className={`p-1.5 rounded-lg ${activeTab === "dashboard" ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-600"}`}>
                                <LayoutDashboard className="h-4 w-4" />
                              </div>
                              <div className="flex flex-col text-right">
                                <span className="font-extrabold">کارگاه من</span>
                                <span className={`text-[10px] ${activeTab === "dashboard" ? "text-indigo-100" : "text-slate-400"}`}>
                                  مدیریت اطلاعات و محصولات
                                </span>
                              </div>
                            </div>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${activeTab === "dashboard" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                              ورود
                            </span>
                          </button>
                        </div>

                        {/* If dashboard is active, show quick sub-tabs shortcut */}
                        {activeTab === "dashboard" && (
                          <div className="mx-2 mb-2 p-1.5 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                            <p className="px-2 py-1 text-[9px] font-bold text-slate-400">بخش‌های پنل کارگاه:</p>
                            {dashboardTabs.map(tab => {
                              const Icon = tab.icon;
                              const isActive = dashboardTab === tab.id;
                              return (
                                <button
                                  key={tab.id}
                                  onClick={() => dispatchDashboardTab(tab.id)}
                                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                                    isActive 
                                      ? 'text-indigo-600 bg-white shadow-xs border border-indigo-100 font-extrabold' 
                                      : 'text-slate-600 hover:bg-white hover:text-slate-900'
                                  }`}
                                >
                                  <Icon className="h-3.5 w-3.5" />
                                  <span>{tab.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                        
                        {/* Admin Panel Button (if admin) */}
                        {isAdmin && (
                          <div className="px-2 py-1">
                            <button
                              onClick={() => {
                                setActiveTab("admin");
                                setShowDropdown(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                activeTab === "admin"
                                  ? "bg-rose-600 text-white shadow-sm shadow-rose-100"
                                  : "text-slate-700 hover:bg-rose-50 hover:text-rose-700"
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className={`p-1.5 rounded-lg ${activeTab === "admin" ? "bg-white/20 text-white" : "bg-rose-100 text-rose-600"}`}>
                                  <Settings className="h-4 w-4" />
                                </div>
                                <div className="flex flex-col text-right">
                                  <span className="font-extrabold">پنل مدیریت</span>
                                  <span className={`text-[10px] ${activeTab === "admin" ? "text-rose-100" : "text-slate-400"}`}>
                                    نظارت، تایید و تنظیمات
                                  </span>
                                </div>
                              </div>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${activeTab === "admin" ? "bg-white/20 text-white" : "bg-rose-50 text-rose-600"}`}>
                                ارشد
                              </span>
                            </button>
                          </div>
                        )}

                        <div className="my-1 border-t border-slate-100" />

                        {/* Logout Button */}
                        <div className="px-2">
                          <button
                            onClick={() => {
                              onLogout();
                              setShowDropdown(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors font-bold text-xs cursor-pointer"
                          >
                            <LogOut className="h-4 w-4" />
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
                  className="flex items-center gap-1.5 sm:gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-100 hover:shadow-lg hover:shadow-indigo-200 transition-all duration-200 cursor-pointer"
                >
                  <LogIn className="h-4 w-4" />
                  <span>ورود / ثبت‌نام</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]" style={{ direction: "rtl" }}>
        <div className="flex items-center justify-around px-2 py-2">
          {tabs.filter((t: any) => !t.mobileHide).map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex flex-col items-center justify-center w-16 sm:w-20 gap-1 p-1.5 rounded-xl transition-all cursor-pointer ${
                  isActive
                    ? "text-indigo-600"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <div className={`p-1.5 rounded-lg transition-all ${isActive ? 'bg-indigo-50' : 'bg-transparent'}`}>
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <span className={`text-[9px] sm:text-[10px] font-bold ${isActive ? 'text-indigo-700' : ''}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
