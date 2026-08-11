import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PasswordModal, { usePasswordModal } from "@/components/Modals/Password";
import { FullScreenLoader } from "@/components/Preloader";
import Home from "./Home";
import DefaultChatContainer from "@/components/DefaultChat";
import TeacherDashboard from "../../components/TeacherDashboard/TeacherDashboard";
import ParentDashboard from "../../components/Parents/ParentDashboard";
import { isMobile } from "react-device-detect";
import Sidebar, { SidebarMobileHeader } from "@/components/Sidebar";
import { userFromStorage } from "@/utils/request";
import EducationHierarchy from "@/models/educationHierarchy";
import StudentToday from "@/pages/StudentToday";

export default function Main() {
  const { loading, requiresAuth, mode } = usePasswordModal();
  const navigate = useNavigate();
  const user = userFromStorage();
  const [checkingEducationAccess, setCheckingEducationAccess] = useState(
    user?.role === "default"
  );

  useEffect(() => {
    if (user?.role !== "default") {
      setCheckingEducationAccess(false);
      return;
    }

    let active = true;
    EducationHierarchy.access()
      .then(({ enabled }) => {
        if (!active) return;
        if (enabled) {
          navigate("/education", { replace: true });
          return;
        }
        setCheckingEducationAccess(false);
      })
      .catch(() => active && setCheckingEducationAccess(false));
    return () => {
      active = false;
    };
  }, [navigate, user?.id, user?.role]);

  if (loading || checkingEducationAccess) return <FullScreenLoader />;
  if (requiresAuth !== false)
    return <>{requiresAuth !== null && <PasswordModal mode={mode} />}</>;

  // If user is a teacher or parent, render their complete dashboard
  if (user?.role === "teacher") {
    return <TeacherDashboard />;
  }

  if (user?.role === "parent") {
    return <ParentDashboard />;
  }

  if (user?.role === "student") {
    return (
      <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex">
        {!isMobile ? <Sidebar /> : <SidebarMobileHeader />}
        <StudentToday />
      </div>
    );
  }

  // Default layout for admin and other users
  return (
    <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex">
      {!isMobile ? <Sidebar /> : <SidebarMobileHeader />}
      {!!user && user?.role !== "admin" ? <DefaultChatContainer /> : <Home />}
    </div>
  );
}
