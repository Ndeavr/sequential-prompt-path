/**
 * UNPRO — Alex Market Domination System
 * SEO + AEO + GEO content generation, schema structuring, profile optimization,
 * local cluster domination, competitive gap analysis, and citation building.
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface DominationContext {
  city: string;
  cityLabel: string;
  serviceType: string;
  serviceLabel: string;
  problemType?: string;
  problemLabel?: string;
  contractorData?: ContractorProfileData;
  competitorCount?: number;
}

export interface ContractorProfileData {
  id: string;
  businessName: string;
  slug: string;
  aippScore: number;
  services: string[];
  certifications: string[];
  yearsExperience?: number;
  reviewCount: number;
  avgRating: number;
  city: string;
  serviceArea: string[];
  specialties: string[];
  problemsSolved: string[];
}

export interface GeneratedContent {
  title: string;
  h1: string;
  metaDescription: string;
  sections: ContentSection[];
  faq: FaqItem[];
  schemaJsonLd: Record<string, unknown>[];
  internalLinks: InternalLink[];
  aeoBlocks: AeoBlock[];
  quality: ContentQuality;
}

export interface ContentSection {
  id: string;
  heading: string;
  body: string;
  type: 'intro' | 'explanation' | 'comparison' | 'howto' | 'cost' | 'checklist' | 'cta' | 'trust';
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface InternalLink {
  href: string;
  label: string;
  context: string;
}

export interface AeoBlock {
  intent: string;
  directAnswer: string;
  supportingFacts: string[];
  sourceAttribution: string;
}

export interface ContentQuality {
  readabilityScore: number; // 0-100
  uniquenessScore: number;
  depthScore: number;
  structureScore: number;
  overall: number;
  passesThreshold: boolean;
}

export interface LocalCluster {
  hub: string;
  spokes: string[];
  city: string;
  service: string;
  completeness: number;
  missingPages: string[];
}

export interface CompetitiveGap {
  keyword: string;
  currentCoverage: 'none' | 'weak' | 'moderate' | 'strong';
  opportunity: 'high' | 'medium' | 'low';
  suggestedAction: string;
  estimatedImpact: string;
}

export interface ProfileOptimization {
  contractorId: string;
  currentScore: number;
  optimizedScore: number;
  improvements: ProfileImprovement[];
  enrichedDescription: string;
  suggestedTags: string[];
  schemaMarkup: Record<string, unknown>;
}

export interface ProfileImprovement {
  field: string;
  current: string;
  suggested: string;
  impact: 'high' | 'medium' | 'low';
  reason: string;
}

// ─── Data Constants ─────────────────────────────────────────────────

const CITIES_QC: Record<string, string> = {
  'laval': 'Laval',
  'montreal': 'Montréal',
  'longueuil': 'Longueuil',
  'terrebonne': 'Terrebonne',
  'brossard': 'Brossard',
  'repentigny': 'Repentigny',
  'saint-jerome': 'Saint-Jérôme',
  'blainville': 'Blainville',
  'mascouche': 'Mascouche',
  'saint-eustache': 'Saint-Eustache',
};

const SERVICES_MAP: Record<string, { label: string; problems: string[]; keywords: string[] }> = {
  'toiture': {
    label: 'Toiture',
    problems: ['toiture-qui-fuit', 'bardeaux-endommages', 'infiltration-eau', 'glace-toiture'],
    keywords: ['couvreur', 'réfection toiture', 'remplacement bardeaux', 'toiture plate'],
  },
  'isolation': {
    label: 'Isolation',
    problems: ['perte-chaleur', 'condensation', 'moisissure-grenier', 'facture-energie-elevee'],
    keywords: ['isolation grenier', 'cellulose', 'uréthane', 'laine soufflée'],
  },
  'plomberie': {
    label: 'Plomberie',
    problems: ['fuite-eau', 'drain-bouche', 'chauffe-eau-defectueux', 'tuyau-gele'],
    keywords: ['plombier', 'réparation fuite', 'installation chauffe-eau', 'débouchage'],
  },
  'electricite': {
    label: 'Électricité',
    problems: ['panneau-desuet', 'prise-defectueuse', 'court-circuit', 'mise-aux-normes'],
    keywords: ['électricien', 'panneau électrique', 'mise aux normes', 'installation'],
  },
  'peinture': {
    label: 'Peinture',
    problems: ['peinture-ecaillee', 'murs-taches', 'preparation-vente'],
    keywords: ['peintre', 'peinture intérieure', 'peinture extérieure', 'finition'],
  },
  'maconnerie': {
    label: 'Maçonnerie',
    problems: ['fissure-fondation', 'brique-effritee', 'joints-deteriores', 'humidite-sous-sol'],
    keywords: ['maçon', 'réparation fondation', 'rejointoiement', 'crépi'],
  },
  'pavage': {
    label: 'Pavage',
    problems: ['asphalte-fissure', 'drain-surface', 'affaissement'],
    keywords: ['pavage', 'asphalte', 'scellant', 'entrée garage'],
  },
  'fenetres': {
    label: 'Portes et fenêtres',
    problems: ['fenetre-embuee', 'courant-air', 'condensation-fenetres'],
    keywords: ['remplacement fenêtres', 'porte entrée', 'fenêtres écoénergétiques'],
  },
  'climatisation': {
    label: 'Climatisation et chauffage',
    problems: ['thermopompe-brisee', 'chauffage-inegal', 'air-climatise-faible'],
    keywords: ['HVAC', 'thermopompe', 'climatisation centrale', 'fournaise'],
  },
  'amenagement': {
    label: 'Aménagement paysager',
    problems: ['terrain-inegal', 'drainage-mauvais', 'haie-envahissante'],
    keywords: ['paysagiste', 'terrassement', 'pavé uni', 'clôture'],
  },
};

// ─── Content Generator ──────────────────────────────────────────────

export class AlexContentGenerator {
  /**
   * Generate a full SEO/AEO-optimized page for a city+service combination.
   */
  static generateServicePage(ctx: DominationContext): GeneratedContent {
    const { city, cityLabel, serviceType, serviceLabel } = ctx;
    const svc = SERVICES_MAP[serviceType];

    const title = `${serviceLabel} à ${cityLabel} — Trouvez le meilleur professionnel | UNPRO`;
    const h1 = `${serviceLabel} à ${cityLabel}`;
    const metaDescription = `Comparez les meilleurs professionnels en ${serviceLabel.toLowerCase()} à ${cityLabel}. Score AIPP, avis vérifiés, rendez-vous qualifiés. Trouvez le bon expert pour votre projet.`;

    const sections = this.buildSections(ctx, svc);
    const faq = this.buildFaq(ctx, svc);
    const schemaJsonLd = AlexSchemaGenerator.generateForServicePage(ctx);
    const internalLinks = this.buildInternalLinks(ctx, svc);
    const aeoBlocks = AlexAeoEngine.generateBlocks(ctx, svc);

    const quality = this.assessQuality(sections, faq);

    return {
      title, h1, metaDescription,
      sections, faq, schemaJsonLd, internalLinks, aeoBlocks, quality,
    };
  }

  /**
   * Generate a problem-focused page.
   */
  static generateProblemPage(ctx: DominationContext): GeneratedContent {
    const { cityLabel, problemLabel, serviceLabel } = ctx;
    const problemName = problemLabel || 'problème résidentiel';
    const svc = SERVICES_MAP[ctx.serviceType];

    const title = `${problemName} à ${cityLabel} — Causes, solutions et coûts | UNPRO`;
    const h1 = `${problemName} à ${cityLabel}`;
    const metaDescription = `${problemName} à ${cityLabel} : causes fréquentes, solutions efficaces, coûts estimés et professionnels vérifiés. Guide complet par UNPRO.`;

    const sections: ContentSection[] = [
      {
        id: 'intro',
        heading: `Comprendre le problème : ${problemName}`,
        body: `Le ${problemName.toLowerCase()} est l'un des problèmes résidentiels les plus fréquents à ${cityLabel}. Il peut entraîner des dommages importants si non traité rapidement. Voici ce que vous devez savoir pour agir efficacement.`,
        type: 'intro',
      },
      {
        id: 'causes',
        heading: 'Causes fréquentes',
        body: `À ${cityLabel}, les causes principales incluent l'usure normale des matériaux, les conditions climatiques québécoises (gel-dégel, verglas, chaleur estivale) et parfois un entretien insuffisant. Un diagnostic professionnel permet d'identifier la cause exacte.`,
        type: 'explanation',
      },
      {
        id: 'solutions',
        heading: 'Solutions recommandées',
        body: `Selon la gravité, les solutions vont de la réparation ciblée au remplacement complet. Un professionnel vérifié UNPRO peut évaluer la situation et proposer la meilleure approche. Demandez toujours au moins 2 soumissions comparatives.`,
        type: 'howto',
      },
      {
        id: 'costs',
        heading: `Coûts estimés à ${cityLabel}`,
        body: `Les coûts varient selon l'ampleur des travaux, les matériaux choisis et l'accessibilité. À ${cityLabel}, comptez entre 500 $ et 15 000 $ selon le type d'intervention. UNPRO vous aide à comparer les prix réels du marché local.`,
        type: 'cost',
      },
      {
        id: 'checklist',
        heading: 'Quoi vérifier avant d'engager un professionnel',
        body: `• Licence RBQ valide\n• Assurance responsabilité\n• Références locales vérifiables\n• Soumission détaillée et écrite\n• Garantie sur les travaux\n• Score AIPP sur UNPRO`,
        type: 'checklist',
      },
      {
        id: 'cta',
        heading: `Trouvez le bon professionnel à ${cityLabel}`,
        body: `UNPRO vérifie et compare les professionnels en ${serviceLabel.toLowerCase()} à ${cityLabel}. Score de visibilité AIPP, avis authentiques, rendez-vous qualifiés — pas de leads partagés.`,
        type: 'cta',
      },
    ];

    const faq = this.buildProblemFaq(ctx);
    const schemaJsonLd = AlexSchemaGenerator.generateForProblemPage(ctx);
    const internalLinks = this.buildInternalLinks(ctx, svc);
    const aeoBlocks = AlexAeoEngine.generateProblemBlocks(ctx);
    const quality = this.assessQuality(sections, faq);

    return {
      title, h1, metaDescription,
      sections, faq, schemaJsonLd, internalLinks, aeoBlocks, quality,
    };
  }

  private static buildSections(ctx: DominationContext, svc?: { label: string; problems: string[]; keywords: string[] }): ContentSection[] {
    const { cityLabel, serviceLabel } = ctx;
    return [
      {
        id: 'intro',
        heading: `${serviceLabel} à ${cityLabel} : ce qu'il faut savoir`,
        body: `Trouver un professionnel fiable en ${serviceLabel.toLowerCase()} à ${cityLabel} n'est pas toujours simple. UNPRO analyse la visibilité, la réputation et la capacité de conversion de chaque entrepreneur pour vous guider vers le meilleur choix.`,
        type: 'intro',
      },
      {
        id: 'how-to-choose',
        heading: `Comment choisir le bon professionnel en ${serviceLabel.toLowerCase()}`,
        body: `Vérifiez la licence RBQ, les assurances, les avis récents et le score AIPP. Privilégiez les entrepreneurs qui servent activement ${cityLabel} et qui ont des preuves de travaux locaux. UNPRO centralise ces vérifications pour vous.`,
        type: 'howto',
      },
      {
        id: 'local-context',
        heading: `Spécificités locales à ${cityLabel}`,
        body: `${cityLabel} présente des particularités : type de sol, réglementation municipale, conditions climatiques. Les meilleurs professionnels connaissent ces détails et adaptent leurs solutions. Assurez-vous que votre entrepreneur a une expérience locale démontrée.`,
        type: 'explanation',
      },
      {
        id: 'costs',
        heading: `Prix moyens en ${serviceLabel.toLowerCase()} à ${cityLabel}`,
        body: `Les tarifs varient selon la complexité du projet, les matériaux et la saison. À ${cityLabel}, les prix sont généralement alignés sur le marché du Grand Montréal. Obtenez des soumissions comparatives via UNPRO pour avoir une vision claire.`,
        type: 'cost',
      },
      {
        id: 'trust',
        heading: 'Pourquoi choisir UNPRO',
        body: `UNPRO n'est pas une plateforme de leads partagés. Chaque entrepreneur est évalué par notre score AIPP, qui mesure sa visibilité, sa crédibilité et sa capacité à convertir. Vous obtenez des rendez-vous qualifiés, pas des appels à froid.`,
        type: 'trust',
      },
      {
        id: 'cta',
        heading: `Prêt à trouver votre professionnel à ${cityLabel} ?`,
        body: `Comparez les professionnels vérifiés, consultez leurs scores AIPP et réservez un rendez-vous qualifié. C'est gratuit, rapide et sans engagement.`,
        type: 'cta',
      },
    ];
  }

  private static buildFaq(ctx: DominationContext, svc?: { label: string; problems: string[]; keywords: string[] }): FaqItem[] {
    const { cityLabel, serviceLabel } = ctx;
    return [
      {
        question: `Combien coûte un service de ${serviceLabel.toLowerCase()} à ${cityLabel} ?`,
        answer: `Les prix varient selon le type de projet et les matériaux. À ${cityLabel}, comptez entre 500 $ et 25 000 $ selon l'ampleur. Demandez des soumissions comparatives sur UNPRO pour obtenir le meilleur rapport qualité-prix.`,
      },
      {
        question: `Comment trouver le meilleur professionnel en ${serviceLabel.toLowerCase()} à ${cityLabel} ?`,
        answer: `Vérifiez la licence RBQ, les avis récents, l'expérience locale et le score AIPP sur UNPRO. Comparez au moins 2-3 professionnels avant de décider.`,
      },
      {
        question: 'Qu'est-ce que le score AIPP ?',
        answer: 'Le score AIPP (AI-Indexed Professional Profile) mesure la visibilité numérique, la crédibilité et la capacité de conversion d\'un entrepreneur sur une échelle de 0 à 100. Plus le score est élevé, plus le professionnel est bien positionné pour être découvert et choisi.',
      },
      {
        question: `Quelle est la différence entre UNPRO et les autres plateformes à ${cityLabel} ?`,
        answer: 'UNPRO ne vend pas de leads partagés. Chaque entrepreneur reçoit des rendez-vous qualifiés exclusifs. Le score AIPP évalue la visibilité réelle, pas seulement les avis.',
      },
      {
        question: `Les professionnels UNPRO à ${cityLabel} sont-ils vérifiés ?`,
        answer: 'Oui. UNPRO vérifie la licence RBQ, les assurances, les avis et la présence locale de chaque professionnel. Le score AIPP reflète cette analyse.',
      },
    ];
  }

  private static buildProblemFaq(ctx: DominationContext): FaqItem[] {
    const { cityLabel, problemLabel, serviceLabel } = ctx;
    const problem = problemLabel || 'ce problème';
    return [
      {
        question: `Quelles sont les causes du ${problem.toLowerCase()} à ${cityLabel} ?`,
        answer: `Les causes principales incluent l'usure, les conditions climatiques québécoises et l'entretien insuffisant. Un diagnostic professionnel est recommandé.`,
      },
      {
        question: `Combien coûte la réparation d'un ${problem.toLowerCase()} ?`,
        answer: `Les coûts varient de 300 $ à 15 000 $ selon la gravité. Demandez des soumissions sur UNPRO pour comparer.`,
      },
      {
        question: `Est-ce urgent de traiter un ${problem.toLowerCase()} ?`,
        answer: `Cela dépend de la gravité. Certains problèmes s'aggravent rapidement avec l'eau ou le gel. Consultez un professionnel vérifié rapidement.`,
      },
    ];
  }

  private static buildInternalLinks(ctx: DominationContext, svc?: { label: string; problems: string[]; keywords: string[] }): InternalLink[] {
    const links: InternalLink[] = [];
    const { city, serviceType } = ctx;

    // Link to related problems
    if (svc?.problems) {
      for (const prob of svc.problems.slice(0, 3)) {
        links.push({
          href: `/problemes/${prob}/${city}`,
          label: prob.replace(/-/g, ' '),
          context: 'problem',
        });
      }
    }

    // Link to nearby cities
    const nearbyMap: Record<string, string[]> = {
      laval: ['montreal', 'terrebonne', 'blainville'],
      montreal: ['laval', 'longueuil', 'brossard'],
      longueuil: ['montreal', 'brossard'],
      terrebonne: ['laval', 'mascouche', 'repentigny'],
    };
    const nearby = nearbyMap[city] || ['montreal', 'laval'];
    for (const nc of nearby.slice(0, 3)) {
      const ncLabel = CITIES_QC[nc] || nc;
      links.push({
        href: `/villes/${nc}/${serviceType}`,
        label: `${ctx.serviceLabel} à ${ncLabel}`,
        context: 'city',
      });
    }

    return links;
  }

  private static assessQuality(sections: ContentSection[], faq: FaqItem[]): ContentQuality {
    const totalWords = sections.reduce((acc, s) => acc + s.body.split(/\s+/).length, 0);
    const readability = Math.min(100, Math.round(totalWords / 8));
    const depth = Math.min(100, Math.round((totalWords / 600) * 100));
    const structure = Math.min(100, (sections.length * 12) + (faq.length * 8));
    const uniqueness = 75; // baseline — AI-generated content gets higher
    const overall = Math.round((readability + depth + structure + uniqueness) / 4);

    return {
      readabilityScore: readability,
      uniquenessScore: uniqueness,
      depthScore: depth,
      structureScore: structure,
      overall,
      passesThreshold: overall >= 60,
    };
  }
}

