import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Edit3, ArrowRight, Building2, Phone, Globe, MapPin, Briefcase, FileText } from "lucide-react";
import { motion } from "framer-motion";

export interface PreviewData {
  business_name: string;
  phone?: string;
  email?: string;
  website_url?: string;
  city?: string;
  description?: string;
  services?: string[];
  logo_url?: string;
  photos?: string[];
}

interface Props {
  data: PreviewData;
  source: string;
  onContinue: () => void;
  onEdit: () => void;
}

function FieldRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  const hasValue = value && value.trim().length > 0;
  return (
    <div className="flex items-center gap-3 py-2">
      <Icon className={`h-4 w-4 flex-shrink-0 ${hasValue ? "text-primary" : "text-muted-foreground/50"}`} />
      <div className="flex-1 min-w-0">
        <span className="text-xs text-muted-foreground">{label}</span>
        <p className={`text-sm font-medium truncate ${hasValue ? "text-foreground" : "text-muted-foreground/50 italic"}`}>
          {hasValue ? value : "Non détecté"}
        </p>
      </div>
      {hasValue ? <CheckCircle className="h-4 w-4 text-success flex-shrink-0" /> : <XCircle className="h-4 w-4 text-destructive/40 flex-shrink-0" />}
    </div>
  );
}

export default function ImportedProfilePreview({ data, source, onContinue, onEdit }: Props) {
  const detectedCount = [data.business_name, data.phone, data.website_url, data.city, data.description].filter(Boolean).length;

  return (
    <motion.div className="space-y-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="text-center">
        <Badge variant="outline" className="text-xs mb-2">
          {detectedCount}/5 champs détectés • Source: {source}
        </Badge>
      </div>

      <Card>
        <CardContent className="p-5">
          {data.logo_url && (
            <div className="flex justify-center mb-4">
              <img src={data.logo_url} alt="Logo" className="h-16 w-16 rounded-xl object-cover border" />
            </div>
          )}
          <h3 className="text-lg font-bold text-foreground text-center mb-4">{data.business_name}</h3>

          <div className="divide-y divide-border">
            <FieldRow icon={Phone} label="Téléphone" value={data.phone} />
            <FieldRow icon={Globe} label="Site web" value={data.website_url} />
            <FieldRow icon={MapPin} label="Ville" value={data.city} />
            <FieldRow icon={FileText} label="Description" value={data.description} />
          </div>

          {data.services && data.services.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Briefcase className="h-3 w-3" /> Services détectés
              </p>
              <div className="flex flex-wrap gap-1.5">
                {data.services.map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                ))}
              </div>
            </div>
          )}

          {data.photos && data.photos.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">Photos trouvées</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {data.photos.slice(0, 4).map((p, i) => (
                  <img key={i} src={p} alt={`Photo ${i + 1}`} className="h-16 w-16 rounded-lg object-cover border flex-shrink-0" />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onEdit} className="flex-1">
          <Edit3 className="h-4 w-4 mr-1" /> Corriger
        </Button>
        <Button onClick={onContinue} className="flex-1 font-bold">
          Continuer <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
