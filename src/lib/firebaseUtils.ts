import { auth } from "../firebase";
import { UserProfile, Unit, Product } from "../types";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const savedUser = localStorage.getItem("custom_auth_user");
  if (!savedUser) {
    return {};
  }
  try {
    const user = JSON.parse(savedUser);
    if (user && user.token) {
      return {
        "Authorization": `Bearer ${user.token}`
      };
    }
    return {};
  } catch (err) {
    console.error("Error getting custom auth token:", err);
    return {};
  }
}

// User profiles
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!uid) return null;
  try {
    const res = await fetch(`/api/users/profile/${uid}`);
    if (!res.ok) {
      return null;
    }
    const data = await res.json().catch(() => null);
    return data;
  } catch (error) {
    console.warn("Notice: getUserProfile fallback:", error);
    return null;
  }
}

export async function createUserProfile(profile: UserProfile): Promise<void> {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch("/api/users/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders
      },
      body: JSON.stringify(profile)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(errData.error || "Failed to create user profile");
    }
  } catch (error) {
    console.error("Error creating user profile:", error);
    throw error;
  }
}

// Units
export async function getAllUnits(): Promise<Unit[]> {
  try {
    const res = await fetch("/api/units");
    if (!res.ok) {
      return [];
    }
    const data = await res.json().catch(() => []);
    const unitsList: Unit[] = Array.isArray(data) ? data : (data?.data || []);
    // Sort by createdAt descending
    return unitsList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  } catch (error) {
    console.warn("Notice: getAllUnits fallback to empty list:", error);
    return [];
  }
}

export async function getUnitByOwner(ownerId: string): Promise<Unit | null> {
  if (!ownerId) return null;
  try {
    const res = await fetch(`/api/units/owner/${ownerId}`);
    if (!res.ok) {
      return null;
    }
    const data = await res.json().catch(() => null);
    return data;
  } catch (error) {
    console.warn("Notice: getUnitByOwner fallback to null:", error);
    return null;
  }
}

export async function saveUnit(unit: Unit): Promise<void> {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch("/api/units", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders
      },
      body: JSON.stringify(unit)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(errData.error || "Failed to save unit");
    }
  } catch (error) {
    console.error("Error saving unit:", error);
    throw error;
  }
}

// Products
export async function getAllProducts(): Promise<Product[]> {
  try {
    const res = await fetch("/api/products");
    if (!res.ok) {
      return [];
    }
    const data = await res.json().catch(() => []);
    const productsList: Product[] = Array.isArray(data) ? data : (data?.data || []);
    return productsList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  } catch (error) {
    console.warn("Notice: getAllProducts fallback to empty list:", error);
    return [];
  }
}

export async function getProductsByUnit(unitId: string): Promise<Product[]> {
  if (!unitId) return [];
  try {
    const res = await fetch(`/api/products/unit/${unitId}`);
    if (!res.ok) {
      return [];
    }
    const data = await res.json().catch(() => []);
    const productsList: Product[] = Array.isArray(data) ? data : (data?.data || []);
    return productsList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  } catch (error) {
    console.warn("Notice: getProductsByUnit fallback:", error);
    return [];
  }
}

export async function saveProduct(product: Product): Promise<void> {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch("/api/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders
      },
      body: JSON.stringify(product)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(errData.error || "Failed to save product");
    }
  } catch (error) {
    console.error("Error saving product:", error);
    throw error;
  }
}

export async function deleteProduct(productId: string): Promise<void> {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`/api/products/${productId}`, {
      method: "DELETE",
      headers: {
        ...authHeaders
      }
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(errData.error || "Failed to delete product");
    }
  } catch (error) {
    console.error("Error deleting product:", error);
    throw error;
  }
}

export async function deleteUnit(unitId: string): Promise<void> {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`/api/units/${unitId}`, {
      method: "DELETE",
      headers: {
        ...authHeaders
      }
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(errData.error || "خطا در حذف کارگاه");
    }
  } catch (error) {
    console.error("Error deleting unit:", error);
    throw error;
  }
}