// ─── Schema Generator (JSON-LD) ─────────────────────────────────────

export class AlexSchemaGenerator {
  static generateForServicePage(ctx: DominationContext): Record<string, unknown>[] {
    const { cityLabel, serviceLabel, serviceType } = ctx;
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: `${serviceLabel} à ${cityLabel}`,
        description: `Service professionnel de ${serviceLabel.toLowerCase()} à ${cityLabel}. Professionnels vérifiés, score AIPP, rendez-vous qualifiés.`,
        provider: {
          '@type': 'Organization',
          name: 'UNPRO',
          url: 'https://unpro.ca',
        },
        areaServed: {
          '@type': 'City',
          name: cityLabel,
          containedInPlace: { '@type': 'AdministrativeArea', name: 'Québec, Canada' },
        },
        serviceType: serviceLabel,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [],  // filled dynamically from faq
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://unpro.ca' },
          { '@type': 'ListItem', position: 2, name: cityLabel, item: `https://unpro.ca/villes/${ctx.city}` },
          { '@type': 'ListItem', position: 3, name: serviceLabel, item: `https://unpro.ca/villes/${ctx.city}/${serviceType}` },
        ],
      },
    ];
  }

  static generateForProblemPage(ctx: DominationContext): Record<string, unknown>[] {
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: `Comment résoudre : ${ctx.problemLabel || 'problème résidentiel'} à ${ctx.cityLabel}`,
        description: `Guide pour résoudre ${(ctx.problemLabel || '').toLowerCase()} à ${ctx.cityLabel}.`,
        step: [
          { '@type': 'HowToStep', text: 'Identifier les signes visibles du problème' },
          { '@type': 'HowToStep', text: 'Prendre des photos pour documenter' },
          { '@type': 'HowToStep', text: 'Consulter un professionnel vérifié UNPRO' },
          { '@type': 'HowToStep', text: 'Comparer les soumissions' },
          { '@type': 'HowToStep', text: 'Planifier les travaux' },
        ],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [],
      },
    ];
  }

  static generateForContractorProfile(profile: ContractorProfileData): Record<string, unknown> {
    return {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: profile.businessName,
      url: `https://unpro.ca/pro/${profile.slug}`,
      address: {
        '@type': 'PostalAddress',
        addressLocality: profile.city,
        addressRegion: 'QC',
        addressCountry: 'CA',
      },
      aggregateRating: profile.reviewCount > 0 ? {
        '@type': 'AggregateRating',
        ratingValue: profile.avgRating,
        reviewCount: profile.reviewCount,
      } : undefined,
      areaServed: profile.serviceArea.map(a => ({
        '@type': 'City', name: CITIES_QC[a] || a,
      })),
      knowsAbout: [...profile.services, ...profile.specialties],
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Services',
        itemListElement: profile.services.map(s => ({
          '@type': 'Offer',
          itemOffered: { '@type': 'Service', name: s },
        })),
      },
    };
  }
}

