/**
 * UNPRO Design — Main Page
 * Routes between upload and workspace states
 */
import { useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import DesignUpload from "@/components/design/DesignUpload";
import DesignWorkspace from "@/components/design/DesignWorkspace";

export default function DesignPage() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [roomType, setRoomType] = useState<string | null>(null);
  const [isWorkspace, setIsWorkspace] = useState(false);

  const handleUpload = useCallback((file: File, selectedRoom?: string) => {
    const reader = new FileReader();
    reader.onload = () => {
      setOriginalImage(reader.result as string);
      setRoomType(selectedRoom ?? null);
      setIsWorkspace(true);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleBack = useCallback(() => {
    setIsWorkspace(false);
    setOriginalImage(null);
    setRoomType(null);
  }, []);

  return (
    <>
      <Helmet>
        <title>UNPRO Design — Transformez votre espace</title>
        <meta
          name="description"
          content="Outil de design IA premium pour planifier vos rénovations. Téléversez une photo, générez des concepts, comparez et lancez votre projet."
        />
      </Helmet>

      {isWorkspace && originalImage ? (
        <DesignWorkspace
          originalImage={originalImage}
          roomType={roomType}
          onBack={handleBack}
        />
      ) : (
        <DesignUpload onUpload={handleUpload} />
      )}
    </>
  );
}
