/**
 * UNPRO Design — Left Sidebar
 * Original image, version tree, frozen versions, compare mode, history
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Image, GitBranch, Lock, Columns, History, ChevronRight,
  Snowflake, Copy, Plus, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DesignVersion } from "./data";

interface Props {
  originalImage: string | null;
  versions: DesignVersion[];
  activeVersionId: string | null;
  onSelectVersion: (id: string) => void;
  onFreezeVersion: (id: string) => void;
  onDuplicateVersion: (id: string) => void;
  onCompareMode: () => void;
  isComparing: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export default function DesignSidebar({
  originalImage,
  versions,
  activeVersionId,
  onSelectVersion,
  onFreezeVersion,
  onDuplicateVersion,
  onCompareMode,
  isComparing,
  isOpen,
  onClose,
}: Props) {
  const [expandedSection, setExpandedSection] = useState<string | null>("versions");

  const frozenVersions = versions.filter((v) => v.frozen);
  const allVersions = versions;

  const toggleSection = (key: string) =>
    setExpandedSection(expandedSection === key ? null : key);

  const SectionHeader = ({
    icon: Icon,
    label,
    sectionKey,
    count,
  }: {
    icon: any;
    label: string;
    sectionKey: string;
    count?: number;
  }) => (
    <button
      onClick={() => toggleSection(sectionKey)}
      className="flex items-center justify-between w-full px-4 py-3 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center gap-2.5 text-sm font-medium text-foreground">
        <Icon className="w-4 h-4 text-muted-foreground" />
        {label}
        {count !== undefined && (
          <Badge variant="secondary" className="text-xs h-5 px-1.5">
            {count}
          </Badge>
        )}
      </div>
      <ChevronRight
        className={`w-4 h-4 text-muted-foreground transition-transform ${
          expandedSection === sectionKey ? "rotate-90" : ""
        }`}
      />
    </button>
  );

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ x: isOpen ? 0 : -320 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className={`
          fixed lg:relative top-0 left-0 h-full z-50 lg:z-auto
          w-72 bg-card border-r border-border flex flex-col
          lg:translate-x-0
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold text-foreground font-display">Projet</span>
          <button onClick={onClose} className="lg:hidden p-1 rounded-md hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Original Image */}
          {originalImage && (
            <div className="p-4 border-b border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                Photo originale
              </p>
              <div className="rounded-xl overflow-hidden border border-border">
                <img
                  src={originalImage}
                  alt="Original"
                  className="w-full h-32 object-cover"
                />
              </div>
            </div>
          )}

          {/* Version Tree */}
          <SectionHeader
            icon={GitBranch}
            label="Versions"
            sectionKey="versions"
            count={allVersions.length}
          />
          <AnimatePresence>
            {expandedSection === "versions" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-3 space-y-1.5">
                  {allVersions.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => onSelectVersion(v.id)}
                      className={`
                        w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm
                        transition-all duration-200
                        ${activeVersionId === v.id
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "hover:bg-muted/60 text-foreground"
                        }
                      `}
                    >
                      <span
                        className="text-xs font-mono font-semibold min-w-[2rem]"
                        style={{ paddingLeft: v.parentVersionId ? "0.75rem" : 0 }}
                      >
                        V{v.versionNumber}
                      </span>
                      <span className="truncate flex-1 text-xs text-muted-foreground">
                        {v.styleLabel || v.promptUsed?.slice(0, 30)}
                      </span>
                      {v.frozen && (
                        <Snowflake className="w-3.5 h-3.5 text-accent shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Frozen Versions */}
          <SectionHeader
            icon={Lock}
            label="Gelées"
            sectionKey="frozen"
            count={frozenVersions.length}
          />
          <AnimatePresence>
            {expandedSection === "frozen" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-3 space-y-1.5">
                  {frozenVersions.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">
                      Aucune version gelée
                    </p>
                  ) : (
                    frozenVersions.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/5 border border-accent/10"
                      >
                        <Snowflake className="w-3.5 h-3.5 text-accent" />
                        <span className="text-xs font-medium text-foreground">
                          V{v.versionNumber}
                        </span>
                        <span className="text-xs text-muted-foreground truncate flex-1">
                          {v.styleLabel}
                        </span>
                        <button
                          onClick={() => onDuplicateVersion(v.id)}
                          className="p-1 hover:bg-muted rounded"
                          title="Éditer depuis cette version"
                        >
                          <Copy className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Compare */}
          <SectionHeader icon={Columns} label="Comparer" sectionKey="compare" />
          {expandedSection === "compare" && (
            <div className="px-4 pb-3">
              <Button
                variant={isComparing ? "default" : "outline"}
                size="sm"
                className="w-full gap-2"
                onClick={onCompareMode}
              >
                <Columns className="w-4 h-4" />
                {isComparing ? "Quitter la comparaison" : "Mode comparaison"}
              </Button>
            </div>
          )}

          {/* History */}
          <SectionHeader icon={History} label="Historique" sectionKey="history" />
          {expandedSection === "history" && (
            <div className="px-4 pb-3">
              <p className="text-xs text-muted-foreground">
                {allVersions.length} version{allVersions.length > 1 ? "s" : ""} créée{allVersions.length > 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      </motion.aside>
    </>
  );
}