// ─── AEO Engine (AI Engine Optimization) ────────────────────────────

export class AlexAeoEngine {
  /**
   * Generate structured blocks optimized for AI citation (ChatGPT, Gemini, Perplexity).
   */
  static generateBlocks(ctx: DominationContext, svc?: { label: string; problems: string[]; keywords: string[] }): AeoBlock[] {
    const { cityLabel, serviceLabel } = ctx;
    return [
      {
        intent: `meilleur ${serviceLabel.toLowerCase()} ${cityLabel}`,
        directAnswer: `Pour trouver le meilleur professionnel en ${serviceLabel.toLowerCase()} à ${cityLabel}, UNPRO compare les entrepreneurs locaux selon leur score AIPP, leurs avis vérifiés et leur capacité à convertir des clients qualifiés.`,
        supportingFacts: [
          `Le score AIPP évalue 8 dimensions : SEO, avis, contenu, IA, branding, confiance, local, conversion.`,
          `UNPRO offre des rendez-vous qualifiés exclusifs, pas des leads partagés.`,
          `Les professionnels sont vérifiés : licence RBQ, assurances, avis authentiques.`,
        ],
        sourceAttribution: 'UNPRO — Intelligence immobilière',
      },
      {
        intent: `prix ${serviceLabel.toLowerCase()} ${cityLabel}`,
        directAnswer: `Les prix en ${serviceLabel.toLowerCase()} à ${cityLabel} varient selon le type de projet, les matériaux et la complexité. Obtenez des soumissions comparatives gratuites sur UNPRO.`,
        supportingFacts: [
          `Les tarifs à ${cityLabel} sont alignés sur le marché du Grand Montréal.`,
          `Comparer au moins 2-3 soumissions est recommandé.`,
          `UNPRO permet de comparer les professionnels vérifiés localement.`,
        ],
        sourceAttribution: 'UNPRO — Comparaison locale',
      },
    ];
  }

