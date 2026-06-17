import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  ArrowLeft, Phone, Mail, Globe, ExternalLink, Check, X, AlertTriangle,
  PhoneCall, Send, RefreshCw, FileText, Calendar,
} from "lucide-react";
import {
  useContactVerificationQueue, updateVerificationStatus, addVerificationNote,
  listVerificationNotes, type ContactVerificationRow, type ContactVerificationNote,
  type FilterKey,
} from "@/hooks/useContactVerificationQueue";
import { sendViaRouter } from "@/lib/communications/router";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "needs_manual_review", label: "Needs Review" },
  { key: "verified", label: "Verified" },
  { key: "contacted", label: "Contacted" },
  { key: "replied", label: "Replied" },
  { key: "landline_only", label: "Landline Only" },
  { key: "email_available", label: "Email Available" },
  { key: "no_email", label: "No Email" },
  { key: "conflict", label: "Conflict" },
  { key: "high", label: "High" },
  { key: "medium", label: "Medium" },
  { key: "low", label: "Low" },
];

function ConfidenceBadge({ c }: { c: string }) {
  const map: Record<string, string> = {
    high: "bg-emerald-500/15 text-emerald-700 border-emerald-300",
    medium: "bg-amber-500/15 text-amber-700 border-amber-300",
    low: "bg-slate-400/15 text-slate-600 border-slate-300",
    conflict: "bg-rose-500/15 text-rose-700 border-rose-300",
  };
  return <Badge variant="outline" className={map[c] ?? ""}>{c}</Badge>;
}

function PhoneBadge({ t }: { t: string | null }) {
  if (!t || t === "unknown") return <Badge variant="outline">unknown</Badge>;
  const map: Record<string, string> = {
    mobile: "bg-emerald-500/15 text-emerald-700",
    landline: "bg-amber-500/15 text-amber-700",
    voip: "bg-sky-500/15 text-sky-700",
    invalid: "bg-rose-500/15 text-rose-700",
  };
  return <Badge variant="outline" className={map[t] ?? ""}>{t}</Badge>;
}

