import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router } from "react-router-dom";
import App from "@/App.jsx";
import "./chunkErrorHandler.js";
import "@/index.css";
const isDev = import.meta.env.DEV;
const REACTWRAP = isDev ? React.Fragment : React.StrictMode;

ReactDOM.createRoot(document.getElementById("root")).render(
  <REACTWRAP>
    <Router>
      <App />
    </Router>
  </REACTWRAP>
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register(
        "/service-worker.js",
        { updateViaCache: "none" }
      );
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (
            worker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            window.dispatchEvent(new CustomEvent("chikoro:pwa-update"));
          }
        });
      });
    } catch (error) {
      console.warn("Service worker registration failed", error);
    }
  });
}
