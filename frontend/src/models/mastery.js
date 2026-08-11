import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";

const Mastery = {
  async get(options = {}) {
    const response = await fetch(`${API_BASE}/system/courses/mastery`, {
      ...options,
      headers: { ...baseHeaders(), ...options.headers },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false)
      throw new Error(data.error || "Unable to load your mastery map");
    return data;
  },
};

export default Mastery;
