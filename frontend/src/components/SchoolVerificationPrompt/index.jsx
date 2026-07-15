import { useEffect, useState } from "react";
import { Buildings, CheckCircle, MapPin } from "@phosphor-icons/react";
import EducationHierarchy from "@/models/educationHierarchy";
import showToast from "@/utils/toast";

const LEVELS = [
  ["ecd", "ECD"],
  ["infant", "Infant"],
  ["primary", "Primary"],
  ["secondary", "Secondary"],
  ["combined", "Combined primary and secondary"],
  ["special", "Special school"],
];

const AUTHORITIES = [
  ["government", "Central government"],
  ["local_authority", "Local authority or council"],
  ["mission_church", "Mission or church"],
  ["trust_company", "Trust or company"],
  ["community", "Community"],
  ["other", "Other"],
  ["unknown", "Not sure"],
];

export default function SchoolVerificationPrompt() {
  const [context, setContext] = useState(null);
  const [school, setSchool] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    EducationHierarchy.schoolVerificationContext()
      .then((result) => {
        setContext(result);
        const nextSchool = result.schools.find(
          (item) =>
            !sessionStorage.getItem(`school-verification-dismissed-${item.id}`)
        );
        setSchool(nextSchool || null);
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (!school) return;
    setForm({
      schoolId: school.id,
      proposedName: school.name,
      schoolLevel: school.schoolLevel || "",
      provinceId: school.provinceId ? String(school.provinceId) : "",
      districtId: school.districtId ? String(school.districtId) : "",
      sector: school.sector || "",
      responsibleAuthority: school.responsibleAuthority || "unknown",
      address: school.address || "",
      notes: "",
    });
  }, [school]);

  if (!context || !school || !form) return null;
  const provinces = context.organizations.filter(
    ({ type }) => type === "province"
  );
  const districts = context.organizations.filter(
    ({ type, parentId }) =>
      type === "district" && String(parentId) === form.provinceId
  );

  const update = (key, value) =>
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "provinceId" ? { districtId: "" } : {}),
    }));

  const dismiss = () => {
    sessionStorage.setItem(`school-verification-dismissed-${school.id}`, "1");
    setSchool(null);
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await EducationHierarchy.submitSchoolVerification({
        ...form,
        provinceId: Number(form.provinceId),
        districtId: Number(form.districtId),
      });
      showToast("School details sent for administrator review.", "success");
      setSchool(null);
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-cyan-500/20 bg-theme-bg-secondary shadow-2xl"
      >
        <div className="h-1.5 bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500" />
        <div className="p-5 md:p-7">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
              <Buildings size={24} />
            </span>
            <div>
              <h2 className="text-xl font-black text-theme-text-primary">
                Help us confirm your school
              </h2>
              <p className="mt-1 text-sm leading-6 text-theme-text-secondary">
                Please confirm the school level, location and responsible
                authority. An administrator will review your submission before
                it changes the national directory.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2 text-xs font-bold uppercase tracking-wide text-theme-text-secondary">
              School name
              <input
                required
                value={form.proposedName}
                onChange={(event) => update("proposedName", event.target.value)}
                className="mt-2 w-full rounded-xl border border-theme-sidebar-border bg-theme-bg-primary px-3 py-3 text-sm normal-case text-theme-text-primary"
              />
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-theme-text-secondary">
              School level
              <select
                required
                value={form.schoolLevel}
                onChange={(event) => update("schoolLevel", event.target.value)}
                className="mt-2 w-full rounded-xl border border-theme-sidebar-border bg-theme-bg-primary px-3 py-3 text-sm normal-case text-theme-text-primary"
              >
                <option value="">Select level</option>
                {LEVELS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-theme-text-secondary">
              Sector
              <select
                required
                value={form.sector}
                onChange={(event) => update("sector", event.target.value)}
                className="mt-2 w-full rounded-xl border border-theme-sidebar-border bg-theme-bg-primary px-3 py-3 text-sm normal-case text-theme-text-primary"
              >
                <option value="">Select public or private</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-theme-text-secondary">
              Province
              <select
                required
                value={form.provinceId}
                onChange={(event) => update("provinceId", event.target.value)}
                className="mt-2 w-full rounded-xl border border-theme-sidebar-border bg-theme-bg-primary px-3 py-3 text-sm normal-case text-theme-text-primary"
              >
                <option value="">Select province</option>
                {provinces.map((province) => (
                  <option key={province.id} value={province.id}>
                    {province.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-theme-text-secondary">
              District
              <select
                required
                value={form.districtId}
                onChange={(event) => update("districtId", event.target.value)}
                className="mt-2 w-full rounded-xl border border-theme-sidebar-border bg-theme-bg-primary px-3 py-3 text-sm normal-case text-theme-text-primary"
              >
                <option value="">Select district</option>
                {districts.map((district) => (
                  <option key={district.id} value={district.id}>
                    {district.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-2 text-xs font-bold uppercase tracking-wide text-theme-text-secondary">
              Responsible authority
              <select
                required
                value={form.responsibleAuthority}
                onChange={(event) =>
                  update("responsibleAuthority", event.target.value)
                }
                className="mt-2 w-full rounded-xl border border-theme-sidebar-border bg-theme-bg-primary px-3 py-3 text-sm normal-case text-theme-text-primary"
              >
                {AUTHORITIES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-2 text-xs font-bold uppercase tracking-wide text-theme-text-secondary">
              Address or locality
              <div className="relative mt-2">
                <MapPin
                  className="absolute left-3 top-3 text-theme-text-secondary"
                  size={17}
                />
                <input
                  value={form.address}
                  onChange={(event) => update("address", event.target.value)}
                  placeholder="Village, suburb, road or postal address"
                  className="w-full rounded-xl border border-theme-sidebar-border bg-theme-bg-primary py-3 pl-10 pr-3 text-sm normal-case text-theme-text-primary"
                />
              </div>
            </label>
            <label className="sm:col-span-2 text-xs font-bold uppercase tracking-wide text-theme-text-secondary">
              Additional information
              <textarea
                value={form.notes}
                onChange={(event) => update("notes", event.target.value)}
                rows={3}
                placeholder="Optional correction or context"
                className="mt-2 w-full resize-none rounded-xl border border-theme-sidebar-border bg-theme-bg-primary px-3 py-3 text-sm normal-case text-theme-text-primary"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={dismiss}
              className="rounded-xl border border-theme-sidebar-border px-5 py-3 text-sm font-bold text-theme-text-secondary hover:bg-theme-bg-primary"
            >
              Remind me later
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
            >
              <CheckCircle size={18} />
              {saving ? "Submitting..." : "Submit for review"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
