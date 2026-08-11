import React, {
  startTransition,
  useDeferredValue,
  useEffect,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Buildings,
  ChartLineUp,
  CheckCircle,
  ClockCounterClockwise,
  GraduationCap,
  MagnifyingGlass,
  Student,
  WarningCircle,
} from "@phosphor-icons/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import EducationHierarchy, {
  EDUCATION_ROLE_LABELS,
  educationViewerContext,
} from "@/models/educationHierarchy";

const TYPE_LABELS = {
  ministry: "National",
  department: "Ministry department",
  province: "Province",
  district: "District",
  school: "School",
  school_department: "School department",
  class: "Class",
};

const PERFORMANCE_TABLES = {
  ministry: {
    title: "Province performance",
    description: "Compare provinces or select one to view its districts.",
  },
  province: {
    title: "District performance",
    description: "Compare districts or select one to view its schools.",
  },
  district: {
    title: "School performance",
    description: "Compare schools or select one to view its classes.",
  },
  school: {
    title: "Department and class performance",
    description: "Select a department or class to explore its performance.",
  },
  school_department: {
    title: "Class performance",
    description: "Compare classes or select one for detailed performance.",
  },
};

function routeFor(entity) {
  return `/education/${entity.type}/${entity.id}`;
}

function MetricCard({ icon, label, value, detail, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    green: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    red: "bg-rose-500/10 border-rose-500/20 text-rose-400",
  };
  return (
    <div className="rounded-2xl border border-theme-sidebar-border bg-theme-bg-secondary p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-theme-text-secondary">
          {label}
        </span>
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl border ${tones[tone]}`}
        >
          {icon}
        </span>
      </div>
      <div className="text-3xl font-black text-theme-text-primary">{value}</div>
      <div className="mt-2 text-xs text-theme-text-secondary">{detail}</div>
    </div>
  );
}

function EmptyChart({ children }) {
  return (
    <div className="flex h-[260px] items-center justify-center text-sm text-theme-text-secondary">
      {children}
    </div>
  );
}

function dashboardDescription(scopeType, viewer) {
  let description =
    "Curriculum participation and learning performance across this scope.";

  if (scopeType === "school_department") {
    description =
      viewer.role === "hod"
        ? "Department participation, subject performance, and support signals for academic leadership."
        : "Participation and learning performance across this school department.";
  } else if (viewer.role === "headmaster") {
    description =
      "School-wide participation, performance, and learner-support signals for leadership decisions.";
  } else if (viewer.role === "deputy_head") {
    description =
      "School-wide academic performance and participation for day-to-day oversight.";
  } else if (viewer.role === "student_support") {
    description =
      "Learning and participation signals to help prioritize student support.";
  }

  if (viewer.canViewPii === false)
    return `${description} Learner identities remain protected in this view.`;
  if (viewer.capabilities.canViewClass === false)
    return `${description} This view is limited to aggregate signals.`;
  if (viewer.capabilities.canViewClass && scopeType === "school")
    return `${description} Open a department or class for more detail.`;
  if (viewer.capabilities.canViewClass && scopeType === "school_department")
    return `${description} Open a class for more detail.`;
  return description;
}

export default function EducationDashboard() {
  const { scopeType, scopeId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    grade: "",
    subject: "",
  });
  const deferredSubject = useDeferredValue(filters.subject);

  useEffect(() => {
    if (scopeId) return;
    let active = true;
    EducationHierarchy.access()
      .then((access) => {
        if (!active) return;
        const defaultScope =
          access.defaultOrganization ||
          (access.defaultClassId
            ? { id: access.defaultClassId, type: "class" }
            : null);
        if (!access.enabled || !defaultScope) {
          setError("Your account has not been assigned to an education scope.");
          setLoading(false);
          return;
        }
        navigate(routeFor(defaultScope), { replace: true });
      })
      .catch((err) => {
        if (active) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [navigate, scopeId]);

  useEffect(() => {
    if (!scopeId || !scopeType) return;
    let active = true;
    setLoading(true);
    setError("");
    EducationHierarchy.dashboard(scopeType, scopeId, {
      ...filters,
      subject: deferredSubject,
    })
      .then((result) => {
        if (!active) return;
        startTransition(() => setData(result));
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [
    scopeId,
    scopeType,
    filters.from,
    filters.to,
    filters.grade,
    deferredSubject,
  ]);

  const updateFilter = (key, value) =>
    setFilters((current) => ({ ...current, [key]: value }));

  if (loading && !data) {
    return (
      <main className="min-h-screen bg-theme-bg-primary p-5 md:p-8">
        <div className="mx-auto max-w-7xl animate-pulse space-y-5">
          <div className="h-24 rounded-2xl bg-theme-bg-secondary" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-36 rounded-2xl bg-theme-bg-secondary"
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-theme-bg-primary p-6">
        <div className="max-w-md rounded-2xl border border-rose-500/20 bg-theme-bg-secondary p-8 text-center">
          <WarningCircle size={36} className="mx-auto mb-3 text-rose-400" />
          <h1 className="text-xl font-bold text-theme-text-primary">
            Dashboard unavailable
          </h1>
          <p className="mt-2 text-sm text-theme-text-secondary">{error}</p>
        </div>
      </main>
    );
  }

  const {
    scope,
    parent,
    metrics,
    subjects = [],
    trend = [],
    children = [],
  } = data;
  const viewer = educationViewerContext(data, scope.id);
  const roleLabel = EDUCATION_ROLE_LABELS[viewer.role] || "Education viewer";
  let performanceTable = PERFORMANCE_TABLES[scope.type] || {
    title: "Organization performance",
    description: "Select a row to drill into the next level.",
  };
  if (
    scope.type === "school" &&
    children.length &&
    children.every((child) => child.type === "school_department")
  ) {
    performanceTable = {
      title: "Department performance",
      description: "Compare departments or select one to view its classes.",
    };
  }
  return (
    <main className="min-h-screen bg-theme-bg-primary px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="overflow-hidden rounded-3xl border border-theme-sidebar-border bg-theme-bg-secondary">
          <div className="h-1.5 bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500" />
          <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between md:p-7">
            <div>
              {parent && (
                <button
                  onClick={() => navigate(routeFor(parent))}
                  className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-theme-text-secondary hover:text-theme-text-primary"
                >
                  <ArrowLeft size={15} /> {parent.name}
                </button>
              )}
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-cyan-400">
                  <Buildings size={16} />
                  {TYPE_LABELS[scope.type] || scope.type}
                </span>
                <span className="rounded-full border border-theme-sidebar-border bg-theme-bg-primary px-2.5 py-1 text-[11px] font-bold text-theme-text-secondary">
                  {roleLabel}
                </span>
              </div>
              <h1 className="text-2xl font-black text-theme-text-primary md:text-4xl">
                {scope.name}
              </h1>
              <p className="mt-2 text-sm text-theme-text-secondary">
                {dashboardDescription(scope.type, viewer)}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-theme-sidebar-border bg-theme-bg-primary px-3 py-2 text-xs text-theme-text-secondary">
              <ClockCounterClockwise size={16} /> Updated{" "}
              {new Date(data.dataFreshness).toLocaleString()}
            </div>
          </div>
        </header>

        <section className="grid gap-3 rounded-2xl border border-theme-sidebar-border bg-theme-bg-secondary p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-bold uppercase tracking-wide text-theme-text-secondary">
            From
            <input
              type="date"
              value={filters.from}
              onChange={(event) => updateFilter("from", event.target.value)}
              className="mt-2 w-full rounded-lg border border-theme-sidebar-border bg-theme-bg-primary px-3 py-2 text-sm text-theme-text-primary"
            />
          </label>
          <label className="text-xs font-bold uppercase tracking-wide text-theme-text-secondary">
            To
            <input
              type="date"
              value={filters.to}
              onChange={(event) => updateFilter("to", event.target.value)}
              className="mt-2 w-full rounded-lg border border-theme-sidebar-border bg-theme-bg-primary px-3 py-2 text-sm text-theme-text-primary"
            />
          </label>
          <label className="text-xs font-bold uppercase tracking-wide text-theme-text-secondary">
            Grade
            <input
              value={filters.grade}
              onChange={(event) => updateFilter("grade", event.target.value)}
              placeholder="e.g. Form 4"
              className="mt-2 w-full rounded-lg border border-theme-sidebar-border bg-theme-bg-primary px-3 py-2 text-sm text-theme-text-primary"
            />
          </label>
          <label className="text-xs font-bold uppercase tracking-wide text-theme-text-secondary">
            Subject
            <div className="relative mt-2">
              <MagnifyingGlass
                size={16}
                className="absolute left-3 top-2.5 text-theme-text-secondary"
              />
              <input
                value={filters.subject}
                onChange={(event) =>
                  updateFilter("subject", event.target.value)
                }
                placeholder="All subjects"
                className="w-full rounded-lg border border-theme-sidebar-border bg-theme-bg-primary py-2 pl-9 pr-3 text-sm text-theme-text-primary"
              />
            </div>
          </label>
        </section>

        {error && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            {error}
          </div>
        )}

        <section
          className={`grid grid-cols-2 gap-3 lg:grid-cols-4 ${loading ? "opacity-60" : ""}`}
        >
          <MetricCard
            icon={<Student size={19} />}
            label="Registered learners"
            value={metrics.registeredLearners.toLocaleString()}
            detail={`${metrics.activeLearners.toLocaleString()} active in the last 30 days`}
          />
          <MetricCard
            icon={<CheckCircle size={19} />}
            label="Participation"
            value={`${metrics.assessmentParticipation}%`}
            detail={`${metrics.participatingLearners} learners submitted assessments`}
            tone="green"
          />
          <MetricCard
            icon={<ChartLineUp size={19} />}
            label="Average score"
            value={
              metrics.averageScore == null
                ? "No data"
                : `${metrics.averageScore}%`
            }
            detail={`${metrics.assessmentAttempts.toLocaleString()} assessment attempts`}
            tone="amber"
          />
          <MetricCard
            icon={<WarningCircle size={19} />}
            label="Needs support"
            value={metrics.learnersNeedingSupport.toLocaleString()}
            detail="Learners averaging below 50%"
            tone="red"
          />
        </section>

        <section className="grid gap-5 lg:grid-cols-5">
          <div className="rounded-2xl border border-theme-sidebar-border bg-theme-bg-secondary p-5 lg:col-span-3">
            <h2 className="font-bold text-theme-text-primary">
              Performance trend
            </h2>
            <p className="mb-5 mt-1 text-xs text-theme-text-secondary">
              Average assessment score by month
            </p>
            {trend.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trend}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(148,163,184,.15)"
                  />
                  <XAxis dataKey="period" stroke="#94a3b8" fontSize={11} />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "#111827",
                      border: "1px solid #334155",
                      borderRadius: 10,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="averageScore"
                    stroke="#38bdf8"
                    strokeWidth={3}
                    dot={{ fill: "#38bdf8" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart>
                No assessment trend is available for this selection.
              </EmptyChart>
            )}
          </div>
          <div className="rounded-2xl border border-theme-sidebar-border bg-theme-bg-secondary p-5 lg:col-span-2">
            <h2 className="font-bold text-theme-text-primary">
              Subject performance
            </h2>
            <p className="mb-5 mt-1 text-xs text-theme-text-secondary">
              Average score in the most active subjects
            </p>
            {subjects.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={subjects.slice(0, 7)} layout="vertical">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(148,163,184,.15)"
                  />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    stroke="#94a3b8"
                    fontSize={11}
                  />
                  <YAxis
                    dataKey="subject"
                    type="category"
                    width={85}
                    stroke="#94a3b8"
                    fontSize={10}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#111827",
                      border: "1px solid #334155",
                      borderRadius: 10,
                    }}
                  />
                  <Bar
                    dataKey="averageScore"
                    fill="#8b5cf6"
                    radius={[0, 6, 6, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart>No subject results are available.</EmptyChart>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-theme-sidebar-border bg-theme-bg-secondary">
          <div className="flex items-center justify-between border-b border-theme-sidebar-border p-5">
            <div>
              <h2 className="font-bold text-theme-text-primary">
                {performanceTable.title}
              </h2>
              <p className="mt-1 text-xs text-theme-text-secondary">
                {performanceTable.description}
              </p>
            </div>
            <GraduationCap size={24} className="text-cyan-400" />
          </div>
          {children.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-theme-bg-primary text-xs uppercase tracking-wide text-theme-text-secondary">
                  <tr>
                    <th className="px-5 py-3">Name</th>
                    <th className="px-4 py-3">Learners</th>
                    <th className="px-4 py-3">Active</th>
                    <th className="px-4 py-3">Participation</th>
                    <th className="px-4 py-3">Average</th>
                    <th className="px-4 py-3">Needs support</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-sidebar-border">
                  {children.map((child) => (
                    <tr
                      key={`${child.type}-${child.id}`}
                      onClick={() => navigate(routeFor(child))}
                      className="cursor-pointer text-theme-text-primary transition hover:bg-theme-bg-primary"
                    >
                      <td className="px-5 py-4">
                        <div className="font-bold">{child.name}</div>
                        <div className="mt-1 text-xs uppercase text-theme-text-secondary">
                          {TYPE_LABELS[child.type] || child.type}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {child.metrics.registeredLearners}
                      </td>
                      <td className="px-4 py-4">
                        {child.metrics.activeLearners}
                      </td>
                      <td className="px-4 py-4">
                        {child.metrics.assessmentParticipation}%
                      </td>
                      <td className="px-4 py-4">
                        {child.metrics.averageScore == null
                          ? "-"
                          : `${child.metrics.averageScore}%`}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={
                            child.metrics.learnersNeedingSupport
                              ? "text-rose-400"
                              : "text-emerald-400"
                          }
                        >
                          {child.metrics.learnersNeedingSupport}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-10 text-center text-sm text-theme-text-secondary">
              No child organizations or classes are assigned to this scope.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