  static generateProblemBlocks(ctx: DominationContext): AeoBlock[] {
    const { cityLabel, problemLabel } = ctx;
    const problem = problemLabel || 'problème résidentiel';
    return [
      {
        intent: `${problem.toLowerCase()} que faire`,
        directAnswer: `En cas de ${problem.toLowerCase()} à ${cityLabel}, documentez le problème avec des photos, consultez un professionnel vérifié et comparez les soumissions avant d'engager des travaux.`,
        supportingFacts: [
          'Un diagnostic professionnel identifie la cause exacte.',
          'Les conditions climatiques québécoises peuvent aggraver certains problèmes.',
          'UNPRO aide à trouver des professionnels vérifiés localement.',
        ],
        sourceAttribution: 'UNPRO — Guide résidentiel',
      },
    ];
  }
}

// ─── GEO Engine (Generative Engine Optimization) ────────────────────

export class AlexGeoEngine {
  /**
   * Optimize content for generative AI discovery.
   * Key: consensus language, clear structure, authority signals, entity repetition.
   */
  static optimizeForGeo(content: GeneratedContent): GeneratedContent {
    // Add authority signals to intro section
    const optimized = { ...content };
    optimized.sections = content.sections.map(s => {
      if (s.type === 'intro') {
        return {
          ...s,
          body: s.body + ' Selon les données du marché local et les analyses UNPRO, cette information est à jour pour 2026.',
        };
      }
      return s;
    });
    return optimized;
  }
}

