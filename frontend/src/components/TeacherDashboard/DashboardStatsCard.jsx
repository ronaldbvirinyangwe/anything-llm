// src/components/TeacherDashboard/DashboardStatsCard.jsx
import React from "react";

const DashboardStatsCard = ({ title, value }) => (
  <div className="stats-card">
    <h4>{title}</h4>
    <p>{value}</p>
  </div>
);

export default DashboardStatsCard;