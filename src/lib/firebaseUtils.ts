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
  try {
    const res = await fetch(`/api/users/profile/${uid}`);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Failed to fetch profile: ${res.statusText}`);
    }
    return await res.json();
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw error;
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
      throw new Error(`Failed to fetch units: ${res.statusText}`);
    }
    const units: Unit[] = await res.json();
    // Sort by createdAt descending
    return units.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error("Error getting units:", error);
    throw error;
  }
}

export async function getUnitByOwner(ownerId: string): Promise<Unit | null> {
  try {
    const res = await fetch(`/api/units/owner/${ownerId}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch unit by owner: ${res.statusText}`);
    }
    return await res.json();
  } catch (error) {
    console.error("Error getting unit by owner:", error);
    throw error;
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
      throw new Error(`Failed to fetch products: ${res.statusText}`);
    }
    const products: Product[] = await res.json();
    return products.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error("Error getting products:", error);
    throw error;
  }
}

export async function getProductsByUnit(unitId: string): Promise<Product[]> {
  try {
    const res = await fetch(`/api/products/unit/${unitId}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch unit products: ${res.statusText}`);
    }
    const products: Product[] = await res.json();
    return products.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error("Error getting products for unit:", error);
    throw error;
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
