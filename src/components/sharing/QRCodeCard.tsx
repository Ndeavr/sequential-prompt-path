/**
 * UNPRO — QR Code Card
 * Renders a large, scannable QR code with download capability.
 * Uses toDataURL for reliable cross-browser rendering.
 * Bilingual FR/EN support.
 */
import { useEffect, useState } from "react";
import QRCodeDefault, * as QRCodeNS from "qrcode";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useLanguage } from "@/components/ui/LanguageToggle";

const QRCodeLib = (QRCodeDefault as any)?.toDataURL
  ? (QRCodeDefault as any)
  : (QRCodeNS as any);

const t = {
  download: { fr: "Télécharger le QR", en: "Download QR" },
  alt: { fr: "Code QR UNPRO", en: "UNPRO QR Code" },
  unavailable: { fr: "QR indisponible", en: "QR unavailable" },
};

interface QRCodeCardProps {
  url: string;
  size?: number;
  label?: string;
}

const QRCodeCard = ({ url, size = 220, label }: QRCodeCardProps) => {
  const { lang } = useLanguage();
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const generate = async () => {
      if (!url) {
        setDataUrl(null);
        return;
      }

      setIsGenerating(true);
      setDataUrl(null);

      try {
        const pngDataUrl = await QRCodeLib.toDataURL(url, {
          width: Math.max(size, 220),
          margin: 2,
          color: {
            dark: "#1e293b",
            light: "#ffffff",
          },
          errorCorrectionLevel: "M",
        });

        if (!cancelled) {
          setDataUrl(pngDataUrl);
        }
      } catch (pngError) {
        try {
          const svg = await QRCodeLib.toString(url, {
            type: "svg",
            margin: 2,
          color: {
              dark: "#1e293b",
              light: "#ffffff",
            },
            errorCorrectionLevel: "M",
          });

          if (!cancelled) {
            setDataUrl(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
          }
        } catch (svgError) {
          if (!cancelled) {
            setDataUrl(null);
          }
          console.error("QR generation failed", { pngError, svgError, urlLength: url.length });
        }
      } finally {
        if (!cancelled) setIsGenerating(false);
      }
    };

    generate();
    return () => {
      cancelled = true;
    };
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
    <div className="flex flex-col items-center gap-3 w-full max-w-full overflow-hidden">
      <div className="p-3 bg-card rounded-2xl shadow-lg border border-border inline-flex max-w-full">
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={t.alt[lang]}
            loading="eager"
            decoding="sync"
            className="rounded-lg block w-full h-auto max-w-[200px]"
            style={{ imageRendering: "pixelated", aspectRatio: "1/1" }}
          />
        ) : isGenerating ? (
          <div className="rounded-lg bg-muted/40 animate-pulse w-full max-w-[200px] aspect-square" />
        ) : (
          <div className="rounded-lg bg-muted/20 border border-dashed border-border flex items-center justify-center px-3 w-full max-w-[200px] aspect-square">
            <span className="text-[11px] text-muted-foreground text-center">{t.unavailable[lang]}</span>
          </div>
        )}
      </div>

      {label && <p className="text-[11px] text-muted-foreground text-center max-w-full px-2">{label}</p>}

      <Button
        variant="outline"
        size="sm"
        onClick={handleDownload}
        className="gap-2 rounded-full text-xs"
        disabled={!dataUrl}
      >
        <Download className="h-3.5 w-3.5" />
        {t.download[lang]}
      </Button>
    </div>
  );
};

export default QRCodeCard;
