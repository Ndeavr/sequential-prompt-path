import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Bell, Mail, Phone } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Preference = {
  id: string;
  channel: string;
  notification_type: string;
  is_enabled: boolean;
  phone_number: string | null;
  email_override: string | null;
};

const CHANNELS = [
  { key: "in_app", label: "Notifications in-app", icon: Bell, description: "Toujours actives" },
  { key: "sms", label: "SMS", icon: Phone, description: "Rappels et alertes urgentes", requiresPhone: true },
  { key: "email", label: "Email", icon: Mail, description: "Résumés et confirmations" },
];

const NotificationPreferences = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [emailOverride, setEmailOverride] = useState("");

  const { data: prefs, isLoading } = useQuery({
    queryKey: ["notification-preferences", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_preferences" as any)
        .select("*")
        .eq("profile_id", user!.id);
      if (error) throw error;
      return (data || []) as unknown as Preference[];
    },
    enabled: !!user?.id,
  });

  const upsertMutation = useMutation({
    mutationFn: async (pref: {
      channel: string;
      notification_type: string;
      is_enabled: boolean;
      phone_number?: string;
      email_override?: string;
    }) => {
      const existing = prefs?.find(
        (p) => p.channel === pref.channel && p.notification_type === pref.notification_type
      );

      if (existing?.id) {
        const { error } = await supabase
          .from("notification_preferences" as any)
          .update({
            is_enabled: pref.is_enabled,
            phone_number: pref.phone_number || null,
            email_override: pref.email_override || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("notification_preferences" as any)
          .insert({
            profile_id: user!.id,
            channel: pref.channel,
            notification_type: pref.notification_type,
            is_enabled: pref.is_enabled,
            phone_number: pref.phone_number || null,
            email_override: pref.email_override || null,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification-preferences"] });
      toast.success("Préférences mises à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  const getEnabled = (channel: string) => {
    const pref = prefs?.find((p) => p.channel === channel && p.notification_type === "all");
    return pref?.is_enabled ?? channel === "in_app";
  };

  const getPhoneNumber = () => {
    const pref = prefs?.find((p) => p.channel === "sms");
    return pref?.phone_number || "";
  };

  const handleToggle = (channel: string, enabled: boolean) => {
    upsertMutation.mutate({
      channel,
      notification_type: "all",
      is_enabled: enabled,
      phone_number: channel === "sms" ? phoneNumber || getPhoneNumber() : undefined,
    });
  };

  const handleSavePhone = () => {
    upsertMutation.mutate({
      channel: "sms",
      notification_type: "all",
      is_enabled: true,
      phone_number: phoneNumber,
    });
  };

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Préférences de notification</CardTitle>
        <CardDescription>Choisissez comment recevoir vos alertes et rappels.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {CHANNELS.map((ch) => {
          const Icon = ch.icon;
          const enabled = getEnabled(ch.key);

          return (
            <div key={ch.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{ch.label}</p>
                    <p className="text-xs text-muted-foreground">{ch.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {ch.key === "sms" && !getPhoneNumber() && (
                    <Badge variant="outline" className="text-xs">Configuration requise</Badge>
                  )}
                  <Switch
                    checked={enabled}
                    onCheckedChange={(v) => handleToggle(ch.key, v)}
                    disabled={ch.key === "in_app"}
                  />
                </div>
              </div>

              {ch.key === "sms" && enabled && (
                <div className="ml-7 flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Numéro de téléphone</Label>
                    <Input
                      placeholder="+1 514 555-1234"
                      value={phoneNumber || getPhoneNumber()}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <Button size="sm" variant="outline" className="h-8" onClick={handleSavePhone}>
                    Enregistrer
                  </Button>
                </div>
              )}

              {ch.key === "email" && enabled && (
                <div className="ml-7 flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Email alternatif (optionnel)</Label>
                    <Input
                      placeholder="mon@email.com"
                      type="email"
                      value={emailOverride}
                      onChange={(e) => setEmailOverride(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() =>
                      upsertMutation.mutate({
                        channel: "email",
                        notification_type: "all",
                        is_enabled: true,
                        email_override: emailOverride,
                      })
                    }
                  >
                    Enregistrer
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default NotificationPreferences;
