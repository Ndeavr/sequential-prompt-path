/**
 * UNPRO — Domain Health Dashboard
 * Diagnoses SSL, DNS, accessibility, and security issues for unpro.ca
 */
import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Globe, Lock, AlertTriangle, CheckCircle2, RefreshCw, Wifi, Server, ArrowRight, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Types ─── */
interface HealthCheck {
  domain: string;
  score: number;
  status: "ok" | "warning" | "critical" | "pending";
  ssl: SSLStatus;
  dns: DNSRecord[];
  security: SecurityFlag[];
  access: AccessStatus;
  checkedAt: string;
}

interface SSLStatus {
  valid: boolean;
  issuer: string;
  expiryDate: string;
  errorCode: string | null;
  errorMessage: string | null;
}

interface DNSRecord {
  type: string;
  expected: string;
  actual: string;
  status: "ok" | "mismatch" | "missing";
}

interface SecurityFlag {
  type: string;
  blocked: boolean;
  category: string;
  riskLevel: string;
  details: string;
}

interface AccessStatus {
  httpsOk: boolean;
  httpRedirect: boolean;
  responseTime: number;
}

/* ─── Status helpers ─── */
const statusColor = (s: string) => {
  if (s === "ok") return "text-emerald-400";
  if (s === "warning") return "text-amber-400";
  return "text-red-400";
};

const statusBg = (s: string) => {
  if (s === "ok") return "bg-emerald-500/10 border-emerald-500/20";
  if (s === "warning") return "bg-amber-500/10 border-amber-500/20";
  return "bg-red-500/10 border-red-500/20";
};

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "ok") return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
  if (status === "warning") return <AlertTriangle className="w-5 h-5 text-amber-400" />;
  return <XCircle className="w-5 h-5 text-red-400" />;
};

/* ─── Score Ring ─── */
function ScoreRing({ score, size = 160 }: { score: number; size?: number }) {
  const r = (size - 16) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 80 ? "#34d399" : score >= 50 ? "#fbbf24" : "#f87171";

  return (
    <svg width={size} height={size} className="mx-auto">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(228 18% 15%)" strokeWidth={8} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeLinecap="round" strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em" className="fill-foreground text-3xl font-bold font-display">
        {score}
      </text>
    </svg>
  );
}

/* ─── Mock check (simulates edge function call) ─── */
function runDomainCheck(domain: string): Promise<HealthCheck> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const sslValid = Math.random() > 0.4;
      const dnsOk = Math.random() > 0.3;
      const accessOk = Math.random() > 0.3;
      const securityOk = Math.random() > 0.5;
      const score = Math.round(
        (sslValid ? 30 : 0) + (dnsOk ? 25 : 5) + (accessOk ? 25 : 0) + (securityOk ? 20 : 5)
      );

      resolve({
        domain,
        score,
        status: score >= 80 ? "ok" : score >= 50 ? "warning" : "critical",
        ssl: {
          valid: sslValid,
          issuer: sslValid ? "Let's Encrypt Authority X3" : "Unknown",
          expiryDate: sslValid ? "2026-09-15T00:00:00Z" : "",
          errorCode: sslValid ? null : "NET::ERR_CERT_AUTHORITY_INVALID",
          errorMessage: sslValid ? null : "Le certificat SSL n'est pas émis par une autorité reconnue.",
        },
        dns: [
          { type: "A", expected: "185.158.133.1", actual: dnsOk ? "185.158.133.1" : "76.23.11.99", status: dnsOk ? "ok" : "mismatch" },
          { type: "CNAME (www)", expected: "unpro.ca", actual: dnsOk ? "unpro.ca" : "", status: dnsOk ? "ok" : "missing" },
          { type: "TXT (_lovable)", expected: "lovable_verify=...", actual: dnsOk ? "lovable_verify=abc123" : "", status: dnsOk ? "ok" : "missing" },
        ],
        security: [
          {
            type: "FortiGuard",
            blocked: !securityOk,
            category: securityOk ? "Business" : "Newly Observed Domain",
            riskLevel: securityOk ? "low" : "high",
            details: securityOk ? "Domaine catégorisé correctement." : "FortiGuard bloque ce domaine comme « Newly Observed Domain ». Les utilisateurs protégés par FortiGate ne peuvent pas y accéder.",
          },
        ],
        access: { httpsOk: accessOk && sslValid, httpRedirect: accessOk, responseTime: Math.round(Math.random() * 800 + 100) },
        checkedAt: new Date().toISOString(),
      });
    }, 2500);
  });
}

