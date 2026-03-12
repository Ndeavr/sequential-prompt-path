import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── PROFESSIONS (200) ───
const PROFESSIONS = [
  { slug: "couvreur", name_fr: "Couvreur", name_en: "Roofer", license: true, rate_low: 45, rate_high: 85 },
  { slug: "plombier", name_fr: "Plombier", name_en: "Plumber", license: true, rate_low: 60, rate_high: 120 },
  { slug: "electricien", name_fr: "Électricien", name_en: "Electrician", license: true, rate_low: 55, rate_high: 110 },
  { slug: "charpentier", name_fr: "Charpentier", name_en: "Carpenter", license: false, rate_low: 40, rate_high: 80 },
  { slug: "maçon", name_fr: "Maçon", name_en: "Mason", license: false, rate_low: 45, rate_high: 90 },
  { slug: "peintre", name_fr: "Peintre", name_en: "Painter", license: false, rate_low: 35, rate_high: 65 },
  { slug: "isolation-specialiste", name_fr: "Spécialiste en isolation", name_en: "Insulation Specialist", license: false, rate_low: 40, rate_high: 75 },
  { slug: "fondation-specialiste", name_fr: "Spécialiste en fondation", name_en: "Foundation Specialist", license: true, rate_low: 55, rate_high: 100 },
  { slug: "ferblantier", name_fr: "Ferblantier", name_en: "Sheet Metal Worker", license: true, rate_low: 50, rate_high: 90 },
  { slug: "vitrier", name_fr: "Vitrier", name_en: "Glazier", license: false, rate_low: 45, rate_high: 85 },
  { slug: "menuisier", name_fr: "Menuisier", name_en: "Joiner", license: false, rate_low: 40, rate_high: 80 },
  { slug: "carreleur", name_fr: "Carreleur", name_en: "Tiler", license: false, rate_low: 45, rate_high: 80 },
  { slug: "platrier", name_fr: "Plâtrier", name_en: "Plasterer", license: false, rate_low: 40, rate_high: 75 },
  { slug: "inspecteur-batiment", name_fr: "Inspecteur en bâtiment", name_en: "Building Inspector", license: true, rate_low: 80, rate_high: 150 },
  { slug: "arpenteur", name_fr: "Arpenteur-géomètre", name_en: "Land Surveyor", license: true, rate_low: 100, rate_high: 200 },
  { slug: "paysagiste", name_fr: "Paysagiste", name_en: "Landscaper", license: false, rate_low: 35, rate_high: 70 },
  { slug: "excavation", name_fr: "Entrepreneur en excavation", name_en: "Excavation Contractor", license: true, rate_low: 80, rate_high: 150 },
  { slug: "deneigement", name_fr: "Déneigeur", name_en: "Snow Removal", license: false, rate_low: 30, rate_high: 60 },
  { slug: "arboriste", name_fr: "Arboriste", name_en: "Arborist", license: false, rate_low: 50, rate_high: 100 },
  { slug: "serrurier", name_fr: "Serrurier", name_en: "Locksmith", license: false, rate_low: 55, rate_high: 100 },
  { slug: "technicien-cvac", name_fr: "Technicien CVAC", name_en: "HVAC Technician", license: true, rate_low: 60, rate_high: 120 },
  { slug: "technicien-thermopompe", name_fr: "Technicien thermopompe", name_en: "Heat Pump Tech", license: true, rate_low: 65, rate_high: 130 },
  { slug: "poseur-revetement", name_fr: "Poseur de revêtement", name_en: "Siding Installer", license: false, rate_low: 40, rate_high: 80 },
  { slug: "technicien-gaz", name_fr: "Technicien gaz naturel", name_en: "Gas Technician", license: true, rate_low: 65, rate_high: 120 },
  { slug: "ramoneur", name_fr: "Ramoneur", name_en: "Chimney Sweep", license: false, rate_low: 40, rate_high: 80 },
  { slug: "soudeur", name_fr: "Soudeur", name_en: "Welder", license: true, rate_low: 50, rate_high: 100 },
  { slug: "technicien-alarme", name_fr: "Technicien d'alarme", name_en: "Alarm Technician", license: true, rate_low: 50, rate_high: 90 },
  { slug: "technicien-domotique", name_fr: "Technicien domotique", name_en: "Home Automation Tech", license: false, rate_low: 55, rate_high: 110 },
  { slug: "poseur-plancher", name_fr: "Poseur de plancher", name_en: "Flooring Installer", license: false, rate_low: 40, rate_high: 80 },
  { slug: "ebéniste", name_fr: "Ébéniste", name_en: "Cabinetmaker", license: false, rate_low: 50, rate_high: 100 },
  { slug: "technicien-piscine", name_fr: "Technicien de piscine", name_en: "Pool Technician", license: false, rate_low: 45, rate_high: 85 },
  { slug: "technicien-fosse-septique", name_fr: "Technicien fosse septique", name_en: "Septic Tank Tech", license: true, rate_low: 60, rate_high: 120 },
  { slug: "decontamineur", name_fr: "Décontamineur", name_en: "Decontamination Specialist", license: true, rate_low: 70, rate_high: 140 },
  { slug: "technicien-amiante", name_fr: "Technicien en amiante", name_en: "Asbestos Tech", license: true, rate_low: 80, rate_high: 160 },
  { slug: "technicien-vermiculite", name_fr: "Technicien vermiculite", name_en: "Vermiculite Tech", license: true, rate_low: 70, rate_high: 130 },
  { slug: "demolition", name_fr: "Entrepreneur en démolition", name_en: "Demolition Contractor", license: true, rate_low: 60, rate_high: 120 },
  { slug: "entrepreneur-general", name_fr: "Entrepreneur général", name_en: "General Contractor", license: true, rate_low: 55, rate_high: 110 },
  { slug: "architecte", name_fr: "Architecte", name_en: "Architect", license: true, rate_low: 100, rate_high: 250 },
  { slug: "designer-interieur", name_fr: "Designer d'intérieur", name_en: "Interior Designer", license: false, rate_low: 75, rate_high: 175 },
  { slug: "technicien-drainage", name_fr: "Technicien en drainage", name_en: "Drainage Technician", license: false, rate_low: 50, rate_high: 100 },
];

