import React, { useState, useEffect } from "react";
import { customAuth, CustomUser } from "./lib/customAuth";
import { UserProfile, Unit, Product, CATEGORIES, SiteContent, DEFAULT_SITE_CONTENT } from "./types";
import { getUserProfile, createUserProfile, getAllUnits, getAllProducts } from "./lib/firebaseUtils";
import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import UnitCard from "./components/UnitCard";
import { UnitGridSkeleton } from "./components/Skeleton";
import UnitDetailModal from "./components/UnitDetailModal";
import AuthModal from "./components/AuthModal";
import Dashboard from "./components/Dashboard";
import AdminDashboard from "./components/AdminDashboard";
import AdminLoginPage from "./components/AdminLogin/AdminLoginPage";
import CategoryBar from "./components/CategoryBar";
import IndustrialAds from "./components/IndustrialAds";
import AllProductsPage from "./components/AllProductsPage";
import Classifieds from "./components/Classifieds";
import IndustrialParkMap from "./components/IndustrialParkMap";
import InstallPWA from "./components/InstallPWA";
import EmergencyAlertBanner from "./components/EmergencyAlertBanner";
import IndustrialCapacitiesPage from "./components/IndustrialCapacities/IndustrialCapacitiesPage";

import { 
  Building2, 
  Search, 
  MapPin, 
  Briefcase, 
  Plus, 
  Grid, 
  Layout, 
  Package, 
  Info, 
  Loader2,
  AlertCircle,
  LogOut,
  Map as MapIcon,
  Layers,
  ShieldCheck,
  Settings,
  Lock
} from "lucide-react";
import { motion } from "motion/react";
import { Toaster } from "react-hot-toast";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRouteAdmin = location.pathname.startsWith("/app/adminpanel");
  const isAdminLoginRoute = location.pathname === "/admin-login" || location.pathname === "/admin/login" || location.pathname === "/admin";
  
  const [user, setUser] = useState<CustomUser | null>(() => customAuth.currentUserState);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    const u = customAuth.currentUserState;
    if (u) {
      if (u.isAdmin || u.role === "super_admin" || u.uid === "usr_direct_admin" || u.email === "manamalat@gmail.com" || u.email === "admin@industrialpark.ir") {
        return true;
      }
    }
    try {
      const adminSession = localStorage.getItem("custom_admin_session");
      if (adminSession) {
        const parsed = JSON.parse(adminSession);
        if (parsed && (parsed.uid || parsed.email)) return true;
      }
    } catch (_) {}
    return false;
  });
  const [authLoading, setAuthLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"home" | "map" | "products" | "capacities" | "classifieds" | "dashboard" | "admin">(() => {
    try {
      const savedTab = localStorage.getItem("custom_active_tab");
      const validTabs = ["home", "map", "products", "capacities", "classifieds", "dashboard", "admin"];
      if (savedTab && validTabs.includes(savedTab)) {
        return savedTab as any;
      }
    } catch (_) {}
    return "home";
  });
  const [homeViewMode, setHomeViewMode] = useState<"grid" | "map">("grid");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Sync activeTab to localStorage
  const handleTabChange = (tab: "home" | "map" | "products" | "capacities" | "classifieds" | "dashboard" | "admin") => {
    setActiveTab(tab);
    try {
      localStorage.setItem("custom_active_tab", tab);
    } catch (_) {}
  };

  // Main Data States
  const [units, setUnits] = useState<Unit[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Search/Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [unitsPage, setUnitsPage] = useState(1);

  useEffect(() => {
    setUnitsPage(1);
  }, [searchQuery, selectedCategory]);

  // Detailed Modal State
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  // Dynamic Site Content State (Managed by Senior Admin via CMS)
  const [siteContent, setSiteContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);

  const fetchSiteContent = async () => {
    try {
      const res = await fetch("/api/site-content");
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === "object" && Object.keys(data).length > 0) {
          setSiteContent({
            ...DEFAULT_SITE_CONTENT,
            ...data
          });
        }
      }
    } catch (err) {
      console.warn("Could not load site content, using defaults:", err);
    }
  };

  // Real-time listener for site content updates dispatched from admin panel
  useEffect(() => {
    const handleContentUpdate = (e: any) => {
      if (e?.detail) {
        setSiteContent(prev => ({
          ...prev,
          ...e.detail
        }));
      } else {
        fetchSiteContent();
      }
    };

    window.addEventListener("siteContentUpdated", handleContentUpdate);
    return () => {
      window.removeEventListener("siteContentUpdated", handleContentUpdate);
    };
  }, []);

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = customAuth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        let isUserAdmin = Boolean(
          currentUser.isAdmin || 
          currentUser.role === "super_admin" || 
          currentUser.uid === "usr_direct_admin" || 
          currentUser.email === "manamalat@gmail.com" || 
          currentUser.email === "admin@industrialpark.ir"
        );

        try {
          const adminSession = localStorage.getItem("custom_admin_session");
          if (adminSession) {
            const parsed = JSON.parse(adminSession);
            if (parsed && (parsed.uid === currentUser.uid || parsed.email === currentUser.email)) {
              isUserAdmin = true;
            }
          }
        } catch (_) {}

        try {
          const res = await fetch(`/api/users/is-admin/${currentUser.uid}`);
          if (res.ok) {
            const data = await res.json().catch(() => ({}));
            if (typeof data?.isAdmin === "boolean") {
              isUserAdmin = data.isAdmin;
            }
          }
        } catch (err) {
          console.warn("Could not check admin status:", err);
        }

        setIsAdmin(isUserAdmin);

        try {
          const userProfile = await getUserProfile(currentUser.uid).catch(() => null);
          if (userProfile) {
            setProfile(userProfile);
          } else {
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              name: currentUser.name || currentUser.email?.split("@")[0] || "کاربر محترم",
              phone: currentUser.phone || "ثبت نشده",
              email: currentUser.email || "",
              createdAt: new Date().toISOString()
            };
            setProfile(newProfile);
          }
        } catch (err) {
          setProfile({
            uid: currentUser.uid,
            name: currentUser.name || "کاربر محترم",
            phone: currentUser.phone || "ثبت نشده",
            email: currentUser.email || "",
            createdAt: new Date().toISOString()
          });
        }
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Load Public Directories
  const loadDirectoryData = async () => {
    try {
      setDataLoading(true);
      const [allUnits, allProducts] = await Promise.all([
        getAllUnits().catch((err) => {
          console.warn("Failed to load units:", err);
          return [];
        }),
        getAllProducts().catch((err) => {
          console.warn("Failed to load products:", err);
          return [];
        })
      ]);
      setUnits(allUnits);
      setProducts(allProducts);
    } catch (err) {
      console.warn("Could not load directory data:", err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    loadDirectoryData();
    fetchSiteContent();
  }, []);

  // Handle Deep Linking for Share feature (?unit=unitId)
  useEffect(() => {
    if (units.length > 0 && !dataLoading) {
      const params = new URLSearchParams(window.location.search);
      const unitIdParam = params.get("unit") || params.get("unitId");
      if (unitIdParam) {
        const found = units.find(u => u.id === unitIdParam);
        if (found) {
          setSelectedUnit(found);
          setActiveTab("home");
        }
      }
    }
  }, [units, dataLoading]);

  // 3. Search and Filter Logic
  const filteredUnits = units.filter((unit) => {
    // A. Category Filter
    if (selectedCategory && unit.category !== selectedCategory) {
      return false;
    }

    // B. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      
      // Check unit details
      const matchesUnit = 
        unit.name.toLowerCase().includes(q) ||
        (unit.description && unit.description.toLowerCase().includes(q)) ||
        unit.address.toLowerCase().includes(q) ||
        unit.phone.includes(q);

      if (matchesUnit) return true;

      // Check products of this unit
      const unitProducts = products.filter(p => p.unitId === unit.id);
      const matchesProducts = unitProducts.some(p => 
        p.name.toLowerCase().includes(q) || 
        (p.description && p.description.toLowerCase().includes(q))
      );

      return matchesProducts;
    }

    return true;
  });

  const handleLogout = async () => {
    setShowLogoutConfirm(true);
  };

  const handleAdminLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch (_) {}
    try {
      localStorage.removeItem("custom_admin_session");
      localStorage.removeItem("custom_admin_tab");
      localStorage.removeItem("custom_active_tab");
      localStorage.removeItem("custom_dashboard_tab");
    } catch (_) {}
    customAuth.signOut();
    setIsAdmin(false);
    handleTabChange("home");
    navigate("/admin-login");
  };

  // If user is accessing dedicated admin login route
  if (isAdminLoginRoute) {
    return (
      <>
        <Toaster position="top-center" reverseOrder={false} />
        <AdminLoginPage
          onLoginSuccess={(adminUser) => {
            setUser(adminUser);
            setIsAdmin(true);
            setProfile({
              uid: adminUser.uid,
              name: adminUser.name || "مدیر ارشد سامانه",
              phone: adminUser.phone || "",
              email: adminUser.email || "",
              createdAt: new Date().toISOString()
            });
            navigate("/app/adminpanel");
          }}
          onNavigateHome={() => {
            handleTabChange("home");
            navigate("/");
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-between transition-colors duration-200">
      <Toaster 
        position="top-center" 
        reverseOrder={false}
        toastOptions={{
          className: "dark:bg-slate-800 dark:text-white dark:border-slate-700",
        }}
      />
      
      {/* Header / Navbar */}
      <Navbar
        user={user}
        profile={profile}
        isAdmin={isAdmin}
        activeTab={isRouteAdmin ? "admin" : activeTab}
        setActiveTab={(tab) => {
          if (tab === "admin") {
            if (isAdmin) {
              navigate("/app/adminpanel");
            } else {
              navigate("/admin-login");
            }
          } else {
            if (isRouteAdmin) navigate("/");
            handleTabChange(tab);
          }
        }}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
        siteContent={siteContent}
      />

      {/* Main Content Workspace */}
      <main className="max-w-7xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-4 sm:py-8 flex-1 flex flex-col relative">
        <Routes>
          <Route path="/app/adminpanel" element={
            authLoading ? (
              <div className="flex flex-col justify-center items-center h-80 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">در حال بررسی سطح دسترسی مدیریت...</span>
              </div>
            ) : user && isAdmin ? (
              <AdminDashboard 
                user={user} 
                profile={profile}
                onAdminLogout={handleAdminLogout}
                onNavigateHome={() => navigate("/")}
                onContentSaved={(newContent) => setSiteContent(newContent)}
              />
            ) : (
              <Navigate to="/admin-login" replace />
            )
          } />
          <Route path="/*" element={
            <>
              
        {activeTab === "home" && (
          <div className="w-full space-y-4 sm:space-y-6">
            {/* Emergency Announcements and Outages Banner */}
            <EmergencyAlertBanner />

            {/* Senior Admin Announcement Banner (if active) */}
            {siteContent?.announcementEnabled && siteContent?.announcementText && (
              <div 
                className={`w-full text-white p-3.5 sm:p-4 rounded-2xl shadow-md border flex flex-col sm:flex-row items-center justify-between gap-3 text-right ${
                  siteContent.announcementType === "warning"
                    ? "bg-gradient-to-l from-amber-600 to-orange-700 border-amber-400/30"
                    : siteContent.announcementType === "success"
                    ? "bg-gradient-to-l from-emerald-600 to-teal-700 border-emerald-400/30"
                    : "bg-gradient-to-l from-indigo-600 via-blue-600 to-indigo-700 border-indigo-400/30"
                }`}
                style={{ direction: "rtl" }}
              >
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 bg-white/20 rounded-xl shrink-0">
                    <Info className="h-4 w-4 text-white" />
                  </span>
                  <p className="text-xs sm:text-sm font-bold leading-relaxed">
                    {siteContent.announcementText}
                  </p>
                </div>
              </div>
            )}

            {/* Hero Section */}
            <HeroSection
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              units={units}
              products={products}
              onSelectUnit={(unit) => setSelectedUnit(unit)}
              siteContent={siteContent}
            />

            {/* Category narrow bar with unit counts */}
            <CategoryBar
              units={units}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
            />

            {/* Industrial Banner Ads Showcase */}
            <IndustrialAds />

            {/* Quick Helper Category Badge Row & View Switcher */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-4 gap-2 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-800 dark:text-slate-100">
                    {siteContent?.unitsSectionTitle || DEFAULT_SITE_CONTENT.unitsSectionTitle}
                  </h3>
                  {siteContent?.unitsSectionSubtitle && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      {siteContent.unitsSectionSubtitle}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* View Switcher (Grid vs Map) */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60">
                  <button
                    onClick={() => setHomeViewMode("grid")}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      homeViewMode === "grid"
                        ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <Grid className="h-3.5 w-3.5" />
                    <span>لیست کارت‌ها</span>
                  </button>
                  <button
                    onClick={() => setHomeViewMode("map")}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      homeViewMode === "map"
                        ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    <span>نقشه جانمایی</span>
                  </button>
                </div>

                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold font-mono bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/60 hidden sm:inline-block">
                  {filteredUnits.length} واحد
                </span>
              </div>
            </div>

            {/* Main Units View (Map or Grid) */}
            {homeViewMode === "map" ? (
              <div className="space-y-4">
                <IndustrialParkMap
                  units={units}
                  onSelectUnit={(selected) => setSelectedUnit(selected)}
                />
              </div>
            ) : dataLoading ? (
              <div className="space-y-4">
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">در حال بارگذاری بانک اطلاعاتی شهرک صنعتی...</p>
                <UnitGridSkeleton count={6} />
              </div>
            ) : filteredUnits.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-12 text-center max-w-lg mx-auto shadow-sm">
                <AlertCircle className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto stroke-1 mb-3" />
                <h4 className="font-extrabold text-slate-700 dark:text-slate-200 text-sm mb-1">نتیجه‌ای یافت نشد</h4>
                <p className="text-xs text-slate-400 dark:text-slate-400 leading-relaxed mb-4">
                  هیچ کارگاه یا محصولی با مشخصات جستجو شده شما پیدا نشد. لطفاً از کلمات کلیدی دیگری استفاده کنید.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("");
                  }}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  پاک کردن فیلترها
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredUnits.slice((unitsPage - 1) * 6, unitsPage * 6).map((unit, index) => (
                    <UnitCard
                      key={`${unit.id}-${index}`}
                      unit={unit}
                      onSelect={(selected) => setSelectedUnit(selected)}
                    />
                  ))}
                </div>

                {/* Pagination Controls */}
                {Math.ceil(filteredUnits.length / 6) > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-6" style={{ direction: "rtl" }}>
                    <button
                      onClick={() => setUnitsPage(p => Math.max(1, p - 1))}
                      disabled={unitsPage === 1}
                      className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1"
                    >
                      <span>قبلی</span>
                    </button>
                    
                    {Array.from({ length: Math.ceil(filteredUnits.length / 6) }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => setUnitsPage(pageNum)}
                        className={`w-9 h-9 flex items-center justify-center rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                          unitsPage === pageNum
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none"
                            : "border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}

                    <button
                      onClick={() => setUnitsPage(p => Math.min(Math.ceil(filteredUnits.length / 6), p + 1))}
                      disabled={unitsPage === Math.ceil(filteredUnits.length / 6)}
                      className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1"
                    >
                      <span>بعدی</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "map" && (
          <div className="w-full space-y-4">
            {/* Map Tab Header */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors" style={{ direction: "rtl" }}>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-100 dark:border-indigo-900/60">
                  <MapPin className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-extrabold text-base sm:text-lg text-slate-800 dark:text-slate-100">
                    نقشه و جانمایی واحدهای شهرک صنعتی
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    موقعیت جغرافیایی، آدرس کارگاه‌ها، دسترسی به صنایع و مسیریابی آنلاین به صورت تعاملی
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/60">
                  مجموع: {units.length} کارگاه فعال
                </span>
              </div>
            </div>

            {/* Full Interactive Map */}
            <IndustrialParkMap
              units={units}
              onSelectUnit={(selected) => setSelectedUnit(selected)}
            />
          </div>
        )}

        {activeTab === "products" && (
          <AllProductsPage
            units={units}
            products={products}
            onSelectUnit={(selected) => setSelectedUnit(selected)}
          />
        )}

        {activeTab === "capacities" && (
          <IndustrialCapacitiesPage
            units={units}
            user={user}
            onOpenAuth={() => setAuthModalOpen(true)}
            onSelectUnit={(selected) => setSelectedUnit(selected)}
            onSwitchToClassifieds={() => setActiveTab("classifieds")}
          />
        )}

        {activeTab === "classifieds" && (
          <Classifieds
            user={user}
            profile={profile}
            isAdmin={isAdmin}
            onOpenAuth={() => setAuthModalOpen(true)}
            onSwitchToCapacities={() => setActiveTab("capacities")}
          />
        )}

        {activeTab === "dashboard" && user && (
          isAdmin ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 text-center max-w-xl mx-auto space-y-4 shadow-sm my-8 transition-colors" style={{ direction: "rtl" }}>
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto border border-rose-100 dark:border-rose-900/60">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">حساب مدیریت ارشد سامانه</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                مدیران ارشد و ناظران سامانه فاقد کارگاه شخصی هستند و صرفاً مسئولیت مدیریت، نظارت و کنترل کلیه بخش‌های سامانه شهرک صنعتی را بر عهده دارند.
              </p>
              <button
                onClick={() => navigate("/app/adminpanel")}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-100 dark:shadow-none cursor-pointer inline-flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                <span>ورود به پنل جامع نظارت و مدیریت</span>
              </button>
            </div>
          ) : (
            <Dashboard
              user={user}
              profile={profile}
              isAdmin={false}
              key={user.uid}
            />
          )
        )}

      
            </>
          } />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 dark:bg-slate-950 text-slate-400 py-10 pb-24 md:pb-10 mt-16 border-t border-slate-800 dark:border-slate-900" style={{ direction: "rtl" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <p className="text-sm font-semibold text-slate-300 dark:text-slate-200">
            {siteContent?.footerTitle || DEFAULT_SITE_CONTENT.footerTitle}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-400 font-light max-w-2xl mx-auto leading-relaxed">
            {siteContent?.footerDescription || DEFAULT_SITE_CONTENT.footerDescription}
          </p>
          {siteContent?.footerContactText && (
            <p className="text-xs text-indigo-400 dark:text-indigo-300 font-medium">
              {siteContent.footerContactText}
            </p>
          )}
          <div className="text-[10px] text-slate-600 dark:text-slate-500 font-mono border-t border-slate-800/60 dark:border-slate-900 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              {siteContent?.footerCopyright || DEFAULT_SITE_CONTENT.footerCopyright}
            </div>
            <a 
              href="/admin-login" 
              onClick={(e) => {
                e.preventDefault();
                navigate("/admin-login");
              }}
              className="text-slate-500 hover:text-slate-300 dark:text-slate-400 dark:hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <ShieldCheck className="h-3 w-3 text-rose-500/70" />
              <span>درگاه ورود مدیران سامانه</span>
            </a>
          </div>
        </div>
      </footer>

      {/* Modals & Overlays */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={() => {
          loadDirectoryData();
          handleTabChange("dashboard");
        }}
      />

      <UnitDetailModal
        unit={selectedUnit}
        onClose={() => setSelectedUnit(null)}
        onUnitChange={(u) => setSelectedUnit(u)}
      />

      {/* PWA Install Banner */}
      <InstallPWA />

      {/* Custom Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" style={{ direction: "rtl" }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 max-w-sm w-full p-6 shadow-xl text-center space-y-4"
          >
            <div className="mx-auto h-12 w-12 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center border border-rose-100 dark:border-rose-900/60">
              <LogOut className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">خروج از حساب کاربری</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                آیا مایل به خروج از حساب کاربری هستید؟
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  try {
                    localStorage.removeItem("custom_active_tab");
                    localStorage.removeItem("custom_dashboard_tab");
                    localStorage.removeItem("custom_admin_tab");
                    localStorage.removeItem("custom_admin_session");
                  } catch (_) {}
                  customAuth.signOut();
                  handleTabChange("home");
                  setShowLogoutConfirm(false);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-rose-100 dark:shadow-none cursor-pointer"
              >
                بله، خارج شو
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                انصراف
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
