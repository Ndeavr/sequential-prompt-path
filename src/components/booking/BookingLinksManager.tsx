/**
 * UNPRO Booking Intelligence — QR & Links Manager
 * Contractor-facing panel to generate/manage booking QR codes.
 */

import { useState } from "react";
import { Copy, Download, QrCode, Plus, ExternalLink, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  QR_PRESETS,
  generateQrCodeDataUrl,
  buildBookingUrl,
  createBookingLink,
  type QrPreset,
  type BookingLink,
} from "@/services/bookingLinksService";

interface BookingLinksManagerProps {
  contractorId: string;
  contractorSlug: string;
  existingLinks: any[];
  onLinkCreated?: () => void;
}

export function BookingLinksManager({
  contractorId,
  contractorSlug,
  existingLinks,
  onLinkCreated,
}: BookingLinksManagerProps) {
  const [generating, setGenerating] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleGenerate = async (preset: QrPreset) => {
    setGenerating(preset.key);
    try {
      await createBookingLink({
        contractorId,
        contractorSlug,
        title: preset.label,
        appointmentTypeSlug: preset.appointmentSlug,
        sourceTag: preset.sourceTag,
        alexMode: preset.alexMode,
      });
      toast.success(`${preset.label} créé`);
      onLinkCreated?.();
    } catch {
      toast.error("Erreur lors de la génération");
    } finally {
      setGenerating(null);
    }
  };

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success("Lien copié");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadQr = async (url: string, title: string) => {
    const dataUrl = await generateQrCodeDataUrl(url, { width: 800 });
    const link = document.createElement("a");
    link.download = `unpro-qr-${title.toLowerCase().replace(/\s+/g, "-")}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Existing Links */}
      {existingLinks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-body font-semibold text-foreground">Liens actifs</h3>
          <div className="grid gap-3">
            {existingLinks.map((link: any) => {
              const url = buildBookingUrl({
                contractorSlug,
                appointmentSlug: link.service,
                source: link.source_tag,
                alexMode: link.alex_mode,
              });

              return (
                <Card key={link.id} className="border-border/60">
                  <CardContent className="p-4 flex items-center gap-3">
                    {link.qr_code_url ? (
                      <img
                        src={link.qr_code_url}
                        alt="QR"
                        className="w-12 h-12 rounded-lg border border-border/40"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                        <QrCode className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {link.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{url}</p>
                    </div>

                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8"
                        onClick={() => handleCopy(url, link.id)}
                      >
                        {copiedId === link.id ? (
                          <Check className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8"
                        onClick={() => handleDownloadQr(url, link.title)}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8"
                        onClick={() => window.open(url, "_blank")}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Preset Generator */}
      <div className="space-y-3">
        <h3 className="text-body font-semibold text-foreground">Générer des QR codes</h3>
        <p className="text-xs text-muted-foreground">
          Chaque QR code trace la source pour vos statistiques de conversion
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {QR_PRESETS.map((preset) => {
            const exists = existingLinks.some(
              (l: any) => l.source_tag === preset.sourceTag
            );

            return (
              <button
                key={preset.key}
                disabled={generating === preset.key || exists}
                onClick={() => handleGenerate(preset)}
                className="flex items-start gap-3 p-3 rounded-xl border border-border/60 bg-card text-left hover:border-primary/40 hover:bg-primary/[0.02] transition-all disabled:opacity-50 disabled:cursor-default"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <QrCode className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{preset.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{preset.description}</p>
                </div>
                {exists ? (
                  <Badge variant="outline" className="text-[10px] text-primary border-primary/20 bg-primary/5 mt-1">
                    Actif
                  </Badge>
                ) : (
                  <Plus className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
