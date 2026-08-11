import { useEffect, useState } from "react";
import {
  ArrowClockwise,
  CloudCheck,
  CloudSlash,
  DownloadSimple,
} from "@phosphor-icons/react";
import { useAuth } from "@/AuthContext";
import {
  lowDataEnabled,
  pendingMutationCount,
  setLowDataEnabled,
  syncPendingMutations,
} from "@/utils/offline";

export default function OfflineStatus() {
  const { user } = useAuth();
  const [online, setOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(0);
  const [lowData, setLowData] = useState(() => lowDataEnabled());
  const [installPrompt, setInstallPrompt] = useState(null);
  const [updateReady, setUpdateReady] = useState(false);
  const [syncError, setSyncError] = useState("");

  useEffect(() => {
    const refresh = async () => {
      setOnline(navigator.onLine);
      setLowData(lowDataEnabled());
      setPending(await pendingMutationCount());
    };
    const reconnect = async () => {
      setOnline(true);
      await syncPendingMutations();
      refresh();
    };
    const captureInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const showUpdate = () => setUpdateReady(true);
    const showSyncError = (event) =>
      setSyncError(
        event.detail?.error || "Saved work could not be synchronized"
      );
    const clearSyncError = (event) => {
      if (event.detail?.success) setSyncError("");
    };
    window.addEventListener("online", reconnect);
    window.addEventListener("offline", refresh);
    window.addEventListener("chikoro:offline-change", refresh);
    window.addEventListener("beforeinstallprompt", captureInstall);
    window.addEventListener("chikoro:pwa-update", showUpdate);
    window.addEventListener("chikoro:sync-error", showSyncError);
    window.addEventListener("chikoro:sync-settled", clearSyncError);
    refresh();
    if (navigator.onLine) syncPendingMutations().then(refresh);
    return () => {
      window.removeEventListener("online", reconnect);
      window.removeEventListener("offline", refresh);
      window.removeEventListener("chikoro:offline-change", refresh);
      window.removeEventListener("beforeinstallprompt", captureInstall);
      window.removeEventListener("chikoro:pwa-update", showUpdate);
      window.removeEventListener("chikoro:sync-error", showSyncError);
      window.removeEventListener("chikoro:sync-settled", clearSyncError);
    };
  }, [user?.id]);

  if (!user && !installPrompt && !updateReady) return null;

  const install = async () => {
    await installPrompt?.prompt();
    setInstallPrompt(null);
  };

  return (
    <aside className="offline-status" aria-live="polite">
      {syncError && (
        <span className="is-sync-error" role="alert" title={syncError}>
          Sync failed
        </span>
      )}
      <span className={online ? "is-online" : "is-offline"}>
        {online ? <CloudCheck size={16} /> : <CloudSlash size={16} />}
        {online
          ? pending
            ? `${pending} waiting to sync`
            : "Synced"
          : "Offline"}
      </span>
      {user?.role === "student" && (
        <button
          type="button"
          aria-pressed={lowData}
          onClick={() => setLowDataEnabled(!lowData)}
        >
          Low data {lowData ? "on" : "off"}
        </button>
      )}
      {installPrompt && (
        <button type="button" onClick={install}>
          <DownloadSimple size={15} /> Install
        </button>
      )}
      {updateReady && (
        <button type="button" onClick={() => window.location.reload()}>
          <ArrowClockwise size={15} /> Update
        </button>
      )}
    </aside>
  );
}
