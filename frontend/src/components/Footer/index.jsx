import System from "@/models/system";
import paths from "@/utils/paths";
import {
  BookOpen,
  DiscordLogo,
  GithubLogo,
  Briefcase,
  Envelope,
  Globe,
  HouseLine,
  Info,
  LinkSimple,
  FacebookLogo,
  LinkedinLogo,
  ChartLine,

} from "@phosphor-icons/react";
import React, { useEffect, useState } from "react";
import SettingsButton from "../SettingsButton";
import { isMobile } from "react-device-detect";
import { Tooltip } from "react-tooltip";
import { Link } from "react-router-dom";

export const MAX_ICONS = 3;
export const ICON_COMPONENTS = {
  ChartLine:ChartLine,
  DiscordLogo: DiscordLogo,
  GithubLogo: GithubLogo,
  Envelope: Envelope,
  LinkSimple: LinkSimple,
  HouseLine: HouseLine,
  Globe: Globe,
  Briefcase: Briefcase,
  Info: Info,
  FacebookLogo: FacebookLogo,
  LinkedinLogo: LinkedinLogo,
};

export default function Footer() {
  const [footerData, setFooterData] = useState(false);
  const student = JSON.parse(localStorage.getItem("chikoroai_user") || "{}");
  const [reportLink, setReportLink] = useState("/reports");

  useEffect(() => {
    async function fetchFooterData() {
      const { footerData } = await System.fetchCustomFooterIcons();
      setFooterData(footerData);
    }
    fetchFooterData();
  }, []);

useEffect(() => {
  async function fetchStudentId() {
    const user = JSON.parse(localStorage.getItem("chikoroai_user") || "{}");
    console.log("[Footer] user from localStorage:", { id: user?.id, role: user?.role });

    if (!user?.id || user?.role !== "student") {
      console.log("[Footer] Skipping report link — user is not a student or has no ID");
      return;
    }

    try {
      const token = localStorage.getItem("chikoroai_authToken");

      if (!token) {
        console.log("[Footer] No auth token found");
        return;
      }

      console.log("[Footer] Fetching /api/system/my-profile...");
      const res = await fetch(`https://api.chikoro-ai.com/api/system/my-profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("[Footer] my-profile response status:", res.status);

      if (res.ok) {
        const data = await res.json();
        console.log("[Footer] my-profile data:", data);
        if (data.success && data.profile?.id) {
          const link = `/reports/${data.profile.id}`;
          console.log("[Footer] Setting report link to:", link, "| students.id =", data.profile.id, "| students.user_id =", data.profile.user_id);
          setReportLink(link);
        } else {
          console.warn("[Footer] my-profile returned success=false or no profile.id:", data);
        }
      } else {
        console.error("[Footer] Failed to fetch student profile, status:", res.status);
      }
    } catch (err) {
      console.error("[Footer] Error fetching student profile:", err);
    }
  }
  fetchStudentId();
}, []);

  // wait for some kind of non-false response from footer data first
  // to prevent pop-in.
  if (footerData === false) return null;

  if (!Array.isArray(footerData) || footerData.length === 0) {
    return (
      <div className="flex justify-center mb-2">
        <div className="flex space-x-4">
          <div className="flex w-fit">
            <Link
              to={paths.facebook()}
              target="_blank"
              rel="noreferrer"
              className="transition-all duration-300 p-2 rounded-full bg-theme-sidebar-footer-icon hover:bg-theme-sidebar-footer-icon-hover"
              aria-label="Find us on Facebook"
              data-tooltip-id="footer-item"
              data-tooltip-content="Open ChikoroAI Facebook page"
            >
              <FacebookLogo
                weight="fill"
                className="h-5 w-5"
                color="var(--theme-sidebar-footer-icon-fill)"
              />
            </Link>
          </div>
           <div className="flex w-fit">
            <Link
  to={reportLink}
  className="transition-all duration-300 p-2 rounded-full bg-theme-sidebar-footer-icon hover:bg-theme-sidebar-footer-icon-hover"
  aria-label="Reports"
  data-tooltip-id="footer-item"
  data-tooltip-content="View performance reports"
>
  <ChartLine
    weight="fill"
    className="h-5 w-5"
    color="var(--theme-sidebar-footer-icon-fill)"
  />
</Link>
          </div>
          <div className="flex w-fit">
            <Link
              to={paths.linkedin()}
              target="_blank"
              rel="noreferrer"
              className="transition-all duration-300 p-2 rounded-full bg-theme-sidebar-footer-icon hover:bg-theme-sidebar-footer-icon-hover"
              aria-label="Join our LinkedIn"
              data-tooltip-id="footer-item"
              data-tooltip-content="Join the ChikoroAI LinkedIn"
            >
              <LinkedinLogo
                weight="fill"
                className="h-5 w-5"
                color="var(--theme-sidebar-footer-icon-fill)"
              />
            </Link>
          </div>
          {!isMobile && <SettingsButton />}
        </div>
        <Tooltip
          id="footer-item"
          place="top"
          delayShow={300}
          className="tooltip !text-xs z-99"
        />
      </div>
    );
  }

  return (
    <div className="flex justify-center mb-2">
      <div className="flex space-x-4">
        {footerData.map((item, index) => (
          <a
            key={index}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="transition-all duration-300 flex w-fit h-fit p-2 p-2 rounded-full bg-theme-sidebar-footer-icon hover:bg-theme-sidebar-footer-icon-hover hover:border-slate-100"
          >
            {React.createElement(
              ICON_COMPONENTS?.[item.icon] ?? ICON_COMPONENTS.Info,
              {
                weight: "fill",
                className: "h-5 w-5",
                color: "var(--theme-sidebar-footer-icon-fill)",
              }
            )}
          </a>
        ))}
        {!isMobile && <SettingsButton />}
      </div>
      <Tooltip
        id="footer-item"
        place="top"
        delayShow={300}
        className="tooltip !text-xs z-99"
      />
    </div>
  );
}
