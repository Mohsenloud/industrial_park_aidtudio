import React, { useState, useEffect } from "react";
import { customAuth, CustomUser } from "./lib/customAuth";
import { UserProfile, Unit, Product, CATEGORIES } from "./types";
import { getUserProfile, createUserProfile, getAllUnits, getAllProducts } from "./lib/firebaseUtils";
import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import UnitCard from "./components/UnitCard";
import { UnitGridSkeleton } from "./components/Skeleton";
import UnitDetailModal from "./components/UnitDetailModal";
import AuthModal from "./components/AuthModal";
import Dashboard from "./components/Dashboard";
import CategoryBar from "./components/CategoryBar";
import IndustrialAds from "./components/IndustrialAds";
import AllProductsPage from "./components/AllProductsPage";
import Classifieds from "./components/Classifieds";
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
  LogOut
} from "lucide-react";
import { motion } from "motion/react";
import { Toaster } from "react-hot-toast";

export default function App() {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"home" | "products" | "classifieds" | "dashboard">("home");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = customAuth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch is-admin state
        try {
          const res = await fetch(`/api/users/is-admin/${currentUser.uid}`);
          if (res.ok) {
            const data = await res.json();
            setIsAdmin(!!data.isAdmin);
          } else {
            setIsAdmin(false);
          }
        } catch (err) {
          console.error("Error checking admin status:", err);
          setIsAdmin(false);
        }

        try {
          let userProfile = await getUserProfile(currentUser.uid);
          if (!userProfile) {
            // User does not exist in PostgreSQL yet. Create the profile dynamically in PostgreSQL.
            const newProfile = {
              uid: currentUser.uid,
              name: currentUser.email?.split("@")[0] || "کاربر جدید",
              phone: "ثبت نشده",
              email: currentUser.email || "",
              createdAt: new Date().toISOString()
            };
            await createUserProfile(newProfile);
            userProfile = newProfile;
          }
          setProfile(userProfile);
        } catch (err) {
          console.error("Error syncing profile to PostgreSQL:", err);
        }
      } else {
        setProfile(null);
        setIsAdmin(false);
        setActiveTab("home");
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Load Public Directories
  const loadDirectoryData = async () => {
    try {
      setDataLoading(true);
      const [allUnits, allProducts] = await Promise.all([
        getAllUnits(),
        getAllProducts()
      ]);
      setUnits(allUnits);
      setProducts(allProducts);
    } catch (err) {
      console.error("Error loading directory data:", err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    loadDirectoryData();
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <Toaster position="top-center" reverseOrder={false} />
      {/* Header / Navbar */}
      <Navbar
        user={user}
        profile={profile}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Workspace */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {activeTab === "home" && (
          <div className="space-y-6">
            {/* Hero Section */}
            <HeroSection
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              units={units}
              products={products}
              onSelectUnit={(unit) => setSelectedUnit(unit)}
            />

            {/* Category narrow bar with unit counts */}
            <CategoryBar
              units={units}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
            />

            {/* Industrial Banner Ads Showcase */}
            <IndustrialAds />

            {/* Quick Helper Category Badge Row */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-600" />
                <h3 className="font-extrabold text-base sm:text-lg text-slate-800">
                  واحدهای تولیدی شهرک صنعتی
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-bold font-mono bg-slate-100 px-3 py-1 rounded-full">
                {filteredUnits.length} واحد صنعتی یافت شد
              </span>
            </div>

            {/* Main Units Grid or Loading spinner */}
            {dataLoading ? (
              <div className="space-y-4">
                <p className="text-xs font-semibold text-slate-400">در حال بارگذاری بانک اطلاعاتی شهرک صنعتی...</p>
                <UnitGridSkeleton count={6} />
              </div>
            ) : filteredUnits.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center max-w-lg mx-auto shadow-sm">
                <AlertCircle className="h-12 w-12 text-slate-300 mx-auto stroke-1 mb-3" />
                <h4 className="font-extrabold text-slate-700 text-sm mb-1">نتیجه‌ای یافت نشد</h4>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  هیچ کارگاه یا محصولی با مشخصات جستجو شده شما پیدا نشد. لطفاً از کلمات کلیدی دیگری استفاده کنید.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("");
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
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
                      className="px-3 py-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer text-xs font-bold text-slate-600 flex items-center gap-1"
                    >
                      <span>قبلی</span>
                    </button>
                    
                    {Array.from({ length: Math.ceil(filteredUnits.length / 6) }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => setUnitsPage(pageNum)}
                        className={`w-9 h-9 flex items-center justify-center rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                          unitsPage === pageNum
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                            : "border border-slate-200 text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}

                    <button
                      onClick={() => setUnitsPage(p => Math.min(Math.ceil(filteredUnits.length / 6), p + 1))}
                      disabled={unitsPage === Math.ceil(filteredUnits.length / 6)}
                      className="px-3 py-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer text-xs font-bold text-slate-600 flex items-center gap-1"
                    >
                      <span>بعدی</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "products" && (
          <AllProductsPage
            units={units}
            products={products}
            onSelectUnit={(selected) => setSelectedUnit(selected)}
          />
        )}

        {activeTab === "classifieds" && (
          <Classifieds
            user={user}
            profile={profile}
            isAdmin={isAdmin}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {activeTab === "dashboard" && user && (
          <Dashboard
            user={user}
            profile={profile}
            isAdmin={isAdmin}
            // Refresh directory data on any modification inside Dashboard
            key={user.uid}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 mt-16 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <p className="text-sm font-semibold text-slate-300">
            سامانه بانک اطلاعاتی آنلاین واحدهای تولیدی شهرک صنعتی
          </p>
          <p className="text-xs text-slate-500 font-light max-w-xl mx-auto leading-relaxed">
            این پلتفرم به صورت رایگان در جهت رونق کسب‌وکارهای تولیدی، تسهیل ارتباط مستقیم خریداران و تولیدکنندگان و نمایش توانمندی‌های بومی شهرک‌های صنعتی طراحی و پیاده‌سازی شده است.
          </p>
          <div className="text-[10px] text-slate-600 font-mono border-t border-slate-800/60 pt-4">
            Industrial Park Directory &copy; {new Date().getFullYear()} - All Rights Reserved
          </div>
        </div>
      </footer>

      {/* Modals & Overlays */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={() => {
          loadDirectoryData();
          setActiveTab("dashboard");
        }}
      />

      <UnitDetailModal
        unit={selectedUnit}
        onClose={() => setSelectedUnit(null)}
        onUnitChange={(u) => setSelectedUnit(u)}
      />

      {/* Custom Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" style={{ direction: "rtl" }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-slate-100 max-w-sm w-full p-6 shadow-xl text-center space-y-4"
          >
            <div className="mx-auto h-12 w-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center border border-rose-100">
              <LogOut className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-slate-800 text-sm">خروج از حساب کاربری</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                آیا مایل به خروج از حساب کاربری هستید؟
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  customAuth.signOut();
                  setShowLogoutConfirm(false);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-rose-100 cursor-pointer"
              >
                بله، خارج شو
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
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
