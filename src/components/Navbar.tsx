import React from "react";
import { CustomUser } from "../lib/customAuth";
import { UserProfile } from "../types";
import { LogIn, LogOut, LayoutDashboard, Home, Factory, User as UserIcon, Package, Briefcase } from "lucide-react";
import { motion } from "motion/react";

interface NavbarProps {
  user: CustomUser | null;
  profile: UserProfile | null;
  activeTab: "home" | "products" | "classifieds" | "dashboard";
  setActiveTab: (tab: "home" | "products" | "classifieds" | "dashboard") => void;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export default function Navbar({
  user,
  profile,
  activeTab,
  setActiveTab,
  onOpenAuth,
  onLogout
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Branding */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab("home")}>
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 border border-indigo-100">
              <Factory className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-800 tracking-tight leading-tight">
                بانک اطلاعات شهرک صنعتی
              </h1>
              <p className="text-[10px] text-slate-400 font-medium">
                سامانه آنلاین معرفی واحدهای تولیدی و محصولات
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setActiveTab("home")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === "home"
                  ? "bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <Home className="h-4 w-4" />
              <span>صفحه اصلی</span>
            </button>

            <button
              onClick={() => setActiveTab("products")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === "products"
                  ? "bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <Package className="h-4 w-4" />
              <span>ویترین محصولات</span>
            </button>

            <button
              onClick={() => setActiveTab("classifieds")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === "classifieds"
                  ? "bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <Briefcase className="h-4 w-4" />
              <span>نیازمندی‌ها و استخدام</span>
            </button>

            {user && (
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeTab === "dashboard"
                    ? "bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>مدیریت کارگاه من</span>
              </button>
            )}
          </div>

          {/* Authentication Status */}
          <div className="flex items-center gap-3">
            {/* Mobile Tab Navigation Icons */}
            <div className="md:hidden flex items-center gap-1 bg-slate-50 border border-slate-200/60 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab("home")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === "home"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="صفحه اصلی"
              >
                <Home className="h-4 w-4" />
              </button>
              <button
                onClick={() => setActiveTab("products")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === "products"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="ویترین محصولات"
              >
                <Package className="h-4 w-4" />
              </button>
              <button
                onClick={() => setActiveTab("classifieds")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === "classifieds"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="نیازمندی‌ها و استخدام"
              >
                <Briefcase className="h-4 w-4" />
              </button>
              {user && (
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === "dashboard"
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="مدیریت کارگاه من"
                >
                  <LayoutDashboard className="h-4 w-4" />
                </button>
              )}
            </div>

            {user ? (
              <div className="flex items-center gap-3">
                {/* User Info (Desktop) */}
                <div className="hidden sm:flex flex-col text-left items-end">
                  <span className="text-sm font-semibold text-slate-700">
                    {profile?.name || user.email?.split("@")[0]}
                  </span>
                  <span className="text-xs text-slate-400 font-medium font-mono">
                    {profile?.phone || "کاربر گرامی"}
                  </span>
                </div>
                
                {/* User Icon Avatar */}
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-slate-100 text-slate-600 border border-slate-200 shadow-sm">
                  <UserIcon className="h-5 w-5" />
                </div>

                {/* Logout Button */}
                <button
                  onClick={onLogout}
                  className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-xl transition-all duration-200 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">خروج</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md shadow-indigo-100 hover:shadow-lg hover:shadow-indigo-200 transition-all duration-200"
              >
                <LogIn className="h-4 w-4" />
                <span>ورود / ثبت‌نام کارگاه</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
