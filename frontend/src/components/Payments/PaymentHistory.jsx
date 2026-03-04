import React, { useState, useEffect, useMemo } from "react";
import {
  MagnifyingGlass,
  ChartBar,
  ListBullets,
} from "@phosphor-icons/react";
import showToast from "@/utils/toast";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── helpers ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-theme-action-menu-bg border border-theme-sidebar-border rounded-[12px] p-5 flex flex-col gap-1">
      <span className="text-theme-text-secondary text-xs uppercase tracking-wide">
        {label}
      </span>
      <span className="text-2xl font-bold text-theme-text-primary">{value}</span>
      {sub && (
        <span className="text-theme-text-secondary text-xs">{sub}</span>
      )}
    </div>
  );
}

function buildMonthlyData(payments) {
  const map = {};
  payments.forEach((p) => {
    const d = new Date(p.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
    if (!map[key]) map[key] = { key, label, total: 0 };
    map[key].total += parseFloat(p.amount) || 0;
  });
  return Object.values(map)
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(-12);
}

function methodColor(method) {
  const m = (method || "").toLowerCase();
  if (m.includes("cash")) return "bg-green-500/20 text-green-400";
  if (m.includes("ecocash") || m.includes("eco"))
    return "bg-purple-500/20 text-purple-400";
  if (m.includes("bank") || m.includes("transfer"))
    return "bg-blue-500/20 text-blue-400";
  return "bg-yellow-500/20 text-yellow-400";
}

// ─── main component ──────────────────────────────────────────────────────────

export default function PaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchPaymentHistory();
  }, []);

  const fetchPaymentHistory = async () => {
    try {
      const token = localStorage.getItem("chikoroai_authToken");
      const res = await axios.get(
        "https://api.chikoro-ai.com/api/payments/history",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setPayments(res.data.payments || []);
        setFilteredPayments(res.data.payments || []);
      }
    } catch (error) {
      showToast("Error loading payment history", "error");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query === "") {
      setFilteredPayments(payments);
    } else {
      const q = query.toLowerCase();
      setFilteredPayments(
        payments.filter(
          (p) =>
            p.student_name?.toLowerCase().includes(q) ||
            p.payment_method?.toLowerCase().includes(q) ||
            p.notes?.toLowerCase().includes(q)
        )
      );
    }
  };

  // ── derived analytics ──────────────────────────────────────────────────────

  const stats = useMemo(() => {
    if (!payments.length)
      return { total: 0, count: 0, topMethod: "—", thisMonth: 0 };

    const total = payments.reduce(
      (sum, p) => sum + (parseFloat(p.amount) || 0),
      0
    );

    const now = new Date();
    const thisMonth = payments
      .filter((p) => {
        const d = new Date(p.created_at);
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      })
      .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    const methodCounts = {};
    payments.forEach((p) => {
      const m = p.payment_method || "Unknown";
      methodCounts[m] = (methodCounts[m] || 0) + 1;
    });
    const topMethod = Object.entries(methodCounts).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0] ?? "—";

    return { total, count: payments.length, topMethod, thisMonth };
  }, [payments]);

  const monthlyData = useMemo(() => buildMonthlyData(payments), [payments]);

  const methodBreakdown = useMemo(() => {
    const map = {};
    payments.forEach((p) => {
      const m = p.payment_method || "Unknown";
      if (!map[m]) map[m] = { method: m, count: 0, total: 0 };
      map[m].count += 1;
      map[m].total += parseFloat(p.amount) || 0;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [payments]);

  // ── loading state ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-theme-text-secondary">
          Loading payment history...
        </div>
      </div>
    );
  }

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="w-screen h-screen overflow-hidden bg-theme-bg-secondary flex">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto">
          {/* header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-theme-text-primary mb-2">
              Payment History
            </h1>
            <p className="text-theme-text-secondary text-sm">
              View and analyse all recorded cash payments
            </p>
          </div>

          {/* tabs */}
          <div className="flex gap-1 mb-6 bg-theme-action-menu-bg border border-theme-sidebar-border rounded-[10px] p-1 w-fit">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-2 px-4 py-2 rounded-[8px] text-sm font-medium transition-colors ${
                activeTab === "overview"
                  ? "bg-blue-600 text-white"
                  : "text-theme-text-secondary hover:text-theme-text-primary"
              }`}
            >
              <ChartBar className="h-4 w-4" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 px-4 py-2 rounded-[8px] text-sm font-medium transition-colors ${
                activeTab === "history"
                  ? "bg-blue-600 text-white"
                  : "text-theme-text-secondary hover:text-theme-text-primary"
              }`}
            >
              <ListBullets className="h-4 w-4" />
              History
            </button>
          </div>

          {/* ── OVERVIEW TAB ── */}
          {activeTab === "overview" && (
            <div className="flex flex-col gap-6">
              {/* stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Total Collected"
                  value={`$${stats.total.toFixed(2)}`}
                  sub="All time"
                />
                <StatCard
                  label="This Month"
                  value={`$${stats.thisMonth.toFixed(2)}`}
                  sub={new Date().toLocaleString("default", {
                    month: "long",
                    year: "numeric",
                  })}
                />
                <StatCard
                  label="Total Payments"
                  value={stats.count}
                  sub="Transactions recorded"
                />
                <StatCard
                  label="Top Method"
                  value={stats.topMethod}
                  sub="Most used"
                />
              </div>

              {/* monthly bar chart */}
              <div className="bg-theme-bg-sidebar rounded-[16px] border-2 border-theme-sidebar-border p-6">
                <h2 className="text-theme-text-primary font-semibold mb-4">
                  Monthly Revenue
                </h2>
                {monthlyData.length === 0 ? (
                  <p className="text-theme-text-secondary text-sm text-center py-8">
                    No data yet
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={monthlyData}
                      margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.06)"
                      />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: "var(--theme-text-secondary)", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "var(--theme-text-secondary)", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `$${v}`}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--theme-bg-sidebar)",
                          border: "1px solid var(--theme-sidebar-border)",
                          borderRadius: 8,
                          color: "var(--theme-text-primary)",
                        }}
                        formatter={(value) => [`$${value.toFixed(2)}`, "Revenue"]}
                      />
                      <Bar
                        dataKey="total"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* payment method breakdown */}
              <div className="bg-theme-bg-sidebar rounded-[16px] border-2 border-theme-sidebar-border p-6">
                <h2 className="text-theme-text-primary font-semibold mb-4">
                  By Payment Method
                </h2>
                {methodBreakdown.length === 0 ? (
                  <p className="text-theme-text-secondary text-sm">No data yet</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {methodBreakdown.map((m) => {
                      const pct = stats.total
                        ? Math.round((m.total / stats.total) * 100)
                        : 0;
                      return (
                        <div key={m.method}>
                          <div className="flex justify-between items-center mb-1">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${methodColor(m.method)}`}
                            >
                              {m.method}
                            </span>
                            <span className="text-theme-text-primary text-sm font-medium">
                              ${m.total.toFixed(2)}{" "}
                              <span className="text-theme-text-secondary font-normal">
                                ({m.count} payment{m.count !== 1 ? "s" : ""})
                              </span>
                            </span>
                          </div>
                          <div className="w-full h-2 bg-theme-action-menu-bg rounded-full overflow-hidden">
                            <div
                              className="h-2 bg-blue-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── HISTORY TAB ── */}
          {activeTab === "history" && (
            <div className="bg-theme-bg-sidebar rounded-[16px] border-2 border-theme-sidebar-border p-6">
              <div className="mb-4">
                <div className="relative">
                  <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-text-secondary h-5 w-5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search payments..."
                    className="w-full pl-10 pr-4 py-3 bg-theme-action-menu-bg border border-theme-sidebar-border rounded-lg text-theme-text-primary placeholder-theme-text-secondary focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-theme-sidebar-border">
                      <th className="text-left py-3 px-4 text-theme-text-secondary text-sm font-medium">
                        Date
                      </th>
                      <th className="text-left py-3 px-4 text-theme-text-secondary text-sm font-medium">
                        Student
                      </th>
                      <th className="text-left py-3 px-4 text-theme-text-secondary text-sm font-medium">
                        Amount
                      </th>
                      <th className="text-left py-3 px-4 text-theme-text-secondary text-sm font-medium">
                        Method
                      </th>
                      <th className="text-left py-3 px-4 text-theme-text-secondary text-sm font-medium">
                        Recorded By
                      </th>
                      <th className="text-left py-3 px-4 text-theme-text-secondary text-sm font-medium">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.length === 0 ? (
                      <tr>
                        <td
                          colSpan="6"
                          className="text-center py-8 text-theme-text-secondary"
                        >
                          No payments found
                        </td>
                      </tr>
                    ) : (
                      filteredPayments.map((payment) => (
                        <tr
                          key={payment.id}
                          className="border-b border-theme-sidebar-border hover:bg-theme-action-menu-item-hover transition-colors"
                        >
                          <td className="py-3 px-4 text-theme-text-primary text-sm">
                            {new Date(payment.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-theme-text-primary">
                            {payment.student_name}
                          </td>
                          <td className="py-3 px-4 text-theme-text-primary font-medium">
                            ${parseFloat(payment.amount).toFixed(2)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded text-xs ${methodColor(payment.payment_method)}`}
                            >
                              {payment.payment_method}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-theme-text-primary text-sm">
                            {payment.recorded_by_name}
                          </td>
                          <td className="py-3 px-4 text-theme-text-secondary text-sm">
                            {payment.notes || "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