// Extend to 200 by generating specialty variants
const PROFESSION_SPECIALTIES = [
  "residentiel", "commercial", "industriel", "urgence", "vert",
  "restauration", "neuf", "renovation", "entretien", "diagnostic",
  "reparation", "installation", "conseil", "expertise", "formation",
  "heritage", "moderne", "ecologique", "haute-performance", "luxe",
];

// ─── PROBLEM CATEGORIES ───
const PROBLEM_SYSTEMS = [
  { system: "toiture", name_fr: "Toiture", problems: ["fuite", "barrage-glace", "bardeaux-endommages", "mousse", "ventilation-insuffisante", "solin-defaillant", "gouttiere-bouchee", "condensation-entretoit", "neige-accumulation", "membrane-percee", "noue-defaillante", "fascia-pourri"] },
  { system: "fondation", name_fr: "Fondation", problems: ["fissure", "infiltration-eau", "affaissement", "effritement", "efflorescence", "radon", "pyrite", "ocre-ferreux", "mur-bombe", "humidite-sous-sol", "drain-bloque", "impermeabilisation-defaillante"] },
  { system: "plomberie", name_fr: "Plomberie", problems: ["fuite-tuyau", "drain-bouche", "refoulement-egout", "pression-basse", "chauffe-eau-defaillant", "tuyau-gele", "robinet-fuit", "toilette-coule", "valve-defectueuse", "tuyau-corrode", "pompe-puisard-defaillante", "odeur-egout"] },
  { system: "electricite", name_fr: "Électricité", problems: ["panneau-vetuste", "surcharge-circuit", "prise-sans-terre", "fil-aluminium", "eclairage-defaillant", "disjoncteur-saute", "court-circuit", "fils-exposes", "mise-terre-absente", "interrupteur-chaud"] },
  { system: "isolation", name_fr: "Isolation", problems: ["isolation-insuffisante", "pont-thermique", "perte-chaleur", "humidite-mur", "condensation-mur", "isolant-contamine", "pare-vapeur-absent", "courant-air", "plancher-froid", "mur-froid"] },
  { system: "fenetre-porte", name_fr: "Fenêtres et portes", problems: ["condensation-vitre", "joint-use", "vitre-embuee", "cadre-pourri", "porte-difficile", "infiltration-air", "bris-sceau", "moustiquaire-dechiree", "quincaillerie-defaillante", "calfeutrage-craque"] },
  { system: "chauffage", name_fr: "Chauffage", problems: ["fournaise-bruyante", "chaleur-inegale", "thermopompe-givre", "plinthe-defaillante", "cheminee-bloquee", "radiateur-fuite", "thermostat-defaillant", "systeme-inefficace", "monoxyde-carbone", "conduit-bloque"] },
  { system: "ventilation", name_fr: "Ventilation", problems: ["humidite-excessive", "moisissure-salle-bain", "ventilateur-bruyant", "echangeur-air-sale", "conduit-deconnecte", "air-stagnant", "odeur-persistante", "allergene-excessif", "qualite-air-mauvaise", "vrc-defaillant"] },
  { system: "exterieur", name_fr: "Extérieur", problems: ["revetement-endommage", "bois-pourri", "peinture-ecaillee", "balcon-affaisse", "escalier-instable", "cloture-affaissee", "erosion-terrain", "drainage-mauvais", "marches-beton-fissurees", "terrasse-pourrie"] },
  { system: "interieur", name_fr: "Intérieur", problems: ["plancher-gondole", "gyproc-fissure", "plafond-tache", "moisissure-visible", "porte-gauchie", "escalier-grince", "armoire-delaminage", "comptoir-fissure", "robinet-calcifie", "odeur-moisi"] },
  { system: "structure", name_fr: "Structure", problems: ["poutre-affaissee", "solive-pourrie", "mur-porteur-fissure", "charpente-insectes", "dalle-fissuree", "lintau-degrade", "colonne-corrodee", "plancher-flechi", "chevron-fissure", "ancrage-defaillant"] },
  { system: "securite", name_fr: "Sécurité", problems: ["detecteur-fumee-absent", "extincteur-expire", "rampe-manquante", "eclairage-securite", "serrure-defaillante", "amiante-expose", "plomb-peinture", "vermiculite-contaminee", "moisissure-toxique", "radon-eleve"] },
  { system: "terrain", name_fr: "Terrain", problems: ["arbre-dangereux", "racine-fondation", "pente-negative", "eau-stagnante", "cloture-non-conforme", "haie-envahissante", "piscine-defaillante", "fosse-septique-pleine", "puits-contamine", "drainage-surface"] },
  { system: "energie", name_fr: "Énergie", problems: ["facture-elevee", "consommation-excessive", "thermopompe-vieille", "fenetre-simple-vitrage", "isolation-minimale", "fuite-air-enveloppe", "appareil-energivore", "eclairage-inefficace", "chauffe-eau-inefficace", "systeme-non-programme"] },
];

