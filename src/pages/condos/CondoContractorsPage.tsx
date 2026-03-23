/**
 * UNPRO Condos — Contractors Page (Manager + Board)
 */
import CondoLayout from "@/layouts/CondoLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Star, Phone, Wrench, CheckCircle2 } from "lucide-react";

const mockContractors = [
  { id: "1", name: "Plomberie Laval Pro", specialty: "Plomberie", rating: 4.7, phone: "450-555-0101", verified: true, activeJobs: 1 },
  { id: "2", name: "Électricité 440", specialty: "Électricité", rating: 4.5, phone: "514-555-0202", verified: true, activeJobs: 0 },
  { id: "3", name: "Toiture Élasto-Pro", specialty: "Toiture", rating: 4.3, phone: "438-390-9516", verified: false, activeJobs: 0 },
  { id: "4", name: "Paysagement Duguay", specialty: "Aménagement", rating: 4.8, phone: "438-933-0876", verified: true, activeJobs: 2 },
];

export default function CondoContractorsPage() {
  return (
    <CondoLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Entrepreneurs</h1>
            <p className="text-sm text-muted-foreground mt-1">Entrepreneurs assignés à l'immeuble</p>
          </div>
          <Button className="rounded-xl gap-2">
            <Plus className="h-4 w-4" /> Ajouter
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {mockContractors.map((c) => (
            <Card key={c.id} className="border-border/30 hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm text-foreground">{c.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{c.specialty}</Badge>
                      {c.verified && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Vérifié
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-amber-500">
                    <Star className="h-3 w-3 fill-current" />
                    {c.rating}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>
                  {c.activeJobs > 0 && (
                    <span className="flex items-center gap-1 text-primary">
                      <Wrench className="h-3 w-3" /> {c.activeJobs} travaux actifs
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </CondoLayout>
  );
}
