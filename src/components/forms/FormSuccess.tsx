import { CheckCircle2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface Props {
  referenceCode?: string;
  title?: string;
  message?: string;
  onReset?: () => void;
}

export function FormSuccess({ referenceCode, title, message, onReset }: Props) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!referenceCode) return;
    try { await navigator.clipboard.writeText(referenceCode); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };

  return (
    <div className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur p-8 text-center animate-in fade-in zoom-in-95 duration-300">
      <div className="mx-auto w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mb-4">
        <CheckCircle2 className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-xl font-semibold mb-2">{title || 'Demande envoyée'}</h3>
      <p className="text-sm text-muted-foreground mb-5">
        {message || 'Notre équipe vous contactera rapidement.'}
      </p>
      {referenceCode && (
        <button
          type="button" onClick={copy}
          className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-xs font-mono hover:border-primary/40 transition"
        >
          <span className="text-muted-foreground">Référence</span>
          <span className="font-semibold">{referenceCode}</span>
          <Copy className="w-3 h-3 opacity-60" />
          {copied && <span className="text-primary">Copié</span>}
        </button>
      )}
      {onReset && (
        <div className="mt-6">
          <Button variant="outline" size="sm" onClick={onReset}>Envoyer une autre demande</Button>
        </div>
      )}
    </div>
  );
}