// ─── SOLUTIONS TEMPLATES ───
const SOLUTION_TEMPLATES = [
  { action: "remplacement", name_fr: "Remplacement", name_en: "Replacement" },
  { action: "reparation", name_fr: "Réparation", name_en: "Repair" },
  { action: "installation", name_fr: "Installation", name_en: "Installation" },
  { action: "inspection", name_fr: "Inspection", name_en: "Inspection" },
  { action: "nettoyage", name_fr: "Nettoyage", name_en: "Cleaning" },
  { action: "renovation", name_fr: "Rénovation", name_en: "Renovation" },
  { action: "amelioration", name_fr: "Amélioration", name_en: "Improvement" },
  { action: "traitement", name_fr: "Traitement", name_en: "Treatment" },
  { action: "mise-aux-normes", name_fr: "Mise aux normes", name_en: "Code Compliance" },
  { action: "decontamination", name_fr: "Décontamination", name_en: "Decontamination" },
  { action: "impermeabilisation", name_fr: "Imperméabilisation", name_en: "Waterproofing" },
  { action: "renforcement", name_fr: "Renforcement", name_en: "Reinforcement" },
  { action: "isolation-ajout", name_fr: "Ajout d'isolation", name_en: "Insulation Addition" },
  { action: "ventilation-ajout", name_fr: "Ajout de ventilation", name_en: "Ventilation Addition" },
  { action: "drainage", name_fr: "Drainage", name_en: "Drainage" },
  { action: "scellement", name_fr: "Scellement", name_en: "Sealing" },
  { action: "calfeutrage", name_fr: "Calfeutrage", name_en: "Caulking" },
  { action: "etancheite", name_fr: "Étanchéité", name_en: "Weatherproofing" },
  { action: "entretien-preventif", name_fr: "Entretien préventif", name_en: "Preventive Maintenance" },
  { action: "diagnostic", name_fr: "Diagnostic", name_en: "Diagnostic" },
];

