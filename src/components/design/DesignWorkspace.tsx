/**
 * UNPRO Design — Main Workspace Layout
 * Orchestrates Sidebar + Canvas + Controls + Compare + Share + SignupPrompt
 */
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, ArrowLeft, Sparkles, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import DesignSidebar from "./DesignSidebar";
import DesignCanvas from "./DesignCanvas";
import DesignControls from "./DesignControls";
import DesignCompare from "./DesignCompare";
import DesignShare from "./DesignShare";
import DesignUpgradeModal from "./DesignUpgradeModal";
import DesignSignupPrompt from "./DesignSignupPrompt";
import type { DesignVersion } from "./data";

interface Props {
  originalImage: string;
  roomType: string | null;
  versions: DesignVersion[];
  activeVersionId: string | null;
  activeVersion: DesignVersion | null;
  isGenerating: boolean;
  error: string | null;
  projectId: string | null;
  shareToken: string | null;
  usageLimitHit: { current: number; limit: number } | null;
  onBack: () => void;
  onGenerate: (prompt: string, options?: any) => void;
  onFreeze: (id: string) => void;
  onDuplicate: (id: string) => void;
  onSelectVersion: (id: string) => void;
  onCreateShare: (privacyType: string) => Promise<string | null>;
  onClearUsageLimit: () => void;
}

export default function DesignWorkspace({
  originalImage,
  roomType,
  versions,
  activeVersionId,
  activeVersion,
  isGenerating,
  error,
  projectId,
  shareToken,
  usageLimitHit,
  onBack,
  onGenerate,
  onFreeze,
  onDuplicate,
  onSelectVersion,
  onCreateShare,
  onClearUsageLimit,
}: Props) {
  const { user } = useAuth();
  const [isComparing, setIsComparing] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  // Show signup prompt when generation starts (if not logged in)
  useEffect(() => {
    if (isGenerating && !user) {
      const timer = setTimeout(() => setShowSignup(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [isGenerating, user]);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
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
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
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
            {versions.length} version{versions.length !== 1 ? "s" : ""}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8"
            onClick={() => setIsComparing(true)}
            disabled={versions.filter((v) => v.imageUrl).length < 2}
          >
            Comparer
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5"
            onClick={() => setIsSharing(true)}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Partager</span>
          </Button>
          <Button size="sm" className="text-xs h-8 gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Créer le brief
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Left Sidebar — hidden on mobile */}
        <div className="hidden lg:block">
          <DesignSidebar
            originalImage={originalImage}
            versions={versions}
            activeVersionId={activeVersionId}
            onSelectVersion={onSelectVersion}
            onFreezeVersion={onFreeze}
            onDuplicateVersion={onDuplicate}
            onCompareMode={() => setIsComparing(true)}
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
            onSelectVersion(id);
            setSidebarOpen(false);
          }}
          onFreezeVersion={onFreeze}
          onDuplicateVersion={onDuplicate}
          onCompareMode={() => setIsComparing(true)}
          isComparing={isComparing}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Center Canvas — give it a minimum height on mobile */}
        <div className="flex-1 min-h-[40vh] lg:min-h-0">
          <DesignCanvas
            originalImage={originalImage}
            activeVersion={activeVersion}
            isGenerating={isGenerating}
            error={error}
            onFreeze={() => activeVersionId && onFreeze(activeVersionId)}
            onDuplicate={() => activeVersionId && onDuplicate(activeVersionId)}
            onShare={() => setIsSharing(true)}
          />
        </div>

        {/* Right Controls — desktop */}
        <div className="hidden lg:block">
          <DesignControls
            onSendPrompt={onGenerate}
            isGenerating={isGenerating}
            roomType={roomType}
          />
        </div>

        {/* Mobile Bottom Controls — scrollable */}
        <div className="lg:hidden max-h-[50vh] overflow-y-auto border-t border-border">
          <DesignControls
            onSendPrompt={onGenerate}
            isGenerating={isGenerating}
            roomType={roomType}
          />
        </div>
      </div>

      {/* Compare Overlay */}
      <AnimatePresence>
        {isComparing && (
          <DesignCompare
            versions={versions}
            originalImage={originalImage}
            onClose={() => setIsComparing(false)}
            onFreeze={onFreeze}
            onSelect={onSelectVersion}
          />
        )}
        {isSharing && (
          <DesignShare
            projectId={projectId}
            onClose={() => setIsSharing(false)}
            onCreateShare={onCreateShare}
            existingToken={shareToken}
          />
        )}
        {usageLimitHit && (
          <DesignUpgradeModal
            currentCount={usageLimitHit.current}
            limit={usageLimitHit.limit}
            onClose={onClearUsageLimit}
          />
        )}
      </AnimatePresence>

      {/* Signup prompt during generation */}
      <DesignSignupPrompt
        isOpen={showSignup}
        onClose={() => setShowSignup(false)}
      />
    </div>
  );
}
