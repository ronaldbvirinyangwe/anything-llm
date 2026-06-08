// src/components/TeacherDashboard/DashboardStatsCard.jsx
import React from "react";

const DashboardStatsCard = ({ title, value, icon, label }) => (
  <div style={{
    background: "var(--theme-bg-secondary)",
    border: "1px solid var(--theme-sidebar-border)",
    borderRadius: 14,
    padding: "20px 22px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    boxShadow: "0 4px 12px rgba(0,0,0,.1)",
  }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--theme-text-secondary)", textTransform: "uppercase", letterSpacing: ".06em" }}>
        {title}
      </span>
      {icon && (
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: "color-mix(in srgb, var(--theme-button-primary) 12%, transparent)",
          border: "1px solid color-mix(in srgb, var(--theme-button-primary) 25%, transparent)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--theme-button-primary)", fontSize: 15,
        }}>
          {icon}
        </div>
      )}
    </div>

    <p style={{ margin: 0, fontSize: "clamp(1.6rem, 3vw, 2rem)", fontWeight: 800, color: "var(--theme-text-primary)", lineHeight: 1 }}>
      {value ?? 0}
    </p>

    {label && (
      <span style={{
        fontSize: 11, fontWeight: 600,
        color: "var(--theme-text-secondary)",
        padding: "2px 8px", borderRadius: 6,
        background: "var(--theme-bg-container)",
        border: "1px solid var(--theme-sidebar-border)",
        alignSelf: "flex-start",
      }}>
        {label}
      </span>
    )}
  </div>
);

export default DashboardStatsCard;