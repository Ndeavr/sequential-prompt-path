/**
 * UNPRO — QR Code Card
 * Renders a large, scannable QR code with download capability.
 */
import { useEffect, useRef } from "react";
import QRCodeLib from "qrcode";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface QRCodeCardProps {
  url: string;
  size?: number;
  label?: string;
}

const QRCodeCard = ({ url, size = 200, label }: QRCodeCardProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCodeLib.toCanvas(canvasRef.current, url, {
        width: size,
        margin: 2,
        color: { dark: "#1a1a2e", light: "#ffffff" },
        errorCorrectionLevel: "H",
      });
    }
  }, [url, size]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `unpro-qr-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <div className="p-3 bg-white rounded-2xl shadow-lg border border-border/10 max-w-[calc(100%-2rem)] mx-auto">
        <canvas ref={canvasRef} className="rounded-lg w-full h-auto max-w-[200px] mx-auto" />
      </div>
      {label && (
        <p className="text-caption text-muted-foreground text-center max-w-[200px]">{label}</p>
      )}
      <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2 rounded-full">
        <Download className="h-3.5 w-3.5" />
        Télécharger le QR
      </Button>
    </div>
  );
};

export default QRCodeCard;
