const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ExtractedField {
  field: string;
  value: string | string[] | number | boolean | null;
  confidence: number;
  source_url: string;
}

interface ExtractionResult {
  fields: ExtractedField[];
  pages_crawled: string[];
  raw_texts: { url: string; excerpt: string }[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { website_url, contractor_id } = await req.json();

    if (!website_url) {
      return new Response(JSON.stringify({ success: false, error: 'website_url is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlKey) {
      return new Response(JSON.stringify({ success: false, error: 'Firecrawl not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let formattedUrl = website_url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    // Step 1: Map the website to discover pages
    console.log('Step 1: Mapping website', formattedUrl);
    const mapRes = await fetch('https://api.firecrawl.dev/v1/map', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: formattedUrl, limit: 50, includeSubdomains: false }),
    });
    const mapData = await mapRes.json();
    const allLinks: string[] = mapData?.links || [formattedUrl];

    // Categorize pages
    const servicePatterns = /servi|travaux|offre|specialit|what-we-do|our-work/i;
    const cityPatterns = /ville|region|zone|area|location|secteur|territ/i;
    const aboutPatterns = /about|a-propos|qui-sommes|notre-equipe|team/i;
    const contactPatterns = /contact|joindre|reach/i;
    const faqPatterns = /faq|question/i;

    const mainUrl = formattedUrl;
    const servicePages = allLinks.filter(l => servicePatterns.test(l)).slice(0, 5);
    const cityPages = allLinks.filter(l => cityPatterns.test(l)).slice(0, 5);
    const aboutPages = allLinks.filter(l => aboutPatterns.test(l)).slice(0, 2);
    const contactPages = allLinks.filter(l => contactPatterns.test(l)).slice(0, 1);
    const faqPages = allLinks.filter(l => faqPatterns.test(l)).slice(0, 1);

    // Step 2: Scrape key pages (main + up to 8 subpages)
    const pagesToScrape = [mainUrl, ...servicePages, ...cityPages, ...aboutPages, ...contactPages, ...faqPages].slice(0, 10);
    const uniquePages = [...new Set(pagesToScrape)];

    console.log(`Step 2: Scraping ${uniquePages.length} pages`);
    const scrapedPages: { url: string; markdown: string; metadata: any }[] = [];

    for (const pageUrl of uniquePages) {
      try {
        const scrapeRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: pageUrl,
            formats: ['markdown'],
            onlyMainContent: true,
          }),
        });
        const scrapeData = await scrapeRes.json();
        if (scrapeData?.success !== false) {
          scrapedPages.push({
            url: pageUrl,
            markdown: scrapeData?.data?.markdown || scrapeData?.markdown || '',
            metadata: scrapeData?.data?.metadata || scrapeData?.metadata || {},
          });
        }
      } catch (e) {
        console.error(`Failed to scrape ${pageUrl}:`, e);
      }
    }

    // Step 3: AI extraction using Lovable AI
    console.log('Step 3: AI structured extraction');
    const combinedContent = scrapedPages.map(p =>
      `--- PAGE: ${p.url} ---\n${p.markdown.slice(0, 3000)}`
    ).join('\n\n');

    const extractionPrompt = `You are a business data extraction engine. Extract ONLY information that is EXPLICITLY stated on the website. NEVER invent or assume data.

From the following website content, extract these fields if present. For each field, provide a confidence score (0.0-1.0) based on how clearly it appears.

Fields to extract:
- company_name (legal or trade name)
- legal_name (if different from company_name)  
- phones (array of phone numbers)
- emails (array of email addresses)
- address (full street address)
- city (primary city)
- province (province/state)
- postal_code
- service_categories (array: main trade categories like "Plomberie", "Électricité")
- primary_services (array: specific services offered)
- secondary_services (array: additional services)
- service_areas (array: cities/regions served)
- about_text (company description/about text)
- cta_type ("strong" if clear CTA buttons, "weak" if minimal, "none" if absent)
- logo_url (if found in metadata or content)
- media_urls (array of image URLs found)
- proof_signals (array: mentions of insurance, RBQ, certifications, awards - but mark as "mentioned_not_verified")
- faq_content (array of {question, answer} objects)
- business_hours (opening hours if found)
- languages (array of languages the site is in)
- years_in_business (if mentioned)
- emergency_service (true/false if mentioned)
- warranty_info (warranty details if mentioned)
- financing_available (true/false if mentioned)

CRITICAL RULES:
- Do NOT invent any data
- Do NOT assume RBQ/license numbers unless clearly displayed
- Do NOT assume insurance unless explicitly mentioned
- Mark proof_signals as "mentioned_not_verified" - never as confirmed
- If a field is not found, omit it entirely

Return valid JSON only, no markdown. Format:
{
  "fields": [
    {"field": "company_name", "value": "...", "confidence": 0.95, "source_url": "..."},
    ...
  ]
}

WEBSITE CONTENT:
${combinedContent.slice(0, 12000)}`;

    const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://lovable.dev',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: extractionPrompt }],
        temperature: 0.1,
      }),
    });

    const aiData = await aiRes.json();
    const aiContent = aiData?.choices?.[0]?.message?.content || '{"fields":[]}';

    // Parse AI response
    let extraction: ExtractionResult;
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : aiContent);
      extraction = {
        fields: parsed.fields || [],
        pages_crawled: uniquePages,
        raw_texts: scrapedPages.map(p => ({ url: p.url, excerpt: p.markdown.slice(0, 200) })),
      };
    } catch {
      extraction = {
        fields: [],
        pages_crawled: uniquePages,
        raw_texts: scrapedPages.map(p => ({ url: p.url, excerpt: p.markdown.slice(0, 200) })),
      };
    }

    // Step 4: Store extraction job if contractor_id provided
    if (contractor_id) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

      // Create extraction job
      const jobRes = await fetch(`${supabaseUrl}/rest/v1/extraction_jobs`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          contractor_id,
          source_type: 'website_crawl',
          source_url: formattedUrl,
          status: 'completed',
          pages_crawled: uniquePages.length,
          fields_extracted: extraction.fields.length,
          raw_payload: { pages: extraction.raw_texts },
          extracted_data: { fields: extraction.fields },
        }),
      });
      const jobData = await jobRes.json();
      console.log('Extraction job stored:', jobData?.[0]?.id);

      // Store each field as data_source
      for (const field of extraction.fields) {
        await fetch(`${supabaseUrl}/rest/v1/data_sources`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            contractor_id,
            field_name: field.field,
            field_value: typeof field.value === 'object' ? JSON.stringify(field.value) : String(field.value ?? ''),
            source_type: 'public_site_confirmed',
            source_url: field.source_url || formattedUrl,
            confidence: field.confidence,
            extraction_job_id: jobData?.[0]?.id,
          }),
        });
      }

      // Create field_validations for sensitive fields
      const sensitiveFields = ['proof_signals', 'license_number', 'insurance_info', 'certifications'];
      for (const field of extraction.fields) {
        const isSensitive = sensitiveFields.some(s => field.field.includes(s));
        await fetch(`${supabaseUrl}/rest/v1/field_validations`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            contractor_id,
            field_name: field.field,
            field_value: typeof field.value === 'object' ? JSON.stringify(field.value) : String(field.value ?? ''),
            source_type: 'public_site_confirmed',
            validation_status: isSensitive ? 'pending_admin_validation' : (field.confidence >= 0.8 ? 'auto_accepted' : 'pending_review'),
            confidence: field.confidence,
          }),
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data: extraction,
      summary: {
        pages_found: allLinks.length,
        pages_crawled: uniquePages.length,
        fields_extracted: extraction.fields.length,
        service_pages: servicePages.length,
        city_pages: cityPages.length,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Import error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Import failed',
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
