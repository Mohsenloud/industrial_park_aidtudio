import React, { useState, useEffect } from "react";
import { CustomUser } from "../../lib/customAuth";
import { UserProfile, Unit } from "../../types";
import Dashboard from "../Dashboard";
import SmsSettings from "../Dashboard/SmsSettings";
import BannerManager from "../Dashboard/BannerManager";
import BackupRestore from "../BackupRestore";
import { Database, MessageSquare, Image as ImageIcon, Users, ShieldAlert, LayoutDashboard, Search, Trash2, Edit3, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";

interface AdminDashboardProps {
  user: CustomUser;
  profile: UserProfile | null;
}

export default function AdminDashboard({ user, profile }: AdminDashboardProps) {
  const [activeAdminTab, setActiveAdminTab] = useState<"units" | "sms" | "banners" | "backup">("units");
  const [allUnits, setAllUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // When a unit is selected for management, we render the Dashboard for it
  const [managingUnitId, setManagingUnitId] = useState<string | null>(null);

  const fetchUnits = async () => {
    try {
      setIsLoading(true);
      let tokenHeaders = {};
      const savedUser = localStorage.getItem("custom_auth_user");
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed?.token) {
          tokenHeaders = { "Authorization": `Bearer ${parsed.token}` };
        }
      }
      const res = await fetch("/api/admin/units", { headers: tokenHeaders });
      if (res.ok) {
        const data = await res.json();
        setAllUnits(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  
  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'approved' ? 'pending' : 'approved';
    try {
      let tokenHeaders = { "Content-Type": "application/json" };
      const savedUser = localStorage.getItem("custom_auth_user");
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed?.token) {
          tokenHeaders["Authorization"] = `Bearer ${parsed.token}`;
        }
      }
      const response = await fetch(`/api/units/${id}/status`, {
        method: "PUT",
        headers: tokenHeaders,
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        toast.success("وضعیت تغییر کرد.");
        fetchUnits();
      } else {
        toast.error("خطا در تغییر وضعیت.");
      }
    } catch (err) {
      toast.error("خطا در برقراری ارتباط.");
    }
  };

  const handleDeleteUnit = async (id: string) => {
    if (!window.confirm("آیا از حذف دائم این کارگاه مطمئن هستید؟")) return;
    try {
      const savedUser = localStorage.getItem("custom_auth_user");
      let tokenHeaders = {};
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed?.token) {
          tokenHeaders = { "Authorization": `Bearer ${parsed.token}` };
        }
      }
      const response = await fetch(`/api/units/${id}`, {
        method: "DELETE",
        headers: tokenHeaders
      });
      if (response.ok) {
        toast.success("کارگاه حذف شد.");
        fetchUnits();
      } else {
        toast.error("خطا در حذف کارگاه.");
      }
    } catch (err) {
      toast.error("خطا در برقراری ارتباط.");
    }
  };

  // If a specific unit is being managed, render the Dashboard in "admin mode"
  if (managingUnitId) {
    return (
      <div className="w-full space-y-4" style={{ direction: "rtl" }}>
        <div>
          <button
            onClick={() => setManagingUnitId(null)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-all font-bold text-xs shadow-sm cursor-pointer"
          >
            <ArrowRight className="h-4 w-4" />
            <span>بازگشت به لیست کارگاه‌ها</span>
          </button>
        </div>
        <Dashboard 
          user={user} 
          profile={profile} 
          isAdmin={true} 
          adminSelectedUnitId={managingUnitId || undefined} 
          key={managingUnitId}
        />
      </div>
    );
  }

  const filteredUnits = allUnits.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (u.phone && u.phone.includes(searchQuery))
  );

  return (
    <div className="w-full space-y-6 pb-20" style={{ direction: "rtl" }}>
      <div className="bg-gradient-to-l from-rose-600 to-rose-800 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row items-center justify-between">
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">پنل مدیریت کل</span>
          </div>
          <h2 className="text-2xl font-black">مدیریت سامانه</h2>
          <p className="text-rose-100 text-sm font-medium">
            دسترسی کامل به تنظیمات، کاربران، کارگاه‌ها و بک‌آپ‌ها
          </p>
        </div>
        <ShieldAlert className="h-32 w-32 text-white/10 absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/4" />
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveAdminTab("units")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeAdminTab === "units"
              ? "bg-rose-600 text-white shadow-md shadow-rose-200"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>مدیریت کارگاه‌ها</span>
        </button>
        <button
          onClick={() => setActiveAdminTab("banners")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeAdminTab === "banners"
              ? "bg-rose-600 text-white shadow-md shadow-rose-200"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <ImageIcon className="h-4 w-4" />
          <span>تبلیغات و بنرها</span>
        </button>
        <button
          onClick={() => setActiveAdminTab("sms")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeAdminTab === "sms"
              ? "bg-rose-600 text-white shadow-md shadow-rose-200"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          <span>تنظیمات پیامک</span>
        </button>
        <button
          onClick={() => setActiveAdminTab("backup")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeAdminTab === "backup"
              ? "bg-rose-600 text-white shadow-md shadow-rose-200"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <Database className="h-4 w-4" />
          <span>پشتیبان‌گیری</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeAdminTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeAdminTab === "units" && (
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <h3 className="font-extrabold text-slate-800 flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-500" />
                  <span>لیست کارگاه‌های ثبت شده ({allUnits.length})</span>
                </h3>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="جستجو در نام یا شماره موبایل..."
                    className="w-full pl-4 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              {isLoading ? (
                <div className="text-center py-10 text-slate-400 text-sm">در حال بارگذاری...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-500 text-xs font-bold">
                        <th className="pb-3 pr-2">ردیف</th>
                        <th className="pb-3">نام کارگاه / شرکت</th>
                        <th className="pb-3">شماره تماس (مالک)</th>
                        <th className="pb-3">دسته‌بندی</th>
                        <th className="pb-3 text-center">وضعیت</th><th className="pb-3 text-center">عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50/80">
                      {filteredUnits.map((u, idx) => (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 pr-2 text-slate-400 font-mono text-xs">{idx + 1}</td>
                          <td className="py-4 font-bold text-slate-800">{u.name}</td>
                          <td className="py-4 text-slate-600 font-mono text-xs">{u.phone}</td>
                          <td className="py-4 text-slate-600 text-xs">
                            <span className="bg-slate-100 px-2 py-1 rounded-md">{u.category}</span>
                          </td>
                          <td className="py-4 text-center">
    <button
      onClick={() => handleToggleStatus(u.id, u.status || 'pending')}
      className={`px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${u.status === 'approved' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
    >
      {u.status === 'approved' ? 'تایید شده' : 'در انتظار تایید'}
    </button>
  </td>
  <td className="py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setManagingUnitId(u.id)}
                                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                                مدیریت پنل
                              </button>
                              <button
                                onClick={() => handleDeleteUnit(u.id)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all cursor-pointer"
                                title="حذف کارگاه"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredUnits.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                            موردی یافت نشد.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          
          {activeAdminTab === "banners" && (
            <BannerManager isAdmin={true} onClose={() => {}} />
          )}

          {activeAdminTab === "sms" && (
            <SmsSettings isAdmin={true} onClose={() => {}} />
          )}

          {activeAdminTab === "backup" && (
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
              <BackupRestore userUid={user.uid} unit={null} products={[]} onRefresh={() => {}} />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
