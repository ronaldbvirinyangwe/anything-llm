import React from "react";
import PasswordModal, { usePasswordModal } from "@/components/Modals/Password";
import { FullScreenLoader } from "@/components/Preloader";
import Home from "./Home";
import DefaultChatContainer from "@/components/DefaultChat";
import TeacherDashboard from "../../components/TeacherDashboard/TeacherDashboard";
import ParentDashboard from "../../components/Parents/ParentDashboard"; 
import { isMobile } from "react-device-detect";
import Sidebar, { SidebarMobileHeader } from "@/components/Sidebar";
import { userFromStorage } from "@/utils/request";

export default function Main() {
  const { loading, requiresAuth, mode } = usePasswordModal();

  if (loading) return <FullScreenLoader />;
  if (requiresAuth !== false)
    return <>{requiresAuth !== null && <PasswordModal mode={mode} />}</>;

  const user = userFromStorage();
  
  // If user is a teacher or parent, render their complete dashboard
  if (user?.role === "teacher") {
    return <TeacherDashboard />;
  }
  
  if (user?.role === "parent") {
    return <ParentDashboard />;
  }

  // Default layout for admin and other users
  return (
    <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex">
      {!isMobile ? <Sidebar /> : <SidebarMobileHeader />}
      {!!user && user?.role !== "admin" ? <DefaultChatContainer /> : <Home />}
    </div>
  );
}