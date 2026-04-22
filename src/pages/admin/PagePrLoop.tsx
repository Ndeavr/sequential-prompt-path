/**
 * UNPRO — PR Loop Engine Command Center
 * Automated content authority flywheel dashboard.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import SectionContainer from "@/components/unpro/SectionContainer";
import CardGlass from "@/components/unpro/CardGlass";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Zap,
  Copy,
  CheckCircle2,
  Clock,
  FileText,
  Linkedin,
  Twitter,
  Facebook,
  Mail,
  Video,
  MessageSquare,
  Link2,
  HelpCircle,
  Newspaper,
  BarChart3,
  RefreshCw,
  Play,
} from "lucide-react";

const CHANNEL_META: Record<string, { label: string; icon: typeof Zap; color: string }> = {
  article: { label: "Article", icon: FileText, color: "text-blue-400" },
  linkedin: { label: "LinkedIn", icon: Linkedin, color: "text-sky-400" },
  x_thread: { label: "X Thread", icon: Twitter, color: "text-foreground" },
  facebook_homeowner: { label: "FB Proprio", icon: Facebook, color: "text-blue-500" },
  facebook_contractor: { label: "FB Entrepreneur", icon: Facebook, color: "text-indigo-400" },
  reddit: { label: "Reddit", icon: MessageSquare, color: "text-orange-400" },
  short_video_script: { label: "Vidéo 30s", icon: Video, color: "text-red-400" },
  long_video_script: { label: "Vidéo 60s", icon: Video, color: "text-pink-400" },
  email_newsletter: { label: "Newsletter", icon: Mail, color: "text-green-400" },
  press_release: { label: "Presse", icon: Newspaper, color: "text-purple-400" },
  backlink_pitch: { label: "Backlink", icon: Link2, color: "text-amber-400" },
  faq_snippets: { label: "FAQ", icon: HelpCircle, color: "text-teal-400" },
};

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-amber-500/20 text-amber-400",
  completed: "bg-green-500/20 text-green-400",
  queued: "bg-muted text-muted-foreground",
  generated: "bg-blue-500/20 text-blue-400",
  published: "bg-green-500/20 text-green-400",
  failed: "bg-destructive/20 text-destructive",
};

interface Topic {
  id: string;
  title: string;
  slug: string;
  category: string;
  status: string;
  priority_score: number;
  week_number: number | null;
}

interface Asset {
  id: string;
  topic_id: string;
  channel: string;
  content_text: string | null;
  hook: string | null;
  cta: string | null;
  brand_mentions: number;
  status: string;
  scheduled_date: string | null;
  published_at: string | null;
  engagement_clicks: number;
  engagement_shares: number;
  mentions_gained: number;
  backlinks_gained: number;
}

export default function PagePrLoop() {
  const { toast } = useToast();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [topicsRes, assetsRes] = await Promise.all([
      supabase.from("pr_topics").select("*").order("priority_score", { ascending: false }),
      supabase.from("pr_assets").select("*").order("scheduled_date", { ascending: true }),
    ]);
    if (topicsRes.data) setTopics(topicsRes.data as Topic[]);
    if (assetsRes.data) setAssets(assetsRes.data as Asset[]);
    setLoading(false);
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await supabase.functions.invoke("pr-loop-generate", {
        body: { action: "stats" },
      });
      if (res.data) setStats(res.data);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchStats();
  }, [fetchData, fetchStats]);

  const handleGenerate = async (topicId?: string) => {
    setGenerating(true);
    try {
      const body = topicId
        ? { action: "generate_all_assets", topic_id: topicId }
        : { action: "generate_topic_batch" };
      const res = await supabase.functions.invoke("pr-loop-generate", { body });
      if (res.error) throw res.error;

      if (topicId) {
        toast({ title: "🚀 Génération lancée en arrière-plan", description: "Les assets seront générés un par un. Rechargez dans 2-3 minutes." });
        // Poll progress every 15s for up to 3 minutes
        let polls = 0;
        const interval = setInterval(async () => {
          polls++;
          await fetchData();
          await fetchStats();
          if (polls >= 12) {
            clearInterval(interval);
            setGenerating(false);
          }
          // Check if topic is completed
          const updated = topics.find(t => t.id === topicId);
          if (updated?.status === "completed") {
            clearInterval(interval);
            setGenerating(false);
            toast({ title: "✅ Génération complétée!" });
          }
        }, 15000);
      } else {
        toast({ title: "✅ Batch lancé", description: JSON.stringify(res.data) });
        await fetchData();
        await fetchStats();
        setGenerating(false);
      }
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
      setGenerating(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copié!", description: "Contenu copié dans le presse-papier" });
  };

  const handleMarkPublished = async (assetId: string) => {
    await supabase
      .from("pr_assets")
      .update({ status: "published", published_at: new Date().toISOString() } as any)
      .eq("id", assetId);
    await fetchData();
    toast({ title: "Marqué comme publié" });
  };

  const filteredAssets = assets.filter((a) => {
    if (selectedTopic && a.topic_id !== selectedTopic) return false;
    if (channelFilter && a.channel !== channelFilter) return false;
    return true;
  });

  const topicCounts = topics.reduce(
    (acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <SectionContainer width="wide">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
              <Zap className="text-primary" /> PR Loop Engine
            </h1>
            <p className="text-muted-foreground mt-1">
              Machine de contenu multi-canal autonome
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { fetchData(); fetchStats(); }}
              disabled={loading}
            >
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => handleGenerate()}
              disabled={generating}
              className="bg-primary"
            >
              <Play className="w-4 h-4 mr-1" />
              {generating ? "Génération..." : "Générer batch (3 topics)"}
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-8">
          {[
            { label: "Topics", value: topics.length, icon: FileText },
            { label: "Draft", value: topicCounts.draft || 0, icon: Clock },
            { label: "Complétés", value: topicCounts.completed || 0, icon: CheckCircle2 },
            { label: "Assets", value: assets.length, icon: BarChart3 },
            { label: "Mentions", value: stats?.total_mentions || 0, icon: Zap },
            { label: "Backlinks", value: stats?.total_backlinks || 0, icon: Link2 },
          ].map((s) => (
            <CardGlass key={s.label} noAnimation className="text-center p-4">
              <s.icon className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardGlass>
          ))}
        </div>

        {/* Topics Pipeline */}
        <CardGlass noAnimation className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Pipeline Topics</h2>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {topics.map((t) => {
              const assetCount = assets.filter((a) => a.topic_id === t.id).length;
              return (
                <div
                  key={t.id}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedTopic === t.id
                      ? "bg-primary/10 border border-primary/30"
                      : "bg-muted/30 hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedTopic(selectedTopic === t.id ? null : t.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{t.category}</Badge>
                      <span className="text-xs text-muted-foreground">W{t.week_number}</span>
                      <span className="text-xs text-muted-foreground">P{t.priority_score}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{assetCount}/12</span>
                    <Badge className={STATUS_BADGE[t.status] || ""}>{t.status}</Badge>
                    {t.status === "draft" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); handleGenerate(t.id); }}
                        disabled={generating}
                      >
                        <Play className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardGlass>

        {/* Channel Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            size="sm"
            variant={channelFilter === null ? "default" : "outline"}
            onClick={() => setChannelFilter(null)}
          >
            Tous
          </Button>
          {Object.entries(CHANNEL_META).map(([key, meta]) => {
            const Icon = meta.icon;
            const count = filteredAssets.filter(
              (a) => a.channel === key && (!selectedTopic || a.topic_id === selectedTopic)
            ).length;
            return (
              <Button
                key={key}
                size="sm"
                variant={channelFilter === key ? "default" : "outline"}
                onClick={() => setChannelFilter(channelFilter === key ? null : key)}
                className="text-xs"
              >
                <Icon className={`w-3 h-3 mr-1 ${meta.color}`} />
                {meta.label} ({count})
              </Button>
            );
          })}
        </div>

        {/* Assets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssets.map((a) => {
            const meta = CHANNEL_META[a.channel] || { label: a.channel, icon: FileText, color: "" };
            const Icon = meta.icon;
            const topicTitle = topics.find((t) => t.id === a.topic_id)?.title || "";
            return (
              <CardGlass key={a.id} noAnimation className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${meta.color}`} />
                    <span className="text-sm font-medium text-foreground">{meta.label}</span>
                  </div>
                  <Badge className={STATUS_BADGE[a.status] || ""}>{a.status}</Badge>
                </div>

                {a.hook && (
                  <p className="text-xs font-semibold text-primary mb-1 line-clamp-2">
                    🪝 {a.hook}
                  </p>
                )}

                <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{topicTitle}</p>

                {a.content_text && (
                  <p className="text-xs text-foreground/80 mb-3 line-clamp-4 flex-1">
                    {a.content_text.slice(0, 200)}…
                  </p>
                )}

                {a.cta && (
                  <p className="text-xs text-primary/80 mb-3">CTA: {a.cta}</p>
                )}

                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-3">
                  <span>📅 {a.scheduled_date || "—"}</span>
                  <span>·</span>
                  <span>🏷️ {a.brand_mentions} mentions</span>
                </div>

                <div className="flex gap-2 mt-auto">
                  {a.content_text && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={() => handleCopy(a.content_text!)}
                    >
                      <Copy className="w-3 h-3 mr-1" /> Copier
                    </Button>
                  )}
                  {a.status !== "published" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={() => handleMarkPublished(a.id)}
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Publié
                    </Button>
                  )}
                </div>
              </CardGlass>
            );
          })}
        </div>

        {filteredAssets.length === 0 && !loading && (
          <CardGlass noAnimation className="text-center py-12">
            <p className="text-muted-foreground">
              Aucun asset{selectedTopic ? " pour ce topic" : ""}.
              Générez du contenu pour commencer.
            </p>
          </CardGlass>
        )}
      </SectionContainer>
    </div>
  );
}
