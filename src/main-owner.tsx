import { createRoot } from "react-dom/client";
import AppOwner from "./AppOwner.tsx";
import "./index.css";

const manifestLink = document.querySelector('link[rel="manifest"]');
if (manifestLink) {
  manifestLink.setAttribute('href', '/manifest-owner.json');
} else {
  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = '/manifest-owner.json';
  document.head.appendChild(link);
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.log('SW registration failed:', error);
    });
  });
}

createRoot(document.getElementById("root")!).render(<AppOwner />);
