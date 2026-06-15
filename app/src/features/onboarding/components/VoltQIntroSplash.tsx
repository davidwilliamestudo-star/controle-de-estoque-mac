import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";

interface VoltQIntroSplashProps {
  onFinish: () => void;
}

export function VoltQIntroSplash({ onFinish }: VoltQIntroSplashProps) {
  const [videoError, setVideoError] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Fallback timeout in case video never triggers onEnded or fails to load
  useEffect(() => {
    // A VoltQ Intro video should be at most 15-20 seconds. 
    // We add a safety timeout to force finish if it stalls.
    const safetyTimeout = setTimeout(() => {
      finishIntro();
    }, 15000);

    return () => clearTimeout(safetyTimeout);
  }, []);

  const finishIntro = () => {
    if (isFadingOut) return;
    setIsFadingOut(true);
    
    // Pause video immediately if jumping
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.removeAttribute("src"); // help garbage collection
      videoRef.current.load();
    }

    // small delay to let CSS fade out
    setTimeout(() => {
      onFinish();
    }, 800);
  };

  const handleVideoError = () => {
    setVideoError(true);
  };

  const handleVideoEnded = () => {
    finishIntro();
  };

  return (
    <div 
      className={`fixed inset-0 z-[999999] bg-black flex flex-col items-center justify-center transition-opacity duration-700 ease-in-out ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {!videoError ? (
        <video
          ref={videoRef}
          src="/vault/system-voltq.mp4"
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          onEnded={handleVideoEnded}
          onError={handleVideoError}
        />
      ) : (
        // Fallback: Logo Animation
        <div className="flex flex-col items-center justify-center animate-pulse">
          <img 
            src="/vault/voltq-white.svg" 
            alt="VoltQ Studio" 
            className="h-16 w-auto mb-6 drop-shadow-2xl opacity-90"
          />
          <p className="text-white/50 tracking-[0.2em] text-xs uppercase">
            Desenvolvido por VoltQ
          </p>
        </div>
      )}

      {/* Skip Button */}
      <button 
        onClick={finishIntro}
        className="absolute bottom-8 right-8 z-10 flex items-center gap-2 text-white/50 hover:text-white/90 text-sm tracking-[0.1em] uppercase transition-colors duration-300"
      >
        Pular <ChevronRight size={16} />
      </button>
    </div>
  );
}
