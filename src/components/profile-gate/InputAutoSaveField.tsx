import { useState, useCallback, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  field: string;
  label: string;
  placeholder?: string;
  initialValue?: string;
  type?: string;
  onSave: (field: string, value: string) => Promise<unknown>;
}

export default function InputAutoSaveField({
  field,
  label,
  placeholder,
  initialValue = "",
  type = "text",
  onSave,
}: Props) {
  const [value, setValue] = useState(initialValue);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus first empty field
  useEffect(() => {
    if (!initialValue && inputRef.current) {
      inputRef.current.focus();
    }
  }, [initialValue]);

  const debouncedSave = useCallback(
    (val: string) => {
      if (timer.current) clearTimeout(timer.current);
      if (val.trim().length < 2) return;

      timer.current = setTimeout(async () => {
        setStatus("saving");
        try {
          await onSave(field, val.trim());
          setStatus("saved");
          setTimeout(() => setStatus("idle"), 2000);
        } catch {
          setStatus("error");
        }
      }, 600);
    },
    [field, onSave]
  );

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="relative">
        <Input
          ref={inputRef}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            setValue(e.target.value);
            debouncedSave(e.target.value);
          }}
          className={cn(
            "pr-8 transition-colors",
            status === "saved" && "border-green-500/50",
            status === "error" && "border-destructive/50"
          )}
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
          {status === "saving" && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          {status === "saved" && <Check className="h-3.5 w-3.5 text-green-500" />}
        </div>
      </div>
    </div>
  );
}
