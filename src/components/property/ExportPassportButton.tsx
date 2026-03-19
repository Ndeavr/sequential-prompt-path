import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { toast } from "sonner";
import type { Property, PropertyScore, PropertyRecommendation, PropertyEvent } from "@/types/property";
import { scoreLabel, formatCurrency } from "@/types/property";

interface ExportPassportButtonProps {
  property: Property;
  score?: PropertyScore | null;
  recommendations: PropertyRecommendation[];
  events: PropertyEvent[];
}

const SCORE_LABELS: Record<string, string> = {
  structure: "Structure",
  insulation: "Isolation",
  roof: "Toiture",
  humidity: "Humidité",
  windows: "Fenêtres",
  heating: "Chauffage",
  electrical: "Électrique",
  plumbing: "Plomberie",
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: "🔴 Urgent",
  high: "🟠 Haute",
  medium: "🟡 Moyenne",
  low: "🟢 Basse",
};

export default function ExportPassportButton({ property, score, recommendations, events }: ExportPassportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(() => {
    setExporting(true);

    try {
      const dateStr = new Date().toLocaleDateString("fr-CA");
      const address = property.address;
      const location = [property.city, property.province, property.postal_code].filter(Boolean).join(", ");

      // Build HTML content for print
      const componentScores = score?.component_scores ?? {};

      const scoreRows = Object.entries(SCORE_LABELS)
        .map(([key, label]) => {
          const val = componentScores[key];
          return `<tr><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${label}</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">${val != null ? Math.round(val as number) : "—"}</td></tr>`;
        })
        .join("");

      const recRows = recommendations.length === 0
        ? `<p style="color:#6b7280;font-size:14px">Aucune recommandation générée.</p>`
        : recommendations
            .map(
              (r) =>
                `<div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:8px">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                    <strong>${r.title}</strong>
                    <span style="font-size:12px">${PRIORITY_LABELS[r.priority ?? ""] ?? r.priority ?? ""}</span>
                  </div>
                  ${r.description ? `<p style="color:#6b7280;font-size:13px;margin:4px 0">${r.description}</p>` : ""}
                  <div style="font-size:12px;color:#9ca3af;margin-top:4px">
                    ${r.recommended_profession ? `Profession : ${r.recommended_profession}` : ""}
                    ${r.estimated_cost_min != null && r.estimated_cost_max != null ? ` · ${formatCurrency(r.estimated_cost_min)} à ${formatCurrency(r.estimated_cost_max)}` : ""}
                  </div>
                </div>`
            )
            .join("");

      const eventRows = events.length === 0
        ? `<p style="color:#6b7280;font-size:14px">Aucun événement enregistré.</p>`
        : events
            .map(
              (e) =>
                `<div style="border-left:3px solid #6366f1;padding-left:12px;margin-bottom:10px">
                  <div style="font-weight:600">${e.title}</div>
                  <div style="font-size:12px;color:#9ca3af">${e.event_type} · ${e.event_date ? new Date(e.event_date).toLocaleDateString("fr-CA") : "—"}${e.cost ? ` · ${formatCurrency(e.cost)}` : ""}</div>
                  ${e.description ? `<div style="font-size:13px;color:#6b7280;margin-top:2px">${e.description}</div>` : ""}
                </div>`
            )
            .join("");

      const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Passeport Maison — ${address}</title>
  <style>
    @media print { body { margin: 0; } }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 32px; color: #1f2937; }
    h1 { font-size: 22px; margin: 0; }
    h2 { font-size: 16px; margin: 24px 0 12px; border-bottom: 2px solid #6366f1; padding-bottom: 4px; color: #6366f1; }
    table { width: 100%; border-collapse: collapse; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .score-big { font-size: 48px; font-weight: 700; color: #6366f1; }
    .meta { font-size: 13px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <p class="meta">PASSEPORT MAISON — UNPRO</p>
      <h1>${address}</h1>
      <p class="meta">${location}</p>
      <p class="meta">${property.property_type ?? ""} ${property.year_built ? `· ${property.year_built}` : ""} ${property.square_footage ? `· ${property.square_footage} pi²` : ""}</p>
    </div>
    <div style="text-align:right">
      <div class="score-big">${score?.overall_score != null ? Math.round(score.overall_score) : "—"}</div>
      <div class="meta">${scoreLabel(score?.overall_score)}</div>
      <div class="meta">Généré le ${dateStr}</div>
    </div>
  </div>

  <h2>Sous-scores</h2>
  <table>${scoreRows}</table>

  <h2>Recommandations (${recommendations.length})</h2>
  ${recRows}

  <h2>Historique (${events.length})</h2>
  ${eventRows}

  <div style="margin-top:32px;text-align:center;font-size:11px;color:#9ca3af">
    Document généré par UNPRO · ${dateStr} · unpro.ca
  </div>
</body>
</html>`;

      // Open print dialog
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Veuillez autoriser les popups pour exporter");
        setExporting(false);
        return;
      }
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
      toast.success("PDF prêt — utilisez « Enregistrer en PDF » dans la boîte d'impression");
    } catch {
      toast.error("Erreur lors de l'export");
    } finally {
      setExporting(false);
    }
  }, [property, score, recommendations, events]);

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting} className="gap-1.5">
      <FileDown className="h-3.5 w-3.5" />
      {exporting ? "Export…" : "Exporter PDF"}
    </Button>
  );
}