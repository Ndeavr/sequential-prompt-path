import { Icon } from "lucide-react";

/**
 * CameraPlus (lucide) — the installed lucide-react (0.462.0) does not ship this
 * glyph, so it is rendered through lucide's own <Icon> renderer with the lucide
 * camera body and a centred plus, keeping stroke, size and props behaviour
 * identical to the rest of the library.
 */
const cameraPlusNode: Array<[string, Record<string, string>]> = [
  ["path", { d: "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" }],
  ["path", { d: "M12 11v4" }],
  ["path", { d: "M10 13h4" }],
];

export function CameraPlusIcon({ className }: { className?: string }) {
  return <Icon iconNode={cameraPlusNode} className={className} aria-hidden="true" />;
}
