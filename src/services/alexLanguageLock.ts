/**
 * AlexLanguageLock — Session-level language detection and locking.
 * 
 * Default: fr-CA
 * Switch to en-CA only after 2+ consecutive English utterances with high confidence.
 * A single English word or brand name does NOT trigger a switch.
 */

export type AlexLanguage = 'fr-CA' | 'en-CA';

// Common English words that should NOT trigger a language switch
const ENGLISH_FALSE_POSITIVES = new Set([
  'ok', 'yes', 'no', 'please', 'thanks', 'sure', 'cool', 'nice',
  'email', 'phone', 'budget', 'contact', 'service', 'design',
  'west island', 'downtown', 'home', 'condo', 'fix', 'check',
]);

// Simple heuristic: count French-specific characters and patterns
function frenchScore(text: string): number {
  const lower = text.toLowerCase();
  let score = 0;
  
  // French accented characters
  const frenchChars = (lower.match(/[àâäéèêëïîôùûüÿçœæ]/g) || []).length;
  score += frenchChars * 3;
  
  // French common words
  const frenchWords = ['je', 'tu', 'il', 'elle', 'nous', 'vous', 'les', 'des', 'une', 'est',
    'pour', 'dans', 'avec', 'sur', 'pas', 'que', 'qui', 'mais', 'oui', 'non',
    'mon', 'ma', 'mes', 'son', 'sa', 'ses', 'ce', 'cette', 'ça', 'au',
    'du', 'de', 'la', 'le', 'un', 'et', 'ou', 'en', 'ai', 'fait',
    'bien', 'merci', 'bonjour', 'bonsoir', 'comment', 'quoi', 'quel', 'quelle'];
  const words = lower.split(/\s+/);
  for (const w of words) {
    if (frenchWords.includes(w)) score += 2;
  }
  
  return score;
}

function englishScore(text: string): number {
  const lower = text.toLowerCase();
  let score = 0;
  
  const englishWords = ['the', 'is', 'are', 'was', 'were', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'can',
    'my', 'your', 'his', 'her', 'their', 'our', 'this', 'that',
    'what', 'where', 'when', 'how', 'why', 'which', 'who',
    'need', 'want', 'like', 'looking', 'help', 'problem'];
  const words = lower.split(/\s+/);
  for (const w of words) {
    if (englishWords.includes(w)) score += 2;
  }
  
  return score;
}

export class AlexLanguageLockSession {
  private currentLanguage: AlexLanguage = 'fr-CA';
  private consecutiveEnglish = 0;
  private locked = false;
  private history: { text: string; detectedLang: AlexLanguage }[] = [];

  getLanguage(): AlexLanguage {
    return this.currentLanguage;
  }

  isLocked(): boolean {
    return this.locked;
  }

  /**
   * Process a user utterance and detect language.
   * Returns the session language (may or may not switch).
   */
  processUtterance(text: string): AlexLanguage {
    if (!text || text.trim().length < 3) return this.currentLanguage;

    const lower = text.toLowerCase().trim();
    
    // Ignore false positives
    if (ENGLISH_FALSE_POSITIVES.has(lower)) {
      return this.currentLanguage;
    }

    const fr = frenchScore(text);
    const en = englishScore(text);
    
    const detectedLang: AlexLanguage = en > fr && en >= 4 ? 'en-CA' : 'fr-CA';
    
    this.history.push({ text: text.substring(0, 100), detectedLang });

    if (detectedLang === 'en-CA') {
      this.consecutiveEnglish++;
    } else {
      this.consecutiveEnglish = 0;
    }

    // Only switch after 2 consecutive strong English utterances
    if (this.consecutiveEnglish >= 2 && !this.locked) {
      this.currentLanguage = 'en-CA';
      this.locked = true;
    }

    // If currently English but user switches back to French strongly
    if (this.currentLanguage === 'en-CA' && fr > en * 2 && fr >= 6) {
      this.currentLanguage = 'fr-CA';
      this.consecutiveEnglish = 0;
      this.locked = true;
    }

    return this.currentLanguage;
  }

  /**
   * Force lock to a specific language.
   */
  forceLock(lang: AlexLanguage) {
    this.currentLanguage = lang;
    this.locked = true;
    this.consecutiveEnglish = 0;
  }

  reset() {
    this.currentLanguage = 'fr-CA';
    this.consecutiveEnglish = 0;
    this.locked = false;
    this.history = [];
  }
}
