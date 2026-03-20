import { useState } from "react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import NotificationPreferences from "@/components/notifications/NotificationPreferences";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  Bell, Calendar, Check, CheckCheck, Clock,
  Navigation, Star, ChevronRight, Settings,
} from "lucide-react";
import { Link } from "react-router-dom";

const typeConfig: Record<string, { icon: typeof Bell; label: string }> = {
  appointment_created: { icon: Calendar, label: "Rendez-vous" },
  contractor_on_the_way: { icon: Navigation, label: "En route" },
  feedback_requested: { icon: Star, label: "Feedback" },
  reminder_24h_before: { icon: Clock, label: "Rappel 24h" },
  reminder_1h_before: { icon: Clock, label: "Rappel 1h" },
  digest: { icon: Bell, label: "Résumé" },
};

const NotificationsPage = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState("all");

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as Array<{
        id: string;
        profile_id: string;
        type: string;
        title: string;
        body: string | null;
        channel: string;
        status: string;
        entity_type: string | null;
        entity_id: string | null;
        metadata: Record<string, unknown>;
        created_at: string;
        read_at: string | null;
      }>;
    },
    enabled: !!user?.id,
  });

  const markReadMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await supabase
        .from("notifications")
        .update({ status: "read", read_at: new Date().toISOString() })
        .in("id", ids);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const all = notifications || [];
  const unread = all.filter((n) => n.status === "unread");
  const filtered = tab === "unread" ? unread : all;

  const handleMarkAllRead = () => {
    const ids = unread.map((n) => n.id);
    if (ids.length > 0) markReadMutation.mutate(ids);
  };

  const getActionUrl = (n: typeof all[0]) => {
    if (n.entity_type === "appointment" && n.entity_id) {
      return "/dashboard/appointments";
    }
    return null;
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Notifications"
        description={`${unread.length} notification${unread.length !== 1 ? "s" : ""} non lue${unread.length !== 1 ? "s" : ""}`}
      />

      {isLoading ? (
        <LoadingState />
      ) : (
        <div className="space-y-4 max-w-3xl">
          <div className="flex items-center justify-between">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="all">Toutes</TabsTrigger>
                <TabsTrigger value="unread">
                  Non lues
                  {unread.length > 0 && (
                    <Badge variant="destructive" className="ml-1.5 text-xs h-5 min-w-5 px-1">
                      {unread.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="preferences" className="gap-1">
                  <Settings className="h-3 w-3" /> Préférences
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {unread.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-xs gap-1">
                <CheckCheck className="h-3.5 w-3.5" /> Tout marquer lu
              </Button>
            )}
          </div>

          {tab === "preferences" ? (
            <NotificationPreferences />
          ) : filtered.length === 0 ? (
            <EmptyState
              message={tab === "unread" ? "Aucune notification non lue." : "Aucune notification pour le moment."}
              action={
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Bell className="h-4 w-4" />
                  Les notifications apparaîtront ici.
                </div>
              }
            />
          ) : (
            filtered.map((n, i) => {
              const config = typeConfig[n.type] || { icon: Bell, label: n.type };
              const Icon = config.icon;
              const actionUrl = getActionUrl(n);

              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card className={n.status === "unread" ? "bg-primary/[0.02]" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 mt-0.5 text-primary">
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h4 className={`text-sm font-medium truncate ${n.status === "unread" ? "text-foreground" : "text-muted-foreground"}`}>
                              {n.title}
                            </h4>
                            {n.status === "unread" && (
                              <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                            )}
                          </div>
                          {n.body && (
                            <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                              {n.body}
                            </p>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {config.label}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(n.created_at).toLocaleDateString("fr-CA", { day: "numeric", month: "short" })}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {n.status === "unread" && (
                                <Button variant="ghost" size="sm" onClick={() => markReadMutation.mutate([n.id])} className="text-xs h-7 px-2">
                                  <Check className="h-3 w-3" />
                                </Button>
                              )}
                              {actionUrl && (
                                <Button asChild size="sm" variant="ghost" className="text-xs h-7 px-2 gap-0.5">
                                  <Link to={actionUrl}>
                                    Voir <ChevronRight className="h-3 w-3" />
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
            })
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default NotificationsPage;
