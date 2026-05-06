// Capture & persist UTM + source page for attribution.
const STORAGE_KEY = 'unpro_attribution';

export interface Attribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  source_page?: string;
  user_agent?: string;
}

export function captureAttribution(): Attribution {
  if (typeof window === 'undefined') return {};
  try {
    const url = new URL(window.location.href);
    const fresh: Attribution = {
      utm_source: url.searchParams.get('utm_source') || undefined,
      utm_medium: url.searchParams.get('utm_medium') || undefined,
      utm_campaign: url.searchParams.get('utm_campaign') || undefined,
      source_page: url.pathname + url.search,
      user_agent: navigator.userAgent,
    };
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
    const merged = { ...stored, ...Object.fromEntries(Object.entries(fresh).filter(([, v]) => v)) };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return {};
  }
}

export function getAttribution(): Attribution {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
  } catch { return {}; }
}
