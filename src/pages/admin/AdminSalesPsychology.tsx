/**
 * UNPRO — Admin Sales Psychology Dashboard
 */
import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MICROCOPY_LIBRARY } from "@/services/salesPsychologyEngine";
import { useMicrocopyDB } from "@/hooks/useSalesPsychology";
import { Brain, MessageSquare, Shield, Zap, Heart, Eye } from "lucide-react";

const PRINCIPLE_ICONS: Record<string, React.ReactNode> = {
  urgency: <Zap className="h-3.5 w-3.5 text-orange-500" />,
  scarcity: <Eye className="h-3.5 w-3.5 text-red-500" />,
  social_proof: <Heart className="h-3.5 w-3.5 text-pink-500" />,
  authority: <Shield className="h-3.5 w-3.5 text-blue-500" />,
  loss_aversion: <Brain className="h-3.5 w-3.5 text-purple-500" />,
  simplicity: <MessageSquare className="h-3.5 w-3.5 text-green-500" />,
};

const PRINCIPLE_COLORS: Record<string, string> = {
  urgency: "bg-orange-100 text-orange-800",
  scarcity: "bg-red-100 text-red-800",
  social_proof: "bg-pink-100 text-pink-800",
  authority: "bg-blue-100 text-blue-800",
  loss_aversion: "bg-purple-100 text-purple-800",
  simplicity: "bg-green-100 text-green-800",
};

export default function AdminSalesPsychology() {
  const { data: dbCopies = [] } = useMicrocopyDB();

  const allCopies = [...dbCopies.map((c) => ({ ...c, source: "db" })), ...MICROCOPY_LIBRARY.map((c, i) => ({ ...c, id: `static-${i}`, source: "static" }))];

  const homeownerCopies = allCopies.filter((c) => c.audience === "homeowner" || c.audience === "both");
  const contractorCopies = allCopies.filter((c) => c.audience === "contractor" || c.audience === "both");

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6" /> Sales Psychology Engine
          </h1>
          <p className="text-sm text-muted-foreground">Bibliothèque de microcopy haute conversion, badges de confiance et accélérateurs de décision</p>
        </div>

        {/* Principle overview */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {Object.entries(PRINCIPLE_ICONS).map(([principle, icon]) => {
            const count = allCopies.filter((c) => c.psychology_principle === principle).length;
            return (
              <Card key={principle}>
                <CardContent className="py-3 px-3 text-center">
                  <div className="flex justify-center mb-1">{icon}</div>
                  <p className="text-[10px] font-medium capitalize">{principle.replace("_", " ")}</p>
                  <p className="text-lg font-bold">{count}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Tabs defaultValue="homeowner">
          <TabsList>
            <TabsTrigger value="homeowner">Propriétaire</TabsTrigger>
            <TabsTrigger value="contractor">Entrepreneur</TabsTrigger>
          </TabsList>

          <TabsContent value="homeowner" className="mt-4 space-y-2">
            {homeownerCopies.map((copy) => (
              <CopyCard key={copy.id} copy={copy} />
            ))}
          </TabsContent>

          <TabsContent value="contractor" className="mt-4 space-y-2">
            {contractorCopies.map((copy) => (
              <CopyCard key={copy.id} copy={copy} />
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

function CopyCard({ copy }: { copy: any }) {
  return (
    <Card>
      <CardContent className="py-3 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium mb-1.5">"{copy.text_fr}"</p>
            <div className="flex gap-1.5 flex-wrap">
              <Badge variant="outline" className="text-[10px]">{copy.context}</Badge>
              <Badge variant="outline" className="text-[10px]">{copy.placement}</Badge>
              <Badge className={`text-[10px] ${PRINCIPLE_COLORS[copy.psychology_principle] ?? ""}`}>
                {copy.psychology_principle?.replace("_", " ")}
              </Badge>
              {copy.source === "db" && <Badge variant="secondary" className="text-[10px]">DB</Badge>}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <span className="text-xs text-muted-foreground">P{copy.priority}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
