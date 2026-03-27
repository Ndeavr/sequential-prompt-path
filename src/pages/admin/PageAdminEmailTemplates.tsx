/**
 * UNPRO — Admin Email Templates Dashboard
 * View all templates, their status, automation rules, and versions.
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mail, MessageSquare, Loader2, RefreshCw, CheckCircle, Pause, Archive,
  Zap, Clock, Users, Send,
} from "lucide-react";

type EmailTemplate = {
  id: string;
  template_key: string;
  template_name: string;
  audience_type: string | null;
  is_active: boolean;
  created_at: string;
};

type EmailRule = {
  id: string;
  rule_key: string;
  trigger_event: string;
  template_key: string;
  sender_email: string;
  audience_type: string | null;
  status: string;
  delay_minutes: number;
  max_retries: number;
};

type SmsTemplate = {
  id: string;
  template_key: string;
  template_name: string;
  body_template: string;
  audience_type: string | null;
  is_active: boolean;
};

type SmsRule = {
  id: string;
  rule_key: string;
  trigger_event: string;
  template_key: string;
  status: string;
  delay_minutes: number;
  cooldown_minutes: number;
};

const STATUS_BADGE: Record<string, { className: string; icon: typeof CheckCircle }> = {
  active: { className: "bg-green-500/15 text-green-700 border-green-200", icon: CheckCircle },
  paused: { className: "bg-yellow-500/15 text-yellow-700 border-yellow-200", icon: Pause },
  archived: { className: "bg-muted text-muted-foreground border-border", icon: Archive },
};

export default function PageAdminEmailTemplates() {
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [emailRules, setEmailRules] = useState<EmailRule[]>([]);
  const [smsTemplates, setSmsTemplates] = useState<SmsTemplate[]>([]);
  const [smsRules, setSmsRules] = useState<SmsRule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    const [et, er, st, sr] = await Promise.all([
      supabase.from("email_templates").select("*").order("created_at"),
      supabase.from("email_automation_rules").select("*").order("created_at"),
      supabase.from("sms_templates").select("*").order("created_at"),
      supabase.from("sms_automation_rules").select("*").order("created_at"),
    ]);
    if (et.data) setEmailTemplates(et.data as EmailTemplate[]);
    if (er.data) setEmailRules(er.data as EmailRule[]);
    if (st.data) setSmsTemplates(st.data as SmsTemplate[]);
    if (sr.data) setSmsRules(sr.data as SmsRule[]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
              <Send className="w-6 h-6 text-primary" /> Templates & Automation
            </h1>
            <p className="text-sm text-muted-foreground">
              {emailTemplates.length} email templates · {smsTemplates.length} SMS templates
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAll}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Rafraîchir
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-black text-foreground">{emailTemplates.length}</p>
                <p className="text-xs text-muted-foreground">Email Templates</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-xl font-black text-foreground">{emailRules.filter(r => r.status === 'active').length}</p>
                <p className="text-xs text-muted-foreground">Règles actives</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-xl font-black text-foreground">{smsTemplates.length}</p>
                <p className="text-xs text-muted-foreground">SMS Templates</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-xl font-black text-foreground">{smsRules.filter(r => r.status === 'active').length}</p>
                <p className="text-xs text-muted-foreground">SMS Règles</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="emails" className="space-y-4">
          <TabsList>
            <TabsTrigger value="emails">
              <Mail className="w-3.5 h-3.5 mr-1" /> Emails
            </TabsTrigger>
            <TabsTrigger value="email-rules">
              <Zap className="w-3.5 h-3.5 mr-1" /> Règles Email
            </TabsTrigger>
            <TabsTrigger value="sms">
              <MessageSquare className="w-3.5 h-3.5 mr-1" /> SMS
            </TabsTrigger>
            <TabsTrigger value="sms-rules">
              <Clock className="w-3.5 h-3.5 mr-1" /> Règles SMS
            </TabsTrigger>
          </TabsList>

          {/* Email Templates */}
          <TabsContent value="emails">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Email Templates</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Clé</TableHead>
                      <TableHead className="text-xs">Nom</TableHead>
                      <TableHead className="text-xs">Audience</TableHead>
                      <TableHead className="text-xs">Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emailTemplates.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-xs font-mono">{t.template_key}</TableCell>
                        <TableCell className="text-sm font-medium">{t.template_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            <Users className="w-3 h-3 mr-1" />
                            {t.audience_type || 'all'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${t.is_active
                              ? "bg-green-500/15 text-green-700 border-green-200"
                              : "bg-muted text-muted-foreground border-border"
                            }`}
                          >
                            {t.is_active ? "Actif" : "Inactif"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Automation Rules */}
          <TabsContent value="email-rules">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Règles d'Automation Email</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Événement</TableHead>
                      <TableHead className="text-xs">Template</TableHead>
                      <TableHead className="text-xs">Sender</TableHead>
                      <TableHead className="text-xs">Délai</TableHead>
                      <TableHead className="text-xs">Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emailRules.map((r) => {
                      const status = STATUS_BADGE[r.status] || STATUS_BADGE.active;
                      const StatusIcon = status.icon;
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="text-xs font-mono">{r.trigger_event}</TableCell>
                          <TableCell className="text-xs">{r.template_key}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{r.sender_email}</TableCell>
                          <TableCell className="text-xs">
                            {r.delay_minutes === 0 ? 'Immédiat' : `${r.delay_minutes}min`}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${status.className}`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {r.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SMS Templates */}
          <TabsContent value="sms">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">SMS Templates</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Clé</TableHead>
                      <TableHead className="text-xs">Nom</TableHead>
                      <TableHead className="text-xs">Message</TableHead>
                      <TableHead className="text-xs">Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {smsTemplates.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-xs font-mono">{t.template_key}</TableCell>
                        <TableCell className="text-sm font-medium">{t.template_name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">
                          {t.body_template}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${t.is_active
                              ? "bg-green-500/15 text-green-700 border-green-200"
                              : "bg-muted text-muted-foreground border-border"
                            }`}
                          >
                            {t.is_active ? "Actif" : "Inactif"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SMS Rules */}
          <TabsContent value="sms-rules">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Règles d'Automation SMS</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Événement</TableHead>
                      <TableHead className="text-xs">Template</TableHead>
                      <TableHead className="text-xs">Cooldown</TableHead>
                      <TableHead className="text-xs">Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {smsRules.map((r) => {
                      const status = STATUS_BADGE[r.status] || STATUS_BADGE.active;
                      const StatusIcon = status.icon;
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="text-xs font-mono">{r.trigger_event}</TableCell>
                          <TableCell className="text-xs">{r.template_key}</TableCell>
                          <TableCell className="text-xs">{r.cooldown_minutes}min</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${status.className}`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {r.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
