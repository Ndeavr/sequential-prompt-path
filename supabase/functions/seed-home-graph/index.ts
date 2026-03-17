import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, serviceKey);

  const results: Record<string, any> = {};

  // ── 1. Symptoms ──
  const symptoms = [
    { slug: "buee-fenetre", name_fr: "Buée sur les fenêtres", description_fr: "Condensation visible sur les vitres intérieures" },
    { slug: "moisissure-visible", name_fr: "Moisissure visible", description_fr: "Taches noires ou vertes sur murs, plafonds ou joints" },
    { slug: "odeur-humidite", name_fr: "Odeur d'humidité", description_fr: "Odeur de moisi persistante dans la maison" },
    { slug: "tache-eau-plafond", name_fr: "Tache d'eau au plafond", description_fr: "Cernes bruns ou jaunes au plafond" },
    { slug: "fissure-fondation", name_fr: "Fissure dans la fondation", description_fr: "Craquelure visible dans le béton de fondation" },
    { slug: "eau-sous-sol", name_fr: "Eau au sous-sol", description_fr: "Infiltration d'eau ou accumulation au sous-sol" },
    { slug: "courant-air-froid", name_fr: "Courant d'air froid", description_fr: "Air froid entrant par fenêtres, portes ou murs" },
    { slug: "givre-interieur", name_fr: "Givre intérieur", description_fr: "Formation de glace à l'intérieur des fenêtres" },
    { slug: "facture-energie-elevee", name_fr: "Facture d'énergie élevée", description_fr: "Consommation anormalement haute de chauffage" },
    { slug: "peinture-ecaillee", name_fr: "Peinture écaillée", description_fr: "Peinture qui s'écaille ou se décolle des murs" },
    { slug: "plancher-froid", name_fr: "Plancher froid", description_fr: "Sol anormalement froid même en hiver" },
    { slug: "bardeaux-souleves", name_fr: "Bardeaux soulevés", description_fr: "Bardeaux de toiture soulevés ou manquants" },
    { slug: "glaçons-gouttiere", name_fr: "Glaçons aux gouttières", description_fr: "Formation de barrages de glace en bordure de toit" },
    { slug: "drain-lent", name_fr: "Drain lent", description_fr: "Écoulement lent dans les éviers, bains ou drains de sol" },
    { slug: "bruit-tuyauterie", name_fr: "Bruit de tuyauterie", description_fr: "Coups de bélier ou bruits anormaux dans les tuyaux" },
  ];
  const { error: symErr } = await sb.from("problem_symptoms").upsert(symptoms, { onConflict: "slug" });
  results.symptoms = symErr ? symErr.message : `${symptoms.length} inserted`;

  // ── 2. Causes ──
  const causes = [
    { slug: "mauvaise-ventilation", name_fr: "Mauvaise ventilation", description_fr: "Échangeur d'air déficient ou absent" },
    { slug: "isolation-insuffisante", name_fr: "Isolation insuffisante", description_fr: "Isolation sous les normes ou dégradée" },
    { slug: "pont-thermique", name_fr: "Pont thermique", description_fr: "Zone non isolée créant un passage pour le froid" },
    { slug: "drain-francais-bloque", name_fr: "Drain français bloqué", description_fr: "Système de drainage périmétrique obstrué" },
    { slug: "pression-hydrostatique", name_fr: "Pression hydrostatique", description_fr: "Pression d'eau souterraine contre la fondation" },
    { slug: "membrane-deterioree", name_fr: "Membrane détériorée", description_fr: "Membrane d'étanchéité usée ou percée" },
    { slug: "solin-defectueux", name_fr: "Solin défectueux", description_fr: "Solins de toiture mal installés ou corrodés" },
    { slug: "gouttiere-bouchee", name_fr: "Gouttière bouchée", description_fr: "Gouttières obstruées par feuilles ou débris" },
    { slug: "fenetre-simple-vitrage", name_fr: "Fenêtre à simple vitrage", description_fr: "Fenêtres anciennes non performantes" },
    { slug: "joint-deteriore", name_fr: "Joint détérioré", description_fr: "Calfeutrage usé autour des fenêtres ou portes" },
    { slug: "fondation-gel-degel", name_fr: "Cycles gel-dégel", description_fr: "Dommages causés par les cycles gel-dégel répétés" },
    { slug: "humidite-relative-elevee", name_fr: "Humidité relative élevée", description_fr: "Taux d'humidité intérieure trop élevé" },
    { slug: "absence-pare-vapeur", name_fr: "Absence de pare-vapeur", description_fr: "Pare-vapeur manquant ou mal installé" },
    { slug: "ventilation-entretoit-bloquee", name_fr: "Ventilation d'entretoit bloquée", description_fr: "Soffites ou évents de toit obstrués" },
    { slug: "tassement-sol", name_fr: "Tassement du sol", description_fr: "Mouvement du sol sous la fondation" },
    { slug: "racines-arbres", name_fr: "Racines d'arbres", description_fr: "Racines endommageant fondation ou drain" },
    { slug: "pyrite-remblai", name_fr: "Pyrite dans le remblai", description_fr: "Remblai pyriteux gonflant sous la dalle" },
    { slug: "vieillissement-toiture", name_fr: "Vieillissement de la toiture", description_fr: "Toiture en fin de vie utile" },
    { slug: "systeme-electrique-desuet", name_fr: "Système électrique désuet", description_fr: "Câblage ou panneau non conforme" },
    { slug: "plomberie-galvanisee", name_fr: "Plomberie galvanisée", description_fr: "Tuyaux galvanisés corrodés réduisant le débit" },
    { slug: "absence-clapet-antiretour", name_fr: "Absence de clapet anti-retour", description_fr: "Pas de protection contre le refoulement d'égout" },
    { slug: "pente-terrain-inversee", name_fr: "Pente de terrain inversée", description_fr: "Le terrain dirige l'eau vers la fondation" },
    { slug: "radon-sol", name_fr: "Radon du sol", description_fr: "Infiltration de gaz radon par fissures" },
    { slug: "amiante-materiaux", name_fr: "Amiante dans les matériaux", description_fr: "Présence d'amiante dans isolation ou revêtements anciens" },
    { slug: "charpente-affaiblie", name_fr: "Charpente affaiblie", description_fr: "Structure de toit affaiblie par l'humidité ou les insectes" },
    { slug: "condensation-conduits", name_fr: "Condensation dans les conduits", description_fr: "Humidité se formant dans les conduits de ventilation" },
    { slug: "mouvement-structural", name_fr: "Mouvement structural", description_fr: "Mouvement différentiel de la structure" },
    { slug: "erosion-terrain", name_fr: "Érosion du terrain", description_fr: "Perte de sol autour de la fondation" },
    { slug: "installation-incorrecte", name_fr: "Installation incorrecte", description_fr: "Travaux précédents mal exécutés" },
    { slug: "absence-entretien", name_fr: "Absence d'entretien", description_fr: "Manque d'entretien préventif régulier" },
  ];
  const { error: cauErr } = await sb.from("problem_causes").upsert(causes, { onConflict: "slug" });
  results.causes = cauErr ? cauErr.message : `${causes.length} inserted`;

  // ── 3. Value Tags ──
  const tags = [
    { slug: "urgence-24-7", label_fr: "Urgence 24/7", category: "service" },
    { slug: "rbq-verifie", label_fr: "RBQ vérifié", category: "certification" },
    { slug: "caa-quebec", label_fr: "CAA Québec recommandé", category: "certification" },
    { slug: "garantie-gcr", label_fr: "Garantie GCR", category: "certification" },
    { slug: "assurance-responsabilite", label_fr: "Assurance responsabilité", category: "certification" },
    { slug: "estimation-gratuite", label_fr: "Estimation gratuite", category: "service" },
    { slug: "financement-disponible", label_fr: "Financement disponible", category: "service" },
    { slug: "subventions-admissibles", label_fr: "Subventions admissibles", category: "finance" },
    { slug: "eco-energetique", label_fr: "Éco-énergétique", category: "green" },
    { slug: "novoclimat", label_fr: "Novoclimat certifié", category: "certification" },
    { slug: "experience-10-ans", label_fr: "10+ ans d'expérience", category: "experience" },
    { slug: "experience-25-ans", label_fr: "25+ ans d'expérience", category: "experience" },
    { slug: "distributeur-autorise", label_fr: "Distributeur autorisé", category: "certification" },
    { slug: "service-bilingue", label_fr: "Service bilingue", category: "service" },
    { slug: "travaux-hiver", label_fr: "Travaux hivernaux", category: "service" },
    { slug: "decontamination-certifiee", label_fr: "Décontamination certifiée", category: "certification" },
    { slug: "inspection-camera", label_fr: "Inspection par caméra", category: "technology" },
    { slug: "thermographie", label_fr: "Thermographie infrarouge", category: "technology" },
    { slug: "test-radon", label_fr: "Test de radon", category: "technology" },
    { slug: "notaire-immobilier", label_fr: "Service notarial immobilier", category: "legal" },
  ];
  const { error: tagErr } = await sb.from("value_tags").upsert(tags, { onConflict: "slug" });
  results.valueTags = tagErr ? tagErr.message : `${tags.length} inserted`;

  // ── 4. Geo Areas ──
  const geoAreas = [
    { slug: "montreal", name_fr: "Montréal", area_type: "city", population_estimate: 1780000, seo_tier: "tier1" },
    { slug: "laval", name_fr: "Laval", area_type: "city", population_estimate: 438000, seo_tier: "tier1" },
    { slug: "longueuil", name_fr: "Longueuil", area_type: "city", population_estimate: 250000, seo_tier: "tier1" },
    { slug: "quebec-ville", name_fr: "Québec", area_type: "city", population_estimate: 549000, seo_tier: "tier1" },
    { slug: "gatineau", name_fr: "Gatineau", area_type: "city", population_estimate: 291000, seo_tier: "tier1" },
    { slug: "sherbrooke", name_fr: "Sherbrooke", area_type: "city", population_estimate: 170000, seo_tier: "tier2" },
    { slug: "trois-rivieres", name_fr: "Trois-Rivières", area_type: "city", population_estimate: 138000, seo_tier: "tier2" },
    { slug: "saguenay", name_fr: "Saguenay", area_type: "city", population_estimate: 151000, seo_tier: "tier2" },
    { slug: "levis", name_fr: "Lévis", area_type: "city", population_estimate: 149000, seo_tier: "tier2" },
    { slug: "terrebonne", name_fr: "Terrebonne", area_type: "city", population_estimate: 119000, seo_tier: "tier2" },
    { slug: "saint-jean-sur-richelieu", name_fr: "Saint-Jean-sur-Richelieu", area_type: "city", population_estimate: 100000, seo_tier: "tier2" },
    { slug: "repentigny", name_fr: "Repentigny", area_type: "city", population_estimate: 86000, seo_tier: "tier3" },
    { slug: "drummondville", name_fr: "Drummondville", area_type: "city", population_estimate: 79000, seo_tier: "tier3" },
    { slug: "saint-jerome", name_fr: "Saint-Jérôme", area_type: "city", population_estimate: 79000, seo_tier: "tier3" },
    { slug: "granby", name_fr: "Granby", area_type: "city", population_estimate: 69000, seo_tier: "tier3" },
    // CLSC / Regions
    { slug: "region-montreal", name_fr: "Région de Montréal", area_type: "region", population_estimate: 4100000, seo_tier: "tier1" },
    { slug: "monteregie", name_fr: "Montérégie", area_type: "region", population_estimate: 1600000, seo_tier: "tier1" },
    { slug: "laurentides", name_fr: "Laurentides", area_type: "region", population_estimate: 620000, seo_tier: "tier2" },
    { slug: "lanaudiere", name_fr: "Lanaudière", area_type: "region", population_estimate: 520000, seo_tier: "tier2" },
    { slug: "clsc-plateau-mont-royal", name_fr: "CLSC Plateau Mont-Royal", area_type: "clsc", seo_tier: "tier3" },
  ];
  const { error: geoErr } = await sb.from("geo_areas").upsert(geoAreas, { onConflict: "slug" });
  results.geoAreas = geoErr ? geoErr.message : `${geoAreas.length} inserted`;

  // ── 5. Homeowner Questions ──
  const questions = [
    { slug: "pourquoi-fenetres-condensent", question_fr: "Pourquoi mes fenêtres condensent-elles l'hiver ?", quick_answer_fr: "La condensation est causée par un excès d'humidité intérieure et des fenêtres peu performantes. Une ventilation adéquate et des fenêtres à double vitrage résolvent le problème.", urgency_note_fr: "Faible à moyenne" },
    { slug: "cout-refaire-toiture", question_fr: "Combien coûte refaire une toiture au Québec ?", quick_answer_fr: "Entre 5 000 $ et 15 000 $ pour une maison standard. Le coût varie selon la surface, le type de revêtement et l'état de la structure.", cost_note_fr: "5 000 $ à 15 000 $ (bardeaux d'asphalte)" },
    { slug: "fondation-fissuree-grave", question_fr: "Une fissure dans la fondation est-elle grave ?", quick_answer_fr: "Cela dépend du type de fissure. Les fissures capillaires sont souvent cosmétiques, mais les fissures actives ou en escalier nécessitent une intervention rapide.", urgency_note_fr: "Moyenne à élevée selon le type" },
    { slug: "moisissure-sous-sol-danger", question_fr: "La moisissure au sous-sol est-elle dangereuse ?", quick_answer_fr: "Oui, la moisissure peut causer des problèmes respiratoires. Il faut identifier la source d'humidité et faire décontaminer par un professionnel certifié.", urgency_note_fr: "Élevée pour la santé" },
    { slug: "isolation-entretoit-necessaire", question_fr: "Mon entretoit est-il bien isolé ?", quick_answer_fr: "Un entretoit devrait avoir R-41 à R-60 d'isolation au Québec. Si vous avez des barrages de glace ou des factures élevées, l'isolation est probablement insuffisante.", cost_note_fr: "1 500 $ à 4 000 $" },
    { slug: "drain-francais-duree-vie", question_fr: "Quelle est la durée de vie d'un drain français ?", quick_answer_fr: "Un drain français dure en moyenne 25 à 40 ans. Les signes de défaillance incluent l'eau au sous-sol et l'humidité persistante.", cost_note_fr: "8 000 $ à 20 000 $ pour remplacement" },
    { slug: "barrage-glace-prevenir", question_fr: "Comment prévenir les barrages de glace ?", quick_answer_fr: "Améliorez l'isolation de l'entretoit et assurez une ventilation adéquate. Le câble chauffant est une solution temporaire.", cost_note_fr: "1 500 $ à 5 000 $" },
    { slug: "radon-maison-verifier", question_fr: "Comment vérifier le radon dans ma maison ?", quick_answer_fr: "Faites un test de radon avec un détecteur passif (3 mois) ou actif. Le seuil d'action est 200 Bq/m³ selon Santé Canada.", cost_note_fr: "50 $ à 200 $ pour le test" },
    { slug: "entrepreneur-verifier-licence", question_fr: "Comment vérifier la licence RBQ d'un entrepreneur ?", quick_answer_fr: "Consultez le registre de la RBQ en ligne ou utilisez l'outil de vérification UNPRO pour un rapport complet.", urgency_note_fr: "Toujours avant de signer un contrat" },
    { slug: "ventilation-echangeur-air", question_fr: "Ai-je besoin d'un échangeur d'air ?", quick_answer_fr: "Oui, un VRC est essentiel dans les maisons bien isolées au Québec. Il renouvelle l'air sans perdre la chaleur.", cost_note_fr: "2 000 $ à 5 000 $ installé" },
    { slug: "pyrite-maison-risques", question_fr: "Qu'est-ce que la pyrite et quels sont les risques ?", quick_answer_fr: "La pyrite est un minerai dans le remblai sous les dalles de béton. En gonflant, elle soulève et fissure les planchers.", cost_note_fr: "20 000 $ à 50 000 $ pour décontamination" },
    { slug: "assurance-habitation-degat-eau", question_fr: "Mon assurance couvre-t-elle un dégât d'eau ?", quick_answer_fr: "Cela dépend de votre police. L'eau venant de l'intérieur est généralement couverte, mais pas toujours les infiltrations par la fondation.", urgency_note_fr: "Contactez votre assureur immédiatement" },
    { slug: "cout-refaire-salle-bain", question_fr: "Combien coûte rénover une salle de bain ?", quick_answer_fr: "Entre 8 000 $ et 25 000 $ selon l'ampleur. Une rénovation complète avec déplacement de plomberie coûte plus cher.", cost_note_fr: "8 000 $ à 25 000 $" },
    { slug: "permis-renovation-necessaire", question_fr: "Ai-je besoin d'un permis pour rénover ?", quick_answer_fr: "Oui pour les travaux structuraux, électriques, de plomberie ou modifiant l'extérieur. Consultez votre municipalité.", urgency_note_fr: "Avant de commencer les travaux" },
    { slug: "isolation-murs-exterieurs", question_fr: "Comment isoler les murs extérieurs d'une vieille maison ?", quick_answer_fr: "Par l'extérieur (EIFS ou panneaux isolants) ou par l'intérieur (mousse giclée ou laine). L'extérieur est préférable si le budget le permet.", cost_note_fr: "10 000 $ à 30 000 $" },
    { slug: "fenetre-triple-vitrage-utile", question_fr: "Le triple vitrage en vaut-il la peine au Québec ?", quick_answer_fr: "Oui, le triple vitrage offre une meilleure performance thermique et réduit la condensation, surtout dans les régions froides.", cost_note_fr: "15-30% plus cher que le double vitrage" },
    { slug: "toiture-plate-problemes", question_fr: "Quels sont les problèmes courants d'une toiture plate ?", quick_answer_fr: "Accumulation d'eau, membrane percée, drainage insuffisant et ponts thermiques. L'entretien régulier est essentiel.", cost_note_fr: "5 000 $ à 20 000 $ selon la surface" },
    { slug: "chauffage-plancher-radiant", question_fr: "Le chauffage par plancher radiant est-il efficace ?", quick_answer_fr: "Oui, c'est très confortable et efficace. L'électrique coûte moins à installer mais l'hydronique est plus économique à long terme.", cost_note_fr: "3 000 $ à 12 000 $" },
    { slug: "subventions-renovation-quebec", question_fr: "Quelles subventions sont disponibles pour rénover au Québec ?", quick_answer_fr: "Rénoclimat, Chauffez vert et Novoclimat offrent des subventions pour l'efficacité énergétique. Les montants varient selon les travaux.", urgency_note_fr: "Vérifiez l'admissibilité avant les travaux" },
    { slug: "inspection-prepurchase-important", question_fr: "L'inspection préachat est-elle importante ?", quick_answer_fr: "Absolument essentielle. Elle peut révéler des problèmes coûteux cachés. Choisissez un inspecteur certifié et indépendant.", cost_note_fr: "400 $ à 800 $" },
    { slug: "amiante-maison-ancienne", question_fr: "Ma vieille maison contient-elle de l'amiante ?", quick_answer_fr: "Les maisons construites avant 1990 peuvent contenir de l'amiante dans l'isolation, les carrelages ou les conduits. Un test professionnel est recommandé.", urgency_note_fr: "Ne pas toucher sans analyse préalable" },
    { slug: "cout-agrandir-maison", question_fr: "Combien coûte agrandir sa maison ?", quick_answer_fr: "Entre 200 $ et 400 $ le pied carré selon la complexité. Un agrandissement standard coûte 40 000 $ à 100 000 $.", cost_note_fr: "40 000 $ à 100 000 $+" },
    { slug: "thermopompe-climatisation", question_fr: "Thermopompe ou climatiseur central ?", quick_answer_fr: "La thermopompe est plus polyvalente car elle chauffe et climatise. Elle est plus éco-énergétique mais coûte plus cher à l'installation.", cost_note_fr: "4 000 $ à 10 000 $" },
    { slug: "garantie-maison-neuve", question_fr: "Que couvre la garantie maison neuve au Québec ?", quick_answer_fr: "La GCR couvre 1 an pour finitions, 3 ans pour vices cachés et 5 ans pour les vices majeurs. Elle est obligatoire pour les maisons neuves.", urgency_note_fr: "Signaler les défauts dans les délais" },
    { slug: "puits-artesien-qualite-eau", question_fr: "Comment vérifier la qualité de l'eau de mon puits ?", quick_answer_fr: "Faites analyser l'eau au moins une fois par an pour les bactéries et tous les 5 ans pour les paramètres chimiques.", cost_note_fr: "50 $ à 150 $ par analyse" },
  ];
  const { error: qErr } = await sb.from("homeowner_questions").upsert(questions, { onConflict: "slug" });
  results.questions = qErr ? qErr.message : `${questions.length} inserted`;

  // ── 6. Update home_problems with scoring columns ──
  // Update existing problems with new scoring fields
  const { data: existingProblems } = await sb.from("home_problems").select("id, slug").limit(100);
  if (existingProblems && existingProblems.length > 0) {
    let updated = 0;
    for (const prob of existingProblems) {
      const demand = Math.floor(Math.random() * 40) + 40;
      const profit = Math.floor(Math.random() * 40) + 30;
      const seo = Math.floor(Math.random() * 40) + 40;
      const total = Math.round(demand * 0.3 + profit * 0.3 + seo * 0.4);
      const { error } = await sb.from("home_problems").update({
        demand_score: demand,
        profitability_score: profit,
        seo_priority_score: seo,
        total_priority_score: total,
        severity_level: ["low", "medium", "high", "critical"][Math.floor(Math.random() * 4)],
        source_confidence: 0.7 + Math.random() * 0.3,
      }).eq("id", prob.id);
      if (!error) updated++;
    }
    results.problemsUpdated = updated;
  }

  // ── 7. Link symptoms to problems ──
  const { data: symData } = await sb.from("problem_symptoms").select("id, slug");
  const { data: probData } = await sb.from("home_problems").select("id, slug").limit(50);
  if (symData && probData && probData.length > 0) {
    const links: any[] = [];
    for (const sym of symData) {
      // Link each symptom to 2-4 random problems
      const count = 2 + Math.floor(Math.random() * 3);
      const shuffled = [...probData].sort(() => Math.random() - 0.5).slice(0, count);
      for (const prob of shuffled) {
        links.push({ problem_id: prob.id, symptom_id: sym.id, weight: 0.5 + Math.random() * 0.5 });
      }
    }
    const { error } = await sb.from("home_problem_symptoms").upsert(links, { onConflict: "problem_id,symptom_id", ignoreDuplicates: true });
    results.symptomLinks = error ? error.message : `${links.length} linked`;
  }

  // ── 8. Link causes to problems ──
  const { data: cauData } = await sb.from("problem_causes").select("id, slug");
  if (cauData && probData && probData.length > 0) {
    const links: any[] = [];
    for (const cau of cauData) {
      const count = 2 + Math.floor(Math.random() * 3);
      const shuffled = [...probData].sort(() => Math.random() - 0.5).slice(0, count);
      for (const prob of shuffled) {
        links.push({ problem_id: prob.id, cause_id: cau.id, weight: 0.5 + Math.random() * 0.5 });
      }
    }
    const { error } = await sb.from("home_problem_causes").upsert(links, { onConflict: "problem_id,cause_id", ignoreDuplicates: true });
    results.causeLinks = error ? error.message : `${links.length} linked`;
  }

  // ── 9. Link problems to geo areas ──
  const { data: geoData } = await sb.from("geo_areas").select("id, slug").eq("area_type", "city").limit(15);
  if (geoData && probData && probData.length > 0) {
    const links: any[] = [];
    for (const prob of probData.slice(0, 25)) {
      const count = 3 + Math.floor(Math.random() * 5);
      const shuffled = [...geoData].sort(() => Math.random() - 0.5).slice(0, count);
      for (const geo of shuffled) {
        links.push({
          problem_id: prob.id,
          geo_area_id: geo.id,
          demand_score: Math.floor(Math.random() * 50) + 30,
          priority_score: Math.floor(Math.random() * 50) + 30,
        });
      }
    }
    const { error } = await sb.from("problem_geo_targets").upsert(links, { onConflict: "problem_id,geo_area_id", ignoreDuplicates: true });
    results.geoLinks = error ? error.message : `${links.length} linked`;
  }

  // ── 10. Generate sample blueprints ──
  if (probData && geoData && probData.length > 0 && geoData.length > 0) {
    const blueprints: any[] = [];
    for (const prob of probData.slice(0, 15)) {
      for (const geo of geoData.slice(0, 5)) {
        const slug = `${prob.slug}-${geo.slug}`;
        blueprints.push({
          blueprint_type: "problem_city",
          problem_id: prob.id,
          geo_area_id: geo.id,
          canonical_slug: slug,
          title_fr: `${prob.slug.replace(/-/g, " ")} à ${geo.slug.replace(/-/g, " ")}`,
          priority_score: Math.floor(Math.random() * 40) + 40,
          generation_status: "pending",
        });
      }
    }
    const { error } = await sb.from("graph_page_blueprints").upsert(
      blueprints.slice(0, 75),
      { onConflict: "canonical_slug", ignoreDuplicates: true }
    );
    results.blueprints = error ? error.message : `${Math.min(blueprints.length, 75)} created`;
  }

  return new Response(JSON.stringify({ success: true, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
