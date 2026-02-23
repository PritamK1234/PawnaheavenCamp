import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const getManifestForHost = () => {
  const hostname = window.location.hostname;
  if (hostname.includes('pawnahavencamp.shop')) return '/manifest-owner.json';
  return '/manifest-public.json';
};

const manifestLink = document.querySelector('link[rel="manifest"]');
if (manifestLink) {
  manifestLink.setAttribute('href', getManifestForHost());
} else {
  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = getManifestForHost();
  document.head.appendChild(link);
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.log('SW registration failed:', error);
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
