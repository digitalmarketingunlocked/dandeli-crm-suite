import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// PWA service worker registration — only outside iframe / preview
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();
const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (!isInIframe && !isPreviewHost && "serviceWorker" in navigator) {
  // Use the virtual module from vite-plugin-pwa
  import("virtual:pwa-register")
    .then(({ registerSW }) => {
      registerSW({ immediate: true });
    })
    .catch((err) => console.warn("PWA register failed", err));
} else if ((isInIframe || isPreviewHost) && "serviceWorker" in navigator) {
  // Clean up any previously installed SW in preview/iframe contexts
  navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
}

createRoot(document.getElementById("root")!).render(<App />);
