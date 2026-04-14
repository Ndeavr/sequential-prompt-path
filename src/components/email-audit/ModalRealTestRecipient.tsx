/**
 * UNPRO — Modal to input test email recipient
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, SendHorizonal } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSend: (email: string) => void;
  isSending: boolean;
}

const ModalRealTestRecipient = ({ open, onClose, onSend, isSending }: Props) => {
  const [email, setEmail] = useState("admin@unpro.ca");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Test réel d'envoi</DialogTitle>
          <DialogDescription>Entrez l'adresse de destination pour le test de délivrabilité.</DialogDescription>
        </DialogHeader>
        <Input
          type="email"
          placeholder="email@exemple.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2"
        />
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={isSending}>Annuler</Button>
          <Button
            onClick={() => onSend(email)}
            disabled={!email || isSending}
            className="gap-2"
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
            Envoyer le test
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ModalRealTestRecipient;
