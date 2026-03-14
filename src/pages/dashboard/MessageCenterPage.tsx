/**
 * UNPRO — Message Center
 * Homeowner notification inbox with read/unread, categories, property filtering.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchMessages, markAsRead, type HomeownerMessage } from "@/services/messages/messagingService";
import { motion } from "framer-motion";
import {
  Bell, DollarSign, TrendingUp, Wrench, MapPin,
  Calendar, FileText, Users, Check, Mail,
  ChevronRight,
} from "lucide-react";

const categoryConfig: Record<string, { icon: typeof Bell; color: string; label: string }> = {
  grant_opportunity: { icon: DollarSign, color: "text-success", label: "Subvention" },
  completion_reminder: { icon: FileText, color: "text-primary", label: "Passeport" },
  score_improved: { icon: TrendingUp, color: "text-accent", label: "Score" },
  recommended_work: { icon: Wrench, color: "text-warning", label: "Travaux" },
  neighborhood_activity: { icon: MapPin, color: "text-secondary-foreground", label: "Voisinage" },
  seasonal_maintenance: { icon: Calendar, color: "text-primary", label: "Entretien" },
  document_suggestion: { icon: FileText, color: "text-muted-foreground", label: "Document" },
  contractor_approval: { icon: Users, color: "text-accent", label: "Entrepreneur" },
};

const MessageCenterPage = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState("all");

  const { data: messages, isLoading } = useQuery({
    queryKey: ["homeowner-messages", user?.id],
    queryFn: () => fetchMessages(user!.id, { limit: 100 }),
    enabled: !!user?.id,
  });

  const markReadMutation = useMutation({
    mutationFn: (ids: string[]) => markAsRead(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["homeowner-messages"] }),
  });

  const allMessages = messages || [];
  const unread = allMessages.filter((m) => !m.is_read);
  const filtered = tab === "unread" ? unread : allMessages;

  const handleMarkAllRead = () => {
    const ids = unread.map((m) => m.id);
    if (ids.length > 0) markReadMutation.mutate(ids);
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Centre de messages"
        description={`${unread.length} message${unread.length !== 1 ? "s" : ""} non lu${unread.length !== 1 ? "s" : ""}`}
      />

      {isLoading ? (
        <LoadingState />
      ) : (
        <div className="space-y-4 max-w-3xl">
          <div className="flex items-center justify-between">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="all">Tous</TabsTrigger>
                <TabsTrigger value="unread">
                  Non lus
                  {unread.length > 0 && (
                    <Badge variant="destructive" className="ml-1.5 text-xs h-5 min-w-5 px-1">
                      {unread.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {unread.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                className="text-xs gap-1"
              >
                <Check className="h-3.5 w-3.5" /> Tout marquer lu
              </Button>
            )}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              message={tab === "unread" ? "Aucun message non lu." : "Aucun message pour le moment."}
              action={
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Mail className="h-4 w-4" />
                  Les notifications apparaîtront ici.
                </div>
              }
            />
          ) : (
            filtered.map((msg, i) => (
              <MessageCard
                key={msg.id}
                message={msg}
                index={i}
                onMarkRead={() => markReadMutation.mutate([msg.id])}
              />
            ))
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

function MessageCard({
  message, index, onMarkRead,
}: {
  message: HomeownerMessage;
  index: number;
  onMarkRead: () => void;
}) {
  const config = categoryConfig[message.category] || { icon: Bell, color: "text-muted-foreground", label: message.category };
  const Icon = config.icon;
  const priorityBorder = message.priority === "urgent" ? "border-destructive/30" : message.priority === "high" ? "border-warning/30" : "border-border/40";

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Card className={`${priorityBorder} ${!message.is_read ? "bg-primary/[0.02]" : ""}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`shrink-0 mt-0.5 ${config.color}`}>
              <Icon className="h-4.5 w-4.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h4 className={`text-sm font-medium truncate ${!message.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                  {message.title_fr}
                </h4>
                {!message.is_read && (
                  <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                {message.body_fr}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {config.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(message.created_at).toLocaleDateString("fr-CA", { day: "numeric", month: "short" })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {!message.is_read && (
                    <Button variant="ghost" size="sm" onClick={onMarkRead} className="text-xs h-7 px-2">
                      <Check className="h-3 w-3" />
                    </Button>
                  )}
                  {message.action_url && (
                    <Button asChild size="sm" variant="ghost" className="text-xs h-7 px-2 gap-0.5">
                      <Link to={message.action_url}>
                        {message.action_label_fr || "Voir"} <ChevronRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default MessageCenterPage;
