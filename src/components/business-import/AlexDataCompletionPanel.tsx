import { useState, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send, Upload, Camera, Mic, Loader2, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { MissingField } from "@/services/profileCompletionService";

interface Props {
  currentField: MissingField | null;
  onFieldCompleted: (field: string, value: string | File) => void;
  isProcessing?: boolean;
}

export default function AlexDataCompletionPanel({ currentField, onFieldCompleted, isProcessing }: Props) {
  const [textValue, setTextValue] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isFileField = currentField?.field === "photos" || currentField?.field === "logo_url";
  const isLongText = currentField?.field === "description_long" || currentField?.field === "description_short";

  const handleTextSubmit = useCallback(() => {
    if (!currentField || !textValue.trim()) return;
    onFieldCompleted(currentField.field, textValue.trim());
    setTextValue("");
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 1500);
  }, [currentField, textValue, onFieldCompleted]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentField) return;
    onFieldCompleted(currentField.field, file);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 1500);
  }, [currentField, onFieldCompleted]);

  if (!currentField) {
    return (
      <Card className="border-primary/20 bg-primary/3">
        <CardContent className="p-5 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-3">
            <MessageCircle className="h-6 w-6 text-primary-foreground" />
          </div>
          <h3 className="font-bold text-foreground mb-1">Alex est prêt</h3>
          <p className="text-sm text-muted-foreground">
            Sélectionnez un champ manquant ci-dessus et Alex vous guidera pour le compléter.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div key={currentField.field} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
        <Card className="border-primary/20 overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 to-secondary/5 p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
              <MessageCircle className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <p className="text-xs font-bold text-primary mb-0.5">Alex</p>
              <p className="text-sm text-foreground leading-relaxed">{currentField.alexPrompt}</p>
            </div>
          </div>

          <CardContent className="p-4 space-y-3">
            {showSuccess ? (
              <motion.div
                className="flex items-center justify-center gap-2 py-4 text-success"
                initial={{ scale: 0.8 }} animate={{ scale: 1 }}
              >
                <CheckCircle className="h-5 w-5" />
                <span className="font-bold text-sm">Ajouté avec succès!</span>
              </motion.div>
            ) : (
              <>
                {isFileField ? (
                  <div className="space-y-2">
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 h-12"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessing}
                      >
                        <Upload className="h-4 w-4 mr-2" /> Choisir un fichier
                      </Button>
                      <Button
                        variant="outline"
                        className="h-12"
                        onClick={() => {
                          if (fileInputRef.current) {
                            fileInputRef.current.setAttribute("capture", "environment");
                            fileInputRef.current.click();
                            fileInputRef.current.removeAttribute("capture");
                          }
                        }}
                        disabled={isProcessing}
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : isLongText ? (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Tapez votre réponse..."
                      value={textValue}
                      onChange={(e) => setTextValue(e.target.value)}
                      rows={4}
                      className="resize-none"
                    />
                    <Button
                      className="w-full h-10 font-bold"
                      onClick={handleTextSubmit}
                      disabled={!textValue.trim() || isProcessing}
                    >
                      {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                      Enregistrer
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Votre réponse..."
                      value={textValue}
                      onChange={(e) => setTextValue(e.target.value)}
                      className="h-11"
                      onKeyDown={(e) => e.key === "Enter" && handleTextSubmit()}
                    />
                    <Button
                      size="icon"
                      className="h-11 w-11 flex-shrink-0"
                      onClick={handleTextSubmit}
                      disabled={!textValue.trim() || isProcessing}
                    >
                      {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
