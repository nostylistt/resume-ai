const cheerio = require('cheerio');

/**
 * Intelligent extraction of requirements from HTML DOM.
 * Looks for specific headers and extracts the following content.
 * Falls back to extracting list items, and finally to the whole body.
 */
function extractRequirements(html) {
  const $ = cheerio.load(html);
  const keywords = ['вимог', 'навичк', 'requirements', 'skills', 'expectations', 'очікуєм', 'must have', 'looking for', 'обов\'язково', 'досвід', 'знання'];
  
  // Якщо це Work.ua або подібний сайт з чітким блоком опису, шукаємо тільки в ньому
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

/**
 * Fetches and parses job listings from DOU.ua based on the search query.
 */
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
    return vacancyUrls;
  } catch (error) {
    console.error('[DOU] Scraping error:', error.message);
    return [];
  }
}

/**
 * Scrapes detailed information from a single DOU vacancy page.
 */
async function scrapeDOUVacancy(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'uk-UA,uk;q=0.9,en;q=0.8',
      },
    });

    if (!response.ok) return '';

    const html = await response.text();
    return extractRequirements(html);
  } catch (error) {
    console.error(`[DOU] Error scraping ${url}:`, error.message);
    return '';
  }
}

/**
 * Fetches and parses job listings from Work.ua based on the search query.
 */
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
        if (!vResp.ok) return '';
        const vHtml = await vResp.text();
        return extractRequirements(vHtml);
      } catch (err) {
        return '';
      }
    });

    const details = await Promise.all(detailsPromises);
    return details.filter(t => t.length > 50);

  } catch (error) {
    console.error('[Work.ua] Scraping error:', error.message);
    return [];
  }
}

/**
 * Fetches and parses job listings from Robota.ua using their API.
 */
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
        if (!detailResp.ok) return '';
        const detailData = await detailResp.json();

        const htmlDescription = detailData.description || '';
        return extractRequirements(htmlDescription);
      } catch (err) {
        return '';
      }
    });

    const details = await Promise.all(detailsPromises);
    return details.filter(t => t.length > 50);

  } catch (error) {
    console.error('[Robota.ua] Scraping error:', error.message);
    return [];
  }
}

/**
 * Aggregates job listings from multiple sources (DOU, Work.ua, Robota.ua).
 */
async function scrapeJobListings(searchKeywords, position) {
  // Use position for search, or fallback to first keyword
  const searchQuery = position ? position : (searchKeywords.length > 0 ? searchKeywords[0] : '');

  console.log(`[JobScraper] Search query: "${searchQuery}"`);

  const [douUrls, workUaTexts, robotaTexts] = await Promise.all([
    scrapeDOUListings(searchQuery),
    scrapeWorkUaListings(searchQuery),
    scrapeRobotaUaListings(searchQuery),
  ]);

  const rawTexts = [...workUaTexts, ...robotaTexts];
  const sources = [];

  if (workUaTexts.length > 0) {
    sources.push(`https://www.work.ua/jobs-${encodeURIComponent(searchQuery.toLowerCase()).replace(/%20/g, '+')}/`);
  }
  if (robotaTexts.length > 0) {
    sources.push(`https://robota.ua/zapros/${encodeURIComponent(searchQuery.replace(/\s+/g, '-'))}/ukraine`);
  }

  // DOU — scrape details of the first 10 vacancies
  const douDetailPromises = douUrls.slice(0, 10).map(url => scrapeDOUVacancy(url));
  const douDetails = await Promise.all(douDetailPromises);

  for (const detail of douDetails) {
    if (detail.length > 50) {
      rawTexts.push(detail);
    }
  }
  sources.push(...douUrls.slice(0, 10));

  console.log(`[JobScraper] Total raw texts extracted: ${rawTexts.length}, sources tracking: ${sources.length}`);

  return { rawTexts, sources };
}

module.exports = {
  scrapeJobListings,
};
