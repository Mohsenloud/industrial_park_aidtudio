import { 
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged
} from "firebase/auth";
import { auth } from "../firebase";
import { createUserProfile } from "./firebaseUtils";

export interface CustomUser {
  uid: string;
  email: string;
  token?: string;
}

type AuthStateCallback = (user: CustomUser | null) => void;

class CustomAuthService {
  private listeners: AuthStateCallback[] = [];
  private currentUser: CustomUser | null = null;

  constructor() {
    // Restore session from localStorage
    const savedUser = localStorage.getItem("custom_auth_user");
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser);
      } catch (e) {
        localStorage.removeItem("custom_auth_user");
      }
    }

    // Keep Firebase Auth state synchronized with our custom state
    firebaseOnAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          const loggedUser: CustomUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || "",
            token: token,
          };
          this.currentUser = loggedUser;
          localStorage.setItem("custom_auth_user", JSON.stringify(loggedUser));
          this.notifyListeners();
        } catch (err) {
          console.error("Error getting ID token during auth state change:", err);
        }
      } else {
        // If signed out of Firebase Auth and current session is custom (starts with usr_), keep custom session.
        if (this.currentUser && !this.currentUser.uid.startsWith("usr_")) {
          this.currentUser = null;
          localStorage.removeItem("custom_auth_user");
          this.notifyListeners();
        }
      }
    });
  }

  get currentUserState() {
    return this.currentUser;
  }

  onAuthStateChanged(callback: AuthStateCallback) {
    this.listeners.push(callback);
    // Call immediately with the current user state
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentUser));
  }

  async signIn(email: string, password: string, code?: string): Promise<{ requireOtp?: boolean; user?: CustomUser; codeSimulated?: string; message?: string }> {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, code }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "خطا در ورود به حساب کاربری");
    }

    const data = await response.json();
    if (data.requireOtp) {
      return { requireOtp: true, codeSimulated: data.codeSimulated, message: data.message };
    }

    const loggedUser: CustomUser = {
      uid: data.user.uid,
      email: data.user.email,
      token: data.user.token,
    };

    this.currentUser = loggedUser;
    localStorage.setItem("custom_auth_user", JSON.stringify(loggedUser));
    this.notifyListeners();
    return { user: loggedUser };
  }

  async signUp(email: string, password: string, name: string, phone: string, code: string): Promise<CustomUser> {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name, phone, code }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "خطا در ثبت نام");
    }

    const data = await response.json();
    const loggedUser: CustomUser = {
      uid: data.user.uid,
      email: data.user.email,
      token: data.user.token,
    };

    this.currentUser = loggedUser;
    localStorage.setItem("custom_auth_user", JSON.stringify(loggedUser));
    this.notifyListeners();
    return loggedUser;
  }

  async sendEmailOtp(email: string): Promise<{ success: boolean; codeSimulated?: string; message?: string }> {
    const response = await fetch("/api/auth/send-email-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "خطا در ارسال کد تایید به ایمیل");
    }
    return response.json();
  }

  async sendOtp(phone: string): Promise<{ success: boolean; codeSimulated?: string; message?: string }> {
    const response = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "خطا در ارسال کد تایید");
    }
    return response.json();
  }

  async verifyOtp(phone: string, code: string, name?: string): Promise<CustomUser> {
    const response = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code, name }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "کد تایید اشتباه یا منقضی شده است.");
    }
    const data = await response.json();
    const loggedUser: CustomUser = {
      uid: data.user.uid,
      email: data.user.email,
      token: data.user.token,
    };

    // Removed Firestore sync. All user details are stored and accessed via PostgreSQL.

    this.currentUser = loggedUser;
    localStorage.setItem("custom_auth_user", JSON.stringify(loggedUser));
    this.notifyListeners();
    return loggedUser;
  }

  async signOut() {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.error("Firebase signOut error:", e);
    }
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Server signOut error:", e);
    }
    this.currentUser = null;
    localStorage.removeItem("custom_auth_user");
    this.notifyListeners();
  }
}

export const customAuth = new CustomAuthService();
