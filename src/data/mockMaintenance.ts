export interface MaintenanceItem {
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
}

export interface SeasonalChecklist {
  season: string;
  seasonSlug: string;
  icon: string;
  items: MaintenanceItem[];
}

export const SEASONAL_CHECKLISTS: SeasonalChecklist[] = [
  {
    season: "Printemps", seasonSlug: "printemps", icon: "Flower2",
    items: [
      { title: "Inspecter la toiture", description: "Vérifier les bardeaux, solins et évents après l'hiver.", priority: "high" },
      { title: "Nettoyer les gouttières", description: "Retirer les feuilles et débris accumulés.", priority: "high" },
      { title: "Vérifier la fondation", description: "Inspecter pour de nouvelles fissures causées par le gel.", priority: "high" },
      { title: "Tester la pompe de puisard", description: "S'assurer du bon fonctionnement avant la fonte des neiges.", priority: "high" },
      { title: "Inspecter le revêtement extérieur", description: "Chercher les dommages causés par la glace et le vent.", priority: "medium" },
      { title: "Nettoyer les fenêtres et moustiquaires", description: "Remplacer les moustiquaires endommagées.", priority: "low" },
      { title: "Vérifier la terrasse et le balcon", description: "Inspecter le bois pour la pourriture et les clous soulevés.", priority: "medium" },
      { title: "Ouvrir le robinet extérieur", description: "Rétablir l'alimentation d'eau extérieure graduellement.", priority: "medium" },
    ],
  },
  {
    season: "Été", seasonSlug: "ete", icon: "Sun",
    items: [
      { title: "Entretenir la climatisation", description: "Nettoyer les filtres et vérifier le réfrigérant.", priority: "high" },
      { title: "Peindre ou teindre le bois extérieur", description: "Protéger les surfaces avant les fortes chaleurs.", priority: "medium" },
      { title: "Vérifier le calfeutrage", description: "Inspecter les joints autour des fenêtres et portes.", priority: "medium" },
      { title: "Entretenir la pelouse et le jardin", description: "Arrosage, fertilisation et contrôle des mauvaises herbes.", priority: "low" },
      { title: "Inspecter le grenier", description: "Vérifier la ventilation et l'isolation.", priority: "medium" },
      { title: "Nettoyer le BBQ et la terrasse", description: "Entretien régulier pour la saison.", priority: "low" },
    ],
  },
  {
    season: "Automne", seasonSlug: "automne", icon: "Leaf",
    items: [
      { title: "Nettoyer les gouttières (encore)", description: "Retirer les feuilles mortes avant le gel.", priority: "high" },
      { title: "Faire inspecter le système de chauffage", description: "Entretien annuel de la fournaise ou chaudière.", priority: "high" },
      { title: "Fermer le robinet extérieur", description: "Couper l'eau et drainer pour éviter le gel.", priority: "high" },
      { title: "Vérifier les détecteurs de fumée", description: "Tester et remplacer les piles.", priority: "high" },
      { title: "Isoler les tuyaux exposés", description: "Prévenir le gel dans le garage et le sous-sol.", priority: "medium" },
      { title: "Ranger le mobilier d'extérieur", description: "Protéger les meubles et accessoires du gel.", priority: "low" },
      { title: "Vérifier les coupe-froid", description: "Remplacer autour des portes et fenêtres usés.", priority: "medium" },
    ],
  },
  {
    season: "Hiver", seasonSlug: "hiver", icon: "Snowflake",
    items: [
      { title: "Surveiller les barrages de glace", description: "Retirer la neige accumulée en bordure de toit.", priority: "high" },
      { title: "Maintenir la ventilation du grenier", description: "Vérifier que les évents ne sont pas bloqués par la neige.", priority: "high" },
      { title: "Vérifier l'humidité intérieure", description: "Maintenir entre 30-50% avec l'échangeur d'air.", priority: "medium" },
      { title: "Inspecter la plomberie au sous-sol", description: "Surveiller les tuyaux exposés au froid.", priority: "high" },
      { title: "Déneiger les sorties de secours", description: "Garder les portes et fenêtres de sous-sol accessibles.", priority: "high" },
      { title: "Surveiller la consommation d'énergie", description: "Comparer avec les mois précédents pour détecter les anomalies.", priority: "low" },
    ],
  },
];
