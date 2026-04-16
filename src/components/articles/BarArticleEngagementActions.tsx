/**
 * UNPRO — Compact engagement bar (like, share, download).
 */
import { Heart, Share2, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useArticleEngagement } from "@/hooks/useArticleEngagement";
import ModalArticleShareOptions from "./ModalArticleShareOptions";

interface Props {
  articleId: string;
  slug: string;
  title: string;
  compact?: boolean;
  className?: string;
}

export default function BarArticleEngagementActions({ articleId, slug, title, compact, className = "" }: Props) {
  const { counts, isLiked, toggleLike, isLiking, logShare, logDownload } = useArticleEngagement(articleId);
  const [shareOpen, setShareOpen] = useState(false);

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleLike();
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShareOpen(true);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Open article in new tab for print/save as PDF
    window.open(`/articles/${slug}`, "_blank");
    logDownload("pdf");
    toast.success("Article ouvert pour téléchargement");
  };

  const url = `${window.location.origin}/articles/${slug}`;

  return (
    <>
      <div className={`flex items-center gap-1 ${className}`} onClick={(e) => e.stopPropagation()}>
        {/* Like */}
        <button
          onClick={handleLike}
          disabled={isLiking}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all ${
            isLiked
              ? "text-red-400 bg-red-500/10"
              : "text-muted-foreground hover:text-red-400 hover:bg-red-500/5"
          }`}
        >
          <Heart className={`h-3.5 w-3.5 ${isLiked ? "fill-red-400" : ""}`} />
          {counts.likes > 0 && <span>{counts.likes}</span>}
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
        >
          <Share2 className="h-3.5 w-3.5" />
          {!compact && counts.shares > 0 && <span>{counts.shares}</span>}
        </button>

        {/* Download */}
        <button
          onClick={handleDownload}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
        >
          <Download className="h-3.5 w-3.5" />
          {!compact && counts.downloads > 0 && <span>{counts.downloads}</span>}
        </button>
      </div>

      <ModalArticleShareOptions
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        url={url}
        title={title}
        onShare={logShare}
      />
    </>
  );
}
