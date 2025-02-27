import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Eye, Volume2 } from "lucide-react";
import { useAccessibility } from "@/hooks/use-accessibility";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function AccessibilitySettings() {
  const { settings, toggleHighContrast, toggleTextToSpeech } = useAccessibility();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Eye className="h-5 w-5" />
          <span className="sr-only">Accessibility Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Accessibility Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="font-medium">High Contrast</h4>
              <p className="text-sm text-muted-foreground">
                Increase contrast for better visibility
              </p>
            </div>
            <Switch
              checked={settings.highContrast}
              onCheckedChange={toggleHighContrast}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="font-medium">Text to Speech</h4>
              <p className="text-sm text-muted-foreground">
                Read text content aloud
              </p>
            </div>
            <Switch
              checked={settings.textToSpeech}
              onCheckedChange={toggleTextToSpeech}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
