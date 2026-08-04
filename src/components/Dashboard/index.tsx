import React, { useState, useEffect } from "react";
import { CustomUser } from "../../lib/customAuth";
import { Unit, Product, UserProfile } from "../../types";
import { 
  getUnitByOwner, 
  getProductsByUnit, 
} from "../../lib/firebaseUtils";
import BackupRestore from "../BackupRestore";
import { Loader2, Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DashboardSkeleton } from "../Skeleton";

import AdminPanel from "./AdminPanel";
import SmsSettings from "./SmsSettings";
import BannerManager from "./BannerManager";
import UnitForm from "./UnitForm";
import UnitOverview from "./UnitOverview";
import ProductManager from "./ProductManager";
import QuotesList from "./QuotesList";
import PasswordSettings from "./PasswordSettings";

interface DashboardProps {
  user: CustomUser;
  profile: UserProfile | null;
  isAdmin?: boolean;
  key?: any;
}

export default function Dashboard({ user, profile, isAdmin = false }: DashboardProps) {
  // Admin States
  const [allUnitsForAdmin, setAllUnitsForAdmin] = useState<Unit[]>([]);
  const [selectedAdminUnitId, setSelectedAdminUnitId] = useState<string>("");

  // Control toggles
  const [showSmsSettings, setShowSmsSettings] = useState(false);
  const [showAdManager, setShowAdManager] = useState(false);

  // Unit States
  const [unit, setUnit] = useState<Unit | null>(null);
  const [unitLoading, setUnitLoading] = useState(true);
  const [isEditingUnit, setIsEditingUnit] = useState(false);

  // Products States
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  // Load all units for admin selection dropdown
  const fetchAllUnitsForAdmin = async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch("/api/units");
      if (res.ok) {
        const data = await res.json();
        setAllUnitsForAdmin(data || []);
      }
    } catch (err) {
      console.error("Error fetching units for admin:", err);
    }
  };

  useEffect(() => {
    fetchAllUnitsForAdmin();
  }, [isAdmin]);

  // Fetch unit and products
  const fetchUnitAndProducts = async () => {
    try {
      setUnitLoading(true);
      let userUnit: Unit | null = null;

      if (isAdmin && selectedAdminUnitId) {
        // Load target unit chosen by admin
        const found = allUnitsForAdmin.find((u) => u.id === selectedAdminUnitId);
        if (found) {
          userUnit = found;
        } else {
          const res = await fetch("/api/units");
          if (res.ok) {
            const all: Unit[] = await res.json();
            userUnit = all.find((u) => u.id === selectedAdminUnitId) || null;
          }
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
  }, [user.uid, profile, selectedAdminUnitId, allUnitsForAdmin.length]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 pb-20">
      
      {/* Admin Panel Header & Switches */}
      <AdminPanel
        isAdmin={isAdmin}
        allUnitsForAdmin={allUnitsForAdmin}
        selectedAdminUnitId={selectedAdminUnitId}
        onSelectAdminUnitId={setSelectedAdminUnitId}
        currentUnit={unit}
        onDeleteSuccess={() => {
          setSelectedAdminUnitId("");
          fetchAllUnitsForAdmin();
        }}
        showAdManager={showAdManager}
        onToggleAdManager={() => {
          setShowAdManager(!showAdManager);
          if (showSmsSettings) setShowSmsSettings(false);
        }}
        showSmsSettings={showSmsSettings}
        onToggleSmsSettings={() => {
          setShowSmsSettings(!showSmsSettings);
          if (showAdManager) setShowAdManager(false);
        }}
      />

      <AnimatePresence mode="wait">
        {/* Ad Campaign Manager Panel */}
        {showAdManager && isAdmin && (
          <BannerManager 
            key="ad-manager"
            isAdmin={isAdmin} 
            onClose={() => setShowAdManager(false)} 
          />
        )}

        {/* SMS Gateway Configurations Panel */}
        {showSmsSettings && isAdmin && (
          <SmsSettings 
            key="sms-settings"
            isAdmin={isAdmin} 
            onClose={() => setShowSmsSettings(false)} 
          />
        )}
      </AnimatePresence>

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
              fetchAllUnitsForAdmin();
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
            fetchAllUnitsForAdmin();
          }}
          onCancel={() => setIsEditingUnit(false)}
        />
      ) : (
        /* Default Factory Profile View & Product Manager */
        <div className="space-y-8">
          
          {/* Unit Info Card Overview */}
          <UnitOverview
            unit={unit}
            onEditClick={() => setIsEditingUnit(true)}
          />

          {/* Product Manager Panel */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8">
            <ProductManager
              unitId={unit.id}
              ownerId={unit.ownerId}
              products={products}
              productsLoading={productsLoading}
              onRefreshProducts={fetchUnitAndProducts}
            />
          </div>

          {/* Received Price Quotes (RFQs) List */}
          <QuotesList
            unitId={unit.id}
            products={products}
          />

        </div>
      )}

      {/* Password settings section (Change or Set password) */}
      <PasswordSettings user={user} />

      {/* Database Backup & Recovery Panel */}
      <BackupRestore
        userUid={user.uid}
        unit={unit}
        products={products}
        onRefresh={fetchUnitAndProducts}
      />
    </div>
  );
}
