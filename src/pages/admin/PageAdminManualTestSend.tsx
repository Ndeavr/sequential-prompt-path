import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Mail, RefreshCw, Send, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const SENDER_EMAIL = "alex@unpro.ca";
const STATUSES = ["queued", "sent", "delivered", "bounced", "opened"] as const;

export default function PageAdminManualTestSend() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [recipientEmail, setRecipientEmail] = useState("");
  const [subject, setSubject] = useState("Test live UNPRO");
  const [body, setBody] = useState("Ceci est un test live envoyé depuis alex@unpro.ca.");
  const [messageId, setMessageId] = useState<string | null>(null);

  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail.trim()), [recipientEmail]);

  const mailbox = useQuery({
    queryKey: ["manual-test-mailbox", SENDER_EMAIL],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outbound_mailboxes")
        .select("sender_email, sender_name, provider, mailbox_status, reply_to_email, tracking_domain, updated_at")
        .eq("sender_email", SENDER_EMAIL)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchInterval: 10_000,
  });

  const statusLog = useQuery({
    queryKey: ["manual-test-send-status", messageId],
    enabled: !!messageId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_send_log")
        .select("status, error_message, created_at")
        .eq("message_id", messageId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 5_000,
  });

  const sendTest = useMutation({
    mutationFn: async () => {
      if (!emailValid) throw new Error("Email destinataire invalide");
      if (!subject.trim()) throw new Error("Sujet requis");
      if (!body.trim()) throw new Error("Body requis");
      if (mailbox.data?.mailbox_status !== "active") throw new Error("Mailbox alex@unpro.ca inactive");

      const id = crypto.randomUUID();
      const trimmedRecipient = recipientEmail.trim().toLowerCase();

      const { error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "manual-live-test",
          recipientEmail: trimmedRecipient,
          senderEmail: SENDER_EMAIL,
          senderName: mailbox.data?.sender_name || "Alex UNPRO",
          idempotencyKey: `manual-live-test-${id}`,
          templateData: { subject: subject.trim(), body: body.trim() },
        },
      });
      if (error) throw error;

      await supabase.from("system_events").insert({
        event_type: "manual_live_test_send",
        severity: "info",
        actor_user_id: user?.id ?? null,
        payload: {
          message_id: id,
          sender_email: SENDER_EMAIL,
          recipient_email: trimmedRecipient,
          subject: subject.trim(),
          statuses_requested: STATUSES,
          status: "queued",
        },
      });

      return id;
    },
    onSuccess: (id) => {
      setMessageId(id);
      toast({ title: "Test live queued", description: `Envoi déclenché depuis ${SENDER_EMAIL}.` });
    },
    onError: (e: any) => toast({ title: "Échec envoi live", description: e.message, variant: "destructive" }),
  });

  const latestStatus = statusLog.data?.[0]?.status === "pending" ? "queued" : statusLog.data?.[0]?.status;

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <Link to="/admin">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Admin</Button>
        </Link>
        <h1 className="text-2xl font-bold">Manual Test Send</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3 text-base">
            <span className="flex items-center gap-2"><Mail className="h-5 w-5" /> Production sender</span>
            <Badge variant={mailbox.data?.mailbox_status === "active" ? "default" : "destructive"}>{mailbox.data?.mailbox_status || "loading"}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <div><span className="text-muted-foreground">From</span><p className="font-medium">{SENDER_EMAIL}</p></div>
          <div><span className="text-muted-foreground">Provider</span><p className="font-medium">{mailbox.data?.provider || "—"}</p></div>
          <div><span className="text-muted-foreground">Reply path</span><p className="font-medium">{mailbox.data?.reply_to_email || "—"}</p></div>
          <div><span className="text-muted-foreground">Tracking</span><p className="font-medium">{mailbox.data?.tracking_domain || "—"}</p></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Send live test</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label htmlFor="recipient">Recipient email</Label><Input id="recipient" type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder="you@example.com" /></div>
          <div className="space-y-2"><Label htmlFor="subject">Subject</Label><Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="body">Body</Label><Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} className="min-h-36" /></div>
          <Button onClick={() => sendTest.mutate()} disabled={sendTest.isPending || !emailValid || mailbox.data?.mailbox_status !== "active"}>
            {sendTest.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />} SEND LIVE TEST
          </Button>
        </CardContent>
      </Card>

      {messageId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              Status tracking
              <Button variant="outline" size="sm" onClick={() => statusLog.refetch()}><RefreshCw className="h-4 w-4 mr-2" /> Refresh</Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Message ID: {messageId}</p>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
              {STATUSES.map((status) => {
                const active = status === latestStatus || (status === "queued" && !latestStatus);
                const failed = status === "bounced" && latestStatus === "bounced";
                return <div key={status} className="flex items-center gap-2 rounded-md border border-border p-3 text-sm">{failed ? <XCircle className="h-4 w-4 text-destructive" /> : <CheckCircle2 className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />}<span className={active ? "font-medium" : "text-muted-foreground"}>{status}</span></div>;
              })}
            </div>
            {statusLog.data?.[0]?.error_message && <p className="text-sm text-destructive">{statusLog.data[0].error_message}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}