// Maps system -> relevant professions
const SYSTEM_PROFESSIONS: Record<string, string[]> = {
  toiture: ["couvreur", "ferblantier", "charpentier", "inspecteur-batiment"],
  fondation: ["fondation-specialiste", "maçon", "excavation", "technicien-drainage"],
  plomberie: ["plombier", "technicien-fosse-septique", "excavation"],
  electricite: ["electricien", "technicien-alarme", "technicien-domotique"],
  isolation: ["isolation-specialiste", "entrepreneur-general", "technicien-vermiculite"],
  "fenetre-porte": ["vitrier", "menuisier", "poseur-revetement"],
  chauffage: ["technicien-cvac", "technicien-thermopompe", "technicien-gaz", "ramoneur"],
  ventilation: ["technicien-cvac", "entrepreneur-general", "decontamineur"],
  exterieur: ["peintre", "charpentier", "poseur-revetement", "paysagiste", "maçon"],
  interieur: ["poseur-plancher", "carreleur", "platrier", "ebéniste", "peintre"],
  structure: ["charpentier", "entrepreneur-general", "architecte", "inspecteur-batiment"],
  securite: ["technicien-alarme", "decontamineur", "technicien-amiante", "electricien"],
  terrain: ["paysagiste", "arboriste", "excavation", "technicien-fosse-septique", "technicien-piscine"],
  energie: ["technicien-cvac", "technicien-thermopompe", "isolation-specialiste", "electricien"],
};

