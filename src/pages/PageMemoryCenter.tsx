import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePersistentUserMemory } from '@/hooks/usePersistentUserMemory';
import { CardMemoryFact } from '@/components/memory/CardMemoryFact';
import { WidgetTimeSavedEstimate } from '@/components/memory/WidgetTimeSavedEstimate';
import { PanelAlexKnownContext } from '@/components/memory/PanelAlexKnownContext';
import { PersistentUserMemoryProvider } from '@/contexts/PersistentUserMemoryProvider';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Brain, RefreshCw, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function PageMemoryCenterInner() {
  const navigate = useNavigate();
  const memory = usePersistentUserMemory();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');

  const filteredFacts = memory.facts.filter((f: any) => {
    const matchesSearch = !search || 
      f.fact_key?.toLowerCase().includes(search.toLowerCase()) ||
      JSON.stringify(f.fact_value_json)?.toLowerCase().includes(search.toLowerCase());
    
    if (tab === 'all') return matchesSearch;
    if (tab === 'confirmed') return matchesSearch && f.is_confirmed;
    if (tab === 'pending') return matchesSearch && f.status === 'pending_confirmation';
    if (tab === 'persistent') return matchesSearch && f.is_persistent;
    return matchesSearch;
  });

  const handleDismiss = (factId: string) => memory.dismissFact.mutate(factId);
  const handlePromote = (factId: string) => memory.promoteFact.mutate(factId);
  const handleConfirm = (factId: string) => memory.promoteFact.mutate(factId);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Ma mémoire
            </h1>
            <p className="text-xs text-muted-foreground">
              Ce qu'UNPRO sait de vous
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Time saved widget */}
        <WidgetTimeSavedEstimate />

        {/* Known context overview */}
        <PanelAlexKnownContext />

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une information..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="all" className="text-xs">Tout</TabsTrigger>
            <TabsTrigger value="confirmed" className="text-xs">Confirmé</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs">À confirmer</TabsTrigger>
            <TabsTrigger value="persistent" className="text-xs">Persistant</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4 space-y-3">
            {memory.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredFacts.length === 0 ? (
              <div className="text-center py-12">
                <Brain className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {search ? 'Aucun résultat' : 'Aucune information mémorisée'}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Interagissez avec UNPRO pour commencer à construire votre mémoire
                </p>
              </div>
            ) : (
              filteredFacts.map((fact: any) => (
                <CardMemoryFact
                  key={fact.id}
                  fact={fact}
                  onDismiss={handleDismiss}
                  onPromote={handlePromote}
                  onConfirm={handleConfirm}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function PageMemoryCenter() {
  return (
    <PersistentUserMemoryProvider>
      <PageMemoryCenterInner />
    </PersistentUserMemoryProvider>
  );
}
