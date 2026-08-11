import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";
import { cachedRequest } from "@/utils/offline";

const StudentToday = {
  get(options = {}) {
    const timezoneOffset = new Date().getTimezoneOffset();
    return cachedRequest("student-today", "current", async () => {
      const response = await fetch(
        `${API_BASE}/system/student/today?timezoneOffset=${timezoneOffset}`,
        { ...options, headers: { ...baseHeaders(), ...options.headers } }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to load today");
      return data;
    });
  },
};

export default StudentToday;
