import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { FullScreenLoader } from "../Preloader";
import validateSessionTokenForUser from "@/utils/session";
import paths from "@/utils/paths";
import { AUTH_TIMESTAMP, AUTH_TOKEN, AUTH_USER } from "@/utils/constants";
import { userFromStorage } from "@/utils/request";
import System from "@/models/system";
import UserMenu from "../UserMenu";
import { KeyboardShortcutWrapper } from "@/utils/keyboardShortcuts";
import EducationHierarchy from "@/models/educationHierarchy";
import { hasOfflineData } from "@/utils/offline";

const OFFLINE_SESSION_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

async function canUseOfflineSession(userId) {
  const lastValidatedAt = Number(localStorage.getItem(AUTH_TIMESTAMP));
  const recentlyValidated =
    lastValidatedAt > 0 &&
    Date.now() - lastValidatedAt <= OFFLINE_SESSION_MAX_AGE;
  return recentlyValidated && (await hasOfflineData(userId));
}

// Used only for Multi-user mode only as we permission specific pages based on auth role.
// When in single user mode we just bypass any authchecks.
function useIsAuthenticated() {
  const [isAuthd, setIsAuthed] = useState(null);
  const [shouldRedirectToOnboarding, setShouldRedirectToOnboarding] =
    useState(false);
  const [multiUserMode, setMultiUserMode] = useState(false);

  useEffect(() => {
    const validateSession = async () => {
      const systemKeys = await System.keys();
      if (!systemKeys) {
        const localUser = userFromStorage();
        const localAuthToken = localStorage.getItem(AUTH_TOKEN);
        const canStudyOffline =
          Boolean(localUser?.id && localAuthToken) &&
          (await canUseOfflineSession(localUser.id));
        setMultiUserMode(Boolean(localUser));
        setIsAuthed(canStudyOffline);
        return;
      }

      const {
        MultiUserMode,
        RequiresAuth,
        LLMProvider = null,
        VectorDB = null,
      } = systemKeys;

      // ✅ Auto-select Ollama if none is set
      if (!LLMProvider || LLMProvider.trim() === "") {
        try {
          await System.updateSystem({ LLMProvider: "ollama" });
          console.log("✅ Ollama automatically set as default LLM provider");
        } catch (err) {
          console.error("Error setting default provider:", err);
        }
      }

      setMultiUserMode(MultiUserMode);

      // Check for the onboarding redirect condition
      if (
        !MultiUserMode &&
        !RequiresAuth && // Not in Multi-user AND no password set.
        !LLMProvider &&
        !VectorDB
      ) {
        setShouldRedirectToOnboarding(true);
        setIsAuthed(true);
        return;
      }

      if (!MultiUserMode && !RequiresAuth) {
        setIsAuthed(true);
        return;
      }

      // Single User password mode check
      if (!MultiUserMode && RequiresAuth) {
        const localAuthToken = localStorage.getItem(AUTH_TOKEN);
        if (!localAuthToken) {
          setIsAuthed(false);
          return;
        }

        const isValid = await validateSessionTokenForUser();
        setIsAuthed(Boolean(isValid));
        return;
      }

      const localUser = localStorage.getItem(AUTH_USER);
      const localAuthToken = localStorage.getItem(AUTH_TOKEN);
      if (!localUser || !localAuthToken) {
        setIsAuthed(false);
        return;
      }

      const isValid = await validateSessionTokenForUser();
      if (isValid === null) {
        setIsAuthed(await canUseOfflineSession(userFromStorage()?.id));
        return;
      }
      if (!isValid) {
        localStorage.removeItem(AUTH_USER);
        localStorage.removeItem(AUTH_TOKEN);
        localStorage.removeItem(AUTH_TIMESTAMP);
        setIsAuthed(false);
        return;
      }

      setIsAuthed(true);
    };
    validateSession();
  }, []);

  return { isAuthd, shouldRedirectToOnboarding, multiUserMode };
}

function RouteContent({ Component, hideUserMenu = false }) {
  return (
    <KeyboardShortcutWrapper>
      {hideUserMenu ? (
        <Component />
      ) : (
        <UserMenu>
          <Component />
        </UserMenu>
      )}
    </KeyboardShortcutWrapper>
  );
}

function RoleRoute({
  Component,
  allowedRoles,
  hideUserMenu = false,
  allowSingleUser = false,
}) {
  const { isAuthd, shouldRedirectToOnboarding, multiUserMode } =
    useIsAuthenticated();
  if (isAuthd === null) return <FullScreenLoader />;

  if (shouldRedirectToOnboarding) {
    return <Navigate to={paths.onboarding.home()} />;
  }

  const user = userFromStorage();
  const permitted =
    isAuthd &&
    (allowedRoles.includes(user?.role) || (allowSingleUser && !multiUserMode));
  return permitted ? (
    <RouteContent Component={Component} hideUserMenu={hideUserMenu} />
  ) : (
    <Navigate to={paths.home()} />
  );
}

// Allows only admin to access the route and if in single user mode,
// allows all users to access the route
export function AdminRoute({ Component, hideUserMenu = false }) {
  return (
    <RoleRoute
      Component={Component}
      allowedRoles={["admin"]}
      hideUserMenu={hideUserMenu}
      allowSingleUser
    />
  );
}

// Allows manager and admin to access the route and if in single user mode,
// allows all users to access the route
export function ManagerRoute({ Component, hideUserMenu = false }) {
  return (
    <RoleRoute
      Component={Component}
      allowedRoles={["admin", "manager"]}
      hideUserMenu={hideUserMenu}
      allowSingleUser
    />
  );
}

export function StudentRoute({ Component }) {
  return <RoleRoute Component={Component} allowedRoles={["student"]} />;
}

export function TeacherRoute({ Component }) {
  return <RoleRoute Component={Component} allowedRoles={["teacher"]} />;
}

export function ParentRoute({ Component }) {
  return <RoleRoute Component={Component} allowedRoles={["parent"]} />;
}

export function EducationRoute({ Component }) {
  const { isAuthd, shouldRedirectToOnboarding } = useIsAuthenticated();
  const [hasAccess, setHasAccess] = useState(null);

  useEffect(() => {
    if (!isAuthd) return;
    let active = true;
    EducationHierarchy.access()
      .then(({ enabled }) => active && setHasAccess(Boolean(enabled)))
      .catch(() => active && setHasAccess(false));
    return () => {
      active = false;
    };
  }, [isAuthd]);

  if (isAuthd === null || (isAuthd && hasAccess === null))
    return <FullScreenLoader />;
  if (shouldRedirectToOnboarding)
    return <Navigate to={paths.onboarding.home()} />;
  if (!isAuthd) return <Navigate to={paths.login(true)} />;
  return hasAccess ? (
    <RouteContent Component={Component} />
  ) : (
    <Navigate to={paths.home()} />
  );
}

export default function PrivateRoute({ Component }) {
  const { isAuthd, shouldRedirectToOnboarding } = useIsAuthenticated();
  if (isAuthd === null) return <FullScreenLoader />;

  if (shouldRedirectToOnboarding) {
    return <Navigate to="/onboarding" />;
  }

  return isAuthd ? (
    <RouteContent Component={Component} />
  ) : (
    <Navigate to={paths.login(true)} />
  );
}
