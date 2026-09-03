import { Request, Response, NextFunction } from "express";
import { initializeApp, getApps, getApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { verifyToken } from "./tokenUtils.ts";

// Initialize Firebase Admin if not already initialized
const adminApp = getApps().length === 0
  ? initializeApp({ projectId: "stellar-axon-g7854" })
  : getApp();

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    role?: string;
    isAdmin?: boolean;
  };
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  let token = req.cookies?.token;

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const extractedToken = authHeader.split("Bearer ")[1]?.trim();
      if (extractedToken && extractedToken !== "undefined" && extractedToken !== "null") {
        token = extractedToken;
      }
    }
  }

  if (!token || token === "") {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }

  // 1. Try to verify as custom signed token first
  const decodedCustom = verifyToken(token);
  if (decodedCustom) {
    req.user = {
      uid: decodedCustom.uid,
      email: decodedCustom.email
    };
    return next();
  }

  // 2. Try to verify as actual Firebase ID Token using Firebase Admin SDK
  try {
    const auth = getAuth(adminApp);
    const decodedIdToken = await auth.verifyIdToken(token);
    req.user = {
      uid: decodedIdToken.uid,
      email: decodedIdToken.email
    };
    return next();
  } catch (error) {
    console.error("Error verifying Firebase ID Token or custom token:", error);
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};

