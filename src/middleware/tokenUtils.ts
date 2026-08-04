import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

export function signToken(payload: { uid: string; email: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const claims = Buffer.from(
    JSON.stringify({ 
      ...payload, 
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60 // 30 days expiration
    })
  ).toString("base64url");
  
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${claims}`)
    .digest("base64url");
    
  return `${header}.${claims}.${signature}`;
}

export function verifyToken(token: string): { uid: string; email: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    
    const [header, claims, signature] = parts;
    const expectedSignature = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${header}.${claims}`)
      .digest("base64url");
      
    if (signature !== expectedSignature) return null;
    
    const decodedClaims = JSON.parse(Buffer.from(claims, "base64url").toString("utf-8"));
    if (decodedClaims.exp && Date.now() / 1000 > decodedClaims.exp) {
      return null; // Expired
    }
    
    return {
      uid: decodedClaims.uid,
      email: decodedClaims.email
    };
  } catch (e) {
    return null;
  }
}
