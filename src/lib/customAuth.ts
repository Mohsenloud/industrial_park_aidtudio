import { 
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged
} from "firebase/auth";
import { auth } from "../firebase";
import { createUserProfile } from "./firebaseUtils";

export interface CustomUser {
  uid: string;
  name?: string;
  phone?: string;
  email?: string;
  token?: string;
}

export interface AuthErrorDetails {
  message: string;
  debugCode?: string;
  details?: any;
  rawResponse?: any;
}

export class CustomAuthError extends Error {
  public debugCode?: string;
  public details?: any;
  public rawResponse?: any;

  constructor(message: string, debugCode?: string, details?: any, rawResponse?: any) {
    super(message);
    this.name = "CustomAuthError";
    this.debugCode = debugCode;
    this.details = details;
    this.rawResponse = rawResponse;
  }
}

type AuthStateCallback = (user: CustomUser | null) => void;

async function executeAuthFetch(url: string, options: RequestInit): Promise<Response> {
  try {
    return await fetch(url, options);
  } catch (netErr: any) {
    throw new CustomAuthError(
      "خطا در برقراری ارتباط با سرور. لطفاً اتصال اینترنت خود را بررسی نمایید.",
      "NETWORK_FETCH_FAILED",
      netErr.message || "Failed to fetch"
    );
  }
}

class CustomAuthService {
  private listeners: AuthStateCallback[] = [];
  private currentUser: CustomUser | null = null;

  constructor() {
    // Restore session from localStorage if present
    const savedUser = localStorage.getItem("custom_auth_user");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed && parsed.uid) {
          this.currentUser = parsed;
        }
      } catch (e) {
        localStorage.removeItem("custom_auth_user");
      }
    }
  }

  get currentUserState() {
    return this.currentUser;
  }

  onAuthStateChanged(callback: AuthStateCallback) {
    this.listeners.push(callback);
    // Call immediately with the active user state
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentUser));
  }

  async signIn(email: string, password?: string, code?: string): Promise<{ requireOtp?: boolean; user?: CustomUser; codeSimulated?: string; message?: string }> {
    const res = await executeAuthFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password, code })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new CustomAuthError(
        data.error || "خطا در ورود به حساب کاربری.",
        data.code || "LOGIN_FAILED",
        data.details || data.innerError,
        data
      );
    }

    if (data.user) {
      this.currentUser = data.user;
      localStorage.setItem("custom_auth_user", JSON.stringify(data.user));
      this.notifyListeners();
    }

    return data;
  }

  async signUp(email: string, password?: string, name?: string, phone?: string, code?: string): Promise<CustomUser> {
    const res = await executeAuthFetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        name: name?.trim(),
        phone: phone?.trim(),
        code: code?.trim()
      })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new CustomAuthError(
        data.error || "خطا در ثبت نام.",
        data.code || "REGISTER_FAILED",
        data.details,
        data
      );
    }

    if (data.user) {
      this.currentUser = data.user;
      localStorage.setItem("custom_auth_user", JSON.stringify(data.user));
      this.notifyListeners();
      return data.user;
    }

    throw new CustomAuthError("اطلاعات کاربر پس از ثبت نام دریافت نشد.", "INVALID_RESPONSE");
  }

  async resetPassword(email: string, code: string, newPassword?: string): Promise<CustomUser> {
    const res = await executeAuthFetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        code: code.trim(),
        newPassword
      })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new CustomAuthError(
        data.error || "خطا در تعیین/تغییر کلمه عبور.",
        data.code || "RESET_PASSWORD_FAILED",
        data.details,
        data
      );
    }

    if (data.user) {
      this.currentUser = data.user;
      localStorage.setItem("custom_auth_user", JSON.stringify(data.user));
      this.notifyListeners();
      return data.user;
    }

    throw new CustomAuthError("اطلاعات کاربر پس از ثبت کلمه عبور دریافت نشد.", "INVALID_RESPONSE");
  }

  async sendEmailOtp(email: string): Promise<{ success: boolean; codeSimulated?: string; message?: string }> {
    const res = await executeAuthFetch("/api/auth/send-email-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase() })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new CustomAuthError(
        data.error || "خطا در ارسال کد تایید به ایمیل.",
        data.code || "SEND_EMAIL_OTP_FAILED",
        data.details,
        data
      );
    }

    return data;
  }

  async sendOtp(phone: string): Promise<{ success: boolean; codeSimulated?: string; message?: string }> {
    const res = await executeAuthFetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phone.trim() })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new CustomAuthError(
        data.error || "خطا در ارسال کد تایید پیامکی.",
        data.code || "SEND_OTP_FAILED",
        data.details,
        data
      );
    }

    return data;
  }

  async verifyOtp(phone: string, code: string, name?: string): Promise<CustomUser> {
    const res = await executeAuthFetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: phone.trim(),
        code: code.trim(),
        name: name?.trim()
      })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new CustomAuthError(
        data.error || "کد تایید وارد شده نادرست یا منقضی است.",
        data.code || "VERIFY_OTP_FAILED",
        data.details,
        data
      );
    }

    if (data.user) {
      this.currentUser = data.user;
      localStorage.setItem("custom_auth_user", JSON.stringify(data.user));
      this.notifyListeners();
      return data.user;
    }

    throw new CustomAuthError("اطلاعات کاربر پس از تایید کد دریافت نشد.", "INVALID_RESPONSE");
  }

  setCurrentUser(user: CustomUser | null) {
    this.currentUser = user;
    if (user) {
      localStorage.setItem("custom_auth_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("custom_auth_user");
    }
    this.notifyListeners();
  }

  async signOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (_) {}
    this.currentUser = null;
    localStorage.removeItem("custom_auth_user");
    this.notifyListeners();
  }
}

export const customAuth = new CustomAuthService();
