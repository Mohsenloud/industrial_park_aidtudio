import React, { useState, useRef } from "react";
import { Unit, Product } from "../types";
import { Download, Upload, AlertCircle, CheckCircle2, Loader2, Sparkles, FileJson } from "lucide-react";
import { motion } from "motion/react";

interface BackupRestoreProps {
  userUid: string;
  unit: Unit | null;
  products: Product[];
  onRefresh: () => void;
}

export default function BackupRestore({ userUid, unit, products, onRefresh }: BackupRestoreProps) {
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate and download backup JSON file
  const handleBackup = () => {
    try {
      if (!unit) {
        setErrorMessage("ابتدا اطلاعات واحد صنعتی خود را تکمیل و ثبت کنید تا امکان پشتیبان‌گیری فراهم شود.");
        return;
      }

      const backupData = {
        backupVersion: "1.0",
        backupDate: new Date().toISOString(),
        unit: unit,
        products: products,
      };

      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(backupData, null, 2)
      )}`;
      
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", jsonString);
      
      const safeUnitName = unit.name.replace(/[^a-zA-Z0-9آ-ی]/g, "_");
      downloadAnchor.setAttribute(
        "download",
        `backup_industrial_unit_${safeUnitName}_${new Date().toISOString().split("T")[0]}.json`
      );
      
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setSuccessMessage("فایل پشتیبان با موفقیت تولید و دانلود شد.");
      setErrorMessage("");
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err: any) {
      console.error(err);
      setErrorMessage("خطا در تهیه نسخه پشتیبان: " + err.message);
    }
  };

  // Read and process the uploaded backup file
  const handleRestoreFile = async (file: File) => {
    if (!file) return;

    setLoading(true);
    setSuccessMessage("");
    setErrorMessage("");

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);

        // Basic validation of the backup format
        if (!data || !data.unit || !Array.isArray(data.products)) {
          throw new Error("قالب فایل پشتیبان نامعتبر است. فایل ساختار صحیح اطلاعات غرفه را ندارد.");
        }

        const backupUnit = data.unit as Unit;
        const backupProducts = data.products as Product[];

        // Confirm overwrite
        const confirmMessage = unit 
          ? `آیا مطمئن هستید؟ با بازیابی اطلاعات، غرفه فعلی شما ("${unit.name}") بازنویسی شده و محصولات بارگذاری شده جایگزین خواهند شد.`
          : `آیا مطمئن هستید که می‌خواهید اطلاعات کارگاه "${backupUnit.name}" را بازیابی و ایجاد کنید؟`;

        if (!window.confirm(confirmMessage)) {
          setLoading(false);
          return;
        }

        // Setup correct headers for authentication using the custom local token/uid
        const savedUser = localStorage.getItem("custom_auth_user");
        let tokenHeaders: Record<string, string> = { "Content-Type": "application/json" };
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          if (parsed) {
            const token = parsed.token;
            if (token) {
              tokenHeaders["Authorization"] = `Bearer ${token}`;
            }
          }
        }

        // 1. Restore/Save the Unit
        // Ensure the owner ID is set to the CURRENT logged in user to avoid database permission issues
        const restoredUnit: Unit = {
          ...backupUnit,
          ownerId: userUid,
          updatedAt: new Date().toISOString(),
        };

        const unitRes = await fetch("/api/units", {
          method: "POST",
          headers: tokenHeaders,
          body: JSON.stringify(restoredUnit),
        });

        if (!unitRes.ok) {
          const errData = await unitRes.json();
          throw new Error(errData.error || "خطا در بازیابی اطلاعات اصلی کارگاه.");
        }

        // 2. Restore all Products
        // For each product, update its unitId and ownerId, and send to server
        for (const prod of backupProducts) {
          const restoredProduct: Product = {
            ...prod,
            unitId: restoredUnit.id,
            ownerId: userUid,
          };

          const prodRes = await fetch("/api/products", {
            method: "POST",
            headers: tokenHeaders,
            body: JSON.stringify(restoredProduct),
          });

          if (!prodRes.ok) {
            console.error(`Failed to restore product: ${prod.name}`);
          }
        }

        setSuccessMessage(`اطلاعات غرفه "${restoredUnit.name}" و ${backupProducts.length} محصول با موفقیت بازیابی شد.`);
        setErrorMessage("");
        onRefresh();
        setTimeout(() => setSuccessMessage(""), 6000);
      } catch (err: any) {
        console.error(err);
        setErrorMessage("خطا در بازیابی اطلاعات: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setErrorMessage("خطا در خواندن فایل بارگذاری شده.");
      setLoading(false);
    };

    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleRestoreFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleRestoreFile(e.target.files[0]);
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200/60 rounded-3xl p-5 sm:p-6 space-y-4 text-right" style={{ direction: "rtl" }}>
      <div className="flex items-center gap-2">
        <FileJson className="h-5 w-5 text-indigo-600" />
        <div>
          <h3 className="font-extrabold text-sm text-slate-800">پشتیبان‌گیری و بازیابی اطلاعات غرفه</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">دریافت نسخه پشتیبان آفلاین (JSON) و بازیابی اطلاعات ثبت شده شما در هر زمان</p>
        </div>
      </div>

      {/* Alert states */}
      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </motion.div>
      )}

      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2"
        >
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </motion.div>
      )}

      {/* Two-Column Action Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Backup Column */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <h4 className="text-xs font-black text-slate-700">۱. تهیه نسخه پشتیبان</h4>
            <p className="text-[10px] text-slate-400 leading-relaxed font-normal">
              با کلیک روی دکمه زیر، فایل کاملی حاوی مشخصات غرفه، آدرس، اطلاعات تماس و تصاویر کاتالوگ محصولات خود را در قالب یک فایل دیجیتال ذخیره و دانلود کنید.
            </p>
          </div>
          
          <button
            onClick={handleBackup}
            disabled={!unit || loading}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              unit
                ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100"
                : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
            }`}
          >
            <Download className="h-4 w-4" />
            <span>دانلود نسخه پشتیبان غرفه (JSON)</span>
          </button>
        </div>

        {/* Restore Column */}
        <div 
          className={`bg-white border-2 border-dashed rounded-2xl p-4 flex flex-col justify-between space-y-3 transition-all ${
            dragActive ? "border-indigo-500 bg-indigo-50/20" : "border-slate-200"
          }`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          <div className="space-y-1">
            <h4 className="text-xs font-black text-slate-700">۲. بازیابی اطلاعات پشتیبان</h4>
            <p className="text-[10px] text-slate-400 leading-relaxed font-normal">
              فایل بکاپ دانلود شده قبلی خود را بکشید و در این کادر رها کنید یا فایل را انتخاب نمایید تا تمام اطلاعات کارگاه و محصولات مجدداً در سامانه ثبت شود.
            </p>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            accept=".json"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                <span>در حال بازیابی اطلاعات...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span>انتخاب و بارگذاری فایل پشتیبان</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
