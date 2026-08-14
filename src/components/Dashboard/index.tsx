import React, { useState, useEffect } from "react";
import { CustomUser } from "../../lib/customAuth";
import { Unit, Product, UserProfile } from "../../types";
import { 
  getUnitByOwner, 
  getProductsByUnit, 
} from "../../lib/firebaseUtils";
import BackupRestore from "../BackupRestore";
import { Loader2, Info, LayoutDashboard, Package, MessageSquare, Star, Settings, FileText } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DashboardSkeleton } from "../Skeleton";

import UnitForm from "./UnitForm";
import UnitOverview from "./UnitOverview";
import ProductManager from "./ProductManager";
import QuotesList from "./QuotesList";
import PasswordSettings from "./PasswordSettings";
import ChatManager from "./ChatManager";
import ReviewManager from "./ReviewManager";

interface DashboardProps {
  user: CustomUser;
  profile: UserProfile | null;
  isAdmin?: boolean;
  adminSelectedUnitId?: string;
  key?: any;
}

export default function Dashboard({ user, profile, isAdmin = false, adminSelectedUnitId }: DashboardProps) {
  // Unit States
  const [unit, setUnit] = useState<Unit | null>(null);
  const [unitLoading, setUnitLoading] = useState(true);
  const [isEditingUnit, setIsEditingUnit] = useState(false);

  // Dashboard Tabs
  const [activeTab, setActiveTab] = useState<"overview" | "products" | "quotes" | "chats" | "reviews" | "settings">("overview");

  useEffect(() => {
    const handleTabChange = (e: any) => setActiveTab(e.detail);
    window.addEventListener('changeDashboardTab', handleTabChange);
    return () => window.removeEventListener('changeDashboardTab', handleTabChange);
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('changeDashboardTab', { detail: activeTab }));
  }, [activeTab]);


  // Products States
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  // Fetch unit and products
  const fetchUnitAndProducts = async () => {
    try {
      setUnitLoading(true);
      let userUnit: Unit | null = null;

      if (isAdmin && adminSelectedUnitId) {
        // Load target unit chosen by admin
        const res = await fetch("/api/units");
        if (res.ok) {
          const all: Unit[] = await res.json();
          userUnit = all.find((u) => u.id === adminSelectedUnitId) || null;
        }
      } else {
        // Load current user's registered unit
        userUnit = await getUnitByOwner(user.uid);
      }

      setUnit(userUnit);
      if (userUnit) {
        // Fetch products
        setProductsLoading(true);
        const prodList = await getProductsByUnit(userUnit.id);
        setProducts(prodList);
        setProductsLoading(false);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUnitLoading(false);
    }
  };

  useEffect(() => {
    fetchUnitAndProducts();
  }, [user.uid, profile, adminSelectedUnitId]);

  const tabs = [
    { id: "overview", label: "اطلاعات کارگاه", icon: LayoutDashboard },
    { id: "products", label: "محصولات", icon: Package },
    { id: "quotes", label: "استعلام‌ها", icon: FileText },
    { id: "chats", label: "پیام‌ها", icon: MessageSquare },
    { id: "reviews", label: "نظرات", icon: Star },
    { id: "settings", label: "تنظیمات حساب", icon: Settings },
  ] as const;

  return (
    <div className="w-full space-y-8 pb-20">
      
      {/* Main Unit Management Content */}
      {unitLoading ? (
        <div className="space-y-4">
          <span className="text-xs font-semibold text-slate-400 block text-right" style={{ direction: "rtl" }}>در حال دریافت اطلاعات کارگاه صنعتی...</span>
          <DashboardSkeleton />
        </div>
      ) : !unit ? (
        /* Empty State / Creation Form */
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 text-amber-950 p-4 rounded-2xl text-xs font-semibold leading-relaxed text-right flex gap-2" style={{ direction: "rtl" }}>
            <Info className="h-4 w-4 shrink-0 text-amber-600" />
            <p>کارگاه شما هنوز در سامانه آنلاین شهرک صنعتی ثبت نشده است. لطفاً فرم زیر را تکمیل نمایید تا مشخصات کارگاه شما به دایرکتوری عمومی شهرک اضافه شود.</p>
          </div>
          
          <UnitForm
            unit={null}
            user={user}
            profile={profile}
            onSave={(savedUnit) => {
              setUnit(savedUnit);
              setIsEditingUnit(false);
              fetchUnitAndProducts();
            }}
          />
        </div>
      ) : isEditingUnit ? (
        /* Editing Unit Form */
        <UnitForm
          unit={unit}
          user={user}
          profile={profile}
          onSave={(savedUnit) => {
            setUnit(savedUnit);
            setIsEditingUnit(false);
            fetchUnitAndProducts();
          }}
          onCancel={() => setIsEditingUnit(false)}
        />
      ) : (
        /* Default Factory Profile View & Product Manager */
        <div className="space-y-6" style={{ direction: "rtl" }}>
          
          {/* Tabs Navigation */}
          {/* Tabs Navigation (Hidden on mobile) */}
          <div className={`${adminSelectedUnitId ? "block" : "hidden md:block"} bg-white rounded-2xl border border-slate-200 p-2 shadow-sm overflow-x-auto hide-scrollbar`}>
            <div className="flex items-center gap-2 min-w-max">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="min-h-[500px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {activeTab === "overview" && (
                  <UnitOverview
                    unit={unit}
                    onEditClick={() => setIsEditingUnit(true)}
                  />
                )}

                {activeTab === "products" && (
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8">
                    <ProductManager
                      unitId={unit.id}
                      ownerId={unit.ownerId}
                      products={products}
                      productsLoading={productsLoading}
                      onRefreshProducts={fetchUnitAndProducts}
                    />
                  </div>
                )}

                {activeTab === "quotes" && (
                  <QuotesList
                    unitId={unit.id}
                    products={products}
                  />
                )}

                {activeTab === "chats" && (
                  <ChatManager unitId={unit.id} unitName={unit.name} />
                )}

                {activeTab === "reviews" && (
                  <ReviewManager unitId={unit.id} />
                )}

                {activeTab === "settings" && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    <PasswordSettings user={user} />
                    <BackupRestore
                      userUid={user.uid}
                      unit={unit}
                      products={products}
                      onRefresh={fetchUnitAndProducts}
                    />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

        </div>
      )}
    </div>
  );
}
