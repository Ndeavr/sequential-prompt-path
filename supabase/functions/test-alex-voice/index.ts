/**
 * test-alex-voice — Automated QA agent for Alex Voice system.
 *
 * Tests every layer of the Alex voice pipeline:
 * 1. Greeting builder (deterministic, time-based, name variants)
 * 2. Spoken French rewrite (corporate → conversational)
 * 3. TTS normalization (abbreviations, units, names)
 * 4. Voice response composer (sentence count, question count)
 * 5. Human voice layer (speech style by mode/stress/urgency)
 * 6. Full pipeline integration (processAlexResponse)
 * 7. Edge function API (create-session, respond-stream)
 * 8. ElevenLabs TTS connectivity
 *
 * Returns a structured test report with pass/fail per test.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  buildAlexGreeting,
  composeAlexVoiceReply,
  rewriteAlexToSpokenFrench,
  normalizeTextForFrenchTts,
  normalizeFrenchNamesForSpeech,
  splitForSpeech,
  processAlexResponse,
  ALEX_VOICE_CONFIG,
  getAlexVoiceSettings,
} from "../_shared/alex-french-voice.ts";
import {
  prepareAlexSpeechStyle,
  shapeTextForHumanSpeech,
} from "../_shared/alex-human-voice.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Test Framework ───

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
  expected?: string;
  actual?: string;
  error?: string;
}

interface TestReport {
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  errors: number;
  duration_ms: number;
  results: TestResult[];
  summary: string;
  fixes_needed: string[];
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

// ─── 1. Greeting Builder Tests ───

function testGreetingBuilder(): TestResult[] {
  const results: TestResult[] = [];

  // Morning greeting, first visit
  try {
    const g = buildAlexGreeting({ firstName: "Yann", localHour: 9 });
    assert(g.displayGreeting.startsWith("Bonjour Yann."), `Expected 'Bonjour Yann.' got '${g.displayGreeting}'`);
    assert(g.spokenGreeting.startsWith("Bonjour Yann."), `Spoken should match display when no preferredSpokenName`);
    results.push({ name: "greeting_morning_with_name", passed: true });
  } catch (e) {
    results.push({ name: "greeting_morning_with_name", passed: false, error: e.message });
  }

   // Afternoon greeting — Quebec French uses "Bonjour" all day
  try {
    const g = buildAlexGreeting({ firstName: "Yann", localHour: 14 });
    assert(g.displayGreeting.startsWith("Bonjour Yann."), `Expected 'Bonjour Yann.' for afternoon (QC French), got '${g.displayGreeting}'`);
    results.push({ name: "greeting_afternoon", passed: true });
  } catch (e) {
    results.push({ name: "greeting_afternoon", passed: false, error: e.message });
  }

  // Evening greeting
  try {
    const g = buildAlexGreeting({ firstName: "Yann", localHour: 20 });
    assert(g.displayGreeting.startsWith("Bonsoir Yann."), `Expected evening greeting, got '${g.displayGreeting}'`);
    results.push({ name: "greeting_evening", passed: true });
  } catch (e) {
    results.push({ name: "greeting_evening", passed: false, error: e.message });
  }

  // Returning user
  try {
    const g = buildAlexGreeting({ firstName: "Yann", isReturningUser: true, localHour: 10 });
    assert(g.displayGreeting.startsWith("Rebonjour Yann."), `Expected 'Rebonjour', got '${g.displayGreeting}'`);
    results.push({ name: "greeting_returning_user", passed: true });
  } catch (e) {
    results.push({ name: "greeting_returning_user", passed: false, error: e.message });
  }

  // No name
  try {
    const g = buildAlexGreeting({ localHour: 10 });
    assert(g.displayGreeting.startsWith("Bonjour."), `Expected 'Bonjour.' without name, got '${g.displayGreeting}'`);
    results.push({ name: "greeting_no_name", passed: true });
  } catch (e) {
    results.push({ name: "greeting_no_name", passed: false, error: e.message });
  }

  // preferredSpokenName differs from firstName
  try {
    const g = buildAlexGreeting({ firstName: "Yan", preferredSpokenName: "Yann", localHour: 9 });
    assert(g.displayGreeting.includes("Yan"), `Display should use firstName 'Yan'`);
    assert(g.spokenGreeting.includes("Yann"), `Spoken should use preferredSpokenName 'Yann'`);
    results.push({ name: "greeting_spoken_name_differs", passed: true });
  } catch (e) {
    results.push({ name: "greeting_spoken_name_differs", passed: false, error: e.message });
  }

  // Legacy userName fallback
  try {
    const g = buildAlexGreeting({ userName: "Marco", localHour: 9 });
    assert(g.displayGreeting.includes("Marco"), `Should fallback to userName`);
    results.push({ name: "greeting_legacy_userName", passed: true });
  } catch (e) {
    results.push({ name: "greeting_legacy_userName", passed: false, error: e.message });
  }

  // Edge: hour exactly 12 — Quebec French uses "Bonjour" until 18h
  try {
    const g = buildAlexGreeting({ firstName: "Test", localHour: 12 });
    assert(g.displayGreeting.startsWith("Bonjour"), `Hour 12 should be Bonjour (QC French)`);
    results.push({ name: "greeting_hour_boundary_12", passed: true });
  } catch (e) {
    results.push({ name: "greeting_hour_boundary_12", passed: false, error: e.message });
  }

  // Edge: hour exactly 18
  try {
    const g = buildAlexGreeting({ firstName: "Test", localHour: 18 });
    assert(g.displayGreeting.startsWith("Bonsoir"), `Hour 18 should be evening`);
    results.push({ name: "greeting_hour_boundary_18", passed: true });
  } catch (e) {
    results.push({ name: "greeting_hour_boundary_18", passed: false, error: e.message });
  }

  return results;
}

// ─── 2. Spoken French Rewrite Tests ───

function testSpokenFrenchRewrite(): TestResult[] {
  const results: TestResult[] = [];
  const cases: [string, string, string][] = [
    ["rewrite_afin_de", "Afin de vous aider, on peut commencer.", "Pour vous aider, on peut commencer."],
    ["rewrite_permettez", "Permettez-moi de vérifier cela.", "vérifier cela."],
    ["rewrite_en_mesure", "Je suis en mesure de vous accompagner.", "Je peux vous accompagner."],
    ["rewrite_pertinent", "Il serait pertinent de vérifier.", "Le mieux, c'est de vérifier."],
    ["rewrite_proceder", "Nous allons procéder à la vérification.", "On va faire ça à la vérification."],
    ["rewrite_merci_precision", "Merci pour cette précision. On continue.", "D'accord. On continue."],
    ["rewrite_nous_pouvons", "Nous pouvons vérifier ensemble.", "On peut vérifier ensemble."],
    ["rewrite_nous_allons", "Nous allons voir ça.", "On va voir ça."],
    ["rewrite_markdown_bold", "**Important** à noter.", "Important à noter."],
    ["rewrite_filler_en_effet", "En effet, c'est correct.", "c'est correct."],
  ];

  for (const [name, input, expectedSubstring] of cases) {
    try {
      const result = rewriteAlexToSpokenFrench(input, "full");
      assert(
        result.includes(expectedSubstring) || result === expectedSubstring.trim(),
        `Expected to contain '${expectedSubstring}', got '${result}'`
      );
      results.push({ name, passed: true, actual: result });
    } catch (e) {
      results.push({ name, passed: false, error: e.message, expected: expectedSubstring });
    }
  }

  return results;
}

// ─── 3. TTS Normalization Tests ───

function testTtsNormalization(): TestResult[] {
  const results: TestResult[] = [];
  const cases: [string, string, string][] = [
    ["tts_24_7", "Disponible 24/7", "24 sur 7"],
    ["tts_rbq", "Licence RBQ valide", "R B Q"],
    ["tts_aipp", "Score AIPP élevé", "A I double P"],
    ["tts_currency", "500$ de travaux", "500 dollars"],
    ["tts_percent", "Rabais de 15%", "15 pour cent"],
    ["tts_sqft", "Surface de 200pi²", "200 pieds carrés"],
    ["tts_ordinal", "Le 1er étage", "premier"],
    ["tts_url_removal", "Visitez https://unpro.ca pour détails", "le lien"],
  ];

  for (const [name, input, expectedSubstring] of cases) {
    try {
      const result = normalizeTextForFrenchTts(input);
      assert(result.includes(expectedSubstring), `Expected '${expectedSubstring}' in '${result}'`);
      results.push({ name, passed: true, actual: result });
    } catch (e) {
      results.push({ name, passed: false, error: e.message });
    }
  }

  return results;
}

// ─── 4. Name Normalization Tests ───

function testNameNormalization(): TestResult[] {
  const results: TestResult[] = [];
  const cases: [string, string, string][] = [
    ["name_montreal", "Projet à Montreal", "Montréal"],
    ["name_quebec", "Région de Quebec", "Québec"],
    ["name_ile_des_soeurs", "Condo à Ile des Soeurs", "Île-des-Sœurs"],
    ["name_ile_des_soeurs_hyphen", "Condo à Ile-des-Soeurs", "Île-des-Sœurs"],
    ["name_st_prefix", "Travaux à St-Hubert", "Saint-Hubert"],
  ];

  for (const [name, input, expectedSubstring] of cases) {
    try {
      const result = normalizeFrenchNamesForSpeech(input);
      assert(result.includes(expectedSubstring), `Expected '${expectedSubstring}' in '${result}'`);
      results.push({ name, passed: true, actual: result });
    } catch (e) {
      results.push({ name, passed: false, error: e.message });
    }
  }

  return results;
}

// ─── 5. Voice Composer Tests ───

function testVoiceComposer(): TestResult[] {
  const results: TestResult[] = [];

  // Basic composition
  try {
    const r = composeAlexVoiceReply({
      greeting: "Bonjour Yann.",
      shortAnswer: "Je suis là",
      nextQuestion: "Qu'est-ce qui se passe",
    });
    assert(r.displayText.includes("Bonjour Yann."), "Should contain greeting");
    assert(r.displayText.includes("Je suis là"), "Should contain answer");
    assert(r.displayText.endsWith("?"), "Should end with question mark");
    assert(r.sentences.length <= 4, `Max 4 sentences, got ${r.sentences.length}`);
    results.push({ name: "composer_basic", passed: true, actual: r.displayText });
  } catch (e) {
    results.push({ name: "composer_basic", passed: false, error: e.message });
  }

  // Spoken name variant
  try {
    const r = composeAlexVoiceReply(
      { greeting: "Bonjour Yan.", shortAnswer: "Je suis là." },
      "Bonjour Yann."
    );
    assert(r.displayText.includes("Yan"), "Display should use Yan");
    assert(r.spokenText.includes("Yann"), "Spoken should use Yann");
    results.push({ name: "composer_spoken_name", passed: true });
  } catch (e) {
    results.push({ name: "composer_spoken_name", passed: false, error: e.message });
  }

  // Max 4 sentences enforcement
  try {
    const r = composeAlexVoiceReply({
      greeting: "Bonjour.",
      acknowledgment: "Je suis là.",
      shortAnswer: "On va vérifier.",
      nextQuestion: "Tu veux une photo?",
    });
    assert(r.sentences.length === 4, `Expected 4 sentences, got ${r.sentences.length}`);
    results.push({ name: "composer_max_4_sentences", passed: true });
  } catch (e) {
    results.push({ name: "composer_max_4_sentences", passed: false, error: e.message });
  }

  return results;
}

// ─── 6. Speech Style Tests ───

function testSpeechStyle(): TestResult[] {
  const results: TestResult[] = [];

  // Neutral baseline
  try {
    const s = prepareAlexSpeechStyle({ mode: "neutral" });
    assert(s.stability >= 0.5 && s.stability <= 0.8, `Stability ${s.stability} out of range`);
    assert(s.speed >= 0.7 && s.speed <= 1.2, `Speed ${s.speed} out of range`);
    results.push({ name: "style_neutral", passed: true, details: JSON.stringify(s) });
  } catch (e) {
    results.push({ name: "style_neutral", passed: false, error: e.message });
  }

  // High stress → higher stability (calmer)
  try {
    const baseline = prepareAlexSpeechStyle({ mode: "homeowner" });
    const stressed = prepareAlexSpeechStyle({ mode: "homeowner", stressLevel: 0.9 });
    assert(stressed.stability >= baseline.stability, `Stress should increase stability: ${stressed.stability} vs ${baseline.stability}`);
    results.push({ name: "style_stress_calmer", passed: true });
  } catch (e) {
    results.push({ name: "style_stress_calmer", passed: false, error: e.message });
  }

  // High urgency → faster speed
  try {
    const baseline = prepareAlexSpeechStyle({ mode: "urgency" });
    const urgent = prepareAlexSpeechStyle({ mode: "urgency", urgencyLevel: 0.9 });
    assert(urgent.speed >= baseline.speed, `Urgency should increase speed: ${urgent.speed} vs ${baseline.speed}`);
    results.push({ name: "style_urgency_faster", passed: true });
  } catch (e) {
    results.push({ name: "style_urgency_faster", passed: false, error: e.message });
  }

  // Contractor → sharper
  try {
    const s = prepareAlexSpeechStyle({ mode: "contractor" });
    assert(s.label === "contractor-sharp", `Expected 'contractor-sharp', got '${s.label}'`);
    results.push({ name: "style_contractor_sharp", passed: true });
  } catch (e) {
    results.push({ name: "style_contractor_sharp", passed: false, error: e.message });
  }

  return results;
}

// ─── 7. Text Shaping Tests ───

function testTextShaping(): TestResult[] {
  const results: TestResult[] = [];

  try {
    const style = prepareAlexSpeechStyle({ mode: "neutral" });
    const r = shapeTextForHumanSpeech("OK on s'en occupe maintenant.", style);
    assert(r.includes("OK,"), `Should add comma after OK: '${r}'`);
    results.push({ name: "shaping_ok_comma", passed: true, actual: r });
  } catch (e) {
    results.push({ name: "shaping_ok_comma", passed: false, error: e.message });
  }

  try {
    const style = prepareAlexSpeechStyle({ mode: "homeowner" });
    const r = shapeTextForHumanSpeech("C'est courant on voit ça souvent.", style);
    assert(r.includes("courant, on"), `Should add pause after 'courant': '${r}'`);
    results.push({ name: "shaping_natural_pause", passed: true, actual: r });
  } catch (e) {
    results.push({ name: "shaping_natural_pause", passed: false, error: e.message });
  }

  return results;
}

// ─── 8. Split for Speech Tests ───

function testSplitForSpeech(): TestResult[] {
  const results: TestResult[] = [];

  try {
    const segments = splitForSpeech("Bonjour Yann. Je suis là. Qu'est-ce qui se passe exactement?");
    assert(segments.length === 3, `Expected 3 segments, got ${segments.length}: ${JSON.stringify(segments)}`);
    results.push({ name: "split_three_sentences", passed: true, details: JSON.stringify(segments) });
  } catch (e) {
    results.push({ name: "split_three_sentences", passed: false, error: e.message });
  }

  // Long sentence splitting
  try {
    const long = "Je vais être directe avec vous, on va vérifier ensemble la licence de cet entrepreneur, son assurance, ses réalisations récentes et son score de confiance.";
    const segments = splitForSpeech(long);
    assert(segments.length >= 2, `Long sentence should split: got ${segments.length}`);
    assert(segments.every(s => s.length <= 100), `All segments should be ≤100 chars`);
    results.push({ name: "split_long_sentence", passed: true, details: JSON.stringify(segments) });
  } catch (e) {
    results.push({ name: "split_long_sentence", passed: false, error: e.message });
  }

  return results;
}

// ─── 9. Full Pipeline (processAlexResponse) Tests ───

function testFullPipeline(): TestResult[] {
  const results: TestResult[] = [];

  // Basic pipeline
  try {
    const raw = "Afin de vous aider, je suis en mesure de vérifier votre licence RBQ. Nous allons procéder ensemble.";
    const r = processAlexResponse(raw);
    assert(!r.displayText.includes("Afin de"), `Should rewrite 'Afin de': '${r.displayText}'`);
    assert(!r.displayText.includes("Je suis en mesure"), `Should rewrite 'Je suis en mesure': '${r.displayText}'`);
    assert(r.ttsSentences.length > 0, "Should produce TTS sentences");
    // TTS sentences should have expanded abbreviations
    const ttsJoined = r.ttsSentences.join(" ");
    assert(ttsJoined.includes("R B Q"), `TTS should expand RBQ: '${ttsJoined}'`);
    results.push({ name: "pipeline_rewrite_and_normalize", passed: true, actual: r.displayText });
  } catch (e) {
    results.push({ name: "pipeline_rewrite_and_normalize", passed: false, error: e.message });
  }

  // UI action extraction
  try {
    const raw = 'Voici votre score. <ui_action type="show_score" /> Tu veux voir les détails?';
    const r = processAlexResponse(raw);
    assert(r.uiActions.length === 1, `Expected 1 UI action, got ${r.uiActions.length}`);
    assert(r.uiActions[0].type === "show_score", `Expected show_score action`);
    assert(!r.displayText.includes("ui_action"), "Display text should not contain raw tags");
    results.push({ name: "pipeline_ui_action_extraction", passed: true });
  } catch (e) {
    results.push({ name: "pipeline_ui_action_extraction", passed: false, error: e.message });
  }

  // Next action extraction
  try {
    const raw = "On va regarder ça. <next_action>montrer le score</next_action>";
    const r = processAlexResponse(raw);
    assert(r.nextAction === "montrer le score", `Expected 'montrer le score', got '${r.nextAction}'`);
    assert(!r.displayText.includes("next_action"), "Display should not contain next_action tag");
    results.push({ name: "pipeline_next_action", passed: true });
  } catch (e) {
    results.push({ name: "pipeline_next_action", passed: false, error: e.message });
  }

  // Transcript parity: displayText should NOT contain TTS-only expansions
  try {
    const raw = "Score AIPP à Montreal. RBQ valide 24/7.";
    const r = processAlexResponse(raw);
    // Display should have natural names (Montréal) but NOT spelled-out abbreviations
    assert(r.displayText.includes("Montréal"), `Display should fix names: '${r.displayText}'`);
    assert(r.displayText.includes("AIPP"), `Display should keep AIPP as-is (not 'A I double P'): '${r.displayText}'`);
    // TTS should have expanded abbreviations
    const tts = r.ttsSentences.join(" ");
    assert(tts.includes("A I double P"), `TTS should expand AIPP: '${tts}'`);
    results.push({ name: "pipeline_transcript_parity", passed: true });
  } catch (e) {
    results.push({ name: "pipeline_transcript_parity", passed: false, error: e.message });
  }

  return results;
}

// ─── 10. Voice Config Tests ───

function testVoiceConfig(): TestResult[] {
  const results: TestResult[] = [];

  // Locked voice ID
  try {
    assert(ALEX_VOICE_CONFIG.voiceId === "gCr8TeSJgJaeaIoV4RWH", `Voice ID mismatch: ${ALEX_VOICE_CONFIG.voiceId}`);
    results.push({ name: "config_voice_id_locked", passed: true });
  } catch (e) {
    results.push({ name: "config_voice_id_locked", passed: false, error: e.message });
  }

  // Default profile settings
  try {
    const settings = getAlexVoiceSettings("default");
    assert(settings.stability === 0.70, `Default stability should be 0.70, got ${settings.stability}`);
    assert(settings.similarity_boost === 0.86, `Default similarity should be 0.86, got ${settings.similarity_boost}`);
    assert(settings.style === 0.14, `Default style should be 0.14, got ${settings.style}`);
    results.push({ name: "config_default_profile", passed: true });
  } catch (e) {
    results.push({ name: "config_default_profile", passed: false, error: e.message });
  }

  // Profile A
  try {
    const settings = getAlexVoiceSettings("profile_a");
    assert(settings.stability === 0.72, `Profile A stability should be 0.72`);
    results.push({ name: "config_profile_a", passed: true });
  } catch (e) {
    results.push({ name: "config_profile_a", passed: false, error: e.message });
  }

  // Profile B
  try {
    const settings = getAlexVoiceSettings("profile_b");
    assert(settings.stability === 0.76, `Profile B stability should be 0.76`);
    results.push({ name: "config_profile_b", passed: true });
  } catch (e) {
    results.push({ name: "config_profile_b", passed: false, error: e.message });
  }

  // Chunk schedule
  try {
    const schedule = ALEX_VOICE_CONFIG.chunkLengthSchedule;
    assert(Array.isArray(schedule) && schedule.length === 3, `Chunk schedule should have 3 entries`);
    assert(schedule[0] === 70, `First chunk should be 70`);
    results.push({ name: "config_chunk_schedule", passed: true });
  } catch (e) {
    results.push({ name: "config_chunk_schedule", passed: false, error: e.message });
  }

  return results;
}

// ─── 11. API Integration Test ───

async function testApiIntegration(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Test create-session
  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/alex-voice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        action: "create-session",
        userName: "TestAgent",
        localHour: 10,
        feature: "test",
      }),
    });
    const data = await resp.json();
    
    if (!resp.ok) {
      results.push({ name: "api_create_session", passed: false, error: `HTTP ${resp.status}: ${JSON.stringify(data)}` });
    } else {
      assert(data.sessionId, "Should return sessionId");
      assert(data.greeting, "Should return greeting");
      assert(data.greeting.includes("Bonjour") || data.greeting.includes("Rebonjour") || data.greeting.includes("Bon après-midi") || data.greeting.includes("Bonsoir"),
        `Greeting should start with proper French salutation: '${data.greeting}'`);
      results.push({ name: "api_create_session", passed: true, details: `sessionId=${data.sessionId}, greeting='${data.greeting}'` });

      // Test respond-stream with the session
      try {
        const resp2 = await fetch(`${SUPABASE_URL}/functions/v1/alex-voice`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            action: "respond-stream",
            sessionId: data.sessionId,
            userMessage: "J'ai un problème de plomberie urgente.",
            messages: [
              { role: "assistant", content: data.greeting },
            ],
          }),
        });
        const data2 = await resp2.json();
        
        if (!resp2.ok) {
          results.push({ name: "api_respond_stream", passed: false, error: `HTTP ${resp2.status}: ${JSON.stringify(data2)}` });
        } else {
          assert(data2.text, "Should return text response");
          assert(data2.text.length > 5, `Response too short: '${data2.text}'`);
          // Check response quality
          const hasQuestion = data2.text.includes("?");
          const sentenceCount = (data2.text.match(/[.!?]+/g) || []).length;
          
          results.push({
            name: "api_respond_stream",
            passed: true,
            details: `text='${data2.text.substring(0, 100)}...', hasQuestion=${hasQuestion}, sentences≈${sentenceCount}, audioChunks=${data2.audioChunks?.length ?? 0}`,
          });

          // Check response doesn't contain banned phrases
          const bannedPhrases = ["Afin de", "Permettez-moi", "Je suis en mesure de", "Il serait pertinent"];
          const foundBanned = bannedPhrases.filter(p => data2.text.includes(p));
          if (foundBanned.length > 0) {
            results.push({
              name: "api_response_no_banned_phrases",
              passed: false,
              error: `Response contains banned phrases: ${foundBanned.join(", ")}`,
              actual: data2.text,
            });
          } else {
            results.push({ name: "api_response_no_banned_phrases", passed: true });
          }

          // Check audio was generated
          const hasAudio = (data2.audioChunks?.length ?? 0) > 0 || !!data2.audio;
          results.push({
            name: "api_tts_generated",
            passed: hasAudio,
            error: hasAudio ? undefined : "No audio chunks returned — ElevenLabs may be down or API key missing",
          });
        }
      } catch (e) {
        results.push({ name: "api_respond_stream", passed: false, error: e.message });
      }
    }
  } catch (e) {
    results.push({ name: "api_create_session", passed: false, error: e.message });
  }

  return results;
}

// ─── 12. Cross-system consistency checks ───

function testConsistencyChecks(): TestResult[] {
  const results: TestResult[] = [];

  // voice-gateway should use same voice ID as config
  try {
    // We can't import voice-gateway directly, but we verify the config is correct
    assert(ALEX_VOICE_CONFIG.voiceId === "gCr8TeSJgJaeaIoV4RWH", "Voice ID should be locked");
    assert(ALEX_VOICE_CONFIG.modelId === "eleven_turbo_v2_5", "Model should be turbo v2.5");
    results.push({ name: "consistency_voice_config", passed: true });
  } catch (e) {
    results.push({ name: "consistency_voice_config", passed: false, error: e.message });
  }

  // Env vars check
  try {
    const elevenlabsKey = Deno.env.get("ELEVENLABS_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    assert(!!elevenlabsKey, "ELEVENLABS_API_KEY not set");
    assert(!!lovableKey, "LOVABLE_API_KEY not set");
    results.push({ name: "consistency_env_vars", passed: true });
  } catch (e) {
    results.push({ name: "consistency_env_vars", passed: false, error: e.message });
  }

  return results;
}

// ─── 13. QA Phrase Acceptance Tests ───

function testQAPhrases(): TestResult[] {
  const results: TestResult[] = [];
  
  const acceptedPhrases = [
    "Bonjour Yann.",
    "Bon après-midi Yann.",
    "Rebonjour Yann.",
    "Je suis là.",
    "Qu'est-ce qui se passe exactement?",
    "Tu veux que je regarde ça avec une photo?",
    "Je peux te montrer ton score actuel.",
    "Je vais être directe. Tu veux plus de visibilité ou plus de rendez-vous?",
    "C'est pour votre condo à l'Île-des-Sœurs?",
  ];

  for (const phrase of acceptedPhrases) {
    try {
      // These should survive the pipeline without corruption
      const normalized = normalizeTextForFrenchTts(phrase);
      assert(normalized.length > 3, `Phrase should not be empty after normalization`);
      // Should still be valid French
      assert(!normalized.includes("undefined"), `Should not contain 'undefined'`);
      results.push({ name: `qa_phrase_${phrase.substring(0, 20)}`, passed: true, actual: normalized });
    } catch (e) {
      results.push({ name: `qa_phrase_${phrase.substring(0, 20)}`, passed: false, error: e.message });
    }
  }

  // Rejection tests
  const rejectedPatterns = [
    "Afin de mieux comprendre votre situation actuelle...",
    "Permettez-moi de vous accompagner...",
    "Je suis en mesure de vous proposer...",
    "Il serait pertinent de...",
    "Je vous propose les options suivantes...",
  ];

  for (const pattern of rejectedPatterns) {
    try {
      const rewritten = rewriteAlexToSpokenFrench(pattern, "full");
      assert(!rewritten.includes("Afin de"), `Should not contain 'Afin de' after rewrite`);
      assert(!rewritten.includes("Permettez-moi"), `Should not contain 'Permettez-moi'`);
      assert(!rewritten.includes("Je suis en mesure"), `Should not contain 'Je suis en mesure'`);
      results.push({ name: `qa_reject_${pattern.substring(0, 20)}`, passed: true, actual: rewritten });
    } catch (e) {
      results.push({ name: `qa_reject_${pattern.substring(0, 20)}`, passed: false, error: e.message });
    }
  }

  return results;
}

// ─── Main Runner ───

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const start = performance.now();
  const allResults: TestResult[] = [];
  const fixesNeeded: string[] = [];

  // Run all unit tests
  allResults.push(...testGreetingBuilder());
  allResults.push(...testSpokenFrenchRewrite());
  allResults.push(...testTtsNormalization());
  allResults.push(...testNameNormalization());
  allResults.push(...testVoiceComposer());
  allResults.push(...testSpeechStyle());
  allResults.push(...testTextShaping());
  allResults.push(...testSplitForSpeech());
  allResults.push(...testFullPipeline());
  allResults.push(...testVoiceConfig());
  allResults.push(...testConsistencyChecks());
  allResults.push(...testQAPhrases());

  // Run API integration tests
  try {
    const body = await req.json().catch(() => ({}));
    if ((body as any)?.skipApi !== true) {
      const apiResults = await testApiIntegration();
      allResults.push(...apiResults);
    }
  } catch {
    // If body parsing fails, still run API tests
    const apiResults = await testApiIntegration();
    allResults.push(...apiResults);
  }

  const duration = Math.round(performance.now() - start);
  const passed = allResults.filter(r => r.passed).length;
  const failed = allResults.filter(r => !r.passed).length;

  // Analyze failures for fix recommendations
  for (const r of allResults.filter(r => !r.passed)) {
    if (r.name.startsWith("api_tts")) {
      fixesNeeded.push("🔊 ElevenLabs TTS: Vérifier ELEVENLABS_API_KEY et la connectivité");
    }
    if (r.name.includes("transcript_parity")) {
      fixesNeeded.push("📝 Transcript Parity: displayText contient des expansions TTS — séparer les couches");
    }
    if (r.name.includes("banned_phrases")) {
      fixesNeeded.push("🗣️ French Rewrite: Le modèle génère encore des phrases corporatives — renforcer le system prompt ou la couche de réécriture");
    }
    if (r.name.includes("voice_id")) {
      fixesNeeded.push("🔒 Voice Lock: Le voice ID ne correspond pas à gCr8TeSJgJaeaIoV4RWH");
    }
    if (r.name.includes("greeting")) {
      fixesNeeded.push(`⏰ Greeting: ${r.error}`);
    }
  }

  const report: TestReport = {
    timestamp: new Date().toISOString(),
    totalTests: allResults.length,
    passed,
    failed,
    errors: allResults.filter(r => r.error).length,
    duration_ms: duration,
    results: allResults,
    summary: failed === 0
      ? `✅ Tous les ${passed} tests passent. Alex Voice est opérationnelle.`
      : `⚠️ ${failed}/${allResults.length} tests échoués. Corrections requises.`,
    fixes_needed: [...new Set(fixesNeeded)],
  };

  return new Response(JSON.stringify(report, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
