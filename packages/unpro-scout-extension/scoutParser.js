/* UNPRO Scout — parser (mirror of supabase/functions/_shared/scoutParser.ts).
   Keep both files in sync. Pure functions, exposed on window.UnproScoutParser. */
(function () {
  const PHONE_RE = /(?:\+?1[\s.\-]?)?\(?([2-9]\d{2})\)?[\s.\-]?([2-9]\d{2})[\s.\-]?(\d{4})\b/g;
  const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]{2,}/gi;
  const URL_RE = /\b(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+\.(?:ca|com|net|org|quebec|info|biz))(?:\/\S*)?/gi;
  const RBQ_RE = /\bRBQ\s*[:#-]?\s*(\d{4}[\s.\-]?\d{4}[\s.\-]?\d{2})\b/i;

  const INTENT_PHRASES = [
    ["disponible pour partenariat", 50], ["dispo pour partenariat", 50],
    ["cherche contrats", 50], ["cherche des contrats", 50],
    ["disponible pour travaux", 45], ["entrepreneur disponible", 45],
    ["sous-traitance", 40], ["sous traitance", 40], ["partenariat", 35],
    ["looking for work", 45], ["available for projects", 45],
    ["disponible immédiatement", 35], ["prends de nouveaux clients", 35],
    ["soumission gratuite", 20], ["contactez-moi", 15], ["en privé", 10],
  ];

  const TRADES = [
    ["plomberie", "plomberie"], ["plombier", "plomberie"], ["toiture", "toiture"],
    ["couvreur", "toiture"], ["électricien", "electricite"], ["electricien", "electricite"],
    ["excavation", "excavation"], ["isolation", "isolation"], ["peinture", "peinture"],
    ["menuiserie", "menuiserie"], ["céramique", "ceramique"], ["paysagement", "paysagement"],
    ["asphalte", "asphalte"], ["déneigement", "deneigement"], ["rénovation", "renovation"],
    ["construction", "construction"], ["climatisation", "cvac"], ["chauffage", "cvac"],
  ];

  const CITIES = ["montréal", "montreal", "laval", "longueuil", "québec", "quebec", "gatineau",
    "sherbrooke", "terrebonne", "repentigny", "brossard", "blainville", "mirabel",
    "boucherville", "mascouche", "lévis", "granby", "drummondville"];

  const SUFFIX = /(inc\.?|ltée|ltee|ltd\.?|enr\.?|senc)\b/i;

  function toE164(raw) {
    if (!raw) return null;
    let d = String(raw).replace(/\D/g, "");
    if (d.length === 11 && d[0] === "1") d = d.slice(1);
    if (d.length !== 10) return null;
    if (!/^[2-9]/.test(d) || !/^[2-9]/.test(d.slice(3, 6))) return null;
    return "+1" + d;
  }


  /* Radar classification — mirror of supabase/functions/_shared/scoutRadar.ts (classifySignal). */
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
  const C_PHRASES = [
    [/\bje cherche (des |de nouveaux )?contrats\b/, 55], [/\bcherche (des )?contrats\b/, 50],
    [/\b(nous sommes|on est|je suis) specialises?\b/, 45], [/\b(je suis|nous sommes|on est) disponibles?\b/, 45],
    [/\b(pv|pm|mp) moi\b/, 35], [/\b(ecris|ecrivez|texte|textez|appelle|appelez)[- ]moi\b/, 30],
    [/\bcontactez[- ]moi\b/, 20], [/\bsous[- ]traitance\b/, 40], [/\bpartenariat\b/, 35],
    [/\bsoumission gratuite\b/, 20], [/\ben prive\b/, 10],
  ];
  const H_PHRASES = [
    [/\bje cherche (un|une|quelqu'un)\b/, 45], [/\b(besoin d'un|besoin d'une|j'ai besoin)\b/, 40],
    [/\b(quelqu'un|qqn|qq1) (connait|aurait|peut)\b/, 40], [/\brecommand(ation|ez|er)\b/, 35],
    [/\bcombien (ca )?(coute|couterait|charge)\b/, 30],
    [/\b(qui (est|serait) disponible|(etes|es)[- ]vous disponibles?|est-ce que .* disponible)\b/, 45],
    [/\bma (maison|toiture|cuisine|salle de bain|fondation)\b/, 20],
  ];
  const BARE = /^(moi|moi aussi|dispo|disponible|disponibles|toujours disponible|disponible ici)\s*[!.]*$/;
  function classifySignal(text) {
    const t = norm(text); const q = /\?/.test(text || "");
    let c = 0, h = 0;
    for (const [re, w] of C_PHRASES) if (re.test(t)) c += w;
    for (const [re, w] of H_PHRASES) if (re.test(t)) h += w;
    const stripped = t.replace(/^[^:]{1,60}:\s*/, "");
    if (BARE.test(stripped)) c += 40;
    else if (/\bdispo(nible)?s?\b/.test(t) && !q && h === 0) c += 25;
    let type = "uncertain";
    if (h > 0 && c === 0) type = "homeowner_request";
    else if (c > 0 && h === 0) type = q && c < 40 ? "uncertain" : "contractor_offer";
    else if (c > 0 && h > 0) type = c >= h + 20 ? "contractor_offer" : "uncertain";
    return { signal_type: type, contractor_score: Math.min(100, c), homeowner_score: Math.min(100, h) };
  }

  function parseScoutText(text, authorName) {
    text = String(text || "");
    const lower = text.toLowerCase();
    PHONE_RE.lastIndex = 0;
    const pm = PHONE_RE.exec(text);
    const phone_e164 = pm ? toE164(pm[0]) : null;
    const em = text.match(EMAIL_RE);
    const email = em ? em[0].toLowerCase() : null;

    let website_url = null;
    URL_RE.lastIndex = 0;
    let m;
    while ((m = URL_RE.exec(text)) !== null) {
      const host = m[1].toLowerCase();
      if (/facebook\.|fb\.|instagram\.|messenger\./.test(host)) continue;
      website_url = "https://" + host;
      break;
    }

    const rbq = text.match(RBQ_RE);
    let company_name = null;
    for (const line of text.split(/\n+/)) {
      const l = line.trim();
      if (l.length >= 3 && l.length <= 120 && SUFFIX.test(l)) { company_name = l; break; }
    }

    const trade = TRADES.find((t) => lower.includes(t[0]));
    const city = CITIES.find((c) => lower.includes(c));
    const hits = INTENT_PHRASES.filter((p) => lower.includes(p[0]));
    const intent_score = Math.min(100, hits.reduce((s, h) => s + h[1], 0));

    const confidence = Math.min(1,
      (phone_e164 ? 0.35 : 0) + (email ? 0.25 : 0) + (company_name ? 0.2 : 0) +
      (website_url ? 0.1 : 0) + (trade ? 0.1 : 0));

    return {
      company_name,
      contact_name: (authorName || "").trim() || null,
      phone_e164, email, website_url,
      rbq_number: rbq ? rbq[1] : null,
      city: city ? city.charAt(0).toUpperCase() + city.slice(1) : null,
      category: trade ? trade[1] : null,
      intent_score,
      intent_evidence: hits.length ? hits.map((h) => h[0]).join(" | ") : null,
      confidence: Number(confidence.toFixed(2)),
      has_contact: Boolean(phone_e164 || email || website_url),
      signal_type: classifySignal(text).signal_type,
    };
  }

  window.UnproScoutParser = { parseScoutText, toE164, classifySignal };
})();
