/**
 * UNPRO Design — Main Page
 * Routes between upload and workspace states, using useDesignProject hook
 */
import { useCallback } from "react";
import { Helmet } from "react-helmet-async";
import DesignUpload from "@/components/design/DesignUpload";
import DesignWorkspace from "@/components/design/DesignWorkspace";
import { useDesignProject } from "@/hooks/useDesignProject";

export default function DesignPage() {
  const {
    projectId,
    originalImage,
    roomType,
    versions,
    activeVersion,
    activeVersionId,
    isGenerating,
    error,
    shareToken,
    usageLimitHit,
    uploadPhoto,
    generate,
    freezeVersion,
    duplicateVersion,
    selectVersion,
    reset,
    createShare,
    clearUsageLimit,
  } = useDesignProject();

  const handleUpload = useCallback(
    (file: File, selectedRoom?: string) => {
      uploadPhoto(file, selectedRoom);
    },
    [uploadPhoto]
  );

  return (
    <>
      <Helmet>
        <title>UNPRO Design — Transformez votre espace</title>
        <meta
          name="description"
          content="Outil de design IA premium pour planifier vos rénovations. Téléversez une photo, générez des concepts, comparez et lancez votre projet."
        />
      </Helmet>

      {originalImage ? (
        <DesignWorkspace
          originalImage={originalImage}
          roomType={roomType}
          versions={versions}
          activeVersionId={activeVersionId}
          activeVersion={activeVersion}
          isGenerating={isGenerating}
          error={error}
          projectId={projectId}
          shareToken={shareToken}
          onBack={reset}
          onGenerate={generate}
          onFreeze={freezeVersion}
          onDuplicate={duplicateVersion}
          onSelectVersion={selectVersion}
          onCreateShare={createShare}
        />
      ) : (
        <DesignUpload onUpload={handleUpload} />
      )}
    </>
  );
}
