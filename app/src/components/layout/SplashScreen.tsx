/**
 * SplashScreen.tsx — Tela de carregamento animada
 * Identidade visual minimalista e hipnotizante
 */
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/common/BrandLogo";

export function SplashScreen() {
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState("Seja bem-vindo(a)...");

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => {
        const next = p + (Math.random() * 8 + 2);
        return next >= 100 ? 100 : next;
      });
    }, 300);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const texts = [
      "Preparando sistema...",
      "Sincronizando banco de dados...",
      "Carregando inventário...",
      "Quase lá...",
    ];
    let i = 0;
    const textInterval = setInterval(() => {
      setLoadingText(texts[i]);
      i = (i + 1) % texts.length;
    }, 2000);
    return () => clearInterval(textInterval);
  }, []);

  return (
    <>
      <style>
        {`
          @keyframes slide-up-fade {
            0% { transform: translateY(40px); opacity: 0; filter: blur(10px); }
            100% { transform: translateY(0); opacity: 1; filter: blur(0); }
          }
          .animate-entrance {
            animation: slide-up-fade 3.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
            opacity: 0;
          }
          .delay-100 { animation-delay: 400ms; }
          .delay-300 { animation-delay: 1200ms; }
          .delay-500 { animation-delay: 2000ms; }
          .delay-700 { animation-delay: 2800ms; }
          .delay-900 { animation-delay: 3600ms; }
          
          .text-glow {
            text-shadow: 0 0 15px rgba(255,255,255,0.3);
          }
        `}
      </style>
      <div
        className="fixed inset-0 flex flex-col items-center justify-center z-[99999]"
        style={{
          background: "linear-gradient(135deg, var(--color-green-deep) 0%, #0d2e26 100%)",
        }}
      >
        <div className="flex flex-col items-center gap-12 w-full max-w-[500px]">
          {/* Logo SVG transparente ao invés de quadrado */}
          <div className="animate-entrance delay-100" style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))" }}>
            <BrandLogo variant="expanded-white" className="h-16 w-auto" />
          </div>

          <div className="flex flex-col items-center gap-4 text-center">
            {/* Título animado */}
            <h1 
              className="text-4xl font-light animate-entrance delay-300 tracking-wide"
              style={{ color: "#ffffff", textShadow: "none" }}
            >
              Bem-vinda, Dra. Ana
            </h1>
            <p 
              className="text-sm font-medium animate-entrance delay-500 uppercase tracking-[3px]" 
              style={{ color: "#ffffff", opacity: 0.9, textShadow: "none" }}
            >
              Controle de Estoque
            </p>
          </div>

          {/* Container da barra de progresso (Larga) */}
          <div className="flex flex-col items-center w-full px-8 animate-entrance delay-700">
            <div className="flex flex-col items-center w-full mb-5 space-y-2">
              <span className="text-2xl font-light tracking-widest" style={{ color: "#ffffff" }}>{Math.floor(progress)}%</span>
              <span className="text-xs opacity-80 tracking-widest uppercase" style={{ color: "#ffffff" }}>{loadingText}</span>
            </div>
            
            {/* Barra de progresso */}
            <div className="relative w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
              <div
                className="absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-in-out"
                style={{ 
                  width: `${progress}%`, 
                  background: "linear-gradient(90deg, #ffffff 0%, #e0e0e0 100%)",
                  boxShadow: "0 0 12px rgba(255, 255, 255, 0.4)"
                }}
              />
            </div>
          </div>
        </div>

        {/* Versão */}
        <p className="absolute bottom-8 text-xs font-medium animate-entrance delay-900" style={{ color: "rgba(255,255,255,0.2)" }}>
          v1.0.0 — Sistema local offline
        </p>
      </div>
    </>
  );
}