export default function AdminContactVerification() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterKey>("needs_manual_review");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ContactVerificationRow | null>(null);
  const [notes, setNotes] = useState<ContactVerificationNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const { rows, loading, reload } = useContactVerificationQueue(filter);

  useEffect(() => {
    if (!selected) { setNotes([]); return; }
    listVerificationNotes(selected.id).then(setNotes);
  }, [selected]);

  const filtered = useMemo(
    () => rows.filter(r => !search.trim() || r.business_name.toLowerCase().includes(search.toLowerCase())),
    [rows, search]
  );

  const cards = useMemo(() => {
    const total = rows.length;
    const by = (p: (r: ContactVerificationRow) => boolean) => rows.filter(p).length;
    return [
      { label: "Total", value: total },
      { label: "Needs Review", value: by(r => r.verification_status === "needs_manual_review") },
      { label: "Verified", value: by(r => r.verification_status === "verified") },
      { label: "Contacted", value: by(r => r.verification_status === "contacted") },
      { label: "Replied", value: by(r => r.verification_status === "replied") },
      { label: "Landline+Email", value: by(r => r.phone_type === "landline" && !!r.email) },
      { label: "No Email", value: by(r => !r.email) },
      { label: "Conflicts", value: by(r => r.match_confidence === "conflict") },
      { label: "High Priority", value: by(r => r.manual_contact_priority_score >= 60) },
    ];
  }, [rows]);

  async function setStatus(status: string, extra: Partial<ContactVerificationRow> = {}) {
    if (!selected) return;
    const { error } = await updateVerificationStatus(selected.id, status, extra);
    if (error) toast.error(error.message); else { toast.success(`Marked ${status}`); reload(); setSelected({ ...selected, verification_status: status, ...extra }); }
  }

  async function handleSendEmail() {
    if (!selected?.email) return toast.error("No email on record");
    const r = await sendViaRouter({
      contact: { email: selected.email, phone: selected.phone ?? undefined, email_consent: true },
      templateKey: "manual_verification_outreach",
      channelOverride: "email",
      idempotencyKey: `cvq-${selected.id}-${Date.now()}`,
    });
    if (!r.ok) toast.error(r.reason ?? "Send failed");
    else {
      toast.success("Email sent");
      const next = new Date(Date.now() + 3 * 86400000).toISOString();
      await setStatus("contacted", { last_contacted_at: new Date().toISOString(), next_followup_at: next } as any);
    }
  }

  async function handleAddNote() {
    if (!selected || !newNote.trim()) return;
    const { error } = await addVerificationNote(selected.id, newNote.trim());
    if (error) toast.error(error.message);
    else {
      setNewNote("");
      const list = await listVerificationNotes(selected.id);
      setNotes(list);
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}><ArrowLeft className="h-4 w-4 mr-1" />Admin</Button>
          <h1 className="font-display text-2xl font-bold">Manual Contact Verification</h1>
        </div>
        <Button size="sm" variant="outline" onClick={reload}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
        {cards.map(c => (
          <Card key={c.label}>
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold">{c.value}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{c.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <Button key={f.key} size="sm" variant={filter === f.key ? "default" : "outline"} onClick={() => setFilter(f.key)}>
            {f.label}
          </Button>
        ))}
      </div>

      <Input
        placeholder="Search business name…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-md"
      />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No contacts in queue</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>RBQ</TableHead>
                  <TableHead>NEQ</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => setSelected(r)}>
                    <TableCell className="font-medium">{r.business_name}</TableCell>
                    <TableCell>{r.contact_person_name ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.email ?? "—"}</TableCell>
                    <TableCell><PhoneBadge t={r.phone_type} /></TableCell>
                    <TableCell className="text-xs">{r.rbq_number ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.neq_number ?? "—"}</TableCell>
                    <TableCell><ConfidenceBadge c={r.match_confidence} /></TableCell>
                    <TableCell className="text-xs">{r.best_contact_method ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.verification_status}</TableCell>
                    <TableCell className="text-right font-mono">{r.manual_contact_priority_score}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center justify-between gap-2">
                  <span>{selected.business_name}</span>
                  <ConfidenceBadge c={selected.match_confidence} />
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-5 mt-4">
                <section>
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Identity</h3>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-muted-foreground">Contact: </span>{selected.contact_person_name ?? "—"} {selected.role ? `(${selected.role})` : ""}</div>
                    <div className="flex items-center gap-1"><Mail className="h-3 w-3" />{selected.email ?? "—"}</div>
                    <div className="flex items-center gap-1"><Phone className="h-3 w-3" />{selected.phone ?? "—"} <PhoneBadge t={selected.phone_type} /></div>
                    {selected.website && <div className="flex items-center gap-1"><Globe className="h-3 w-3" /><a href={selected.website} target="_blank" rel="noreferrer" className="underline">{selected.website}</a></div>}
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Verification</h3>
                  <div className="space-y-1 text-sm">
                    <div>RBQ {selected.rbq_number ?? "—"} · {selected.rbq_business_name ?? "—"} · {selected.rbq_status ?? "—"}</div>
                    <div>NEQ {selected.neq_number ?? "—"} · {selected.neq_business_name ?? "—"} · {selected.neq_status ?? "—"}</div>
                    {selected.match_reasons?.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {selected.match_reasons.map((r, i) => (
                          <div key={i} className="text-xs flex items-center gap-2">
                            {r.signal.endsWith("_conflict") ? <AlertTriangle className="h-3 w-3 text-rose-500" /> : <Check className="h-3 w-3 text-emerald-500" />}
                            <span className="font-mono">{r.signal}</span>
                            <span className="text-muted-foreground">{(r.score * 100).toFixed(0)}%</span>
                            {r.detail && <span className="text-muted-foreground italic">{r.detail}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Actions</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" onClick={handleSendEmail} disabled={!selected.email}>
                      <Send className="h-3 w-3 mr-1" />Send Email
                    </Button>
                    {selected.phone_type === "landline" ? (
                      <Button size="sm" variant="outline" asChild>
                        <a href={`tel:${selected.phone}`}><PhoneCall className="h-3 w-3 mr-1" />Call Landline</a>
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" asChild disabled={!selected.phone}>
                        <a href={`tel:${selected.phone}`}><PhoneCall className="h-3 w-3 mr-1" />Call Manually</a>
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setStatus("verified")}>
                      <Check className="h-3 w-3 mr-1" />Verified
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setStatus("wrong_contact")}>
                      <X className="h-3 w-3 mr-1" />Wrong Contact
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setStatus("replied")}>Replied</Button>
                    <Button size="sm" variant="outline" onClick={() => setStatus("rejected")}>Reject</Button>
                    {selected.website && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={selected.website} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3 mr-1" />Website</a>
                      </Button>
                    )}
                    {selected.google_business_url && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={selected.google_business_url} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3 mr-1" />Google</a>
                      </Button>
                    )}
                    {selected.rbq_number && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={`https://www.rbq.gouv.qc.ca/citoyen/recherche-dune-licence/resultats-de-recherche.html?numero=${selected.rbq_number}`} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3 mr-1" />RBQ</a>
                      </Button>
                    )}
                    {selected.neq_number && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={`https://www.registreentreprises.gouv.qc.ca/RQEntreprisesGRREWeb/GR/GR03/GR03A2_19A_PIU_RechEnt_PC/PageRechSimple.aspx?NEQ=${selected.neq_number}`} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3 mr-1" />NEQ</a>
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={async () => {
                      const next = new Date(Date.now() + 3 * 86400000).toISOString();
                      await setStatus(selected.verification_status, { next_followup_at: next } as any);
                    }}>
                      <Calendar className="h-3 w-3 mr-1" />Follow-up +3d
                    </Button>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Priority: <span className="font-mono">{selected.manual_contact_priority_score}</span>
                    {selected.last_contacted_at && <> · Last contacted {new Date(selected.last_contacted_at).toLocaleDateString()}</>}
                    {selected.next_followup_at && <> · Next {new Date(selected.next_followup_at).toLocaleDateString()}</>}
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1"><FileText className="h-3 w-3" />Notes</h3>
                  <div className="space-y-2">
                    <Textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Add internal note…" rows={2} />
                    <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim()}>Add Note</Button>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {notes.map(n => (
                        <div key={n.id} className="text-xs border rounded p-2">
                          <div className="text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
                          <div>{n.note}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
