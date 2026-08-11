import { API_BASE, AUTH_TIMESTAMP } from "./constants";
import { baseHeaders } from "./request";

// Checks current localstorage and validates the session based on that.
export default async function validateSessionTokenForUser() {
  try {
    const response = await fetch(`${API_BASE}/system/check-token`, {
      method: "GET",
      cache: "no-store",
      headers: baseHeaders(),
    });
    if (response.status === 200) {
      localStorage.setItem(AUTH_TIMESTAMP, String(Date.now()));
      return true;
    }
    return false;
  } catch {
    return null;
  }
}
