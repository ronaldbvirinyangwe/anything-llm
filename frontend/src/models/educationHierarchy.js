import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";

export const EDUCATION_ROLE_LABELS = {
  ministry_admin: "Ministry administrator",
  ministry_analyst: "Ministry analyst",
  department_admin: "Department administrator",
  department_analyst: "Department analyst",
  province_admin: "Provincial administrator",
  district_admin: "District administrator",
  school_admin: "School administrator",
  headmaster: "Headmaster",
  deputy_head: "Deputy head",
  hod: "Head of department",
  student_support: "Student support",
  teacher: "Teacher",
  viewer: "Read-only viewer",
};

export function educationViewerContext(payload, organizationId) {
  const viewer = payload?.viewerContext || payload?.viewer || {};
  const membership =
    payload?.activeMembership ||
    viewer.membership ||
    payload?.memberships?.find(
      (item) =>
        String(item.organizationId || item.organization?.id) ===
        String(organizationId || payload?.defaultOrganization?.id)
    ) ||
    payload?.memberships?.[0] ||
    {};
  const capabilities =
    viewer.capabilities ||
    payload?.access ||
    payload?.capabilities ||
    membership.capabilities ||
    {};
  const canViewPii =
    viewer.canViewPii ??
    membership.canViewPii ??
    (Array.isArray(capabilities)
      ? capabilities.includes("view_pii") ||
        capabilities.includes("view_learner_pii")
      : (capabilities.canViewPii ?? capabilities.viewPii));

  return {
    role:
      viewer.role ||
      viewer.membershipRole ||
      membership.role ||
      capabilities.roles?.find((role) => role !== "global_admin") ||
      "",
    capabilities,
    canViewPii,
  };
}

export function educationDashboardTitle(scopeType, role) {
  if (scopeType === "school_department")
    return role === "hod" ? "HOD Dashboard" : "Department Dashboard";
  if (scopeType === "school") {
    if (role === "headmaster") return "Headmaster Dashboard";
    if (role === "deputy_head") return "Deputy Head Dashboard";
    if (role === "student_support") return "Student Support Dashboard";
    return "School Dashboard";
  }
  return "Education Dashboard";
}

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

  createOrganization(organization) {
    return request("/education/organizations", {
      method: "POST",
      body: JSON.stringify(organization),
    });
  },

  assignClassDepartment(classId, departmentId) {
    return request(`/education/classes/${classId}/department`, {
      method: "PATCH",
      body: JSON.stringify({ departmentId }),
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
