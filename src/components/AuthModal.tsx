import React, { useState, useEffect } from "react";
import { customAuth } from "../lib/customAuth";
import { X, Mail, Lock, User, Phone, Eye, EyeOff, Loader2, KeyRound, ShieldCheck, RefreshCw, ChevronLeft, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
}

export default function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
  const [authMethod, setAuthMethod] = useState<"otp" | "password">("otp");
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  
  // Form input states
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // OTP States (SMS)
  const [otpStep, setOtpStep] = useState<1 | 2>(1);
  const [otpCode, setOtpCode] = useState("");
  const [simulatedCode, setSimulatedCode] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(120);
  const [timerActive, setTimerActive] = useState(false);

  // Email OTP States
  const [emailOtpStep, setEmailOtpStep] = useState<1 | 2>(1);
  const [emailOtpCode, setEmailOtpCode] = useState("");
  const [emailSimulatedCode, setEmailSimulatedCode] = useState<string | null>(null);
  const [requireEmailOtp, setRequireEmailOtp] = useState(false);
  const [emailCountdown, setEmailCountdown] = useState(300);
  const [emailTimerActive, setEmailTimerActive] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Countdown timer effect for SMS
  useEffect(() => {
    let interval: any = null;
    if (timerActive && countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, countdown]);

  // Countdown timer effect for Email
  useEffect(() => {
    let interval: any = null;
    if (emailTimerActive && emailCountdown > 0) {
      interval = setInterval(() => {
        setEmailCountdown((prev) => prev - 1);
      }, 1000);
    } else if (emailCountdown === 0) {
      setEmailTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [emailTimerActive, emailCountdown]);

  if (!isOpen) return null;

  const startCountdown = () => {
    setCountdown(120);
    setTimerActive(true);
  };

  const startEmailCountdown = () => {
    setEmailCountdown(300);
    setEmailTimerActive(true);
  };

  const translateError = (errCode: string) => {
    switch (errCode) {
      case "auth/invalid-email":
        return "آدرس ایمیل وارد شده نامعتبر است.";
      case "auth/user-disabled":
        return "این حساب کاربری غیرفعال شده است.";
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "مشخصات وارد شده اشتباه است.";
      case "auth/email-already-in-use":
        return "این ایمیل قبلاً ثبت‌نام شده است.";
      case "auth/weak-password":
        return "کلمه عبور بسیار ضعیف است (حداقل ۶ کاراکتر).";
      case "auth/missing-password":
        return "لطفاً کلمه عبور را وارد کنید.";
      case "auth/operation-not-allowed":
        return "روش ورود با ایمیل و رمز عبور در فایربیس (Firebase) پروژه شما فعال نیست. لطفاً از روش «کد یکبار مصرف پیامکی (OTP)» در تب بالا استفاده کنید، یا گزینه Email/Password را در بخش Authentication پروژه فایربیس خود فعال کنید.";
      default:
        return "خطایی رخ داد. لطفا دوباره تلاش کنید.";
    }
  };

  // Step 1: Send OTP code
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    
    // Validate phone number format
    const cleanPhone = phone.trim();
    if (!cleanPhone) {
      setError("لطفاً شماره همراه خود را وارد کنید.");
      return;
    }
    
    const phoneRegex = /^09\d{9}$/;
    if (!phoneRegex.test(cleanPhone)) {
      setError("شماره همراه باید با 09 شروع شده و ۱۱ رقم باشد (مثال: 09123456789)");
      return;
    }

    if (mode === "signup" && !name.trim()) {
      setError("وارد کردن نام و نام خانوادگی جهت ثبت‌نام الزامی است.");
      return;
    }

    setLoading(true);
    try {
      const res = await customAuth.sendOtp(cleanPhone);
      if (res.success) {
        if (res.codeSimulated) {
          setSimulatedCode(res.codeSimulated);
        }
        setOtpStep(2);
        startCountdown();
        setSuccessMsg("کد تایید ۵ رقمی از طریق پیامک ارسال شد.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "خطا در ارسال کد تایید. مجدداً تلاش کنید.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP code
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const cleanCode = otpCode.trim();
    if (!cleanCode) {
      setError("لطفاً کد تایید را وارد کنید.");
      return;
    }

    setLoading(true);
    try {
      await customAuth.verifyOtp(phone.trim(), cleanCode, mode === "signup" ? name : undefined);
      onAuthSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "کد تایید اشتباه یا منقضی شده است.");
    } finally {
      setLoading(false);
    }
  };

  // Submit email & password form
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (mode === "signup") {
      if (!name.trim()) {
        setError("وارد کردن نام و نام خانوادگی الزامی است.");
        return;
      }
      if (!phone.trim()) {
        setError("وارد کردن شماره تماس الزامی است.");
        return;
      }
      if (!email.trim()) {
        setError("وارد کردن ایمیل الزامی است.");
        return;
      }
      if (!password.trim() || password.length < 6) {
        setError("کلمه عبور باید حداقل ۶ کاراکتر باشد.");
        return;
      }

      if (emailOtpStep === 1) {
        // Send Email OTP first
        setLoading(true);
        try {
          const res = await customAuth.sendEmailOtp(email.trim());
          if (res.success) {
            if (res.codeSimulated) {
              setEmailSimulatedCode(res.codeSimulated);
            }
            setEmailOtpStep(2);
            startEmailCountdown();
            setSuccessMsg("کد تایید ۵ رقمی به آدرس ایمیل شما ارسال شد.");
          }
        } catch (err: any) {
          console.error(err);
          setError(err.message || "خطا در ارسال ایمیل تایید. لطفاً آدرس ایمیل را مجدداً بررسی کنید.");
        } finally {
          setLoading(false);
        }
        return;
      } else {
        // Step 2: Actually register
        const cleanCode = emailOtpCode.trim();
        if (!cleanCode) {
          setError("لطفاً کد تایید ایمیل را وارد کنید.");
          return;
        }

        setLoading(true);
        try {
          await customAuth.signUp(email, password, name, phone, cleanCode);
          onAuthSuccess();
          onClose();
        } catch (err: any) {
          console.error(err);
          setError(err.message || "کد تایید ایمیل نادرست یا منقضی شده است.");
        } finally {
          setLoading(false);
        }
      }
    } else if (mode === "forgot") {
      // Mode is FORGOT / SET PASSWORD
      if (!email.trim()) {
        setError("وارد کردن ایمیل الزامی است.");
        return;
      }

      if (emailOtpStep === 1) {
        setLoading(true);
        try {
          const res = await customAuth.sendEmailOtp(email.trim());
          if (res.success) {
            if (res.codeSimulated) {
              setEmailSimulatedCode(res.codeSimulated);
            }
            setEmailOtpStep(2);
            startEmailCountdown();
            setSuccessMsg("کد تایید ۵ رقمی به آدرس ایمیل شما ارسال شد.");
          }
        } catch (err: any) {
          console.error(err);
          setError(err.message || "خطا در ارسال کد تایید به ایمیل.");
        } finally {
          setLoading(false);
        }
      } else {
        // Step 2: verify and reset password
        const cleanCode = emailOtpCode.trim();
        if (!cleanCode) {
          setError("لطفاً کد تایید ۵ رقمی ارسال شده به ایمیل را وارد کنید.");
          return;
        }
        if (!newPassword.trim() || newPassword.length < 6) {
          setError("کلمه عبور جدید باید حداقل ۶ کاراکتر باشد.");
          return;
        }

        setLoading(true);
        try {
          await customAuth.resetPassword(email.trim(), cleanCode, newPassword.trim());
          onAuthSuccess();
          onClose();
        } catch (err: any) {
          console.error(err);
          setError(err.message || "کد تایید اشتباه یا منقضی شده است.");
        } finally {
          setLoading(false);
        }
      }
    } else {
      // Mode is SIGNIN
      if (!email.trim() || !password.trim()) {
        setError("وارد کردن ایمیل و کلمه عبور الزامی است.");
        return;
      }

      setLoading(true);
      try {
        const res = await customAuth.signIn(email, password, requireEmailOtp ? emailOtpCode.trim() : undefined);
        if (res.requireOtp) {
          setRequireEmailOtp(true);
          setEmailOtpStep(2); // Show code input
          startEmailCountdown();
          if (res.codeSimulated) {
            setEmailSimulatedCode(res.codeSimulated);
          }
          setSuccessMsg(res.message || "کد تایید ورود به ایمیل شما فرستاده شد.");
        } else {
          onAuthSuccess();
          onClose();
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "ایمیل یا کلمه عبور اشتباه است.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", duration: 0.35 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col text-right"
          style={{ direction: "rtl" }}
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="text-base font-black text-slate-800">
                {mode === "signin" 
                  ? "ورود به حساب کاربری" 
                  : mode === "signup" 
                  ? "ثبت‌نام کارگاه صنعتی جدید" 
                  : "تعیین یا بازیابی رمز عبور"}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 font-semibold leading-relaxed">
                {mode === "signin" 
                  ? "با ورود به سامانه می‌توانید اطلاعات کارگاه خود را ویرایش کرده یا کالا ثبت کنید." 
                  : mode === "signup"
                  ? "با ایجاد حساب، مشخصات، محصولات و توانمندی‌های کارگاه خود را آنلاین معرفی کنید."
                  : "با وارد کردن ایمیل و دریافت کد تایید، می‌توانید رمز عبور جدید تعیین کنید."}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors bg-white border border-slate-100 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Mode Switch (Signin / Signup) */}
          {mode !== "forgot" ? (
            <div className="px-6 pt-5">
              <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => { 
                    setMode("signin"); 
                    setError(""); 
                    setSuccessMsg(""); 
                    setOtpStep(1); 
                    setOtpCode(""); 
                    setEmailOtpStep(1);
                    setEmailOtpCode("");
                    setEmailSimulatedCode(null);
                    setRequireEmailOtp(false);
                  }}
                  className={`py-2 text-[11px] font-black rounded-lg transition-all duration-200 cursor-pointer ${
                    mode === "signin" 
                      ? "bg-white text-slate-800 shadow-sm" 
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  ورود اعضا
                </button>
                <button
                  type="button"
                  onClick={() => { 
                    setMode("signup"); 
                    setError(""); 
                    setSuccessMsg(""); 
                    setOtpStep(1); 
                    setOtpCode(""); 
                    setEmailOtpStep(1);
                    setEmailOtpCode("");
                    setEmailSimulatedCode(null);
                    setRequireEmailOtp(false);
                  }}
                  className={`py-2 text-[11px] font-black rounded-lg transition-all duration-200 cursor-pointer ${
                    mode === "signup" 
                      ? "bg-white text-slate-800 shadow-sm" 
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  ثبت‌نام کارگاه جدید
                </button>
              </div>
            </div>
          ) : (
            <div className="px-6 pt-4">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError("");
                  setSuccessMsg("");
                  setEmailOtpStep(1);
                  setEmailOtpCode("");
                }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                بازگشت به صفحه ورود اعضا
              </button>
            </div>
          )}

          {/* Method Switch (SMS OTP / Password) */}
          {mode !== "forgot" && (
            <div className="px-6 pt-3 flex items-center justify-center gap-4 text-xs font-bold border-b border-slate-100 pb-3 mt-1">
              <button
                type="button"
                onClick={() => { 
                  setAuthMethod("otp"); 
                  setError(""); 
                  setSuccessMsg(""); 
                  setEmailOtpStep(1);
                  setEmailOtpCode("");
                  setEmailSimulatedCode(null);
                  setRequireEmailOtp(false);
                }}
                className={`pb-1 px-1 transition-all border-b-2 cursor-pointer ${
                  authMethod === "otp" 
                    ? "border-indigo-600 text-indigo-600 font-extrabold" 
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                کد یکبار مصرف پیامکی (OTP)
              </button>
              <button
                type="button"
                onClick={() => { 
                  setAuthMethod("password"); 
                  setError(""); 
                  setSuccessMsg(""); 
                  setOtpStep(1);
                  setOtpCode("");
                  setEmailOtpStep(1);
                  setEmailOtpCode("");
                  setEmailSimulatedCode(null);
                  setRequireEmailOtp(false);
                }}
                className={`pb-1 px-1 transition-all border-b-2 cursor-pointer ${
                  authMethod === "password" 
                    ? "border-indigo-600 text-indigo-600 font-extrabold" 
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                ایمیل و رمز عبور
              </button>
            </div>
          )}

          {/* Message Area */}
          <div className="px-6 pt-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-semibold leading-relaxed flex flex-col gap-2">
                <div>{error}</div>
                {error.includes("کد یکبار مصرف") && (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod("otp");
                      setError("");
                    }}
                    className="mt-1 text-xs text-indigo-600 hover:text-indigo-800 font-extrabold flex items-center gap-1 self-start cursor-pointer border-b border-indigo-100 pb-0.5"
                  >
                    <span>← ورود با کد یکبار مصرف پیامکی (OTP)</span>
                  </button>
                )}
              </div>
            )}
            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl text-xs font-semibold leading-relaxed">
                {successMsg}
              </div>
            )}
          </div>

          {/* SMS OTP Forms */}
          {authMethod === "otp" ? (
            <div className="p-6 pt-2 space-y-4">
              {otpStep === 1 ? (
                /* Step 1: Request OTP */
                <form onSubmit={handleSendOtp} className="space-y-4">
                  {mode === "signup" && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600">نام و نام خانوادگی مدیر کارگاه <span className="text-rose-500">*</span></label>
                      <div className="relative">
                        <User className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                        <input
                          type="text"
                          required
                          placeholder="مانند: مهندس علیرضا محمدی"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600">شماره همراه تماس (صاحب کارگاه) <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <input
                        type="tel"
                        required
                        placeholder="مثال: 09123456789"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all font-mono text-right font-bold"
                      />
                    </div>
                    <span className="text-[9px] text-slate-400 font-medium">کد تایید ورود از طریق پیامک برای این شماره فرستاده خواهد شد.</span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-xs font-black shadow-md shadow-indigo-100 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-300"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>در حال ارسال پیامک...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="h-4 w-4" />
                        <span>ارسال کد تایید یکبار مصرف</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Step 2: Verify OTP */
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-bold">ارسال به شماره: <strong className="font-mono text-slate-800">{phone}</strong></span>
                    <button
                      type="button"
                      onClick={() => { setOtpStep(1); setOtpCode(""); setError(""); setSuccessMsg(""); }}
                      className="text-indigo-600 hover:text-indigo-800 font-black flex items-center gap-0.5 cursor-pointer text-[10px]"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      ویرایش شماره
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600">کد تایید ۵ رقمی را وارد کنید <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <ShieldCheck className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <input
                        type="text"
                        required
                        maxLength={5}
                        placeholder="ـ ـ ـ ـ ـ"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm font-black tracking-[0.5em] outline-none focus:border-indigo-500 focus:bg-white transition-all font-mono animate-pulse"
                      />
                    </div>
                  </div>

                  {simulatedCode && (
                    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl text-amber-800 text-[10px] font-bold space-y-1">
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                        <span>شبیه‌ساز پیامک صنعتی (محیط توسعه):</span>
                      </div>
                      <p className="leading-relaxed">
                        کد تایید ارسال شده برای شما: <strong className="font-mono text-xs bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded border border-amber-200">{simulatedCode}</strong> می‌باشد. جهت ورود می‌توانید این کد را وارد کنید.
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
                    {countdown > 0 ? (
                      <span>ارسال مجدد کد تایید تا {countdown} ثانیه دیگر</span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="h-3 w-3" />
                        ارسال مجدد کد تایید
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-xs font-black shadow-md shadow-emerald-100 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-300"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>در حال تایید کد...</span>
                      </>
                    ) : (
                      <span>تایید و ورود به پنل کارگاه</span>
                    )}
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* Email Password Forms */
            <form onSubmit={handlePasswordSubmit} className="p-6 pt-2 space-y-4">
              {emailOtpStep === 1 ? (
                <>
                  {mode === "signup" && (
                    <>
                      {/* Full name */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-600">نام و نام خانوادگی مدیر کارگاه <span className="text-rose-500">*</span></label>
                        <div className="relative">
                          <User className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                          <input
                            type="text"
                            required
                            placeholder="مانند: علیرضا محمدی"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold"
                          />
                        </div>
                      </div>

                      {/* Phone */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-600">شماره همراه تماس <span className="text-rose-500">*</span></label>
                        <div className="relative">
                          <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                          <input
                            type="tel"
                            required
                            placeholder="مانند: 09123456789"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all font-mono text-right font-semibold"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600">آدرس ایمیل <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <input
                        type="email"
                        required
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all font-mono text-right"
                      />
                    </div>
                  </div>

                  {/* Password (Only for signin and signup) */}
                  {mode !== "forgot" && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-600">کلمه عبور <span className="text-rose-500">*</span></label>
                        {mode === "signin" && (
                          <button
                            type="button"
                            onClick={() => {
                              setMode("forgot");
                              setEmailOtpStep(1);
                              setEmailOtpCode("");
                              setError("");
                              setSuccessMsg("");
                            }}
                            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                          >
                            فراموشی / تعیین رمز عبور
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          minLength={6}
                          placeholder="حداقل ۶ کاراکتر"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all font-mono text-right"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-xs font-black shadow-md shadow-indigo-100 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 mt-4 cursor-pointer disabled:bg-slate-300"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>در حال بررسی اطلاعات...</span>
                      </>
                    ) : (
                      <span>
                        {mode === "signin" 
                          ? "ورود به سیستم" 
                          : mode === "signup"
                          ? "ارسال کد تایید به ایمیل"
                          : "ارسال کد تایید جهت بازیابی / تعیین رمز"}
                      </span>
                    )}
                  </button>
                </>
              ) : (
                <>
                  {/* Step 2: Email OTP Verification Input */}
                  <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-bold">ارسال به ایمیل: <strong className="font-mono text-slate-800">{email}</strong></span>
                    <button
                      type="button"
                      onClick={() => { setEmailOtpStep(1); setEmailOtpCode(""); setError(""); setSuccessMsg(""); }}
                      className="text-indigo-600 hover:text-indigo-800 font-black flex items-center gap-0.5 cursor-pointer text-[10px]"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      ویرایش ایمیل
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600">کد تایید ۵ رقمی ارسال شده به ایمیل را وارد کنید <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <ShieldCheck className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <input
                        type="text"
                        required
                        maxLength={5}
                        placeholder="ـ ـ ـ ـ ـ"
                        value={emailOtpCode}
                        onChange={(e) => setEmailOtpCode(e.target.value)}
                        className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm font-black tracking-[0.5em] outline-none focus:border-indigo-500 focus:bg-white transition-all font-mono"
                      />
                    </div>
                  </div>

                  {/* If mode is forgot, ask for new password in step 2 */}
                  {mode === "forgot" && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600">کلمه عبور جدید <span className="text-rose-500">*</span></label>
                      <div className="relative">
                        <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          minLength={6}
                          placeholder="حداقل ۶ کاراکتر"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all font-mono text-right"
                        />
                      </div>
                    </div>
                  )}

                  {emailSimulatedCode && (
                    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl text-amber-800 text-[10px] font-bold space-y-1">
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                        <span>شبیه‌ساز ایمیل صنعتی (محیط توسعه):</span>
                      </div>
                      <p className="leading-relaxed">
                        کد تایید ارسال شده به ایمیل شما: <strong className="font-mono text-xs bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded border border-amber-200">{emailSimulatedCode}</strong> می‌باشد. جهت ثبت‌نام/ورود می‌توانید این کد را وارد کنید.
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
                    {emailCountdown > 0 ? (
                      <span>ارسال مجدد کد تایید تا {emailCountdown} ثانیه دیگر</span>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          setError("");
                          setSuccessMsg("");
                          setLoading(true);
                          try {
                            const res = await customAuth.sendEmailOtp(email.trim());
                            if (res.success) {
                              if (res.codeSimulated) {
                                setEmailSimulatedCode(res.codeSimulated);
                              }
                              startEmailCountdown();
                              setSuccessMsg("کد تایید جدید به ایمیل شما ارسال شد.");
                            }
                          } catch (err: any) {
                            setError(err.message || "خطا در ارسال مجدد کد تایید.");
                          } finally {
                            setLoading(false);
                          }
                        }}
                        className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="h-3 w-3" />
                        ارسال مجدد کد تایید
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-xs font-black shadow-md shadow-emerald-100 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-300"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>در حال تایید کد و ورود...</span>
                      </>
                    ) : (
                      <span>تایید کد و تکمیل فرآیند</span>
                    )}
                  </button>
                </>
              )}
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
