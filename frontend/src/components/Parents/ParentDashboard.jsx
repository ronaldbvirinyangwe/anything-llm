import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useUser from "@/hooks/useUser";
import LinkChildForm from "./LinkParent";
import { API_BASE } from "@/utils/constants";

// ─── Theme tokens (matches QuizGenerator) ────────────────────────────────────
const T = {
  bgPrimary:        "#0f1117",
  bgSecondary:      "#1a1d27",
  bgContainer:      "#1e2130",
  bgSidebar:        "#161923",
  sidebarBorder:    "#2a2d3e",
  textPrimary:      "#e8eaf0",
  textSecondary:    "#8b90a7",
  buttonPrimary:    "#46c8ff",
  buttonPrimaryA:   "rgba(70,200,255,0.12)",
  buttonPrimaryA25: "rgba(70,200,255,0.25)",
  error:            "#dc2626",
  success:          "#16a34a",
};

export default function ParentDashboard() {
  const navigate = useNavigate();
  const { user } = useUser();

  const [children,       setChildren]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState("");
  const [parentProfile,  setParentProfile]  = useState(null);
  const [showLinkForm,   setShowLinkForm]   = useState(false);

  const accessToken = localStorage.getItem("chikoroai_authToken");
  useEffect(() => {
    if (!accessToken || !user?.id) { navigate("/login"); return; }

    const fetchParentProfile = async () => {
      try {
        const res  = await fetch(`${API_BASE}/system/profile/${user.id}`, {
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        });
        const data = await res.json();
        if (data.success && data.profile) {
          setParentProfile(data.profile);
          fetchChildren();
        } else {
          setError("Could not load parent profile");
          setLoading(false);
        }
      } catch {
        setError("Failed to load parent profile");
        setLoading(false);
      }
    };

    fetchParentProfile();
  }, [accessToken, user]);

  const fetchChildren = async () => {
    try {
      const res  = await fetch(`${API_BASE}/system/parent/my-children`, {
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.success) setChildren(data.children);
      else setError(data.error || "Could not fetch children.");
    } catch {
      setError("Failed to fetch children records.");
    } finally {
      setLoading(false);
    }
  };

  const handleLinkSuccess = (newLink) => {
    setChildren(prev => [...prev, {
      id: newLink.student.id,
      name: newLink.student.name,
      grade: newLink.student.grade,
      linkId: newLink.id,
    }]);
    setShowLinkForm(false);
  };

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={s.centerPage}>
      <div style={s.spinner} />
      <p style={s.loadingText}>Loading dashboard…</p>
    </div>
  );

  // ─── Error ─────────────────────────────────────────────────────────────────
  if (error) return (
    <div style={s.centerPage}>
      <div style={s.errorCard}>
        <span style={{ fontSize: 36 }}>⚠️</span>
        <p style={s.errorText}>{error}</p>
        <button style={s.retryBtn} onClick={() => navigate("/login")}>
          Back to Login
        </button>
      </div>
    </div>
  );

  // ─── Main ──────────────────────────────────────────────────────────────────
  return (
    <div style={s.root}>
      <main style={s.main}>

        {/* Hero banner */}
        <div style={s.heroBanner}>
          <h1 style={s.heroTitle}>Family progress</h1>
          <p style={s.heroSub}>
            Track your children's learning, results, and recent activity.
          </p>
        </div>

        {/* Link child button */}
        <button
          style={{ ...s.linkBtn, ...(showLinkForm ? s.linkBtnCancel : {}) }}
          onClick={() => setShowLinkForm(!showLinkForm)}
        >
          {showLinkForm ? "✕ Cancel" : "+ Link New Child"}
        </button>

        {/* Link form */}
        {showLinkForm && parentProfile && (
          <div style={s.formCard}>
            <LinkChildForm parentId={parentProfile.user_id} onSuccess={handleLinkSuccess} />
          </div>
        )}

        {/* Section label */}
        <p style={s.sectionLabel}>My Children</p>

        {/* Empty state */}
        {children.length === 0 ? (
          <div style={s.emptyState}>
            <div style={s.emptyIcon}>👥</div>
            <p style={s.emptyTitle}>No linked children yet</p>
            <p style={s.emptySubtitle}>
              Tap "Link New Child" above to connect your first child's account.
            </p>
          </div>
        ) : (
          <div style={s.grid}>
            {children.map((child) => (
              <div key={child.id} style={s.childCard}>
                {/* Card header */}
                <div style={s.childHeader}>
                  <div style={s.childIconWrap}>
                    <span style={s.childIconText}>
                      {child.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p style={s.childName}>{child.name}</p>
                    <span style={s.gradeBadge}>{child.grade}</span>
                  </div>
                </div>

                {/* Divider */}
                <div style={s.divider} />

                {/* Action footer */}
                <div style={s.cardFooter}>
                  <Link to={`/parent/reports/${child.id}`} style={s.reportBtn}>
                    View Report →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  root: {
    minHeight: "100vh",
    backgroundColor: T.bgPrimary,
    fontFamily: "'Inter', system-ui, sans-serif",
    color: T.textPrimary,
  },

  // Center states
  centerPage: {
    minHeight: "100vh",
    backgroundColor: T.bgPrimary,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  spinner: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    border: `3px solid ${T.sidebarBorder}`,
    borderTopColor: T.buttonPrimary,
    animation: "spin 0.8s linear infinite",
  },
  loadingText:  { color: T.textSecondary, fontSize: 14 },
  errorCard:    { backgroundColor: T.bgSecondary, border: `1px solid ${T.sidebarBorder}`, borderRadius: 16, padding: 40, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 },
  errorText:    { color: T.error, fontSize: 15 },
  retryBtn:     { backgroundColor: T.buttonPrimary, color: "#fff", border: "none", borderRadius: 10, padding: "10px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer" },

  // Main content
  main: { maxWidth: 720, margin: "0 auto", padding: "24px 16px 60px" },

  // Hero
  heroBanner: {
    backgroundColor: T.bgSecondary,
    border: `1px solid ${T.sidebarBorder}`,
    borderRadius: 16,
    padding: "28px 32px",
    textAlign: "center",
    marginBottom: 20,
  },
  heroTitle: { fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 8px" },
  heroSub:   { fontSize: 13, color: "#e0e7ff", margin: 0, lineHeight: 1.6 },

  // Link button
  linkBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    padding: "13px 0",
    backgroundColor: T.buttonPrimary,
    border: "none",
    borderRadius: 12,
    color: "#fff",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
    marginBottom: 16,
  },
  linkBtnCancel: {
    backgroundColor: T.bgContainer,
    border: `1px solid ${T.sidebarBorder}`,
    color: T.textSecondary,
  },

  // Form card
  formCard: {
    backgroundColor: T.bgSecondary,
    border: `1px solid ${T.sidebarBorder}`,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: T.textSecondary,
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    margin: "0 0 12px",
  },

  // Empty state
  emptyState: {
    backgroundColor: T.bgSecondary,
    border: `1px solid ${T.sidebarBorder}`,
    borderRadius: 16,
    padding: 40,
    textAlign: "center",
  },
  emptyIcon:     { fontSize: 36, marginBottom: 12 },
  emptyTitle:    { fontSize: 16, fontWeight: 700, color: T.textPrimary, margin: "0 0 6px" },
  emptySubtitle: { fontSize: 13, color: T.textSecondary, margin: 0, lineHeight: 1.6 },

  // Grid
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: 12,
  },

  // Child card
  childCard: {
    backgroundColor: T.bgSecondary,
    border: `1px solid ${T.sidebarBorder}`,
    borderRadius: 16,
    overflow: "hidden",
  },
  childHeader: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: 16,
  },
  childIconWrap: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    backgroundColor: T.buttonPrimaryA,
    border: `1px solid ${T.buttonPrimaryA25}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  childIconText: { fontSize: 20, fontWeight: 800, color: T.buttonPrimary },
  childName:     { fontSize: 16, fontWeight: 700, color: T.textPrimary, margin: "0 0 6px" },
  gradeBadge: {
    display: "inline-block",
    padding: "2px 10px",
    borderRadius: 20,
    backgroundColor: T.bgContainer,
    border: `1px solid ${T.sidebarBorder}`,
    fontSize: 11,
    fontWeight: 700,
    color: T.textSecondary,
  },

  divider:    { height: 1, backgroundColor: T.sidebarBorder },
  cardFooter: { padding: "12px 16px", backgroundColor: T.bgSidebar },
  reportBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "9px 18px",
    backgroundColor: T.buttonPrimary,
    borderRadius: 10,
    color: "#fff",
    fontWeight: 700,
    fontSize: 13,
    textDecoration: "none",
    width: "100%",
    justifyContent: "center",
    boxSizing: "border-box",
  },
};

// Inject spinner keyframes once
if (typeof document !== "undefined" && !document.getElementById("parent-dash-spin")) {
  const style = document.createElement("style");
  style.id = "parent-dash-spin";
  style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
}
