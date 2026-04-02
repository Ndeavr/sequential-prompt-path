/**
 * UNPRO — Auth Divider (ou / or)
 */
export default function AuthDivider({ text = "ou" }: { text?: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{text}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
