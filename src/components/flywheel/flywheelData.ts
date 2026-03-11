import {
  Home, FileText, Database, Brain, Users, Hammer, Award, MapPin,
} from "lucide-react";

export interface FlywheelNodeData {
  id: number;
  label: string;
  description: string;
  detail: string;
  whyItMatters: string;
  metric: string;
  icon: typeof Home;
  colorClass: string; // tailwind text color token
  glowColor: string;  // raw hsl for glow effects
}

export const flywheelNodes: FlywheelNodeData[] = [
  {
    id: 1,
    label: "House Score",
    description: "Les propriétaires entrent leur adresse et comprennent instantanément leur propriété.",
    detail: "Le House Score donne à chaque propriétaire un portrait objectif de l'état de sa maison : structure, systèmes, énergie, enveloppe. C'est le premier geste qui génère de la confiance et de la curiosité.",
    whyItMatters: "C'est le déclencheur d'engagement. Plus un propriétaire comprend sa maison, plus il agit.",
    metric: "+ meilleure compréhension",
    icon: Home,
    colorClass: "text-primary",
    glowColor: "222 100% 65%",
  },
  {
    id: 2,
    label: "Passeport Maison",
    description: "La maison devient un dossier numérique structuré et permanent.",
    detail: "Le Passeport Maison centralise toute l'information critique : âge des systèmes, travaux passés, inspections, photos. Il devient la mémoire long-terme de la propriété.",
    whyItMatters: "Un dossier complet permet des recommandations plus précises et réduit les allers-retours inutiles.",
    metric: "+ données structurées",
    icon: FileText,
    colorClass: "text-accent",
    glowColor: "195 100% 55%",
  },
  {
    id: 3,
    label: "Couche de données",
    description: "Rapports d'inspection, factures, photos et historiques enrichissent le système.",
    detail: "Chaque document ajouté par un propriétaire ou un entrepreneur augmente la qualité des futures recommandations. Le système apprend continuellement.",
    whyItMatters: "Plus la donnée est riche, plus le matching est précis et plus la valeur perçue augmente.",
    metric: "+ qualité des données",
    icon: Database,
    colorClass: "text-secondary",
    glowColor: "252 100% 72%",
  },
  {
    id: 4,
    label: "Intelligence Alex",
    description: "Alex interprète les problèmes, suggère des actions et guide les décisions.",
    detail: "Alex est le moteur d'intelligence conversationnelle d'UNPRO. Il comprend le contexte du propriétaire, détecte les priorités et propose les meilleures prochaines étapes.",
    whyItMatters: "L'IA réduit la friction de décision et accélère le passage à l'action.",
    metric: "+ recommandations pertinentes",
    icon: Brain,
    colorClass: "text-accent",
    glowColor: "195 100% 55%",
  },
  {
    id: 5,
    label: "Matching + Booking",
    description: "UNPRO dirige le propriétaire vers les bons entrepreneurs selon le problème, le territoire et le Score AIPP.",
    detail: "Le matching tient compte de la catégorie de travaux, du territoire, de la disponibilité, du Score AIPP et de la pertinence historique. Le booking est intégré directement.",
    whyItMatters: "Un bon matching réduit les soumissions inutiles et augmente la conversion pour l'entrepreneur.",
    metric: "+ conversion plus forte",
    icon: Users,
    colorClass: "text-success",
    glowColor: "152 69% 51%",
  },
  {
    id: 6,
    label: "Travaux complétés",
    description: "Les projets, résultats et preuves sont ajoutés au dossier de la propriété.",
    detail: "Chaque projet documenté renforce le Passeport Maison, met à jour le House Score et enrichit le profil de l'entrepreneur qui l'a réalisé.",
    whyItMatters: "Les travaux complétés ferment la boucle et déclenchent le cycle suivant.",
    metric: "+ confiance accrue",
    icon: Hammer,
    colorClass: "text-warning",
    glowColor: "38 92% 63%",
  },
  {
    id: 7,
    label: "Profils AIPP renforcés",
    description: "Les entrepreneurs améliorent leur visibilité, crédibilité et qualité de recommandation.",
    detail: "Chaque projet documenté, certification ajoutée et avis reçu augmente le Score AIPP de l'entrepreneur, améliorant sa position dans les recommandations futures.",
    whyItMatters: "Un Score AIPP élevé = plus de visibilité = plus de rendez-vous qualifiés.",
    metric: "+ entrepreneurs visibles",
    icon: Award,
    colorClass: "text-primary",
    glowColor: "222 100% 65%",
  },
  {
    id: 8,
    label: "Intelligence de quartier",
    description: "UNPRO devient plus intelligent à l'échelle de la rue, du district et de la ville.",
    detail: "En agrégeant les données de multiples propriétés, UNPRO détecte les tendances locales : problèmes récurrents, entrepreneurs performants, saisonnalités, besoins émergents.",
    whyItMatters: "L'intelligence géographique crée un avantage compétitif impossible à reproduire.",
    metric: "+ intelligence locale",
    icon: MapPin,
    colorClass: "text-success",
    glowColor: "152 69% 51%",
  },
];
