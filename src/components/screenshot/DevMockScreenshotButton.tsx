/**
 * UNPRO — Dev Mock Screenshot Button
 * Floating button for admin/dev to simulate screenshot events.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { useScreenshotDetectionBridge } from "@/hooks/screenshot/useScreenshotDetectionBridge";
import { toast } from "sonner";

export default function DevMockScreenshotButton() {
  const { simulateScreenshot, currentScreen } = useScreenshotDetectionBridge();
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const handleClick = () => {
    if (currentScreen) {
      simulateScreenshot();
      toast.info(`📸 Screenshot simulé: ${currentScreen.screenName}`);
    } else {
      toast.warning("Aucun écran reconnu sur cette page.");
    }
  };

  return (
    <div className="fixed bottom-20 right-4 z-40">
      <Button
        size="sm"
        variant="outline"
        onClick={handleClick}
        className="h-9 rounded-full shadow-lg gap-1.5 text-xs bg-card/90 backdrop-blur-sm border-border/40"
      >
        <Camera className="h-3.5 w-3.5" />
        📸 Mock
      </Button>
    </div>
  );
}
