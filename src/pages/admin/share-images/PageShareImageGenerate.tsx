import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Zap, Loader2, Image, Download, Smartphone, Monitor, MessageSquare } from "lucide-react";
import { generateImage, INTENTS, VARIANTS } from "@/services/shareImageService";
import { toast } from "sonner";

export default function PageShareImageGenerate() {
  const navigate = useNavigate();
  const [intent, setIntent] = useState("homeowner_problem");
  const [persona, setPersona] = useState("");
  const [city, setCity] = useState("");
  const [service, setService] = useState("");
  const [contractorName, setContractorName] = useState("");
  const [cta, setCta] = useState("");
  const [variant, setVariant] = useState("A");
  const [width, setWidth] = useState(1200);
  const [height, setHeight] = useState(630);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [previewDevice, setPreviewDevice] = useState<"og" | "mobile" | "sms">("og");

  async function handleGenerate() {
    setGenerating(true);
    try {
      const data = await generateImage({
        intent, persona, city, service,
        contractor_name: contractorName,
        cta, variant, width, height,
      });
      setResult(data);
      toast.success(`Image générée en ${data.generation_time_ms}ms`);
    } catch (e: any) {
      toast.error(e.message || "Erreur de génération");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/share-images")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold font-display">Générer une image OG</h1>
          <p className="text-sm text-muted-foreground">Configurez et générez une carte de partage</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Config Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Intention</Label>
                <Select value={intent} onValueChange={setIntent}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INTENTS.map((i) => (
                      <SelectItem key={i.value} value={i.value}>
                        {i.icon} {i.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Ville</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Laval" />
                </div>
                <div className="space-y-2">
                  <Label>Service</Label>
                  <Input value={service} onChange={(e) => setService(e.target.value)} placeholder="Toiture" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nom entrepreneur</Label>
                <Input value={contractorName} onChange={(e) => setContractorName(e.target.value)} placeholder="Toitures Laval Inc." />
              </div>

              <div className="space-y-2">
                <Label>Persona</Label>
                <Input value={persona} onChange={(e) => setPersona(e.target.value)} placeholder="homeowner / contractor / condo_manager" />
              </div>

              <div className="space-y-2">
                <Label>CTA</Label>
                <Input value={cta} onChange={(e) => setCta(e.target.value)} placeholder="Voir mon diagnostic →" />
              </div>

              <div className="space-y-2">
                <Label>Variante</Label>
                <div className="flex gap-2">
                  {VARIANTS.map((v) => (
                    <Button
                      key={v.value}
                      variant={variant === v.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setVariant(v.value)}
                    >
                      {v.value} — {v.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Largeur</Label>
                  <Select value={String(width)} onValueChange={(v) => setWidth(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1200">1200 (OG)</SelectItem>
                      <SelectItem value="800">800 (Square)</SelectItem>
                      <SelectItem value="600">600 (Compact)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Hauteur</Label>
                  <Select value={String(height)} onValueChange={(v) => setHeight(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="630">630 (OG)</SelectItem>
                      <SelectItem value="800">800 (Square)</SelectItem>
                      <SelectItem value="315">315 (Twitter)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleGenerate} disabled={generating} className="w-full" size="lg">
            {generating ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Génération en cours…</>
            ) : (
              <><Zap className="h-4 w-4 mr-2" /> Générer l'image</>
            )}
          </Button>
        </div>

        {/* Preview Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Preview</CardTitle>
                <div className="flex gap-1">
                  {([
                    { key: "og", icon: Monitor, label: "OG" },
                    { key: "mobile", icon: Smartphone, label: "Mobile" },
                    { key: "sms", icon: MessageSquare, label: "SMS" },
                  ] as const).map((d) => (
                    <Button
                      key={d.key}
                      variant={previewDevice === d.key ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setPreviewDevice(d.key)}
                    >
                      <d.icon className="h-3 w-3 mr-1" /> {d.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {result?.image_url ? (
                <div className="space-y-3">
                  {/* OG Preview */}
                  {previewDevice === "og" && (
                    <div className="rounded-lg overflow-hidden border border-border">
                      <img src={result.image_url} alt="OG Preview" className="w-full aspect-[1200/630] object-cover" />
                      <div className="p-3 bg-muted/50 border-t border-border">
                        <p className="text-xs text-muted-foreground">go.unpro.ca</p>
                        <p className="text-sm font-medium">{result.title}</p>
                        <p className="text-xs text-muted-foreground">{result.subtitle}</p>
                      </div>
                    </div>
                  )}

                  {/* Mobile iMessage Preview */}
                  {previewDevice === "mobile" && (
                    <div className="max-w-[280px] mx-auto">
                      <div className="rounded-2xl overflow-hidden border border-border bg-card">
                        <img src={result.image_url} alt="Mobile Preview" className="w-full aspect-[1200/630] object-cover" />
                        <div className="p-2.5">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">go.unpro.ca</p>
                          <p className="text-xs font-medium mt-0.5 line-clamp-2">{result.title}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SMS Preview */}
                  {previewDevice === "sms" && (
                    <div className="max-w-[300px] mx-auto space-y-2">
                      <div className="bg-primary/10 rounded-2xl rounded-bl-md p-3 space-y-2">
                        <p className="text-sm">Bonjour! Voici votre diagnostic 👇</p>
                        <div className="rounded-xl overflow-hidden border border-border/50">
                          <img src={result.image_url} alt="SMS Preview" className="w-full aspect-[1200/630] object-cover" />
                          <div className="p-2 bg-card">
                            <p className="text-[10px] text-muted-foreground">go.unpro.ca</p>
                            <p className="text-xs font-medium">{result.title}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">{result.generation_time_ms}ms</Badge>
                      <Badge variant="outline" className="text-[10px]">{width}×{height}</Badge>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href={result.image_url} download={`unpro-og-${intent}.jpg`} target="_blank" rel="noreferrer">
                        <Download className="h-3 w-3 mr-1" /> Télécharger
                      </a>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="aspect-[1200/630] rounded-lg bg-muted/30 border-2 border-dashed border-border flex flex-col items-center justify-center gap-2">
                  <Image className="h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Configurez et générez</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
