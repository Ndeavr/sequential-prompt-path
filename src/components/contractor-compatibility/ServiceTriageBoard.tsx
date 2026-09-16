/**
 * UNPRO — Tri des services par glisser-déposer (3 colonnes).
 * Aucune donnée inventée : seules les puces réellement présentes sont affichées.
 */
import { useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Loader2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { serviceSlug, type ServiceSource } from "@/hooks/useDetectedContractorServices";

export type TriageStance = "unsorted" | "priority" | "accepted" | "not_wanted";

export interface ServiceEntry {
  stance: TriageStance;
  label?: string;
  source?: ServiceSource;
  order?: number;
  pending_review?: boolean;
  min_project_cents?: number | null;
}

export type ServiceEntries = Record<string, ServiceEntry>;

export const EMPTY_DETECTION_MESSAGE =
  "Nous n'avons pas encore pu confirmer vos services. Ajoutez votre service principal pour commencer.";

const COLUMNS: { stance: TriageStance; title: string; subtitle: string; tone: string }[] = [
  {
    stance: "unsorted",
    title: "À classer",
    subtitle: "Les services à confirmer : glissez-les dans la bonne colonne",
    tone: "border-border",
  },
  {
    stance: "priority",
    title: "Prioritaire",
    subtitle: "Les travaux que vous voulez recevoir en premier",
    tone: "border-primary/40",
  },
  {
    stance: "accepted",
    title: "Accepté",
    subtitle: "Les travaux que vous faites, sans être votre priorité",
    tone: "border-border",
  },
  {
    stance: "not_wanted",
    title: "Non recherché",
    subtitle: "Les travaux que vous ne voulez pas recevoir",
    tone: "border-destructive/30",
  },
];

export const SOURCE_LABEL: Record<ServiceSource, string> = {
  website: "Site Web",
  google: "Google",
  declared: "Déclaré",
  verified: "Vérifié",
};

interface Props {
  value: ServiceEntries;
  catalog: readonly { slug: string; label: string }[];
  onChange: (next: ServiceEntries) => void;
  loading?: boolean;
}

function labelOf(slug: string, entry: ServiceEntry, catalog: Props["catalog"]): string {
  return entry.label || catalog.find((c) => c.slug === slug)?.label || slug.replace(/[-_]+/g, " ");
}

function SortableChip({
  id,
  label,
  source,
  pending,
}: {
  id: string;
  label: string;
  source?: ServiceSource;
  pending?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={cn(
        "flex touch-none select-none items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground shadow-sm",
        isDragging && "opacity-40",
      )}
    >
      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0 flex-1 truncate capitalize">{label}</span>
      {source && (
        <span className="shrink-0 rounded-full border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {SOURCE_LABEL[source]}
        </span>
      )}
      {pending && (
        <span className="shrink-0 rounded-full border border-warning/40 px-1.5 py-0.5 text-[10px] font-medium text-warning">
          En attente
        </span>
      )}
    </div>
  );
}

function Column({
  stance,
  title,
  subtitle,
  tone,
  items,
  children,
}: {
  stance: TriageStance;
  title: string;
  subtitle: string;
  tone: string;
  items: string[];
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${stance}` });
  return (
    <section
      ref={setNodeRef}
      className={cn(
        "rounded-2xl border bg-card/60 p-3 transition-colors",
        tone,
        isOver && "border-primary bg-primary/5",
      )}
      aria-label={title}
    >
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      <div className="mt-3 space-y-2">
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>
      </div>
    </section>
  );
}

export default function ServiceTriageBoard({ value, catalog, onChange, loading }: Props) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<TriageStance, string>>({
    unsorted: "",
    priority: "",
    accepted: "",
    not_wanted: "",
  });
  const inputs = useRef<Partial<Record<TriageStance, HTMLInputElement | null>>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const columns = useMemo(() => {
    const map: Record<TriageStance, string[]> = { unsorted: [], priority: [], accepted: [], not_wanted: [] };
    Object.entries(value)
      .sort((a, b) => (a[1].order ?? 0) - (b[1].order ?? 0))
      .forEach(([slug, entry]) => map[entry.stance]?.push(slug));
    return map;
  }, [value]);

  function commit(next: Record<TriageStance, string[]>) {
    const out: ServiceEntries = {};
    (Object.keys(next) as TriageStance[]).forEach((stance) => {
      next[stance].forEach((slug, index) => {
        out[slug] = { ...value[slug], stance, order: index };
      });
    });
    onChange(out);
  }

  function columnOf(id: string): TriageStance | null {
    if (id.startsWith("column:")) return id.slice(7) as TriageStance;
    const entry = value[id];
    return entry ? entry.stance : null;
  }

  function handleDragStart(e: DragStartEvent) {
    setDragging(String(e.active.id));
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(8);
  }

  function handleDragEnd(e: DragEndEvent) {
    setDragging(null);
    const activeId = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    if (!overId) return;
    const from = columnOf(activeId);
    const to = columnOf(overId);
    if (!from || !to) return;

    const next: Record<TriageStance, string[]> = {
      priority: [...columns.priority],
      accepted: [...columns.accepted],
      not_wanted: [...columns.not_wanted],
    };

    if (from === to) {
      const oldIndex = next[from].indexOf(activeId);
      const newIndex = overId.startsWith("column:") ? next[to].length - 1 : next[to].indexOf(overId);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
      next[from] = arrayMove(next[from], oldIndex, newIndex);
    } else {
      next[from] = next[from].filter((s) => s !== activeId);
      const at = overId.startsWith("column:") ? next[to].length : Math.max(next[to].indexOf(overId), 0);
      next[to].splice(at, 0, activeId);
    }
    commit(next);
  }

  function addService(stance: TriageStance) {
    const raw = drafts[stance].trim();
    if (!raw) return;
    const known = catalog.find(
      (c) => c.label.localeCompare(raw, "fr", { sensitivity: "base" }) === 0 || c.slug === serviceSlug(raw),
    );
    const slug = known?.slug ?? serviceSlug(raw);
    setDrafts((d) => ({ ...d, [stance]: "" }));
    inputs.current[stance]?.focus();
    if (!slug || value[slug]) return;
    onChange({
      ...value,
      [slug]: {
        stance,
        label: known?.label ?? raw,
        source: "declared",
        order: columns[stance].length,
        pending_review: !known,
      },
    });
  }

  const total = Object.keys(value).length;

  return (
    <div className="space-y-3">
      {loading && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Lecture de vos services…
        </p>
      )}
      {!loading && total === 0 && (
        <p className="rounded-xl border border-dashed border-border bg-muted/30 p-3 text-sm text-muted-foreground">
          Aucun service détecté pour votre entreprise. Ajoutez vos services ci-dessous.
        </p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDragging(null)}
      >
        <div className="space-y-3">
          {COLUMNS.map((col) => (
            <Column key={col.stance} {...col} items={columns[col.stance]}>
              {columns[col.stance].length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
                  Glissez un service ici.
                </p>
              ) : (
                columns[col.stance].map((slug) => (
                  <SortableChip
                    key={slug}
                    id={slug}
                    label={labelOf(slug, value[slug], catalog)}
                    source={value[slug].source}
                    pending={value[slug].pending_review}
                  />
                ))
              )}

              <div className="flex items-center gap-2 pt-1">
                <Input
                  ref={(el) => { inputs.current[col.stance] = el; }}
                  list={`services-catalog-${col.stance}`}
                  value={drafts[col.stance]}
                  onChange={(e) => setDrafts((d) => ({ ...d, [col.stance]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addService(col.stance);
                    }
                  }}
                  placeholder="Ajouter un service…"
                  aria-label={`Ajouter un service dans ${col.title}`}
                  className="h-9 text-sm"
                />
                <button
                  type="button"
                  onClick={() => addService(col.stance)}
                  aria-label={`Ajouter dans ${col.title}`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <datalist id={`services-catalog-${col.stance}`}>
                  {catalog
                    .filter((c) => !value[c.slug])
                    .map((c) => (
                      <option key={c.slug} value={c.label} />
                    ))}
                </datalist>
              </div>
            </Column>
          ))}
        </div>

        <DragOverlay>
          {dragging && value[dragging] ? (
            <div className="flex items-center gap-2 rounded-xl border border-primary bg-background px-3 py-2.5 text-sm text-foreground shadow-lg">
              <GripVertical className="h-4 w-4 text-muted-foreground" aria-hidden />
              <span className="capitalize">{labelOf(dragging, value[dragging], catalog)}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
