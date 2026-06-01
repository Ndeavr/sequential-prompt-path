/**
 * VisualAnalysisCanvas — Image + AI overlay annotations.
 */
import AIAnnotationLayer, { type Annotation } from "./AIAnnotationLayer";

interface Props {
  imageUrl: string;
  annotations: Annotation[];
  loading?: boolean;
}

export default function VisualAnalysisCanvas({ imageUrl, annotations, loading }: Props) {
  return (
    <div className="relative w-full rounded-[28px] overflow-hidden bg-black/40
      border border-white/[0.06] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)]">
      <div className="relative w-full aspect-[4/3]">
        <img
          src={imageUrl}
          alt="Analyse visuelle"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {!loading && <AIAnnotationLayer annotations={annotations} />}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="text-white/85 text-sm tracking-wide flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              Analyse en cours…
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
