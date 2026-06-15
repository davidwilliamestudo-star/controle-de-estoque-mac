/**
 * App.tsx — Root da aplicação
 */
import { RouterProvider } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router } from "./router";
import { SplashScreen } from "@/components/layout/SplashScreen";
import { VoltQIntroSplash } from "@/features/onboarding/components/VoltQIntroSplash";
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
  const [showVoltQIntro, setShowVoltQIntro] = useState(true);
  const [showSplash, setShowSplash] = useState(false);
  const [fadeOutSplash, setFadeOutSplash] = useState(false);

  const startSplashScreen = () => {
    setShowVoltQIntro(false);
    setShowSplash(true);
    
    // Começa a sumir suavemente em 6.5s (esperando toda animação lenta de entrada)
    setTimeout(() => setFadeOutSplash(true), 6500);
    // Remove completamente do DOM em 7.5s
    setTimeout(() => setShowSplash(false), 7500);
  };

  return (
    <QueryClientProvider client={queryClient}>
      {showVoltQIntro && (
        <VoltQIntroSplash onFinish={startSplashScreen} />
      )}
      {!showVoltQIntro && showSplash && (
        <div 
          className={`fixed inset-0 z-[99999] transition-opacity duration-1000 ease-in-out ${
            fadeOutSplash ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <SplashScreen />
        </div>
      )}
      {!showVoltQIntro && <RouterProvider router={router} defaultPreload="intent" />}
    </QueryClientProvider>
  );
}
