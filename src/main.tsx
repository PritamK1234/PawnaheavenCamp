import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const isOwnerPath = window.location.pathname.startsWith('/owner');

if (!isOwnerPath) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    const updateSW = registerSW({
      onNeedRefresh() {
        if (confirm('New content available. Reload?')) {
          updateSW(true);
        }
      },
      onOfflineReady() {
        console.log('App ready to work offline');
      },
      immediate: true,
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
