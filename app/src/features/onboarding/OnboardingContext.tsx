import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { OnboardingScreen } from './components/OnboardingScreen';

export const ONBOARDING_TEST_MODE = false;

const STORAGE_KEYS = {
  COMPLETED: 'onboarding_completed',
  SKIPPED: 'onboarding_skipped',
  AUDIO_ENABLED: 'onboarding_audio_enabled',
  COMPLETED_AT: 'onboarding_completed_at',
};

interface OnboardingContextType {
  showOnboarding: boolean;
  audioEnabled: boolean;
  finishOnboarding: (skipped?: boolean) => void;
  toggleAudio: () => void;
  replayOnboarding: () => void;
  resetOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  
  const [audioEnabled, setAudioEnabled] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.AUDIO_ENABLED) !== 'false';
  });

  useEffect(() => {
    checkOnboarding();
    setIsInitializing(false);
  }, []);

  const checkOnboarding = () => {
    if (ONBOARDING_TEST_MODE) {
      setShowOnboarding(true);
    } else {
      const isCompleted = localStorage.getItem(STORAGE_KEYS.COMPLETED) === 'true';
      const isSkipped = localStorage.getItem(STORAGE_KEYS.SKIPPED) === 'true';
      if (!isCompleted && !isSkipped) {
        setShowOnboarding(true);
      }
    }
  };

  const finishOnboarding = (skipped: boolean = false) => {
    setShowOnboarding(false);
    if (!ONBOARDING_TEST_MODE) {
      if (skipped) {
        localStorage.setItem(STORAGE_KEYS.SKIPPED, 'true');
      } else {
        localStorage.setItem(STORAGE_KEYS.COMPLETED, 'true');
        localStorage.setItem(STORAGE_KEYS.COMPLETED_AT, new Date().toISOString());
      }
    }
  };

  const toggleAudio = () => {
    const newVal = !audioEnabled;
    setAudioEnabled(newVal);
    localStorage.setItem(STORAGE_KEYS.AUDIO_ENABLED, newVal.toString());
  };

  const replayOnboarding = () => {
    setShowOnboarding(true);
  };

  const resetOnboarding = () => {
    localStorage.removeItem(STORAGE_KEYS.COMPLETED);
    localStorage.removeItem(STORAGE_KEYS.SKIPPED);
    localStorage.removeItem(STORAGE_KEYS.COMPLETED_AT);
    setShowOnboarding(true); // Restart from intro
  };

  return (
    <OnboardingContext.Provider
      value={{
        showOnboarding,
        audioEnabled,
        finishOnboarding,
        toggleAudio,
        replayOnboarding,
        resetOnboarding,
      }}
    >
      {children}
      {!isInitializing && showOnboarding && (
        <OnboardingScreen />
      )}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
}

