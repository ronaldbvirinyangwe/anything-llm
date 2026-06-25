import React, { useState } from "react";

// ─── Theme tokens ─────────────────────────────────────────────────────────────
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
};

export default function LinkChildForm({ parentId, onSuccess }) {
  const [linkCode, setLinkCode] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!parentId)                     { setError("Parent ID is missing"); return; }
    if (!linkCode || !linkCode.trim()) { setError("Please enter a link code"); return; }

    setLoading(true);
    setError("");

    try {
      const token   = localStorage.getItem("chikoroai_authToken");
      const payload = { parentId: Number(parentId), linkCode: linkCode.trim().toUpperCase() };

      const res  = await fetch("https://api.chikoro-ai.com/api/system/parent/link-child", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        setLinkCode("");
        onSuccess?.(data.link);
      } else {
        setError(data.error || "Failed to link child");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.card}>
      <p style={s.title}>🔗 Link a New Child</p>

      <form onSubmit={handleSubmit} style={s.form}>
        {/* Label */}
        <label style={s.label}>Enter Link Code</label>

        {/* Input */}
        <input
          type="text"
          value={linkCode}
          onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
          onFocus={(e)  => (e.currentTarget.style.borderColor = T.buttonPrimary)}
          onBlur={(e)   => (e.currentTarget.style.borderColor = T.sidebarBorder)}
          placeholder="e.g. ABC12345"
          maxLength={8}
          required
          style={s.input}
        />

        <p style={s.hint}>
          Ask your child's teacher or the student for their link code.
        </p>

        {/* Error */}
        {error && (
          <div style={s.errorBox}>
            <span style={s.errorIcon}>⚠</span>
            <span style={s.errorText}>{error}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          style={{ ...s.submitBtn, ...(loading ? s.submitBtnDisabled : {}) }}
        >
          {loading ? (
            <span style={s.spinnerRow}>
              <span style={s.spinnerDot} /> Linking…
            </span>
          ) : (
            "Link Child"
          )}
        </button>
      </form>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  card: {
    backgroundColor: T.bgSecondary,
    border:          `1px solid ${T.sidebarBorder}`,
    borderRadius:    16,
    padding:         24,
  },

  title: {
    fontSize:    16,
    fontWeight:  700,
    color:       T.textPrimary,
    margin:      "0 0 20px",
  },

  form: {
    display:       "flex",
    flexDirection: "column",
    gap:           0,
  },

  label: {
    fontSize:      11,
    fontWeight:    700,
    color:         T.textSecondary,
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    marginBottom:  8,
    display:       "block",
  },

  input: {
    width:           "100%",
    padding:         "10px 14px",
    backgroundColor: T.bgContainer,
    border:          `1px solid ${T.sidebarBorder}`,
    borderRadius:    10,
    color:           T.textPrimary,
    fontSize:        15,
    fontWeight:      600,
    letterSpacing:   "0.1em",
    outline:         "none",
    boxSizing:       "border-box",
    transition:      "border-color 0.15s",
    marginBottom:    8,
  },

  hint: {
    fontSize:     12,
    color:        T.textSecondary,
    margin:       "0 0 16px",
    lineHeight:   1.5,
  },

  errorBox: {
    display:         "flex",
    alignItems:      "center",
    gap:             8,
    backgroundColor: "rgba(220,38,38,0.08)",
    border:          "1px solid rgba(220,38,38,0.25)",
    borderRadius:    10,
    padding:         "10px 14px",
    marginBottom:    16,
  },
  errorIcon: { color: "#dc2626", fontSize: 14 },
  errorText: { color: "#dc2626", fontSize: 13 },

  submitBtn: {
    width:           "100%",
    padding:         "12px 0",
    backgroundColor: T.buttonPrimary,
    border:          "none",
    borderRadius:    10,
    color:           "#fff",
    fontWeight:      700,
    fontSize:        14,
    cursor:          "pointer",
    transition:      "opacity 0.15s",
  },
  submitBtnDisabled: {
    opacity: 0.5,
    cursor:  "not-allowed",
  },

  spinnerRow: {
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    gap:            8,
  },
  spinnerDot: {
    width:          10,
    height:         10,
    borderRadius:   "50%",
    border:         "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "#fff",
    display:        "inline-block",
    animation:      "spin 0.7s linear infinite",
  },
};

// Inject spinner keyframes once
if (typeof document !== "undefined" && !document.getElementById("link-form-spin")) {
  const style = document.createElement("style");
  style.id = "link-form-spin";
  style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
}