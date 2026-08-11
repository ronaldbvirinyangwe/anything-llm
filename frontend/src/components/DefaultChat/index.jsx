import React, { useEffect, useState } from "react";
import paths from "@/utils/paths";
import { isMobile } from "react-device-detect";
import Appearance from "@/models/appearance";
import useLogo from "@/hooks/useLogo";
import Workspace from "@/models/workspace";
import { NavLink, useNavigate } from "react-router-dom";
import { LAST_VISITED_WORKSPACE } from "@/utils/constants";
import { safeJsonParse } from "@/utils/request";

export default function DefaultChatContainer() {
  const { logo } = useLogo();
  const navigate = useNavigate();
  const [lastVisitedWorkspace, setLastVisitedWorkspace] = useState(null);
  const [{ workspaces, loading }, setWorkspaces] = useState({
    workspaces: [],
    loading: true,
  });

  useEffect(() => {
    async function fetchWorkspaces() {
      const availableWorkspaces = await Workspace.all();
      const serializedLastVisitedWorkspace = localStorage.getItem(
        LAST_VISITED_WORKSPACE
      );
      if (!serializedLastVisitedWorkspace)
        return setWorkspaces({
          workspaces: availableWorkspaces,
          loading: false,
        });

      try {
        const lastVisitedWorkspace = safeJsonParse(
          serializedLastVisitedWorkspace,
          null
        );
        if (lastVisitedWorkspace == null) throw new Error("Non-parseable!");
        const isValid = availableWorkspaces.some(
          (ws) => ws.slug === lastVisitedWorkspace?.slug
        );
        if (!isValid) throw new Error("Invalid value!");
        setLastVisitedWorkspace(lastVisitedWorkspace);
      } catch {
        localStorage.removeItem(LAST_VISITED_WORKSPACE);
      } finally {
        setWorkspaces({ workspaces: availableWorkspaces, loading: false });
      }
    }
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    if (loading || workspaces.length === 0) return;
    const workspace = lastVisitedWorkspace || workspaces[0];
    navigate(paths.workspace.chat(workspace.slug), { replace: true });
  }, [lastVisitedWorkspace, loading, navigate, workspaces]);

  if (loading || workspaces.length > 0) {
    return (
      <Layout>
        <div className="w-full h-full flex flex-col items-center justify-center overflow-y-auto no-scroll">
          {/* Logo skeleton */}
          <div className="w-[140px] h-[140px] mb-5 rounded-lg bg-theme-bg-primary animate-pulse" />
          {/* Title skeleton */}
          <div className="w-48 h-6 mb-4 rounded bg-theme-bg-primary animate-pulse" />
          {/* Paragraph skeleton */}
          <div className="w-80 h-4 mb-2 rounded bg-theme-bg-primary animate-pulse" />
          <div className="w-64 h-4 rounded bg-theme-bg-primary animate-pulse" />
          {/* Button skeleton */}
          <div className="mt-[29px] w-40 h-[34px] rounded-lg bg-theme-bg-primary animate-pulse" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="w-full h-full flex flex-col items-center justify-center overflow-y-auto no-scroll">
        <img
          src={logo}
          alt="Custom Logo"
          className=" w-[200px] h-fit mb-5 rounded-lg"
        />
        <h1 className="text-theme-home-text text-2xl font-semibold">
          Create your learning space
        </h1>
        <p className="mt-2 max-w-md text-theme-home-text-secondary text-base text-center">
          Enrol to choose your curriculum and start learning with Chikoro AI.
        </p>
        <NavLink
          to={paths.enrol()}
          className="mt-6 flex h-10 w-fit items-center justify-center rounded-lg bg-primary-button px-4 text-sm font-medium text-dark-text transition-colors hover:bg-primary-button/80"
        >
          Enrol now
        </NavLink>
      </div>
    </Layout>
  );
}

const Layout = ({ children }) => {
  const { showScrollbar } = Appearance.getSettings();
  return (
    <div
      style={{ height: isMobile ? "100%" : "calc(100% - 32px)" }}
      className={`relative md:ml-[2px] md:mr-[16px] md:my-[16px] md:rounded-[16px] bg-theme-bg-secondary border border-theme-sidebar-border w-full h-full overflow-y-scroll ${showScrollbar ? "show-scrollbar" : "no-scroll"}`}
    >
      {children}
    </div>
  );
};