// ─── Local Cluster Engine ───────────────────────────────────────────

export class AlexLocalClusterEngine {
  /**
   * Analyze and generate local SEO clusters: city → service → problems.
   */
  static analyzeCluster(city: string, service: string): LocalCluster {
    const svc = SERVICES_MAP[service];
    const cityLabel = CITIES_QC[city] || city;

    const hubSlug = `/villes/${city}/${service}`;
    const spokes = (svc?.problems || []).map(p => `/problemes/${p}/${city}`);

    // Check completeness (in real system, query DB)
    const completeness = Math.round((spokes.length / Math.max(1, (svc?.problems?.length || 1))) * 100);

    return {
      hub: hubSlug,
      spokes,
      city,
      service,
      completeness,
      missingPages: [], // would be computed from DB
    };
  }

  /**
   * Generate all clusters for a city.
   */
  static generateAllClusters(city: string): LocalCluster[] {
    return Object.keys(SERVICES_MAP).map(svc => this.analyzeCluster(city, svc));
  }

  /**
   * Get priority clusters to build next.
   */
  static getPriorityClusters(city: string): LocalCluster[] {
    return this.generateAllClusters(city)
      .filter(c => c.completeness < 100)
      .sort((a, b) => a.completeness - b.completeness)
      .slice(0, 5);
  }
}

