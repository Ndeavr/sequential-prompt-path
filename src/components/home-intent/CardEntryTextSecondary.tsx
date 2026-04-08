/**
 * CardEntryTextSecondary — Smart text input to describe a need.
 */
import { useState, useCallback } from "react";
import { ArrowRight } from "lucide-react";

interface Props {
  onSubmit: (text: string) => void;
}

export default function CardEntryTextSecondary({ onSubmit }: Props) {
  const [value, setValue] = useState("");

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed) onSubmit(trimmed);
  }, [value, onSubmit]);

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        placeholder="Ex: Isolation grenier, urgence plomberie…"
        className="w-full h-14 rounded-2xl pl-5 pr-14
          bg-muted/50 border border-border/60 text-foreground
          placeholder:text-muted-foreground text-body
          focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50
          transition-all duration-200"
      />
      <button
        onClick={handleSubmit}
        disabled={!value.trim()}
        className="absolute right-2 top-1/2 -translate-y-1/2
          w-10 h-10 rounded-xl bg-primary text-primary-foreground
          flex items-center justify-center
          disabled:opacity-30 hover:bg-primary/90 active:scale-95
          transition-all duration-150"
      >
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
