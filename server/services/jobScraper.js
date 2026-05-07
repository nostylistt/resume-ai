const cheerio = require('cheerio');

//  Intelligent extraction of requirements from HTML DOM.
// Looks for specific headers and extracts the following content.
// Falls back to extracting list items, and finally to the whole body.

function extractRequirements(html) {
  const $ = cheerio.load(html);
  const keywords = ['вимог', 'навичк', 'requirements', 'skills', 'expectations', 'очікуєм', 'must have', 'looking for', 'обов\'язково', 'досвід', 'знання'];

  // If this is Work.ua or similar site with a clear description block, we look only in it
  const root = $('#job-description').length > 0 ? $('#job-description') : $('body');

  let requirementsText = '';
  let foundSection = false;

  root.find('h1, h2, h3, h4, h5, h6, strong, b').each((i, el) => {
    const text = $(el).text().toLowerCase();
    if (keywords.some(kw => text.includes(kw))) {
      foundSection = true;
      let nextNode = $(el).next();
      let sectionText = '';

      while (nextNode.length > 0) {
        const tagName = nextNode.prop('tagName')?.toLowerCase();
        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
          break;
        }
        sectionText += nextNode.text().trim() + '\n';
        nextNode = nextNode.next();
      }

      if (sectionText.trim().length > 20) {
        requirementsText += sectionText + '\n';
      }
    }
  });

  // Fallback 1: Extract all lists if no specific headers found or text is too short
  if (!foundSection || requirementsText.trim().length < 50) {
    requirementsText = '';
    root.find('ul li').each((i, el) => {
      requirementsText += $(el).text().trim() + '\n';
    });
  }

  // Fallback 2: Extract entire body (of the root container)
  if (requirementsText.trim().length < 50) {
    requirementsText = root.text().replace(/\s+/g, ' ');
  }

  return requirementsText.trim().substring(0, 1500);
}

// Fetches and parses job listings from DOU.ua based on the search query.

async function scrapeDOUListings(searchQuery) {
  try {
    const url = `https://jobs.dou.ua/vacancies/?search=${encodeURIComponent(searchQuery)}`;
    console.log(`[DOU] Fetching: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept-Language': 'uk-UA,uk;q=0.9,en;q=0.8',
      },
    });

    if (!response.ok) {
      console.warn(`[DOU] HTTP ${response.status}`);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Collect vacancy URLs (max 10)
    const vacancyUrls = [];
    $('a.vt').each((i, el) => {
      if (vacancyUrls.length >= 10) return false;
      const href = $(el).attr('href');
      if (href) vacancyUrls.push(href);
    });

    if (vacancyUrls.length === 0) {
      $('a[href*="/vacancies/"]').each((i, el) => {
        if (vacancyUrls.length >= 10) return false;
        const href = $(el).attr('href');
        if (href && href.includes('/vacancies/') && !vacancyUrls.includes(href) && /\d+/.test(href)) {
          vacancyUrls.push(href);
        }
      });
    }

    console.log(`[DOU] Found ${vacancyUrls.length} vacancy URLs`);
    const details = await Promise.all(
      vacancyUrls.map(url => scrapeDOUVacancy(url))
    );
    return details.filter(item => item.text.length > 50);
  } catch (error) {
    console.error('[DOU] Scraping error:', error.message);
    return [];
  }
}

// Scrapes detailed information from a single DOU vacancy page.

async function scrapeDOUVacancy(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'uk-UA,uk;q=0.9,en;q=0.8',
      },
    });

    if (!response.ok) return null;

    const html = await response.text();
    return {
      source: 'dou',
      url,
      text: extractRequirements(html),
    };
  } catch (error) {
    console.error(`[DOU] Error scraping ${url}:`, error.message);
    return null;
  }
}

// Fetches and parses job listings from Work.ua based on the search query.

async function scrapeWorkUaListings(searchQuery) {
  try {
    const formattedQuery = encodeURIComponent(searchQuery.toLowerCase()).replace(/%20/g, '+');
    const url = `https://www.work.ua/jobs-${formattedQuery}/`;
    console.log(`[Work.ua] Fetching: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'uk-UA,uk;q=0.9,en;q=0.8',
      },
    });

    if (!response.ok) {
      console.warn(`[Work.ua] HTTP ${response.status}`);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const vacancyUrls = [];
    $('a[href^="/jobs/"]').each((i, el) => {
      const href = $(el).attr('href');
      if (href && href.match(/^\/jobs\/\d+\/$/) && !vacancyUrls.includes(href)) {
        vacancyUrls.push(`https://www.work.ua${href}`);
      }
    });

    console.log(`[Work.ua] Found ${vacancyUrls.length} vacancy URLs`);

    // Scrape details for up to 10 vacancies
    const detailsPromises = vacancyUrls.slice(0, 10).map(async (vUrl) => {
      try {
        const vResp = await fetch(vUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          }
        });
        if (!vResp.ok) return null;
        const vHtml = await vResp.text();
        return {
          source: 'workua',
          url: vUrl,
          text: extractRequirements(vHtml),
        };
      } catch (err) {
        return null;
      }
    });

    const details = await Promise.all(detailsPromises);
    return details.filter(item => item && item.text.length > 50);

  } catch (error) {
    console.error('[Work.ua] Scraping error:', error.message);
    return [];
  }
}