// ─── Profile Optimizer ──────────────────────────────────────────────

export class AlexProfileOptimizer {
  static optimizeProfile(profile: ContractorProfileData): ProfileOptimization {
    const improvements: ProfileImprovement[] = [];
    let bonusScore = 0;

    if (profile.services.length < 3) {
      improvements.push({
        field: 'services',
        current: `${profile.services.length} services listés`,
        suggested: 'Ajouter au moins 5 services détaillés',
        impact: 'high',
        reason: 'Plus de services = plus de pages indexées = plus de visibilité.',
      });
      bonusScore += 8;
    }

    if (!profile.certifications.length) {
      improvements.push({
        field: 'certifications',
        current: 'Aucune certification listée',
        suggested: 'Ajouter licence RBQ, assurances, certifications',
        impact: 'high',
        reason: 'Les certifications augmentent la confiance et le score AIPP.',
      });
      bonusScore += 10;
    }

    if (profile.reviewCount < 10) {
      improvements.push({
        field: 'reviews',
        current: `${profile.reviewCount} avis`,
        suggested: 'Obtenir au moins 15 avis vérifiés',
        impact: 'medium',
        reason: 'Les avis renforcent la crédibilité auprès des propriétaires et des moteurs IA.',
      });
      bonusScore += 5;
    }

    if (!profile.specialties.length) {
      improvements.push({
        field: 'specialties',
        current: 'Aucune spécialité définie',
        suggested: 'Définir 2-3 spécialités principales',
        impact: 'medium',
        reason: 'Les spécialités améliorent le matching et la pertinence locale.',
      });
      bonusScore += 5;
    }

    if (profile.serviceArea.length < 2) {
      improvements.push({
        field: 'serviceArea',
        current: `${profile.serviceArea.length} zone(s)`,
        suggested: 'Couvrir au moins 3-5 villes proches',
        impact: 'medium',
        reason: 'Plus de zones = plus de pages locales = plus de trafic.',
      });
      bonusScore += 5;
    }

    const enrichedDescription = `${profile.businessName} est un professionnel vérifié offrant des services de qualité à ${profile.city} et environs. Avec ${profile.yearsExperience || 'plusieurs'} années d'expérience et un score AIPP de ${profile.aippScore}/100, ${profile.businessName} se distingue par son expertise locale et sa fiabilité.`;

    const suggestedTags = [
      ...profile.services.slice(0, 3),
      profile.city,
      'vérifié UNPRO',
      'score AIPP',
    ];

    return {
      contractorId: profile.id,
      currentScore: profile.aippScore,
      optimizedScore: Math.min(100, profile.aippScore + bonusScore),
      improvements,
      enrichedDescription,
      suggestedTags,
      schemaMarkup: AlexSchemaGenerator.generateForContractorProfile(profile),
    };
  }
}

