/**
 * UNPRO — QR Code Card
 * Renders a large, scannable QR code with download capability.
 * Uses toDataURL for reliable cross-browser rendering.
 * Always fits within the viewport with responsive sizing.
 */
import { useEffect, useState } from "react";
import QRCodeLib from "qrcode";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface QRCodeCardProps {
  url: string;
  size?: number;
  label?: string;
}

const QRCodeCard = ({ url, size = 220, label }: QRCodeCardProps) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    QRCodeLib.toDataURL(url, {
      width: size * 2, // retina
      margin: 2,
      color: { dark: "#1a1a2e", light: "#ffffff" },
      errorCorrectionLevel: "H",
    })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [url, size]);

  const handleDownload = () => {
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.download = `unpro-qr-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  if (!url) return null;

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <div
        className="p-3 bg-white rounded-2xl shadow-lg border border-border/10 inline-flex"
      >
        {dataUrl ? (
          <img
            src={dataUrl}
            alt="QR Code UNPRO"
            width={size}
            height={size}
            className="rounded-lg block"
            style={{
              imageRendering: "pixelated",
              width: Math.min(size, 200),
              height: Math.min(size, 200),
            }}
          />
        ) : (
          <div
            className="rounded-lg bg-muted/30 animate-pulse"
            style={{ width: Math.min(size, 200), height: Math.min(size, 200) }}
          />
        )}
      </div>
      {label && (
        <p className="text-[11px] text-muted-foreground text-center max-w-[220px]">{label}</p>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownload}
        className="gap-2 rounded-full text-xs"
        disabled={!dataUrl}
      >
        <Download className="h-3.5 w-3.5" />
        Télécharger le QR
      </Button>
    </div>
  );
};

export default QRCodeCard;
