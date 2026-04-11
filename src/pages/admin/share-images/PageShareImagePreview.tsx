import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Smartphone, Monitor, MessageSquare, Share2, Globe } from "lucide-react";

type PreviewPlatform = "facebook" | "twitter" | "linkedin" | "imessage" | "whatsapp" | "sms";

const PLATFORMS: { key: PreviewPlatform; label: string; icon: typeof Globe; aspect: string }[] = [
  { key: "facebook", label: "Facebook", icon: Globe, aspect: "1200/630" },
  { key: "twitter", label: "Twitter / X", icon: Share2, aspect: "1200/628" },
  { key: "linkedin", label: "LinkedIn", icon: Globe, aspect: "1200/627" },
  { key: "imessage", label: "iMessage", icon: MessageSquare, aspect: "1200/630" },
  { key: "whatsapp", label: "WhatsApp", icon: MessageSquare, aspect: "1200/630" },
  { key: "sms", label: "SMS / RCS", icon: Smartphone, aspect: "1200/630" },
];

export default function PageShareImagePreview() {
  const navigate = useNavigate();
  const [imageUrl, setImageUrl] = useState("");
  const [title, setTitle] = useState("Trouvez le bon entrepreneur");
  const [description, setDescription] = useState("UNPRO — Services résidentiels intelligents");
  const [linkUrl, setLinkUrl] = useState("go.unpro.ca/toiture/laval");

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/share-images")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold font-display">Preview multi-plateforme</h1>
          <p className="text-sm text-muted-foreground">Testez le rendu sur chaque canal</p>
        </div>
      </div>

      {/* Image URL input */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="space-y-2">
            <Label>URL de l'image OG</Label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://... ou data:image/..." />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Titre OG</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>URL du lien</Label>
              <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Platform previews */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PLATFORMS.map((p) => (
          <Card key={p.key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs flex items-center gap-2">
                <p.icon className="h-3.5 w-3.5" /> {p.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              {p.key === "imessage" || p.key === "sms" ? (
                /* Bubble style */
                <div className="max-w-[260px]">
                  <div className="bg-primary/10 rounded-2xl rounded-bl-md p-2.5 space-y-1.5">
                    <p className="text-xs">Bonjour! Voici votre lien 👇</p>
                    <div className="rounded-xl overflow-hidden border border-border/40">
                      {imageUrl ? (
                        <img src={imageUrl} alt="Preview" className="w-full aspect-[1200/630] object-cover" />
                      ) : (
                        <div className="w-full aspect-[1200/630] bg-muted" />
                      )}
                      <div className="p-2 bg-card">
                        <p className="text-[9px] text-muted-foreground uppercase">{linkUrl}</p>
                        <p className="text-[11px] font-medium line-clamp-2">{title}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : p.key === "whatsapp" ? (
                <div className="max-w-[260px]">
                  <div className="bg-emerald-500/10 rounded-lg p-2.5 space-y-1.5">
                    <div className="rounded-lg overflow-hidden border border-border/40">
                      {imageUrl ? (
                        <img src={imageUrl} alt="Preview" className="w-full aspect-[1200/630] object-cover" />
                      ) : (
                        <div className="w-full aspect-[1200/630] bg-muted" />
                      )}
                      <div className="p-2 bg-card">
                        <p className="text-[9px] text-muted-foreground">{linkUrl}</p>
                        <p className="text-[11px] font-medium">{title}</p>
                        <p className="text-[10px] text-muted-foreground line-clamp-2">{description}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Standard card */
                <div className="rounded-lg overflow-hidden border border-border">
                  {imageUrl ? (
                    <img src={imageUrl} alt="Preview" className="w-full aspect-[1200/630] object-cover" />
                  ) : (
                    <div className="w-full aspect-[1200/630] bg-muted" />
                  )}
                  <div className="p-2.5 bg-muted/30 border-t border-border">
                    <p className="text-[9px] text-muted-foreground uppercase">{linkUrl}</p>
                    <p className="text-xs font-medium line-clamp-2">{title}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-2">{description}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
