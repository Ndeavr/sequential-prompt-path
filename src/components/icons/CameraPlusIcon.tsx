/**
 * CameraPlus glyph (lucide) — the installed lucide-react (0.462.0) does not ship
 * this icon, so it is drawn with lucide's own camera body plus a centred plus and
 * lucide's default stroke attributes, keeping size and colour behaviour identical
 * to the rest of the library.
 */
export function CameraPlusIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <path d="M12 11v4" />
      <path d="M10 13h4" />
    </svg>
  );
}
