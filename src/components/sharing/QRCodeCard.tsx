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

const QRCodeCard = ({ url, size = 240, label }: QRCodeCardProps) => {
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
    <div className="flex flex-col items-center gap-3">
      <div className="p-4 bg-white rounded-2xl shadow-lg border border-border/10">
        <canvas ref={canvasRef} className="rounded-lg" />
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
