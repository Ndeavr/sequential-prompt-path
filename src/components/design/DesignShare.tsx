/**
 * UNPRO Design — Share Modal
 * Create and manage share links for design projects
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Link2, Copy, Check, Globe, Lock, Clock, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

interface Props {
  projectId: string | null;
  onClose: () => void;
  onCreateShare: (privacyType: string) => Promise<string | null>;
  existingToken?: string | null;
}

export default function DesignShare({ projectId, onClose, onCreateShare, existingToken }: Props) {
  const [isCreating, setIsCreating] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(existingToken || null);
  const [copied, setCopied] = useState(false);
  const [privacyType, setPrivacyType] = useState<"private" | "public">("private");

  const shareUrl = shareToken
    ? `${window.location.origin}/design/share/${shareToken}`
    : null;

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const token = await onCreateShare(privacyType);
      if (token) {
        setShareToken(token);
        toast({ title: "Lien créé", description: "Partagez ce lien avec vos proches." });
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copié !", description: "Le lien est dans votre presse-papiers." });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-primary" />
            <h3 className="font-display font-semibold text-foreground text-sm">Partager le projet</h3>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {/* Privacy selector */}
          {!shareToken && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Mode de partage</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPrivacyType("private")}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left ${
                    privacyType === "private"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <Lock className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-foreground">Privé</p>
                    <p className="text-[10px] text-muted-foreground">Lien unique</p>
                  </div>
                </button>
                <button
                  onClick={() => setPrivacyType("public")}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left ${
                    privacyType === "public"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <Globe className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-foreground">Public</p>
                    <p className="text-[10px] text-muted-foreground">Communauté</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Create or Show link */}
          {shareToken && shareUrl ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border">
                <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
                <Input
                  value={shareUrl}
                  readOnly
                  className="border-0 bg-transparent text-xs h-auto p-0 focus-visible:ring-0"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={handleCopy}
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px] gap-1">
                  {privacyType === "private" ? (
                    <><Lock className="w-2.5 h-2.5" />Privé</>
                  ) : (
                    <><Globe className="w-2.5 h-2.5" />Public</>
                  )}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  Les visiteurs pourront voter et commenter
                </span>
              </div>
            </div>
          ) : (
            <Button
              onClick={handleCreate}
              disabled={isCreating || !projectId}
              className="w-full gap-2"
              size="sm"
            >
              <Link2 className="w-4 h-4" />
              {isCreating ? "Création..." : "Créer le lien de partage"}
            </Button>
          )}

          {!projectId && (
            <p className="text-xs text-muted-foreground text-center">
              Connectez-vous et générez un design pour partager votre projet.
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
