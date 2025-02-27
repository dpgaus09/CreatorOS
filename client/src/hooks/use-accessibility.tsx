import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface AccessibilitySettings {
  highContrast: boolean;
  textToSpeech: boolean;
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  toggleHighContrast: () => void;
  toggleTextToSpeech: () => void;
  speak: (text: string) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<AccessibilitySettings>({
    highContrast: user?.accessibility?.highContrast ?? false,
    textToSpeech: user?.accessibility?.textToSpeech ?? false,
  });

  // Update settings when user changes
  useEffect(() => {
    if (user?.accessibility) {
      setSettings(user.accessibility);
    }
  }, [user]);

  // Apply high contrast theme
  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', settings.highContrast);
  }, [settings.highContrast]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: AccessibilitySettings) => {
      const res = await apiRequest('PATCH', '/api/user/accessibility', newSettings);
      return res.json();
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update accessibility settings',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const toggleHighContrast = () => {
    const newSettings = {
      ...settings,
      highContrast: !settings.highContrast,
    };
    setSettings(newSettings);
    updateSettingsMutation.mutate(newSettings);
  };

  const toggleTextToSpeech = () => {
    const newSettings = {
      ...settings,
      textToSpeech: !settings.textToSpeech,
    };
    setSettings(newSettings);
    updateSettingsMutation.mutate(newSettings);
  };

  // Text-to-speech function
  const speak = (text: string) => {
    if (settings.textToSpeech && 'speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <AccessibilityContext.Provider
      value={{
        settings,
        toggleHighContrast,
        toggleTextToSpeech,
        speak,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}
