// Previne erros fatais de reconciliação do React causados por Google Tradutor,
// extensões de navegador ou manipulações imperativas de DOM
if (typeof Node === "function" && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      console.warn("DOM: Ignorada remoção de nó com pai divergente (removeChild guard)", child, this);
      return child;
    }
    return originalRemoveChild.apply(this, [child]) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      console.warn("DOM: Ignorada inserção antes de nó com pai divergente (insertBefore guard)", referenceNode, this);
      return newNode;
    }
    return originalInsertBefore.apply(this, [newNode, referenceNode]) as T;
  };
}

// Auto-recuperação de novas versões e assets desatualizados pós-deploy (ChunkLoadError / Failed to fetch dynamically imported module)
if (typeof window !== "undefined") {
  const triggerSafeReload = () => {
    const reloadKey = "chunk_load_failed_retry";
    const hasRetried = sessionStorage.getItem(reloadKey);
    if (!hasRetried) {
      sessionStorage.setItem(reloadKey, "true");
      window.location.reload();
    }
  };

  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    triggerSafeReload();
  });

  window.addEventListener("error", (event) => {
    const msg = event.message || "";
    if (
      msg.includes("Failed to fetch dynamically imported module") ||
      msg.includes("Importing a module script failed") ||
      msg.includes("error loading dynamically imported module")
    ) {
      triggerSafeReload();
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    const msg = event.reason?.message || String(event.reason || "");
    if (
      msg.includes("Failed to fetch dynamically imported module") ||
      msg.includes("Importing a module script failed") ||
      msg.includes("error loading dynamically imported module")
    ) {
      triggerSafeReload();
    }
  });

  // Limpa flag de retry após inicialização bem-sucedida
  setTimeout(() => {
    sessionStorage.removeItem("chunk_load_failed_retry");
  }, 4000);
}

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

