import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { brandAssets } from "./lib/brand-assets";
import "@/styles/globals.css";
import "@/styles/print.css";

const container = document.getElementById("root");
if (!container) throw new Error("Root element not found");

const favicon = document.querySelector<HTMLLinkElement>("link[rel='icon']") ?? document.createElement("link");
favicon.rel = "icon";
favicon.href = brandAssets.favicon;
document.head.appendChild(favicon);

createRoot(container).render(<App />);
