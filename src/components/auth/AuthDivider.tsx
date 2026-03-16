/**
 * UNPRO — Auth Divider (ou / or)
 */
export default function AuthDivider({ text = "ou" }: { text?: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="h-px flex-1" style={{ background: "#DFE9F5" }} />
      <span className="text-xs font-medium" style={{ color: "#6C7A92" }}>{text}</span>
      <div className="h-px flex-1" style={{ background: "#DFE9F5" }} />
    </div>
  );
}