// Fetches and parses job listings from Robota.ua using their API.

async function scrapeRobotaUaListings(searchQuery) {
  try {
    const searchUrl = `https://api.rabota.ua/vacancy/search?keyWords=${encodeURIComponent(searchQuery)}`;
    console.log(`[Robota.ua] Fetching API: ${searchUrl}`);

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });
    if (!response.ok) {
      console.warn(`[Robota.ua] HTTP ${response.status}`);
      return [];
    }

    const searchData = await response.json();
    const documents = searchData.documents || [];

    // Get the first 10 vacancies
    const ids = documents.slice(0, 10).map(doc => doc.id);
    console.log(`[Robota.ua] Found ${ids.length} vacancy IDs`);

    const detailsPromises = ids.map(async (id) => {
      try {
        const detailUrl = `https://api.rabota.ua/vacancy?id=${id}`;
        const detailResp = await fetch(detailUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
          }
        });
        if (!detailResp.ok) return null;
        const detailData = await detailResp.json();

        const htmlDescription = detailData.description || '';
        return {
          source: 'robota',
          url: detailUrl,
          text: extractRequirements(htmlDescription),
        };
      } catch (err) {
        return null;
      }
    });

    const details = await Promise.all(detailsPromises);
    return details.filter(item => item && item.text.length > 50);

  } catch (error) {
    console.error('[Robota.ua] Scraping error:', error.message);
    return [];
  }
}

function normalizeVacancyText(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim();
}

function dedupeVacancyEntries(entries) {
  const seen = new Set();
  const uniqueEntries = [];
  let duplicatesRemoved = 0;

  for (const entry of entries) {
    if (!entry || !entry.text) continue;

    const normalizedText = normalizeVacancyText(entry.text);
    if (!normalizedText) continue;

    const fingerprint = normalizedText.slice(0, 1000);
    if (seen.has(fingerprint)) {
      duplicatesRemoved++;
      continue;
    }

    seen.add(fingerprint);
    uniqueEntries.push(entry);
  }

  return {
    uniqueEntries,
    duplicatesRemoved,
  };
}

// Aggregates job listings from multiple sources (DOU, Work.ua, Robota.ua).

async function scrapeAllSources(query) {
  const [douEntries, workUaEntries, robotaEntries] = await Promise.all([
    scrapeDOUListings(query),
    scrapeWorkUaListings(query),
    scrapeRobotaUaListings(query),
  ]);

  const entries = [...douEntries, ...workUaEntries, ...robotaEntries];
  const sources = [];
  const sourceKeys = [];

  if (douEntries.length > 0) {
    sourceKeys.push('dou');
    sources.push(`https://jobs.dou.ua/vacancies/?search=${encodeURIComponent(query)}`);
  }
  if (workUaEntries.length > 0) {
    sourceKeys.push('workua');
    sources.push(`https://www.work.ua/jobs-${encodeURIComponent(query.toLowerCase()).replace(/%20/g, '+')}/`);
  }
  if (robotaEntries.length > 0) {
    sourceKeys.push('robota');
    sources.push(`https://robota.ua/zapros/${encodeURIComponent(query.replace(/\s+/g, '-'))}/ukraine`);
  }
  
  return { entries, sources, sourceKeys };
}

async function scrapeJobListings(searchKeywords, position) {
  let allEntries = [];
  let allSources = [];
  let allSourceKeys = [];
  let duplicatesRemoved = 0;
  
  const queries = [];
  if (position) queries.push(position);
  if (Array.isArray(searchKeywords)) {
    searchKeywords.forEach(kw => {
      if (!queries.includes(kw)) queries.push(kw);
    });
  }
  
  if (queries.length === 0) {
    console.warn(`[JobScraper] No search queries available`);
    return {
      rawTexts: [],
      sources: [],
      sourceKeys: [],
      dedupeStats: { duplicatesRemoved: 0, finalCount: 0 }
    };
  }

  for (const query of queries) {
    console.log(`[JobScraper] Executing search for: "${query}"`);
    
    const { entries, sources, sourceKeys } = await scrapeAllSources(query);
    
    allEntries.push(...entries);
    sources.forEach(src => {
      if (!allSources.includes(src)) allSources.push(src);
    });
    sourceKeys.forEach(sourceKey => {
      if (!allSourceKeys.includes(sourceKey)) allSourceKeys.push(sourceKey);
    });
    
    console.log(`[JobScraper] Extracted ${entries.length} texts for "${query}". Total so far: ${allEntries.length}`);
    
    if (allEntries.length >= 10) {
      break;
    }
  }

  const dedupeResult = dedupeVacancyEntries(allEntries);
  duplicatesRemoved = dedupeResult.duplicatesRemoved;

  const rawTexts = dedupeResult.uniqueEntries.map(entry => entry.text);
  const sources = [...new Set(dedupeResult.uniqueEntries.map(entry => entry.url).filter(Boolean))];

  console.log(`[JobScraper] Final raw texts extracted: ${rawTexts.length}, duplicates removed: ${duplicatesRemoved}, sources tracking: ${sources.length || allSources.length}`);

  return {
    rawTexts,
    sources: sources.length > 0 ? sources : allSources,
    sourceKeys: allSourceKeys,
    dedupeStats: {
      duplicatesRemoved,
      finalCount: rawTexts.length,
    },
  };
}

module.exports = {
  scrapeJobListings,
};
