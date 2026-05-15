const cheerio = require('cheerio');

function extractRequirements(html) {
  const $ = cheerio.load(html);
  const keywords = ['вимог', 'навичк', 'requirements', 'skills', 'expectations', 'очікуємо', 'must have', 'looking for', "обов'язково", 'досвід', 'знання'];

  const root = $('#job-description').length > 0 ? $('#job-description') : $('body');

  let requirementsText = '';
  let foundSection = false;

  root.find('h1, h2, h3, h4, h5, h6, strong, b').each((index, element) => {
    const text = $(element).text().toLowerCase();
    if (keywords.some((keyword) => text.includes(keyword))) {
      foundSection = true;
      let nextNode = $(element).next();
      let sectionText = '';

      while (nextNode.length > 0) {
        const tagName = nextNode.prop('tagName')?.toLowerCase();
        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
          break;
        }
        sectionText += `${nextNode.text().trim()}\n`;
        nextNode = nextNode.next();
      }

      if (sectionText.trim().length > 20) {
        requirementsText += `${sectionText}\n`;
      }
    }
  });

  if (!foundSection || requirementsText.trim().length < 50) {
    requirementsText = '';
    root.find('ul li').each((index, element) => {
      requirementsText += `${$(element).text().trim()}\n`;
    });
  }

  if (requirementsText.trim().length < 50) {
    requirementsText = root.text().replace(/\s+/g, ' ');
  }

  return requirementsText.trim().substring(0, 1500);
}

function normalizeTitle(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > 0 ? normalized : null;
}

function extractVacancyTitle(html) {
  const $ = cheerio.load(html);

  const title =
    $('h1').first().text() ||
    $('meta[property="og:title"]').attr('content') ||
    $('title').first().text();

  return normalizeTitle(title);
}

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

    const vacancyUrls = [];
    $('a.vt').each((index, element) => {
      if (vacancyUrls.length >= 10) return false;
      const href = $(element).attr('href');
      if (href) vacancyUrls.push(href);
      return undefined;
    });

    if (vacancyUrls.length === 0) {
      $('a[href*="/vacancies/"]').each((index, element) => {
        if (vacancyUrls.length >= 10) return false;
        const href = $(element).attr('href');
        if (href && href.includes('/vacancies/') && !vacancyUrls.includes(href) && /\d+/.test(href)) {
          vacancyUrls.push(href);
        }
        return undefined;
      });
    }

    console.log(`[DOU] Found ${vacancyUrls.length} vacancy URLs`);
    const details = await Promise.all(vacancyUrls.map((vacancyUrl) => scrapeDOUVacancy(vacancyUrl)));
    return details.filter((item) => item && item.text.length > 50);
  } catch (error) {
    console.error('[DOU] Scraping error:', error.message);
    return [];
  }
}

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
      title: extractVacancyTitle(html),
      text: extractRequirements(html),
    };
  } catch (error) {
    console.error(`[DOU] Error scraping ${url}:`, error.message);
    return null;
  }
}

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
    $('a[href^="/jobs/"]').each((index, element) => {
      const href = $(element).attr('href');
      if (href && href.match(/^\/jobs\/\d+\/$/) && !vacancyUrls.includes(href)) {
        vacancyUrls.push(`https://www.work.ua${href}`);
      }
    });

    console.log(`[Work.ua] Found ${vacancyUrls.length} vacancy URLs`);

    const detailsPromises = vacancyUrls.slice(0, 10).map(async (vacancyUrl) => {
      try {
        const vacancyResponse = await fetch(vacancyUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          }
        });
        if (!vacancyResponse.ok) return null;
        const vacancyHtml = await vacancyResponse.text();
        return {
          source: 'workua',
          url: vacancyUrl,
          title: extractVacancyTitle(vacancyHtml),
          text: extractRequirements(vacancyHtml),
        };
      } catch {
        return null;
      }
    });

    const details = await Promise.all(detailsPromises);
    return details.filter((item) => item && item.text.length > 50);

  } catch (error) {
    console.error('[Work.ua] Scraping error:', error.message);
    return [];
  }
}

function extractRobotaTitle(detailData, searchDoc) {
  return normalizeTitle(
    detailData?.title ||
      detailData?.name ||
      detailData?.vacancyTitle ||
      detailData?.vacancy?.title ||
      searchDoc?.title ||
      searchDoc?.name ||
      searchDoc?.vacancyName
  );
}

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

    const detailRequests = documents.slice(0, 10).map((document) => ({
      id: document.id,
      searchDoc: document,
    }));
    console.log(`[Robota.ua] Found ${detailRequests.length} vacancy IDs`);

    const detailsPromises = detailRequests.map(async ({ id, searchDoc }) => {
      try {
        const detailUrl = `https://api.rabota.ua/vacancy?id=${id}`;
        const detailResponse = await fetch(detailUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
          }
        });
        if (!detailResponse.ok) return null;
        const detailData = await detailResponse.json();

        const htmlDescription = detailData.description || '';
        return {
          source: 'robota',
          url: detailData.url || detailData.link || detailData.canonicalUrl || detailUrl,
          title: extractRobotaTitle(detailData, searchDoc),
          text: extractRequirements(htmlDescription),
        };
      } catch {
        return null;
      }
    });

    const details = await Promise.all(detailsPromises);
    return details.filter((item) => item && item.text.length > 50);

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
    searchKeywords.forEach((keyword) => {
      if (!queries.includes(keyword)) queries.push(keyword);
    });
  }

  if (queries.length === 0) {
    console.warn('[JobScraper] No search queries available');
    return {
      rawTexts: [],
      vacancies: [],
      sources: [],
      sourceKeys: [],
      dedupeStats: { duplicatesRemoved: 0, finalCount: 0 }
    };
  }

  for (const query of queries) {
    console.log(`[JobScraper] Executing search for: "${query}"`);

    const { entries, sources, sourceKeys } = await scrapeAllSources(query);

    allEntries.push(...entries);
    sources.forEach((source) => {
      if (!allSources.includes(source)) allSources.push(source);
    });
    sourceKeys.forEach((sourceKey) => {
      if (!allSourceKeys.includes(sourceKey)) allSourceKeys.push(sourceKey);
    });

    console.log(`[JobScraper] Extracted ${entries.length} texts for "${query}". Total so far: ${allEntries.length}`);

    if (allEntries.length >= 10) {
      break;
    }
  }

  const dedupeResult = dedupeVacancyEntries(allEntries);
  duplicatesRemoved = dedupeResult.duplicatesRemoved;

  const rawTexts = dedupeResult.uniqueEntries.map((entry) => entry.text);
  const sources = [...new Set(dedupeResult.uniqueEntries.map((entry) => entry.url).filter(Boolean))];
  const vacancies = dedupeResult.uniqueEntries
    .map((entry) => ({
      source: entry.source,
      url: entry.url,
      title: entry.title || null,
    }))
    .filter((entry) => entry.url);

  console.log(`[JobScraper] Final raw texts extracted: ${rawTexts.length}, duplicates removed: ${duplicatesRemoved}, sources tracking: ${sources.length || allSources.length}`);

  return {
    rawTexts,
    vacancies,
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
