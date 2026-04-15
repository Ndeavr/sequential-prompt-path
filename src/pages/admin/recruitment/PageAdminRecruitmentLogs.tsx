import { useRecruitmentAutomation } from "@/hooks/useRecruitmentAutomation";
import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, FileText, RotateCcw } from "lucide-react";

const severityColor: Record<string, string> = {
  high: "text-red-500 border-red-500/30",
  medium: "text-amber-500 border-amber-500/30",
  low: "text-blue-500 border-blue-500/30",
};

export default function PageAdminRecruitmentLogs() {
  const { auditLogs, exceptions, events } = useRecruitmentAutomation();

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Logs & Exceptions</h1>
          <p className="text-sm text-muted-foreground">Observabilité complète du moteur de recrutement</p>
        </div>

        <Tabs defaultValue="exceptions">
          <TabsList>
            <TabsTrigger value="exceptions" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Exceptions ({exceptions.data?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-1">
              <FileText className="h-3 w-3" /> Audit
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-1">
              <RotateCcw className="h-3 w-3" /> Événements
            </TabsTrigger>
          </TabsList>

          <TabsContent value="exceptions">
            <Card className="bg-card/80 backdrop-blur border-border/50 overflow-hidden">
              {exceptions.isLoading ? (
                <CardContent className="p-4"><Skeleton className="h-40" /></CardContent>
              ) : exceptions.data?.length === 0 ? (
                <CardContent className="py-8 text-center text-muted-foreground text-sm">Aucune exception 🎉</CardContent>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Sévérité</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {exceptions.data?.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="text-sm font-medium">{e.exception_type}</TableCell>
                          <TableCell><Badge variant="outline" className={severityColor[e.severity] || ""}>{e.severity}</Badge></TableCell>
                          <TableCell className="text-sm max-w-[300px] truncate">{e.message}</TableCell>
                          <TableCell><Badge variant="outline">{e.status}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString("fr-CA")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <Card className="bg-card/80 backdrop-blur border-border/50 overflow-hidden">
              {auditLogs.isLoading ? (
                <CardContent className="p-4"><Skeleton className="h-40" /></CardContent>
              ) : auditLogs.data?.length === 0 ? (
                <CardContent className="py-8 text-center text-muted-foreground text-sm">Aucun log d'audit</CardContent>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Entité</TableHead>
                        <TableHead>Événement</TableHead>
                        <TableHead>Acteur</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.data?.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell className="text-sm">{l.entity_type}</TableCell>
                          <TableCell className="text-sm font-medium">{l.event_type}</TableCell>
                          <TableCell className="text-sm">{l.actor_type}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("fr-CA")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="events">
            <Card className="bg-card/80 backdrop-blur border-border/50 overflow-hidden">
              {events.isLoading ? (
                <CardContent className="p-4"><Skeleton className="h-40" /></CardContent>
              ) : events.data?.length === 0 ? (
                <CardContent className="py-8 text-center text-muted-foreground text-sm">Aucun événement</CardContent>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Entité</TableHead>
                        <TableHead>Acteur</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {events.data?.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="text-sm font-medium">{e.event_type}</TableCell>
                          <TableCell className="text-sm">{e.entity_type}</TableCell>
                          <TableCell className="text-sm">{e.actor_type}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString("fr-CA")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
