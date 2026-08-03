import { RouterProvider } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router } from "./router";
import { SplashScreen } from "@/components/layout/SplashScreen";
import { AppUpdateModal } from "@/features/updater/components/AppUpdateModal";
import { useState, useEffect } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [fadeOutSplash, setFadeOutSplash] = useState(false);

  useEffect(() => {
    // Esconde o splash de boas-vindas suavemente em ~2.5s
    const fadeTimer = setTimeout(() => setFadeOutSplash(true), 2500);
    const removeTimer = setTimeout(() => setShowSplash(false), 3200);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {showSplash && (
        <div 
          className={`fixed inset-0 z-[99999] transition-opacity duration-700 ease-in-out ${
            fadeOutSplash ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <SplashScreen />
        </div>
      )}
      <RouterProvider router={router} defaultPreload="intent" />
      {/* Auto-update: verifica releases no GitHub após abrir o app */}
      <AppUpdateModal />
    </QueryClientProvider>
  );
}