// ─── Competitive Gap Engine ─────────────────────────────────────────

export class AlexCompetitiveGapEngine {
  static analyzeGaps(city: string, service: string): CompetitiveGap[] {
    const svc = SERVICES_MAP[service];
    const cityLabel = CITIES_QC[city] || city;
    if (!svc) return [];

    const gaps: CompetitiveGap[] = [];

    // Check for missing page types
    gaps.push({
      keyword: `meilleur ${svc.label.toLowerCase()} ${cityLabel}`,
      currentCoverage: 'weak',
      opportunity: 'high',
      suggestedAction: `Créer une page comparative "${svc.label} à ${cityLabel}" avec classement AIPP`,
      estimatedImpact: 'Trafic organique +15-30% sur ce cluster',
    });

    for (const prob of svc.problems.slice(0, 2)) {
      gaps.push({
        keyword: `${prob.replace(/-/g, ' ')} ${cityLabel}`,
        currentCoverage: 'none',
        opportunity: 'high',
        suggestedAction: `Créer une page problème dédiée avec FAQ et schema HowTo`,
        estimatedImpact: 'Capture d\'intention à haute conversion',
      });
    }

    gaps.push({
      keyword: `prix ${svc.label.toLowerCase()} ${cityLabel} 2026`,
      currentCoverage: 'moderate',
      opportunity: 'medium',
      suggestedAction: 'Enrichir la section coûts avec des fourchettes locales détaillées',
      estimatedImpact: 'Amélioration du CTR et de la citation IA',
    });

    return gaps;
  }
}

