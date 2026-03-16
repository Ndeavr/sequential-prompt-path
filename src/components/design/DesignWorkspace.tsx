/**
 * UNPRO Design — Main Workspace Layout
 * Orchestrates Sidebar + Canvas + Controls
 */
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Menu, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import DesignSidebar from "./DesignSidebar";
import DesignCanvas from "./DesignCanvas";
import DesignControls from "./DesignControls";
import { MOCK_VERSIONS, type DesignVersion } from "./data";

interface Props {
  originalImage: string;
  roomType: string | null;
  onBack: () => void;
}

export default function DesignWorkspace({ originalImage, roomType, onBack }: Props) {
  const [versions, setVersions] = useState<DesignVersion[]>(MOCK_VERSIONS);
  const [activeVersionId, setActiveVersionId] = useState<string>(MOCK_VERSIONS[0]?.id || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeVersion = versions.find((v) => v.id === activeVersionId) || null;

  const handleFreezeVersion = useCallback((id: string) => {
    setVersions((prev) =>
      prev.map((v) => (v.id === id ? { ...v, frozen: true } : v))
    );
  }, []);

  const handleDuplicateVersion = useCallback((id: string) => {
    const source = versions.find((v) => v.id === id);
    if (!source) return;
    const newVersion: DesignVersion = {
      id: `${id}-copy-${Date.now()}`,
      versionNumber: `${source.versionNumber}.${versions.filter((v) => v.parentVersionId === id).length + 1}`,
      imageUrl: source.imageUrl,
      promptUsed: source.promptUsed,
      frozen: false,
      styleLabel: source.styleLabel,
      budgetMode: source.budgetMode,
      parentVersionId: id,
      createdAt: new Date().toISOString(),
    };
    setVersions((prev) => [...prev, newVersion]);
    setActiveVersionId(newVersion.id);
  }, [versions]);

  const handleSendPrompt = useCallback(
    async (prompt: string, options?: any) => {
      setIsGenerating(true);
      // Simulate AI generation
      await new Promise((resolve) => setTimeout(resolve, 2500));

      const baseNum = versions.length + 1;
      const newVersions: DesignVersion[] = [1, 2, 3].map((i) => ({
        id: `gen-${Date.now()}-${i}`,
        versionNumber: `${baseNum + i - 1}`,
        imageUrl: null, // Would be AI-generated URL
        promptUsed: prompt,
        frozen: false,
        styleLabel: options?.style || null,
        budgetMode: options?.budget || null,
        parentVersionId: activeVersionId,
        createdAt: new Date().toISOString(),
      }));

      setVersions((prev) => [...prev, ...newVersions]);
      setActiveVersionId(newVersions[0].id);
      setIsGenerating(false);
    },
    [versions, activeVersionId]
  );

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/80 backdrop-blur-sm z-30">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-4 h-4" />
          </Button>
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Retour</span>
          </button>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-display font-semibold text-foreground">
              UNPRO Design
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {versions.length} version{versions.length > 1 ? "s" : ""}
          </span>
          <Button variant="outline" size="sm" className="text-xs h-8">
            Partager
          </Button>
          <Button size="sm" className="text-xs h-8 gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Créer le brief
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Left Sidebar — hidden on mobile, shown via drawer */}
        <div className="hidden lg:block">
          <DesignSidebar
            originalImage={originalImage}
            versions={versions}
            activeVersionId={activeVersionId}
            onSelectVersion={setActiveVersionId}
            onFreezeVersion={handleFreezeVersion}
            onDuplicateVersion={handleDuplicateVersion}
            onCompareMode={() => setIsComparing(!isComparing)}
            isComparing={isComparing}
            isOpen={true}
            onClose={() => {}}
          />
        </div>

        {/* Mobile Sidebar Drawer */}
        <DesignSidebar
          originalImage={originalImage}
          versions={versions}
          activeVersionId={activeVersionId}
          onSelectVersion={(id) => {
            setActiveVersionId(id);
            setSidebarOpen(false);
          }}
          onFreezeVersion={handleFreezeVersion}
          onDuplicateVersion={handleDuplicateVersion}
          onCompareMode={() => setIsComparing(!isComparing)}
          isComparing={isComparing}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Center Canvas */}
        <DesignCanvas
          originalImage={originalImage}
          activeVersion={activeVersion}
          isGenerating={isGenerating}
          onFreeze={() => activeVersionId && handleFreezeVersion(activeVersionId)}
          onDuplicate={() => activeVersionId && handleDuplicateVersion(activeVersionId)}
          onShare={() => {}}
        />

        {/* Right Controls — Sheet on mobile */}
        <div className="hidden lg:block">
          <DesignControls
            onSendPrompt={handleSendPrompt}
            isGenerating={isGenerating}
            roomType={roomType}
          />
        </div>
      </div>

      {/* Mobile Bottom Controls */}
      <div className="lg:hidden">
        <DesignControls
          onSendPrompt={handleSendPrompt}
          isGenerating={isGenerating}
          roomType={roomType}
        />
      </div>
    </div>
  );
}
