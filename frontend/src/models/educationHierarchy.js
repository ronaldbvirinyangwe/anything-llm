import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...baseHeaders(),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(data.error || "Education dashboard request failed");
  return data;
}

const EducationHierarchy = {
  access() {
    return request("/education/access");
  },

  accessControl() {
    return request("/education/admin/access-control");
  },

  grantAccess(organizationId, membership) {
    return request(`/education/organizations/${organizationId}/memberships`, {
      method: "POST",
      body: JSON.stringify(membership),
    });
  },

  revokeAccess(membershipId) {
    return request(`/education/memberships/${membershipId}`, {
      method: "DELETE",
    });
  },

  schoolVerificationContext() {
    return request("/education/school-verification/context");
  },

  submitSchoolVerification(data) {
    return request("/education/school-verification", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  reviewSchoolVerification(submissionId, decision, reviewNotes = "") {
    return request(
      `/education/admin/school-verifications/${submissionId}/review`,
      {
        method: "POST",
        body: JSON.stringify({ decision, reviewNotes }),
      }
    );
  },

  dashboard(scopeType, scopeId, filters = {}) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value) query.set(key, value);
    }
    const resource = scopeType === "class" ? "classes" : "organizations";
    const suffix = query.size ? `?${query.toString()}` : "";
    return request(`/education/${resource}/${scopeId}/dashboard${suffix}`);
  },
};

export default EducationHierarchy;
