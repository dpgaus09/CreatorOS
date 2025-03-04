import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';

interface CourseCompletionProps {
  courseName: string;
  onClose: () => void;
}

export function CourseCompletion({ courseName, onClose }: CourseCompletionProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Fire confetti when component mounts
    fireConfetti();
    
    // Automatically hide after 6 seconds if user doesn't dismiss
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // Give time for animation to complete
    }, 6000);
    
    return () => clearTimeout(timer);
  }, [onClose]);

  const fireConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      // Use confetti burst
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff']
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff']
      });
    }, 250);
  };

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onClose, 300); // Give time for animation to complete
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 animate-in fade-in duration-300">
      <div className="bg-card border rounded-lg shadow-lg p-6 max-w-md mx-auto text-center animate-in zoom-in-95 duration-300">
        <h2 className="text-2xl font-bold mb-4">
          🎉 Congratulations! 🎉
        </h2>
        <p className="text-xl mb-6">
          You've completed the course:
        </p>
        <p className="text-2xl font-bold mb-8 text-primary">
          {courseName}
        </p>
        <Button onClick={handleDismiss} className="w-full">
          Continue
        </Button>
      </div>
    </div>
  );
}