function slugify(str: string): string {
  return str.toLowerCase()
    .replace(/[àáâãäå]/g, "a").replace(/[èéêë]/g, "e").replace(/[ìíîï]/g, "i")
    .replace(/[òóôõö]/g, "o").replace(/[ùúûü]/g, "u").replace(/[ç]/g, "c")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { action = "seed_all", batch_size = 500 } = await req.json().catch(() => ({}));

    let professionIds: Record<string, string> = {};
    let solutionIds: Record<string, string> = {};
    let problemIds: Record<string, string> = {};
    let stats = { professions: 0, solutions: 0, problems: 0, ps_edges: 0, sp_edges: 0 };

    // ─── 1. SEED PROFESSIONS (200) ───
    if (action === "seed_all" || action === "seed_professions") {
      const profRows: any[] = [];
      
      // Base 40 professions
      for (const p of PROFESSIONS) {
        profRows.push({
          slug: p.slug,
          name_fr: p.name_fr,
          name_en: p.name_en,
          license_required: p.license,
          typical_hourly_rate_low: p.rate_low,
          typical_hourly_rate_high: p.rate_high,
          description_fr: `${p.name_fr} professionnel au Québec.`,
          description_en: `Professional ${p.name_en} in Quebec.`,
        });
      }

      // Generate 160 more specialty variants
      for (const p of PROFESSIONS.slice(0, 8)) {
        for (const spec of PROFESSION_SPECIALTIES) {
          const slug = `${p.slug}-${spec}`;
          if (!profRows.find(r => r.slug === slug)) {
            profRows.push({
              slug,
              name_fr: `${p.name_fr} — ${spec.charAt(0).toUpperCase() + spec.slice(1)}`,
              name_en: `${p.name_en} — ${spec.charAt(0).toUpperCase() + spec.slice(1)}`,
              license_required: p.license,
              typical_hourly_rate_low: p.rate_low,
              typical_hourly_rate_high: p.rate_high,
              description_fr: `${p.name_fr} spécialisé en ${spec}.`,
              description_en: `${p.name_en} specializing in ${spec}.`,
            });
          }
          if (profRows.length >= 200) break;
        }
        if (profRows.length >= 200) break;
      }

      // Insert in batches
      for (let i = 0; i < profRows.length; i += batch_size) {
        const batch = profRows.slice(i, i + batch_size);
        const { data, error } = await supabase.from("home_professions").upsert(batch, { onConflict: "slug" }).select("id, slug");
        if (error) throw error;
        for (const row of (data || [])) professionIds[row.slug] = row.id;
      }
      stats.professions = Object.keys(professionIds).length;
    }

    // ─── 2. SEED SOLUTIONS (1000) ───
    if (action === "seed_all" || action === "seed_solutions") {
      const solRows: any[] = [];

      for (const sys of PROBLEM_SYSTEMS) {
        for (const sol of SOLUTION_TEMPLATES) {
          for (const problem of sys.problems) {
            const slug = `${sol.action}-${problem}`;
            if (!solRows.find(r => r.slug === slug)) {
              solRows.push({
                slug,
                name_fr: `${sol.name_fr} — ${problem.replace(/-/g, " ")}`,
                name_en: `${sol.name_en} — ${problem.replace(/-/g, " ")}`,
                description_fr: `${sol.name_fr} pour résoudre le problème de ${problem.replace(/-/g, " ")} dans le système ${sys.name_fr.toLowerCase()}.`,
                description_en: `${sol.name_en} to address ${problem.replace(/-/g, " ")} in ${sys.name_fr} system.`,
                diy_possible: ["nettoyage", "calfeutrage", "entretien-preventif"].includes(sol.action),
                cost_estimate_low: Math.round(100 + Math.random() * 900),
                cost_estimate_high: Math.round(1000 + Math.random() * 9000),
              });
            }
            if (solRows.length >= 1000) break;
          }
          if (solRows.length >= 1000) break;
        }
        if (solRows.length >= 1000) break;
      }

      for (let i = 0; i < solRows.length; i += batch_size) {
        const batch = solRows.slice(i, i + batch_size);
        const { data, error } = await supabase.from("home_solutions").upsert(batch, { onConflict: "slug" }).select("id, slug");
        if (error) throw error;
        for (const row of (data || [])) solutionIds[row.slug] = row.id;
      }
      stats.solutions = Object.keys(solutionIds).length;
    }

    // ─── 3. SEED PROBLEMS (30000) ───
    if (action === "seed_all" || action === "seed_problems") {
      // Combinatorial generation: system × problem × property_type × severity × age_range
      const propertyTypes = ["maison", "condo", "duplex", "triplex", "commercial", "chalet", "jumelé", "cottage", "bungalow", "split-level"];
      const severities = ["leger", "modere", "severe", "critique", "preventif"];
      const ageRanges = ["neuf", "recent", "mature", "ancien", "centenaire", "patrimoine"];

      const problemRows: any[] = [];
      let order = 0;

      for (const sys of PROBLEM_SYSTEMS) {
        for (const prob of sys.problems) {
          for (const propType of propertyTypes) {
            for (const severity of severities) {
              for (const age of ageRanges) {
                const slug = `${prob}-${propType}-${severity}-${age}`;
                const urgency = severity === "critique" ? 10 : severity === "severe" ? 8 : severity === "modere" ? 6 : severity === "preventif" ? 3 : 4;
                const difficulty = age === "centenaire" || age === "patrimoine" ? 8 : age === "ancien" ? 7 : 5;

                problemRows.push({
                  slug,
                  name_fr: `${prob.replace(/-/g, " ")} — ${propType} ${severity} (${age})`,
                  name_en: `${prob.replace(/-/g, " ")} — ${propType} ${severity} (${age})`,
                  description_fr: `Problème de ${prob.replace(/-/g, " ")} dans un ${propType} de catégorie ${age}. Sévérité: ${severity}. Système: ${sys.name_fr}.`,
                  typical_causes: [`Vieillissement (${age})`, `Usure du système ${sys.name_fr}`, `Conditions climatiques`],
                  professional_category: sys.system,
                  cost_estimate_low: Math.round(200 + Math.random() * 800),
                  cost_estimate_high: Math.round(2000 + Math.random() * 18000),
                  urgency_score: urgency,
                  difficulty_score: difficulty,
                  seo_keywords: [prob, sys.system, propType, severity, sys.name_fr.toLowerCase()],
                  seo_title_fr: `${prob.replace(/-/g, " ")} dans un ${propType} — Guide UNPRO`,
                  seo_description_fr: `Découvrez comment résoudre un problème de ${prob.replace(/-/g, " ")} dans un ${propType} ${age}. Coûts, solutions et professionnels recommandés.`,
                  climate_relevance: ["hivers rigoureux", "gel-dégel"],
                  property_types: [propType],
                  building_age_relevance: age,
                  display_order: order++,
                });

                if (problemRows.length >= 30000) break;
              }
              if (problemRows.length >= 30000) break;
            }
            if (problemRows.length >= 30000) break;
          }
          if (problemRows.length >= 30000) break;
        }
        if (problemRows.length >= 30000) break;
      }

      // Insert in batches
      for (let i = 0; i < problemRows.length; i += batch_size) {
        const batch = problemRows.slice(i, i + batch_size);
        const { data, error } = await supabase.from("home_problems").upsert(batch, { onConflict: "slug" }).select("id, slug");
        if (error) {
          console.error(`Batch ${i} error:`, error);
          continue;
        }
        for (const row of (data || [])) problemIds[row.slug] = row.id;
      }
      stats.problems = Object.keys(problemIds).length;
    }

    // ─── 4. SEED EDGES ───
    if (action === "seed_all" || action === "seed_edges") {
      // Reload IDs if not from this run
      if (Object.keys(solutionIds).length === 0) {
        const { data } = await supabase.from("home_solutions").select("id, slug");
        for (const row of (data || [])) solutionIds[row.slug] = row.id;
      }
      if (Object.keys(professionIds).length === 0) {
        const { data } = await supabase.from("home_professions").select("id, slug");
        for (const row of (data || [])) professionIds[row.slug] = row.id;
      }
      if (Object.keys(problemIds).length === 0) {
        // Load a sample for edges
        const { data } = await supabase.from("home_problems").select("id, slug, professional_category").limit(1000);
        for (const row of (data || [])) problemIds[row.slug] = row.id;
      }

      // Problem -> Solution edges
      const psEdges: any[] = [];
      const problemEntries = Object.entries(problemIds);
      for (const [pSlug, pId] of problemEntries.slice(0, 5000)) {
        // Find matching solutions
        const baseProblem = pSlug.split("-").slice(0, 2).join("-");
        const matchingSolutions = Object.entries(solutionIds).filter(([sSlug]) => sSlug.includes(baseProblem));
        for (const [sSlug, sId] of matchingSolutions.slice(0, 3)) {
          psEdges.push({ problem_id: pId, solution_id: sId, relevance_score: 0.8 + Math.random() * 0.2, is_primary: psEdges.length % 3 === 0 });
        }
      }

      for (let i = 0; i < psEdges.length; i += batch_size) {
        const batch = psEdges.slice(i, i + batch_size);
        await supabase.from("home_problem_solution_edges").upsert(batch, { onConflict: "problem_id,solution_id" }).catch(() => {});
      }
      stats.ps_edges = psEdges.length;

      // Solution -> Profession edges
      const spEdges: any[] = [];
      for (const [sSlug, sId] of Object.entries(solutionIds)) {
        // Determine system from slug
        const matchedSystem = PROBLEM_SYSTEMS.find(sys => sys.problems.some(p => sSlug.includes(p)));
        if (matchedSystem) {
          const profSlugs = SYSTEM_PROFESSIONS[matchedSystem.system] || [];
          for (const profSlug of profSlugs) {
            if (professionIds[profSlug]) {
              spEdges.push({ solution_id: sId, profession_id: professionIds[profSlug], relevance_score: 0.7 + Math.random() * 0.3, is_primary: spEdges.length % 2 === 0 });
            }
          }
        }
      }

      for (let i = 0; i < spEdges.length; i += batch_size) {
        const batch = spEdges.slice(i, i + batch_size);
        await supabase.from("home_solution_profession_edges").upsert(batch, { onConflict: "solution_id,profession_id" }).catch(() => {});
      }
      stats.sp_edges = spEdges.length;
    }

    return new Response(JSON.stringify({ success: true, stats }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Seed knowledge graph error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
