import { AUTH_TOKEN } from "./constants";

export async function refreshUserToken() {
  try {
    const token = localStorage.getItem(AUTH_TOKEN);
    if (!token) return null;

    const res = await fetch("/api/system/refresh-role", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    if (data?.success && data?.token) {
      localStorage.setItem(AUTH_TOKEN, data.token);
      console.log(`✅ Token refreshed → new role: ${data.role}`);
      return data.role;
    }

    console.warn("Token refresh failed:", data?.error || "Unknown error");
    return null;
  } catch (err) {
    console.error("Refresh token error:", err);
    return null;
  }
}