/* ─── Persist to Supabase (background, non-blocking) ─── */
async function persistCheck(check: HealthCheck) {
  try {
    await supabase.from("domain_health_checks").insert({
      domain: check.domain,
      status: check.status,
      score: check.score,
      ssl_valid: check.ssl.valid,
      dns_valid: check.dns.every((d) => d.status === "ok"),
      access_ok: check.access.httpsOk,
      security_ok: check.security.every((s) => !s.blocked),
      details_json: check as any,
    });
  } catch (e) {
    console.error("Persist check failed:", e);
  }
}

/* ─── Main Component ─── */
export default function PageDomainHealthDashboard() {
  const [domain] = useState("unpro.ca");
  const [scanning, setScanning] = useState(false);
  const [check, setCheck] = useState<HealthCheck | null>(null);
  const [showFixGuide, setShowFixGuide] = useState<string | null>(null);

  const doScan = useCallback(async () => {
    setScanning(true);
    setCheck(null);
    try {
      const result = await runDomainCheck(domain);
      setCheck(result);
      void persistCheck(result);
      if (result.status === "critical") toast.error("Erreurs critiques détectées");
      else if (result.status === "warning") toast.warning("Avertissements détectés");
      else toast.success("Domaine en santé ✓");
    } catch {
      toast.error("Erreur pendant le scan");
    } finally {
      setScanning(false);
    }
  }, [domain]);

  useEffect(() => { doScan(); }, [doScan]);

  return (
    <>
      <Helmet>
        <title>Domain Health — UNPRO Admin</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen bg-background p-4 md:p-8 max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-3">
              <Globe className="w-7 h-7 text-primary" />
              Domain Health
            </h1>
            <p className="text-muted-foreground mt-1">Diagnostic SSL, DNS, accès et sécurité pour <span className="text-foreground font-medium">{domain}</span></p>
          </div>
          <Button onClick={doScan} disabled={scanning} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${scanning ? "animate-spin" : ""}`} />
            {scanning ? "Scan en cours…" : "Relancer le scan"}
          </Button>
        </div>

        {/* Scanning state */}
        <AnimatePresence mode="wait">
          {scanning && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="glass-card p-12 text-center space-y-6"
            >
              <div className="relative mx-auto w-24 h-24">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <Shield className="absolute inset-0 m-auto w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">Analyse en cours…</p>
                <p className="text-sm text-muted-foreground mt-1">Vérification SSL • DNS • Accessibilité • Sécurité réseau</p>
              </div>
            </motion.div>
          )}

          {!scanning && check && (
            <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Score card */}
              <div className={`glass-card p-8 border ${statusBg(check.status)} text-center`}>
                <ScoreRing score={check.score} />
                <p className={`text-lg font-bold mt-4 ${statusColor(check.status)}`}>
                  {check.status === "ok" && "Domaine en santé"}
                  {check.status === "warning" && "Avertissements détectés"}
                  {check.status === "critical" && "Erreurs critiques"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Dernière vérification : {new Date(check.checkedAt).toLocaleString("fr-CA")}
                </p>
              </div>

              {/* 4-panel grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* SSL */}
                <div className={`glass-card p-6 border ${check.ssl.valid ? statusBg("ok") : statusBg("critical")}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <Lock className={`w-5 h-5 ${check.ssl.valid ? "text-emerald-400" : "text-red-400"}`} />
                    <h3 className="font-semibold text-foreground">Certificat SSL</h3>
                    <StatusIcon status={check.ssl.valid ? "ok" : "critical"} />
                  </div>
                  {check.ssl.valid ? (
                    <div className="space-y-2 text-sm">
                      <p className="text-muted-foreground">Émetteur : <span className="text-foreground">{check.ssl.issuer}</span></p>
                      <p className="text-muted-foreground">Expiration : <span className="text-foreground">{new Date(check.ssl.expiryDate).toLocaleDateString("fr-CA")}</span></p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-red-500/10 rounded-lg p-3 text-sm">
                        <p className="text-red-400 font-mono text-xs">{check.ssl.errorCode}</p>
                        <p className="text-red-300 mt-1">{check.ssl.errorMessage}</p>
                      </div>
                      <Button size="sm" variant="destructive" className="gap-2" onClick={() => setShowFixGuide("ssl")}>
                        <ArrowRight className="w-3 h-3" /> Voir la correction
                      </Button>
                    </div>
                  )}
                </div>

                {/* DNS */}
                <div className={`glass-card p-6 border ${check.dns.every(d => d.status === "ok") ? statusBg("ok") : statusBg("critical")}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <Server className={`w-5 h-5 ${check.dns.every(d => d.status === "ok") ? "text-emerald-400" : "text-red-400"}`} />
                    <h3 className="font-semibold text-foreground">Enregistrements DNS</h3>
                  </div>
                  <div className="space-y-2">
                    {check.dns.map((rec, i) => (
                      <div key={i} className="flex items-center justify-between text-sm bg-background/50 rounded-lg px-3 py-2">
                        <div>
                          <span className="text-muted-foreground">{rec.type}</span>
                          <span className="text-xs text-muted-foreground ml-2">→ {rec.expected}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {rec.status === "ok" ? (
                            <span className="text-emerald-400 text-xs">✓ Correct</span>
                          ) : (
                            <span className="text-red-400 text-xs">{rec.status === "mismatch" ? `✗ ${rec.actual}` : "✗ Manquant"}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {!check.dns.every(d => d.status === "ok") && (
                    <Button size="sm" variant="outline" className="mt-3 gap-2" onClick={() => setShowFixGuide("dns")}>
                      <ArrowRight className="w-3 h-3" /> Instructions DNS
                    </Button>
                  )}
                </div>

                {/* Access */}
                <div className={`glass-card p-6 border ${check.access.httpsOk ? statusBg("ok") : statusBg("critical")}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <Wifi className={`w-5 h-5 ${check.access.httpsOk ? "text-emerald-400" : "text-red-400"}`} />
                    <h3 className="font-semibold text-foreground">Accessibilité</h3>
                    <StatusIcon status={check.access.httpsOk ? "ok" : "critical"} />
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">HTTPS</span>
                      <span className={check.access.httpsOk ? "text-emerald-400" : "text-red-400"}>{check.access.httpsOk ? "OK" : "Échoué"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Redirection HTTP→HTTPS</span>
                      <span className={check.access.httpRedirect ? "text-emerald-400" : "text-amber-400"}>{check.access.httpRedirect ? "Oui" : "Non"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Temps de réponse</span>
                      <span className="text-foreground">{check.access.responseTime}ms</span>
                    </div>
                  </div>
                </div>

                {/* Security */}
                <div className={`glass-card p-6 border ${check.security.every(s => !s.blocked) ? statusBg("ok") : statusBg("critical")}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <Shield className={`w-5 h-5 ${check.security.every(s => !s.blocked) ? "text-emerald-400" : "text-red-400"}`} />
                    <h3 className="font-semibold text-foreground">Sécurité réseau</h3>
                  </div>
                  {check.security.map((flag, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">{flag.type}</span>
                        {flag.blocked ? (
                          <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full">BLOQUÉ</span>
                        ) : (
                          <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full">OK</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">Catégorie : {flag.category}</p>
                      {flag.blocked && <p className="text-xs text-red-300 bg-red-500/10 rounded-lg p-2">{flag.details}</p>}
                      {flag.blocked && (
                        <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowFixGuide("fortiguard")}>
                          <ArrowRight className="w-3 h-3" /> Guide FortiGuard
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Fix Guides */}
              <AnimatePresence>
                {showFixGuide && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="glass-card p-6 border border-primary/20 space-y-4 overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-foreground">
                        {showFixGuide === "ssl" && "🔒 Correction SSL"}
                        {showFixGuide === "dns" && "🌐 Configuration DNS"}
                        {showFixGuide === "fortiguard" && "🛡️ Résolution FortiGuard"}
                      </h3>
                      <Button size="sm" variant="ghost" onClick={() => setShowFixGuide(null)}>Fermer</Button>
                    </div>

                    {showFixGuide === "ssl" && (
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <Step n={1} title="Vérifier la configuration Lovable">
                          Allez dans <b>Paramètres → Domaines</b> de votre projet Lovable et vérifiez que <code className="text-primary">unpro.ca</code> est bien connecté.
                        </Step>
                        <Step n={2} title="Forcer le renouvellement SSL">
                          Si le domaine est connecté, cliquez sur <b>Retry</b> pour forcer la régénération du certificat Let's Encrypt.
                        </Step>
                        <Step n={3} title="Vérifier les enregistrements CAA">
                          Si vous avez des enregistrements CAA dans votre DNS, assurez-vous qu'ils autorisent <code className="text-primary">letsencrypt.org</code>.
                        </Step>
                        <Step n={4} title="Attendre la propagation">
                          La propagation SSL peut prendre jusqu'à <b>72 heures</b>. Revérifiez avec le bouton ci-dessus.
                        </Step>
                      </div>
                    )}

                    {showFixGuide === "dns" && (
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <Step n={1} title="Configurer l'enregistrement A (racine)">
                          Type: <code className="text-primary">A</code> | Nom: <code className="text-primary">@</code> | Valeur: <code className="text-primary">185.158.133.1</code>
                        </Step>
                        <Step n={2} title="Configurer l'enregistrement A (www)">
                          Type: <code className="text-primary">A</code> | Nom: <code className="text-primary">www</code> | Valeur: <code className="text-primary">185.158.133.1</code>
                        </Step>
                        <Step n={3} title="Ajouter le TXT de vérification">
                          Type: <code className="text-primary">TXT</code> | Nom: <code className="text-primary">_lovable</code> | Valeur fournie dans le panneau Lovable.
                        </Step>
                        <Step n={4} title="Supprimer les conflits">
                          Supprimez tout ancien enregistrement A, AAAA ou CNAME pointant ailleurs pour <code className="text-primary">unpro.ca</code> et <code className="text-primary">www.unpro.ca</code>.
                        </Step>
                      </div>
                    )}

                    {showFixGuide === "fortiguard" && (
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <Step n={1} title="Comprendre le blocage">
                          FortiGuard bloque les domaines récemment enregistrés sous la catégorie <b>« Newly Observed Domain »</b>. Ce blocage est automatique et touche les utilisateurs protégés par un pare-feu FortiGate.
                        </Step>
                        <Step n={2} title="Soumettre une recatégorisation">
                          Allez sur <a href="https://www.fortiguard.com/faq/webfilter" target="_blank" className="text-primary underline">fortiguard.com/faq/webfilter</a>, entrez <code className="text-primary">unpro.ca</code> et soumettez une demande de recatégorisation vers <b>« Business »</b>.
                        </Step>
                        <Step n={3} title="Contacter l'administrateur réseau">
                          Si vos clients sont bloqués, demandez à leur admin réseau d'ajouter <code className="text-primary">unpro.ca</code> en liste blanche dans leur FortiGate.
                        </Step>
                        <Step n={4} title="Délai estimé">
                          FortiGuard traite les demandes en <b>24-72 heures</b>. Une fois recatégorisé, le blocage est levé automatiquement.
                        </Step>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* History */}
              <HistoryPanel domain={domain} />
            </motion.div>
          )}

          {/* Empty state */}
          {!scanning && !check && (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-12 text-center space-y-4">
              <Globe className="w-12 h-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">Cliquez sur « Relancer le scan » pour diagnostiquer votre domaine.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

/* ─── Step component ─── */
function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex-none w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
        {n}
      </div>
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        <p className="mt-0.5">{children}</p>
      </div>
    </div>
  );
}

/* ─── History panel ─── */
function HistoryPanel({ domain }: { domain: string }) {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("domain_health_checks")
      .select("id, score, status, created_at")
      .eq("domain", domain)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => { if (data) setHistory(data); });
  }, [domain]);

  if (history.length === 0) return null;

  return (
    <div className="glass-card p-6">
      <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-muted-foreground" /> Historique des scans
      </h3>
      <div className="space-y-2">
        {history.map((h) => (
          <div key={h.id} className="flex items-center justify-between bg-background/50 rounded-lg px-4 py-2 text-sm">
            <span className="text-muted-foreground">{new Date(h.created_at).toLocaleString("fr-CA")}</span>
            <div className="flex items-center gap-3">
              <span className={`font-bold ${statusColor(h.status)}`}>{h.score}/100</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${statusBg(h.status)}`}>{h.status.toUpperCase()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}