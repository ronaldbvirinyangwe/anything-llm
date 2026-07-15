import { useEffect, useState } from "react";
import { isMobile } from "react-device-detect";
import {
  Buildings,
  CheckCircle,
  LockKey,
  MagnifyingGlass,
  ShieldCheck,
  Trash,
  XCircle,
} from "@phosphor-icons/react";
import Sidebar from "@/components/SettingsSidebar";
import Admin from "@/models/admin";
import EducationHierarchy from "@/models/educationHierarchy";
import showToast from "@/utils/toast";

const ROLE_LABELS = {
  ministry_admin: "Ministry administrator",
  ministry_analyst: "Ministry analyst",
  department_admin: "Department administrator",
  department_analyst: "Department analyst",
  province_admin: "Provincial administrator",
  district_admin: "District administrator",
  school_admin: "School administrator",
  teacher: "Teacher",
  viewer: "Read-only viewer",
};

const ROLES_BY_TYPE = {
  ministry: ["ministry_admin", "ministry_analyst", "viewer"],
  department: ["department_admin", "department_analyst", "viewer"],
  province: ["province_admin", "viewer"],
  district: ["district_admin", "viewer"],
  school: ["school_admin", "viewer"],
};

export default function EducationAccess() {
  const [users, setUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [schoolVerifications, setSchoolVerifications] = useState([]);
  const [userId, setUserId] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [role, setRole] = useState("ministry_analyst");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [allUsers, access] = await Promise.all([
        Admin.users(),
        EducationHierarchy.accessControl(),
      ]);
      setUsers(allUsers);
      setOrganizations(access.organizations);
      setMemberships(access.memberships);
      setSchoolVerifications(access.schoolVerifications || []);
      const eligibleUsers = allUsers.filter((user) => user.role === "default");
      setUserId((current) => current || String(eligibleUsers[0]?.id || ""));
      const ministry = access.organizations.find(
        (organization) => organization.type === "ministry"
      );
      setOrganizationId(
        (current) =>
          current || String(ministry?.id || access.organizations[0]?.id || "")
      );
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const eligibleUsers = users.filter((user) => user.role === "default");
  const selectedOrganization = organizations.find(
    (organization) => String(organization.id) === organizationId
  );
  const allowedRoles = ROLES_BY_TYPE[selectedOrganization?.type] || ["viewer"];
  const visibleMemberships = memberships.filter((membership) => {
    const value = search.toLowerCase();
    return (
      membership.user?.username?.toLowerCase().includes(value) ||
      membership.organization?.name?.toLowerCase().includes(value) ||
      ROLE_LABELS[membership.role]?.toLowerCase().includes(value)
    );
  });

  const selectOrganization = (value) => {
    setOrganizationId(value);
    const organization = organizations.find(
      (item) => String(item.id) === value
    );
    setRole((ROLES_BY_TYPE[organization?.type] || ["viewer"])[0]);
  };

  const grantAccess = async (event) => {
    event.preventDefault();
    if (!userId || !organizationId || !role) return;
    setSaving(true);
    try {
      await EducationHierarchy.grantAccess(organizationId, {
        userId: Number(userId),
        role,
        canViewPii: false,
      });
      showToast("Education access granted.", "success");
      await load();
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const revokeAccess = async (membership) => {
    if (
      !window.confirm(
        `Remove ${ROLE_LABELS[membership.role] || membership.role} access for ${membership.user?.username}?`
      )
    )
      return;
    try {
      await EducationHierarchy.revokeAccess(membership.id);
      setMemberships((current) =>
        current.filter((item) => item.id !== membership.id)
      );
      showToast("Education access removed.", "success");
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  const reviewSchool = async (submission, decision) => {
    const action = decision === "approved" ? "approve" : "reject";
    if (
      !window.confirm(
        `${action} the submitted details for ${submission.school?.name}?`
      )
    )
      return;
    try {
      await EducationHierarchy.reviewSchoolVerification(
        submission.id,
        decision
      );
      setSchoolVerifications((current) =>
        current.filter((item) => item.id !== submission.id)
      );
      showToast(`School verification ${decision}.`, "success");
      if (decision === "approved") await load();
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-theme-bg-container">
      <Sidebar />
      <main
        style={{ height: isMobile ? "100%" : "calc(100% - 32px)" }}
        className="relative h-full w-full overflow-y-auto bg-theme-bg-secondary p-4 md:mx-4 md:my-4 md:rounded-2xl md:p-8"
      >
        <div className="mx-auto max-w-6xl space-y-6 py-12 md:py-0">
          <header className="border-b border-white/10 pb-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
                <Buildings size={22} />
              </span>
              <div>
                <h1 className="text-xl font-bold text-theme-text-primary">
                  Education access
                </h1>
                <p className="mt-1 text-xs text-theme-text-secondary">
                  Assign users to a specific level of the education hierarchy.
                </p>
              </div>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <div className="flex items-center gap-2 font-bold text-emerald-400">
                <ShieldCheck size={20} /> Education analytics only
              </div>
              <p className="mt-2 text-sm leading-6 text-theme-text-secondary">
                These assignments grant dashboard access only. They do not grant
                access to payments, system settings, API keys, or learner
                payment records.
              </p>
            </div>
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
              <div className="flex items-center gap-2 font-bold text-amber-400">
                <LockKey size={20} /> Use a standard account
              </div>
              <p className="mt-2 text-sm leading-6 text-theme-text-secondary">
                Create ministry users with the global role “default”, then
                assign their education scope here. Global admin accounts always
                retain internal payment access.
              </p>
            </div>
          </section>

          <form
            onSubmit={grantAccess}
            className="rounded-2xl border border-theme-sidebar-border bg-theme-bg-primary p-5"
          >
            <h2 className="font-bold text-theme-text-primary">Grant access</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label className="text-xs font-bold uppercase tracking-wide text-theme-text-secondary">
                User
                <select
                  value={userId}
                  onChange={(event) => setUserId(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-theme-sidebar-border bg-theme-bg-secondary px-3 py-3 text-sm normal-case text-theme-text-primary"
                >
                  {eligibleUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.username}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold uppercase tracking-wide text-theme-text-secondary">
                Organization
                <select
                  value={organizationId}
                  onChange={(event) => selectOrganization(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-theme-sidebar-border bg-theme-bg-secondary px-3 py-3 text-sm normal-case text-theme-text-primary"
                >
                  {[
                    "ministry",
                    "department",
                    "province",
                    "district",
                    "school",
                  ].map((type) => (
                    <optgroup
                      key={type}
                      label={`${type[0].toUpperCase()}${type.slice(1)}`}
                    >
                      {organizations
                        .filter((organization) => organization.type === type)
                        .map((organization) => (
                          <option key={organization.id} value={organization.id}>
                            {organization.name}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold uppercase tracking-wide text-theme-text-secondary">
                Education role
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-theme-sidebar-border bg-theme-bg-secondary px-3 py-3 text-sm normal-case text-theme-text-primary"
                >
                  {allowedRoles.map((value) => (
                    <option key={value} value={value}>
                      {ROLE_LABELS[value]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {!eligibleUsers.length && !loading && (
              <p className="mt-4 text-sm text-amber-400">
                No standard accounts are available. Create a user with the
                “default” role first.
              </p>
            )}
            <button
              type="submit"
              disabled={saving || !userId || !organizationId}
              className="mt-5 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Granting access..." : "Grant education access"}
            </button>
          </form>

          <section className="overflow-hidden rounded-2xl border border-cyan-500/20 bg-theme-bg-primary">
            <div className="border-b border-theme-sidebar-border p-5">
              <h2 className="font-bold text-theme-text-primary">
                School details awaiting review
              </h2>
              <p className="mt-1 text-xs text-theme-text-secondary">
                Approving a submission updates the school classification and its
                district placement.
              </p>
            </div>
            {schoolVerifications.length ? (
              <div className="divide-y divide-theme-sidebar-border">
                {schoolVerifications.map((submission) => {
                  const province = organizations.find(
                    ({ id }) => id === submission.provinceId
                  );
                  const district = organizations.find(
                    ({ id }) => id === submission.districtId
                  );
                  return (
                    <div
                      key={submission.id}
                      className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center"
                    >
                      <div>
                        <div className="font-bold text-theme-text-primary">
                          {submission.proposedName || submission.school?.name}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-theme-text-secondary">
                          <span className="rounded-full bg-theme-bg-secondary px-3 py-1">
                            {submission.schoolLevel}
                          </span>
                          <span className="rounded-full bg-theme-bg-secondary px-3 py-1">
                            {submission.sector}
                          </span>
                          <span className="rounded-full bg-theme-bg-secondary px-3 py-1">
                            {submission.responsibleAuthority.replaceAll(
                              "_",
                              " "
                            )}
                          </span>
                          <span className="rounded-full bg-theme-bg-secondary px-3 py-1">
                            {province?.name || "Unknown province"} /{" "}
                            {district?.name || "Unknown district"}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-theme-text-secondary">
                          Submitted by {submission.submitter?.username}
                          {submission.address ? ` · ${submission.address}` : ""}
                        </div>
                        {submission.notes && (
                          <p className="mt-2 text-sm text-theme-text-secondary">
                            {submission.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => reviewSchool(submission, "rejected")}
                          className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-sm font-bold text-rose-400 hover:bg-rose-500/20"
                        >
                          <XCircle size={17} /> Reject
                        </button>
                        <button
                          onClick={() => reviewSchool(submission, "approved")}
                          className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-400 hover:bg-emerald-500/20"
                        >
                          <CheckCircle size={17} /> Approve
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-theme-text-secondary">
                No school verification submissions are waiting.
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-theme-sidebar-border bg-theme-bg-primary">
            <div className="flex flex-col gap-4 border-b border-theme-sidebar-border p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-bold text-theme-text-primary">
                  Active assignments
                </h2>
                <p className="mt-1 text-xs text-theme-text-secondary">
                  Access is inherited by child organizations.
                </p>
              </div>
              <div className="relative">
                <MagnifyingGlass
                  size={16}
                  className="absolute left-3 top-2.5 text-theme-text-secondary"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search assignments"
                  className="w-full rounded-xl border border-theme-sidebar-border bg-theme-bg-secondary py-2 pl-9 pr-3 text-sm text-theme-text-primary sm:w-64"
                />
              </div>
            </div>
            {loading ? (
              <div className="p-10 text-center text-sm text-theme-text-secondary">
                Loading access assignments...
              </div>
            ) : visibleMemberships.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-theme-bg-secondary text-xs uppercase tracking-wide text-theme-text-secondary">
                    <tr>
                      <th className="px-5 py-3">User</th>
                      <th className="px-4 py-3">Education role</th>
                      <th className="px-4 py-3">Organization</th>
                      <th className="px-4 py-3">Global role</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-sidebar-border">
                    {visibleMemberships.map((membership) => (
                      <tr
                        key={membership.id}
                        className="text-theme-text-primary"
                      >
                        <td className="px-5 py-4 font-bold">
                          {membership.user?.username || "Unknown user"}
                        </td>
                        <td className="px-4 py-4">
                          {ROLE_LABELS[membership.role] || membership.role}
                        </td>
                        <td className="px-4 py-4">
                          <div>{membership.organization?.name}</div>
                          <div className="mt-1 text-xs uppercase text-theme-text-secondary">
                            {membership.organization?.type}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-bold ${
                              membership.user?.role === "default"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-amber-500/10 text-amber-400"
                            }`}
                          >
                            {membership.user?.role}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => revokeAccess(membership)}
                            title="Revoke education access"
                            className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-2 text-rose-400 hover:bg-rose-500/20"
                          >
                            <Trash size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-10 text-center text-sm text-theme-text-secondary">
                No matching education assignments.
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
