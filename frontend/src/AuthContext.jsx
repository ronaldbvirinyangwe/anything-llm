import React, { useState, createContext,useContext } from "react";
import { AUTH_TIMESTAMP, AUTH_TOKEN, AUTH_USER } from "@/utils/constants";

export const AuthContext = createContext(null);

function decodeJWTPayload(token) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

export function AuthProvider(props) {
  // Detect and clear stale localStorage if JWT user id doesn't match stored user id
  const localAuthToken = localStorage.getItem(AUTH_TOKEN);
  const localUser = localStorage.getItem(AUTH_USER);
  if (localAuthToken && localUser) {
    const decoded = decodeJWTPayload(localAuthToken);
    const storedUser = JSON.parse(localUser);
    if (decoded?.id && storedUser?.id && decoded.id !== storedUser.id) {
      console.warn("[Auth] JWT/localStorage user id mismatch — clearing stale session. JWT id:", decoded.id, "localStorage id:", storedUser.id);
      localStorage.removeItem(AUTH_USER);
      localStorage.removeItem(AUTH_TOKEN);
      localStorage.removeItem(AUTH_TIMESTAMP);
    }
  }
  const [store, setStore] = useState({
    user: localStorage.getItem(AUTH_USER) ? JSON.parse(localStorage.getItem(AUTH_USER)) : null,
    authToken: localStorage.getItem(AUTH_TOKEN) ?? null,
  });

  const [actions] = useState({
    updateUser: (user, authToken = "") => {
      localStorage.setItem(AUTH_USER, JSON.stringify(user));
      localStorage.setItem(AUTH_TOKEN, authToken);
      setStore({ user, authToken });
    },
    unsetUser: () => {
      localStorage.removeItem(AUTH_USER);
      localStorage.removeItem(AUTH_TOKEN);
      localStorage.removeItem(AUTH_TIMESTAMP);
      setStore({ user: null, authToken: null });
    },
    setStreak: (streak) => {
      setStore((prev) => {
        if (!prev.user) return prev;
        const updated = { ...prev.user, streak };
        localStorage.setItem(AUTH_USER, JSON.stringify(updated));
        return { ...prev, user: updated };
      });
    },
  });

  return (
    <AuthContext.Provider value={{ store, actions }}>
      {props.children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  const { store, actions } = context;
  return {
    user: store.user,
    accessToken: store.authToken,
    updateUser: actions.updateUser,
    unsetUser: actions.unsetUser,
    setStreak: actions.setStreak,
  };
}