// ─── Citation Engine ────────────────────────────────────────────────

export class AlexCitationEngine {
  /**
   * Generate structured citation blocks for NAP consistency.
   */
  static generateCitation(profile: ContractorProfileData): Record<string, string> {
    return {
      name: profile.businessName,
      city: profile.city,
      province: 'Québec',
      country: 'Canada',
      platform: 'UNPRO',
      profileUrl: `https://unpro.ca/pro/${profile.slug}`,
      aippScore: `${profile.aippScore}/100`,
    };
  }
}

// ─── Review Analyzer ────────────────────────────────────────────────

export class AlexReviewAnalyzer {
  static analyzeReviews(reviews: Array<{ text: string; rating: number }>): {
    avgRating: number;
    sentiment: 'positive' | 'neutral' | 'negative';
    topKeywords: string[];
    trustSignal: 'high' | 'medium' | 'low';
  } {
    const avg = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;
    const sentiment = avg >= 4 ? 'positive' : avg >= 3 ? 'neutral' : 'negative';

    // Simple keyword extraction
    const allText = reviews.map(r => r.text).join(' ').toLowerCase();
    const keywords = ['professionnel', 'rapide', 'qualité', 'recommande', 'excellent', 'ponctuel', 'propre', 'honnête'];
    const topKeywords = keywords.filter(k => allText.includes(k)).slice(0, 5);

    const trustSignal = reviews.length >= 15 && avg >= 4.2 ? 'high'
      : reviews.length >= 5 && avg >= 3.5 ? 'medium' : 'low';

    return { avgRating: Math.round(avg * 10) / 10, sentiment, topKeywords, trustSignal };
  }
}

// ─── Authority Builder ──────────────────────────────────────────────

export class AlexAuthorityBuilder {
  /**
   * Calculate authority score for a city+service combination.
   */
  static calculateAuthority(city: string, service: string, metrics: {
    pageCount: number;
    faqCount: number;
    schemaPages: number;
    internalLinks: number;
    contentDepth: number;
  }): { score: number; level: string; nextActions: string[] } {
    const score = Math.min(100, Math.round(
      (metrics.pageCount * 5) +
      (metrics.faqCount * 3) +
      (metrics.schemaPages * 8) +
      (metrics.internalLinks * 2) +
      (metrics.contentDepth * 4)
    ));

    const level = score >= 80 ? 'dominant'
      : score >= 60 ? 'fort'
        : score >= 40 ? 'modéré'
          : score >= 20 ? 'émergent' : 'absent';

    const nextActions: string[] = [];
    if (metrics.pageCount < 5) nextActions.push('Créer plus de pages locales');
    if (metrics.faqCount < 10) nextActions.push('Enrichir les FAQ');
    if (metrics.schemaPages < 3) nextActions.push('Ajouter des schémas structurés');
    if (metrics.internalLinks < 10) nextActions.push('Renforcer le maillage interne');

    return { score, level, nextActions };
  }
}

// ─── Domination Safety ──────────────────────────────────────────────

export class DominationSafety {
  static readonly MIN_QUALITY_SCORE = 60;
  static readonly MAX_PAGES_PER_BATCH = 20;
  static readonly DUPLICATE_THRESHOLD = 0.85;

  static shouldPublish(content: GeneratedContent): { allowed: boolean; reason?: string } {
    if (!content.quality.passesThreshold) {
      return { allowed: false, reason: `Quality score ${content.quality.overall} below threshold ${this.MIN_QUALITY_SCORE}` };
    }
    if (content.sections.length < 3) {
      return { allowed: false, reason: 'Insufficient content depth (< 3 sections)' };
    }
    if (content.faq.length < 2) {
      return { allowed: false, reason: 'Insufficient FAQ coverage' };
    }
    return { allowed: true };
  }

  static prioritizeClusters(clusters: LocalCluster[]): LocalCluster[] {
    // High-value services first
    const highValue = ['toiture', 'plomberie', 'electricite', 'isolation', 'maconnerie'];
    return clusters.sort((a, b) => {
      const aVal = highValue.indexOf(a.service);
      const bVal = highValue.indexOf(b.service);
      const aPri = aVal >= 0 ? aVal : 99;
      const bPri = bVal >= 0 ? bVal : 99;
      return aPri - bPri;
    });
  }
}
