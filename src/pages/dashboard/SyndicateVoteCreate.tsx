import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreateVote } from "@/hooks/useSyndicate";
import { toast } from "sonner";
import { Vote, Plus, X } from "lucide-react";

const VOTE_TYPES = [
  { value: "simple_majority", label: "Majorité simple (50%+1)" },
  { value: "two_thirds", label: "Majorité des 2/3" },
  { value: "three_quarters", label: "Majorité des 3/4" },
  { value: "unanimous", label: "Unanimité" },
];

const SyndicateVoteCreate = () => {
  const { id: syndicateId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const createVote = useCreateVote();

  const [form, setForm] = useState({
    title: "",
    description: "",
    vote_type: "simple_majority",
    quorum_percentage: "50",
    required_majority: "50",
  });
  const [choices, setChoices] = useState(["Pour", "Contre", "Abstention"]);

  const addChoice = () => setChoices((c) => [...c, ""]);
  const removeChoice = (i: number) => setChoices((c) => c.filter((_, idx) => idx !== i));
  const updateChoice = (i: number, val: string) => setChoices((c) => c.map((v, idx) => (idx === i ? val : v)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!syndicateId) return;
    const validChoices = choices.filter((c) => c.trim());
    if (validChoices.length < 2) {
      toast.error("Au moins 2 choix sont requis.");
      return;
    }

    try {
      await createVote.mutateAsync({
        syndicate_id: syndicateId,
        title: form.title,
        description: form.description || undefined,
        vote_type: form.vote_type,
        quorum_percentage: parseFloat(form.quorum_percentage),
        required_majority: parseFloat(form.required_majority),
        choices: validChoices,
      });
      toast.success("Vote créé avec succès !");
      navigate(`/dashboard/syndicates/${syndicateId}/votes`);
    } catch {
      toast.error("Erreur lors de la création du vote.");
    }
  };

  return (
    <DashboardLayout>
      <PageHeader title="Nouveau vote" description="Créez une résolution pour votre syndicat" />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Vote className="h-4 w-4 text-primary" />
            Détails du vote
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre de la résolution *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
                placeholder="Ex: Remplacement de la toiture"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Détails de la résolution…"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type de vote</Label>
                <Select value={form.vote_type} onValueChange={(v) => setForm((f) => ({ ...f, vote_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VOTE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quorum">Quorum (%)</Label>
                <Input
                  id="quorum"
                  type="number"
                  min="1"
                  max="100"
                  value={form.quorum_percentage}
                  onChange={(e) => setForm((f) => ({ ...f, quorum_percentage: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Choix de réponse</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addChoice}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter
                </Button>
              </div>
              <div className="space-y-2">
                {choices.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={c}
                      onChange={(e) => updateChoice(i, e.target.value)}
                      placeholder={`Choix ${i + 1}`}
                    />
                    {choices.length > 2 && (
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeChoice(i)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Button type="submit" disabled={createVote.isPending} className="w-full">
              {createVote.isPending ? "Création…" : "Créer le vote"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default SyndicateVoteCreate;
