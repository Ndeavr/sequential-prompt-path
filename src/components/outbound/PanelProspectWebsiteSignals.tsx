import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Globe, Lock, FileText, MapPin, Phone, Mail,
  Star, Calendar, Image, CreditCard, Code, HelpCircle,
  CheckCircle, XCircle
} from "lucide-react";

interface Enrichment {
  website_title: string | null;
  website_meta_description: string | null;
  has_https: boolean;
  has_schema: boolean;
  has_faq: boolean;
  has_booking_cta: boolean;
  has_reviews_widget: boolean;
  has_service_pages: boolean;
  has_city_pages: boolean;
  has_before_after_gallery: boolean;
  has_phone_visible: boolean;
  has_email_visible: boolean;
  has_financing_visible: boolean;
  detected_platform: string | null;
  estimated_review_count: number;
  estimated_google_rating: number | null;
}

const signals = [
  { key: "has_https", label: "HTTPS", icon: Lock },
  { key: "has_schema", label: "Schema.org", icon: Code },
  { key: "has_faq", label: "FAQ", icon: HelpCircle },
  { key: "has_booking_cta", label: "CTA Réservation", icon: Calendar },
  { key: "has_reviews_widget", label: "Widget avis", icon: Star },
  { key: "has_service_pages", label: "Pages services", icon: FileText },
  { key: "has_city_pages", label: "Pages villes", icon: MapPin },
  { key: "has_before_after_gallery", label: "Portfolio", icon: Image },
  { key: "has_phone_visible", label: "Téléphone visible", icon: Phone },
  { key: "has_email_visible", label: "Email visible", icon: Mail },
  { key: "has_financing_visible", label: "Financement", icon: CreditCard },
];

export function PanelProspectWebsiteSignals({ enrichment }: { enrichment: Enrichment }) {
  const present = signals.filter(s => (enrichment as any)[s.key]);
  const absent = signals.filter(s => !(enrichment as any)[s.key]);

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Globe className="h-4 w-4" /> Signaux Web
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {enrichment.website_title && (
          <div className="text-xs">
            <span className="text-muted-foreground">Titre: </span>
            <span className="font-medium">{enrichment.website_title}</span>
          </div>
        )}
        {enrichment.detected_platform && (
          <Badge variant="outline" className="text-xs">
            {enrichment.detected_platform}
          </Badge>
        )}

        {/* Present signals */}
        <div className="space-y-1">
          <span className="text-xs font-medium text-emerald-400">Détectés ({present.length})</span>
          <div className="flex flex-wrap gap-1.5">
            {present.map(s => (
              <div key={s.key} className="flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-400 rounded-md px-2 py-0.5">
                <CheckCircle className="h-3 w-3" />
                {s.label}
              </div>
            ))}
          </div>
        </div>

        {/* Absent signals */}
        <div className="space-y-1">
          <span className="text-xs font-medium text-red-400">Absents ({absent.length})</span>
          <div className="flex flex-wrap gap-1.5">
            {absent.map(s => (
              <div key={s.key} className="flex items-center gap-1 text-xs bg-red-500/10 text-red-400 rounded-md px-2 py-0.5">
                <XCircle className="h-3 w-3" />
                {s.label}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
