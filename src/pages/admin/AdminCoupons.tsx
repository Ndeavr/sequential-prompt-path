/**
 * PageAdminCoupons — Full coupon management for UNPRO admins
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Tag, Plus, Search, Filter, ToggleLeft, Archive,
  Ticket, Users, Crown, Lock, Globe, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  useAdminCoupons, useAdminCouponStats, useToggleCoupon, useArchiveCoupon,
  type Coupon,
} from "@/hooks/useCoupons";
import FormCouponAdminCreate from "@/components/coupon/FormCouponAdminCreate";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type FilterMode = "all" | "active" | "inactive" | "founder" | "partner" | "internal";

export default function AdminCoupons() {
  const { data: coupons, isLoading } = useAdminCoupons();
  const { data: stats } = useAdminCouponStats();
  const toggleCoupon = useToggleCoupon();
  const archiveCoupon = useArchiveCoupon();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [showCreate, setShowCreate] = useState(false);

  const filtered = (coupons || []).filter((c) => {
    if (search && !c.code.toLowerCase().includes(search.toLowerCase()) && !c.label?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "active") return c.active;
    if (filter === "inactive") return !c.active;
    if (filter === "founder") return c.is_founder_offer;
    if (filter === "partner") return c.is_partner_only;
    if (filter === "internal") return c.is_internal_only;
    return true;
  });

  const statCards = [
    { label: "Total", value: stats?.total ?? 0, icon: Ticket, color: "text-foreground" },
    { label: "Actifs", value: stats?.active ?? 0, icon: ToggleLeft, color: "text-green-500" },
    { label: "Fondateurs", value: stats?.founder ?? 0, icon: Crown, color: "text-amber-500" },
    { label: "Redemptions", value: stats?.total_redemptions ?? 0, icon: TrendingUp, color: "text-primary" },
  ];

  const filters: { key: FilterMode; label: string; icon: any }[] = [
    { key: "all", label: "Tous", icon: Tag },
    { key: "active", label: "Actifs", icon: ToggleLeft },
    { key: "inactive", label: "Inactifs", icon: Archive },
    { key: "founder", label: "Fondateurs", icon: Crown },
    { key: "partner", label: "Partenaires", icon: Users },
    { key: "internal", label: "Internes", icon: Lock },
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Tag className="h-6 w-6 text-primary" />
            Gestion des coupons
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Créez, gérez et suivez les codes promo UNPRO
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Créer un coupon
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border/50 bg-card p-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par code ou nom..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {filters.map((f) => (
            <Button
              key={f.key}
              variant={filter === f.key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f.key)}
              className="gap-1.5 text-xs"
            >
              <f.icon className="h-3 w-3" />
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <Tag className="h-8 w-8 text-muted-foreground/50 mx-auto" />
          <p className="text-muted-foreground">Aucun coupon trouvé</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead>Valeur</TableHead>
                <TableHead className="hidden md:table-cell">Plans</TableHead>
                <TableHead className="hidden sm:table-cell">Usages</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((coupon) => (
                <CouponRow
                  key={coupon.id}
                  coupon={coupon}
                  onToggle={() => toggleCoupon.mutate(coupon.id)}
                  onArchive={() => archiveCoupon.mutate(coupon.id)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <FormCouponAdminCreate onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}

function CouponRow({ coupon, onToggle, onArchive }: { coupon: Coupon; onToggle: () => void; onArchive: () => void }) {
  const isExpired = coupon.ends_at && new Date(coupon.ends_at) < new Date();

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <code className="font-mono text-sm font-bold text-foreground">{coupon.code}</code>
          <div className="flex gap-1">
            {coupon.is_founder_offer && <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-500 border-amber-500/30">Fondateur</Badge>}
            {coupon.is_internal_only && <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-blue-500 border-blue-500/30">Interne</Badge>}
            {coupon.is_partner_only && <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-purple-500 border-purple-500/30">Partenaire</Badge>}
          </div>
        </div>
        {coupon.label && <p className="text-xs text-muted-foreground mt-0.5">{coupon.label}</p>}
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <span className="text-xs text-muted-foreground capitalize">{coupon.discount_type}</span>
      </TableCell>
      <TableCell>
        <span className="font-semibold text-sm">
          {coupon.discount_type === "percentage"
            ? `${coupon.discount_value}%`
            : `${(coupon.discount_value / 100).toFixed(2)} $`}
        </span>
        <span className="text-xs text-muted-foreground ml-1">
          {coupon.duration_type === "once" ? "1x" : coupon.duration_type === "forever" ? "∞" : `${coupon.duration_in_months}m`}
        </span>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <div className="flex gap-1 flex-wrap">
          {coupon.eligible_plan_codes?.length > 0
            ? coupon.eligible_plan_codes.map((p) => (
                <Badge key={p} variant="outline" className="text-[10px] px-1.5 py-0">{p}</Badge>
              ))
            : <span className="text-xs text-muted-foreground">Tous</span>}
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <span className="text-sm">
          {coupon.actual_redemptions ?? coupon.current_redemptions_count}
          {coupon.usage_limit_total ? `/${coupon.usage_limit_total}` : ""}
        </span>
      </TableCell>
      <TableCell>
        {isExpired ? (
          <Badge variant="outline" className="text-destructive border-destructive/30 text-[10px]">Expiré</Badge>
        ) : coupon.active ? (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">Actif</Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground text-[10px]">Inactif</Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex gap-1 justify-end">
          <Button variant="ghost" size="sm" onClick={onToggle} className="h-8 px-2 text-xs">
            {coupon.active ? "Désactiver" : "Activer"}
          </Button>
          <Button variant="ghost" size="sm" onClick={onArchive} className="h-8 px-2 text-xs text-destructive hover:text-destructive">
            <Archive className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
